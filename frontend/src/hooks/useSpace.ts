import { useQuery } from "@tanstack/react-query";
import { getSpaceRequest } from "../api/spaces";

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: ["space", id],
    queryFn: () => getSpaceRequest(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
