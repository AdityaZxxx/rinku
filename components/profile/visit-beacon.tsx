"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget page-view ping. Lives outside the render path so the public
 * page itself stays cacheable; the POST route owns bot filtering, the owner
 * skip, and the visitor hash. The traffic source travels in the body because
 * the fetch's own Referer header is this page, not the site that sent the
 * visitor.
 */
export function VisitBeacon({
  username,
  profileId,
}: {
  username: string;
  profileId: string;
}) {
  useEffect(() => {
    // StrictMode mounts twice in dev; count one view per profile per tab.
    const key = `rinku:visit:${profileId}`;
    try {
      if (sessionStorage.getItem(key)) {
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode can throw; still count the view.
    }
    void fetch(`/${encodeURIComponent(username)}/visit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, referrer: document.referrer || undefined }),
      keepalive: true,
    });
  }, [username, profileId]);

  return null;
}
