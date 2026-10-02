export { linkClicks, linkVariant, links } from "./links";
export { profileUsernames, profiles, profileVisits } from "./profiles";

import { linkClicks, links } from "./links";
import { profileUsernames, profiles, profileVisits } from "./profiles";

export const schema = { profiles, profileUsernames, links, linkClicks, profileVisits };

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileUsername = typeof profileUsernames.$inferSelect;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
