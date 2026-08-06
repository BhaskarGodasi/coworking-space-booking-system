import { useQuery } from "@tanstack/react-query";
import { getSpaceAvailabilityRequest } from "../api/spaces";

export function useSpaceAvailability(spaceId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["availability", spaceId, date],
    queryFn: () => getSpaceAvailabilityRequest(spaceId as string, date as string),
    enabled: Boolean(spaceId) && Boolean(date),
  });
}
