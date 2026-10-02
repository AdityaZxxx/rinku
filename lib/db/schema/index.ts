export { linkVariant, links } from "./links";
export { profileUsernames, profiles } from "./profiles";

import { links } from "./links";
import { profileUsernames, profiles } from "./profiles";

export const schema = { profiles, profileUsernames, links };

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileUsername = typeof profileUsernames.$inferSelect;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
