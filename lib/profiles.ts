import * as z from "zod";

// The same shapes and lengths the database checks, so the client rejects what
// the server would only reject after a round trip.
export const profileBasicsSchema = z.object({
  displayName: z.string().max(80, "Use 80 characters or fewer."),
  bio: z.string().max(200, "Use 200 characters or fewer."),
  headerStyle: z.enum([
    "classic",
    "hero",
    "banner",
    "cutout",
    "minimal",
    "left",
    "statement",
  ]),
});

// How edits reach the public page, per editor area. The database checks mirror
// this enum; a missing settings row reads as all-auto.
export const saveModeSchema = z.enum(["auto", "manual"]);
export type SaveMode = z.infer<typeof saveModeSchema>;

// The three independently configurable areas, keyed the same in the settings
// table and the editor routes.
export const editorAreas = ["links", "profile", "appearance"] as const;
export type EditorArea = (typeof editorAreas)[number];

// The same format and length the handle trigger checks in the database.
export const usernameSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/,
    "Use lowercase letters, numbers, dashes, or underscores.",
  )
  .min(3, "Use at least 3 characters.")
  .max(30, "Use 30 characters or fewer.");

export function imageExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

export function videoExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return null;
  }
}

export const imageMaxBytes = {
  avatar: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
  link: 5 * 1024 * 1024,
  wallpaperImage: 5 * 1024 * 1024,
  wallpaperVideo: 25 * 1024 * 1024,
};
