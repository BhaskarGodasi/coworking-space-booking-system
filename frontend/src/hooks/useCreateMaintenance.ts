import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMaintenanceRequest, CreateMaintenancePayload } from "../api/admin";

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMaintenancePayload) => createMaintenanceRequest(payload),
    onSuccess: (maintenance) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["availability", maintenance.spaceId] });
    },
  });
}
