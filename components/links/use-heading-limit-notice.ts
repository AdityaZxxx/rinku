"use client";

import { useEffect, useState } from "react";

import { HEADING_TITLE_MAX } from "@/lib/links/model";

const NOTICE_MS = 2000;

/**
 * Feedback for a heading input pinned at its cap. `atLimit` rises only when a
 * keystroke or paste genuinely cannot fit (typing over a selection still fits,
 * so it stays quiet), falls on its own after a beat, and clears the moment the
 * field goes idle, so callers can surface the reason without reserving space
 * for it or leaving chrome behind.
 */
export function useHeadingLimitNotice() {
  const [atLimit, setAtLimit] = useState(false);

  useEffect(() => {
    if (!atLimit) {
      return;
    }
    const timer = setTimeout(() => setAtLimit(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [atLimit]);

  function dismiss() {
    setAtLimit(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const input = event.currentTarget;
    const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length - selected + 1 > HEADING_TITLE_MAX) {
      setAtLimit(true);
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const pasted = event.clipboardData.getData("text").length;
    if (input.value.length - selected + pasted > HEADING_TITLE_MAX) {
      setAtLimit(true);
    }
  }

  return { atLimit, dismiss, onKeyDown, onPaste };
}
