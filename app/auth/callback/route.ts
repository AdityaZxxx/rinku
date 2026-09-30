import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Two flows land here with a token in the URL, and they need different handling:
 * OAuth returns `?code=`, a PKCE code only a server can redeem because only a
 * server can write the session cookie; email confirmation returns
 * `?token_hash=&type=`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] exchangeCodeForSession failed", error.message);
      return redirectWithError(origin, error.message);
    }
  } else if (tokenHash && type) {
    // SAFETY: Supabase types this as a union but sends it as a query parameter,
    // so an unrecognised value is rejected instead of forwarded to verifyOtp.
    const otpTypes = [
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "email",
    ] as const;
    const otpType = otpTypes.find((candidate) => candidate === type);

    if (!otpType) {
      return redirectWithError(origin, "That confirmation link is not valid.");
    }

    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth] verifyOtp failed", error.message);
      return redirectWithError(origin, error.message);
    }
  } else if (oauthError) {
    return redirectWithError(origin, oauthError);
  } else {
    return redirectWithError(origin, "That sign-in link is not valid.");
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}

/**
 * Errors go in the query string because this route is only ever reached by a
 * browser redirect, where a response body would never be rendered.
 */
function redirectWithError(origin: string, message: string) {
  const login = new URL("/login", origin);
  login.searchParams.set("error", message);
  return NextResponse.redirect(login);
}
