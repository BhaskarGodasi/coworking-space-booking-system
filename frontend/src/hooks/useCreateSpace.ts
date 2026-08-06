import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSpaceRequest, SpaceInput } from "../api/spaces";

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SpaceInput) => createSpaceRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}
