"use client";

import type { Profile } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/app/actions/profiles";

export function useProfileQuery(username: string, initialProfile: Profile) {
  const query = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const result = await getProfile({ username });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialProfile,
  });

  return {
    query,
    profile: query.data && !("error" in query.data) ? query.data : initialProfile,
  };
}
