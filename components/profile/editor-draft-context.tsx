"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppearanceDraftFields, ProfileDraftFields } from "@/lib/editor-draft";

/**
 * Holds the unpublished Profile/Appearance drafts for one editor route so the
 * editor and the live preview render the same values. Null means "show the
 * published profile", which is always true in auto mode.
 *
 * State is lifted to the page and provided around `EditorShell`, so the preview
 * does not have to reach into React Query's cache to find a draft.
 */
interface EditorDraftValue {
  profileDraft: ProfileDraftFields | null;
  appearanceDraft: AppearanceDraftFields | null;
  setProfileDraft: (draft: ProfileDraftFields | null) => void;
  setAppearanceDraft: (draft: AppearanceDraftFields | null) => void;
}

const EditorDraftContext = createContext<EditorDraftValue | null>(null);

export function EditorDraftProvider({
  children,
  initialProfileDraft = null,
  initialAppearanceDraft = null,
}: {
  children: ReactNode;
  initialProfileDraft?: ProfileDraftFields | null;
  initialAppearanceDraft?: AppearanceDraftFields | null;
}) {
  const [profileDraft, setProfileDraft] = useState<ProfileDraftFields | null>(
    initialProfileDraft,
  );
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraftFields | null>(
    initialAppearanceDraft,
  );

  const value = useMemo(
    () => ({ profileDraft, appearanceDraft, setProfileDraft, setAppearanceDraft }),
    [profileDraft, appearanceDraft],
  );

  return (
    <EditorDraftContext.Provider value={value}>{children}</EditorDraftContext.Provider>
  );
}

/** Null outside a provider, which the preview reads as "no draft". */
export function useEditorDraft() {
  return useContext(EditorDraftContext);
}
