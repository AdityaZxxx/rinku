import { type NextRequest, NextResponse } from "next/server";

import {
  AGE_GATE_COOKIE,
  isAgeGateCleared,
  withAgeGateUnlock,
} from "@/lib/links/age-gate";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

const consentPage = (linkId: string, minAge: number) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Age check</title>
    <style>
      body { margin: 0; min-height: 100dvh; display: grid; place-items: center;
             padding: 1rem; font-family: system-ui, sans-serif;
             background: #f5f5f5; color: #111; }
      main { max-width: 22rem; width: 100%; background: #fff;
             border: 1px solid #e5e5e5; border-radius: 1rem; padding: 1.5rem;
             display: flex; flex-direction: column; gap: 1rem; }
      h1 { font-size: 1rem; font-weight: 600; margin: 0; }
      p { font-size: 0.875rem; color: #555; margin: 0; }
      form { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; }
      button { font: inherit; border-radius: 9999px; padding: 0.625rem 1rem;
               cursor: pointer; border: 1px solid #ddd; background: #fff; }
      button[type="submit"] { background: #111; color: #fff; border: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Age-restricted link</h1>
      <p>This link is intended for people ${minAge} or older.</p>
      <form method="post" action="/go/${linkId}">
        <button type="submit">I am ${minAge} or older</button>
        <button type="button" onclick="history.back()">Go back</button>
      </form>
    </main>
  </body>
</html>`;

function consentResponse(linkId: string, minAge: number): NextResponse {
  const response = new NextResponse(consentPage(linkId, minAge), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  response.headers.set("cache-control", "no-store");
  return response;
}

async function loadLink(id: string) {
  const supabase = await createClient();
  return supabase.from("links").select("url, min_age").eq("id", id).maybeSingle();
}

/**
 * Click-through redirect: the public page points link buttons here so every
 * visit counts, then the visitor lands on the owner's URL. Analytics never
 * needs the owner's RLS context, record_click only bumps publicly visible
 * rows, and the anon-visible row read is what supplies the destination.
 *
 * Age-gated links stop at a consent interstitial unless the session cookie
 * already clears the gate; consent posts here, is recorded in the cookie and
 * the HMAC, then the redirect proceeds.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await loadLink(id);

  if (error) {
    log.error("go", "link lookup failed", error.message);
    return new NextResponse("Something went wrong.", { status: 500 });
  }
  if (!data) {
    return new NextResponse("Link not found.", { status: 404 });
  }

  const minAge: number | null = data.min_age ?? null;
  if (minAge !== null) {
    const cookie = request.cookies.get(AGE_GATE_COOKIE)?.value;
    if (!isAgeGateCleared(cookie, id, minAge)) {
      return consentResponse(id, minAge);
    }
  }

  const supabase = await createClient();
  const { error: recordError } = await supabase.rpc("record_click", {
    link_id: id,
  });
  if (recordError) {
    log.error("go", "record_click failed", recordError.message);
  }

  const response = NextResponse.redirect(data.url, 302);
  response.headers.set("cache-control", "no-store");
  return response;
}

/** Consent submission: remember the unlock for this link, then redirect. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await loadLink(id);

  if (error) {
    log.error("go", "link lookup failed", error.message);
    return new NextResponse("Something went wrong.", { status: 500 });
  }
  if (!data) {
    return new NextResponse("Link not found.", { status: 404 });
  }

  const minAge: number | null = data.min_age ?? null;
  if (minAge === null) {
    // Nothing to consent to; treat as a plain click.
    return GET(request, { params: Promise.resolve({ id }) });
  }

  const supabase = await createClient();
  const { error: recordError } = await supabase.rpc("record_click", {
    link_id: id,
  });
  if (recordError) {
    log.error("go", "record_click failed", recordError.message);
  }

  const response = NextResponse.redirect(data.url, 303);
  // Session cookie: closing the browser re-arms every gate.
  response.cookies.set({
    name: AGE_GATE_COOKIE,
    value: withAgeGateUnlock(request.cookies.get(AGE_GATE_COOKIE)?.value, id, minAge),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
