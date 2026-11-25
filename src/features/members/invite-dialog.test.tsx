import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyField } from "./invite-dialog";

const code = "3q2-7wEAAAAAAAAA";

function renderField(onCopied = vi.fn<() => void>()) {
  render(<CopyField label="Code" copyLabel="Copy code" value={code} onCopied={onCopied} />);
  return onCopied;
}

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
}

describe("CopyField", () => {
  afterEach(() => {
    setClipboard(undefined);
  });

  it("copies the value with the Clipboard API and says so", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();
    setClipboard({ writeText });
    const onCopied = renderField();

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith(code);
    await waitFor(() => {
      expect(onCopied).toHaveBeenCalledOnce();
    });
  });

  it("without a clipboard, selects the field's text for copying by hand", () => {
    setClipboard(undefined);
    const onCopied = renderField();

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Code" });
    expect(field).toHaveFocus();
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, code.length]);
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("when the clipboard refuses, selects the field's text instead", async () => {
    setClipboard({ writeText: () => Promise.reject(new Error("denied")) });
    const onCopied = renderField();

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Code" });
    await waitFor(() => {
      expect(field).toHaveFocus();
    });
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, code.length]);
    expect(onCopied).not.toHaveBeenCalled();
  });
});
