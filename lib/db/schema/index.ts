export { linkClicks, linkVariant, links } from "./links";
export { appearanceDrafts, profileDrafts, profileEditorSettings } from "./editor";
export { profileUsernames, profiles, profileVisits } from "./profiles";

import { appearanceDrafts, profileDrafts, profileEditorSettings } from "./editor";
import { linkClicks, links } from "./links";
import { profileUsernames, profiles, profileVisits } from "./profiles";

export const schema = {
  profiles,
  profileUsernames,
  links,
  linkClicks,
  profileVisits,
  profileEditorSettings,
  profileDrafts,
  appearanceDrafts,
};

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileUsername = typeof profileUsernames.$inferSelect;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;

export type ProfileEditorSettings = typeof profileEditorSettings.$inferSelect;
export type ProfileDraft = typeof profileDrafts.$inferSelect;
export type AppearanceDraft = typeof appearanceDrafts.$inferSelect;
