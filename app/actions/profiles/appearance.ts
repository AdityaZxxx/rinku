"use server";

import { eq } from "drizzle-orm";
import * as z from "zod";

import { expirePublicProfileCache } from "@/lib/db/public-cache";
import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { appearanceSchema } from "@/lib/profiles/appearance";
import { createClient } from "@/lib/supabase/server";

export async function updateAppearance(input: {
  username: string;
  themeId: string;
  headerStyle: string;
  bannerPath: string | null;
  buttonContour: string;
  buttonVariant: string;
  buttonUmbra: string;
  buttonUmbraColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontId: string;
  titleColor: string;
  bodyColor: string;
  wallpaperKind: string;
  wallpaperColor: string;
  wallpaperColorB: string;
  wallpaperPattern: string;
  wallpaperPatternSpacing: number;
  wallpaperPatternThickness: number;
  linkEntrance: string;
  linkHover: string;
  pageAlignment: string;
  showUsername: boolean;
  wallpaperImagePath: string | null;
  wallpaperVideoPath: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = appearanceSchema.extend({ username: z.string() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({
        themeId: parsed.data.themeId,
        headerStyle: parsed.data.headerStyle,
        bannerPath: parsed.data.bannerPath,
        buttonContour: parsed.data.buttonContour,
        buttonVariant: parsed.data.buttonVariant,
        buttonUmbra: parsed.data.buttonUmbra,
        buttonUmbraColor: parsed.data.buttonUmbraColor,
        buttonColor: parsed.data.buttonColor,
        buttonTextColor: parsed.data.buttonTextColor,
        fontId: parsed.data.fontId,
        titleColor: parsed.data.titleColor,
        bodyColor: parsed.data.bodyColor,
        wallpaperKind: parsed.data.wallpaperKind,
        wallpaperColor: parsed.data.wallpaperColor,
        wallpaperColorB: parsed.data.wallpaperColorB,
        wallpaperPattern: parsed.data.wallpaperPattern,
        wallpaperPatternSpacing: parsed.data.wallpaperPatternSpacing,
        wallpaperPatternThickness: parsed.data.wallpaperPatternThickness,
        linkEntrance: parsed.data.linkEntrance,
        linkHover: parsed.data.linkHover,
        pageAlignment: parsed.data.pageAlignment,
        showUsername: parsed.data.showUsername,
        wallpaperImagePath: parsed.data.wallpaperImagePath,
        wallpaperVideoPath: parsed.data.wallpaperVideoPath,
        updatedAt: new Date(),
      })
      .where(eq(profiles.username, parsed.data.username))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "This profile could not be saved." };
  }
  expirePublicProfileCache();
  return { ok: true };
}
