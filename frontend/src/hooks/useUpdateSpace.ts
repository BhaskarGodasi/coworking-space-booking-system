import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSpaceRequest, SpaceInput } from "../api/spaces";

export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SpaceInput> }) =>
      updateSpaceRequest(id, input),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["space", space.id] });
    },
  });
}
