import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { errorText, useErrorText } from "../../components/error-text";
import { useErrorToast } from "../../components/toaster";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "../../components/ui/popover";
import { useSidebar } from "../../components/ui/sidebar";
import { notificationsInterval, notificationsKey } from "../../lib/notifications";

type Notification = components["schemas"]["Notification"];
type NotificationList = components["schemas"]["NotificationList"];

/** The kinds this build knows. `kind` is an extensible enum: others are shown as sent, with no link. */
export const notificationKinds = ["SUSPECTED_DUPLICATES_FOUND"] as const;
const [suspectedDuplicatesFound] = notificationKinds;

/**
 * What a Suspected duplicates Notification points at. Its fields are present
 * only on that kind, so any other kind (or one missing them) gives undefined.
 */
function suspectedDuplicates(notification: Notification) {
  const { kind, account_id: accountId, suspected_duplicates: count } = notification;
  return kind === suspectedDuplicatesFound && accountId !== undefined && count !== undefined
    ? { accountId, count }
    : undefined;
}

const when = (dateTime: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(dateTime),
  );

/**
 * The Notifications bell (spec, "Notifications"): an unread count worked out
 * from the list, and a panel listing them. A Suspected duplicates one marks
 * itself read and opens that Account's Suspected duplicates.
 */
export function NotificationsBell({ householdId }: { householdId: string }) {
  const { t } = useTranslation("shell");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useErrorToast();
  const { setOpenMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const household = { params: { path: { household_id: householdId } } };
  const notifications = api.useQuery("get", "/households/{household_id}/notifications", household, {
    // Paused while the page is hidden; refetched on focus too.
    refetchInterval: notificationsInterval,
  });
  const accounts = api.useQuery("get", "/households/{household_id}/accounts", household);
  const key = notificationsKey(householdId);

  const markRead = api.useMutation(
    "post",
    "/households/{household_id}/notifications/{notification_id}/read",
    {
      onMutate: async ({ params }) => {
        await queryClient.cancelQueries({ queryKey: key });
        const before = queryClient.getQueryData<NotificationList>(key);
        queryClient.setQueryData<NotificationList>(key, (list) =>
          list === undefined
            ? list
            : {
                items: list.items.map((item) =>
                  item.notification_id === params.path.notification_id
                    ? { ...item, read: true }
                    : item,
                ),
              },
        );
        return { before };
      },
      onError: (error, _variables, context) => {
        queryClient.setQueryData(key, context?.before);
        const { title, detail } = errorText(error, tCommon);
        toast(t("notifications.markFailed"), detail === undefined ? title : `${title}: ${detail}`);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
    },
  );

  const items = notifications.data?.items ?? [];
  const unread = items.filter(({ read }) => !read).length;
  const accountName = (accountId: string) =>
    accounts.data?.items.find(({ account_id }) => account_id === accountId)?.name ??
    t("notifications.unknownAccount");

  const follow = (notification: Notification, accountId: string) => {
    setOpen(false);
    setOpenMobile(false);
    if (!notification.read) {
      markRead.mutate({
        params: {
          path: { household_id: householdId, notification_id: notification.notification_id },
        },
      });
    }
    void navigate({
      to: "/households/$householdId/accounts/$accountId/to-review",
      params: { householdId, accountId },
      search: { state: "SUSPECTED_DUPLICATE" },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative shrink-0"
            aria-label={
              unread === 0
                ? t("notifications.bell")
                : t("notifications.bellUnread", { count: unread })
            }
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        <PopoverTitle className="px-2 pt-1">{t("notifications.title")}</PopoverTitle>
        {notifications.isPending ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">{t("notifications.loading")}</p>
        ) : notifications.isError ? (
          <LoadFailed error={notifications.error} onRetry={() => void notifications.refetch()} />
        ) : items.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">{t("notifications.empty")}</p>
        ) : (
          <ul className="grid max-h-96 gap-0.5 overflow-y-auto">
            {items.map((notification) => (
              <li key={notification.notification_id}>
                <Item notification={notification} accountName={accountName} onFollow={follow} />
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Item({
  notification,
  accountName,
  onFollow,
}: {
  notification: Notification;
  accountName: (accountId: string) => string;
  onFollow: (notification: Notification, accountId: string) => void;
}) {
  const { t } = useTranslation("shell");
  const suspected = suspectedDuplicates(notification);
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? "" : "bg-primary"}`}
      />
      <span className="grid gap-0.5">
        <span className={notification.read ? undefined : "font-medium"}>
          {!notification.read && <span className="sr-only">{t("notifications.unread")} </span>}
          {suspected !== undefined
            ? t("notifications.suspected", {
                count: suspected.count,
                account: accountName(suspected.accountId),
              })
            : notification.kind}
        </span>
        <span className="text-xs text-muted-foreground">{when(notification.created_at)}</span>
      </span>
    </>
  );
  const itemClass = "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm";
  return suspected !== undefined ? (
    <button
      type="button"
      className={`${itemClass} outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50`}
      onClick={() => {
        onFollow(notification, suspected.accountId);
      }}
    >
      {body}
    </button>
  ) : (
    <div className={itemClass}>{body}</div>
  );
}

function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { title, detail } = useErrorText(error);
  return (
    <div className="grid justify-items-start gap-2 px-2 py-1 text-sm">
      <div role="alert">
        <p className="font-medium">{title}</p>
        {detail !== undefined && <p className="text-muted-foreground">{detail}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("errors.tryAgain")}
      </Button>
    </div>
  );
}
