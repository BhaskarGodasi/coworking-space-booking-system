import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMaintenanceRequest } from "../api/admin";

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMaintenanceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}
