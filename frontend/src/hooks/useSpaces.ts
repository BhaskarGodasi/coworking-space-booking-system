import { useQuery } from "@tanstack/react-query";
import { listSpacesRequest, ListSpacesParams } from "../api/spaces";

export function useSpaces(params: ListSpacesParams) {
  return useQuery({
    queryKey: ["spaces", params],
    queryFn: () => listSpacesRequest(params),
    staleTime: 5 * 60 * 1000,
  });
}
