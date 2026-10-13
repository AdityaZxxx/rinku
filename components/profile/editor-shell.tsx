import type { ReactNode } from "react";

import { PreviewActions } from "./preview-actions";

export function EditorShell({
  children,
  preview,
  mobilePreview,
  username,
}: {
  children: ReactNode;
  preview: ReactNode;
  mobilePreview?: ReactNode;
  username?: string;
}) {
  return (
    <>
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_405px]">
        <div className="min-w-0">{children}</div>
        <div className="hidden lg:sticky lg:top-18 lg:block lg:self-start">
          <div className="flex items-start justify-center gap-3">
            {/* The canonical 360x640 mobile viewport at 1:1 CSS scale;
                shrink-0 keeps the action rail from squeezing the frame. */}
            <div className="bg-background flex h-[min(660px,85vh)] w-[360px] shrink-0 flex-col overflow-hidden rounded-[2rem] shadow-lg">
              <div className="flex-1 overflow-y-auto">{preview}</div>
            </div>
            {username ? <PreviewActions username={username} /> : null}
          </div>
        </div>
      </div>
      {mobilePreview}
    </>
  );
}
