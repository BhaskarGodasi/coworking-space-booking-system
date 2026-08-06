import { useQuery } from "@tanstack/react-query";
import { listMaintenanceRequest } from "../api/admin";

export function useMaintenance(spaceId?: string) {
  return useQuery({
    queryKey: ["maintenance", { spaceId }],
    queryFn: () => listMaintenanceRequest(spaceId),
  });
}
