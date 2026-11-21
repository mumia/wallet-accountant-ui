import { useId } from "react";
import { useTranslation } from "react-i18next";

import { schemeChoices, useAppearance, type SchemeChoice } from "../lib/theme/appearance";
import { presetKeys, themeTokens, type PresetKey } from "../lib/theme/themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface AppearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Appearance… (spec, "Look and feel"): the four presets and Light / Dark /
 * System, applied as they are picked and saved in this browser.
 */
export function AppearanceDialog({ open, onOpenChange }: AppearanceDialogProps) {
  const { t } = useTranslation();
  const [appearance, setAppearance] = useAppearance();
  const themeLabel = useId();
  const modeLabel = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("appearance.title")}</DialogTitle>
          <DialogDescription>{t("appearance.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <p id={themeLabel} className="font-medium">
            {t("appearance.theme")}
          </p>
          <RadioGroup
            aria-labelledby={themeLabel}
            value={appearance.preset}
            onValueChange={(preset: PresetKey) => {
              setAppearance({ ...appearance, preset });
            }}
            className="grid-cols-2"
          >
            {presetKeys.map((preset) => (
              <Label
                key={preset}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3"
              >
                <RadioGroupItem value={preset} />
                <Swatch preset={preset} />
                {t(`appearance.presets.${preset}`)}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="grid gap-2">
          <p id={modeLabel} className="font-medium">
            {t("appearance.mode")}
          </p>
          <RadioGroup
            aria-labelledby={modeLabel}
            value={appearance.scheme}
            onValueChange={(scheme: SchemeChoice) => {
              setAppearance({ ...appearance, scheme });
            }}
            className="grid-cols-3"
          >
            {schemeChoices.map((scheme) => (
              <Label key={scheme} className="flex min-h-11 cursor-pointer items-center gap-2">
                <RadioGroupItem value={scheme} />
                {t(`appearance.schemes.${scheme}`)}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A small sample of a preset's accent, shown beside its name. */
function Swatch({ preset }: { preset: PresetKey }) {
  const light = themeTokens(preset, "light").primary;
  const dark = themeTokens(preset, "dark").primary;
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 rounded-full border"
      style={{ background: `linear-gradient(135deg, ${light} 50%, ${dark} 50%)` }}
    />
  );
}
