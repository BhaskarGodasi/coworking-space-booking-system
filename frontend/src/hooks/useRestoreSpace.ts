import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreSpaceRequest } from "../api/spaces";

export function useRestoreSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreSpaceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["deletedSpaces"] });
    },
  });
}
