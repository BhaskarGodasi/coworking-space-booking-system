import { useQuery } from "@tanstack/react-query";
import { listDeletedSpacesRequest } from "../api/spaces";

export function useDeletedSpaces() {
  return useQuery({
    queryKey: ["deletedSpaces"],
    queryFn: listDeletedSpacesRequest,
  });
}
