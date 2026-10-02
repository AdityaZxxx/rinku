"use server";

import { redirect } from "next/navigation";

import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) log.error("auth", "signOut failed", error.message);
  redirect("/login");
}
