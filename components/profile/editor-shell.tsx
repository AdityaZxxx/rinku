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
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">{children}</div>
        <div className="hidden lg:sticky lg:top-18 lg:block lg:self-start">
          <div className="flex flex-col gap-3">
            {username ? <PreviewActions username={username} /> : null}
            <div className="bg-background mx-auto flex h-[min(700px,85vh)] w-full max-w-[360px] flex-col overflow-hidden rounded-[2rem] shadow-xl">
              <div className="flex-1 overflow-y-auto">{preview}</div>
            </div>
          </div>
        </div>
      </div>
      {mobilePreview}
    </>
  );
}
