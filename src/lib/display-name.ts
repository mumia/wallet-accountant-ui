import { z } from "zod";

/** The contract's `DisplayName`: at most 64 characters. */
export const displayNameMaxLength = 64;

/**
 * A User's display name, as the backend checks it: trimmed, then 1–64
 * characters. A name of only spaces is caught here, before the backend's 422.
 * Shared by `/register` and the Your name dialog.
 */
export function displayNameSchema(messages: { required: string; tooLong: string }) {
  return z.string().trim().min(1, messages.required).max(displayNameMaxLength, messages.tooLong);
}
