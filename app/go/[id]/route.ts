import { type NextRequest, NextResponse } from "next/server";

import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

/**
 * Click-through redirect: the public page points link buttons here so every
 * visit counts, then the visitor lands on the owner's URL. Analytics never
 * needs the owner's RLS context, record_click only bumps publicly visible
 * rows, and the anon-visible row read is what supplies the destination.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("links")
    .select("url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("go", "link lookup failed", error.message);
    return new NextResponse("Something went wrong.", { status: 500 });
  }
  if (!data) {
    return new NextResponse("Link not found.", { status: 404 });
  }

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
