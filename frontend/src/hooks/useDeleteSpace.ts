import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSpaceRequest } from "../api/spaces";

export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSpaceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["deletedSpaces"] });
    },
  });
}
