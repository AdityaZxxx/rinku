"use client";

import type { Link as LinkData } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";

import { getLinks } from "@/app/actions/links";

export function useLinksQuery(profileId: string, initialLinks: LinkData[]) {
  const query = useQuery({
    queryKey: ["links", profileId],
    queryFn: async () => {
      const result = await getLinks(profileId);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialLinks,
  });

  return {
    query,
    links: Array.isArray(query.data) ? query.data : [],
  };
}
