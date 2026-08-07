import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { Trash2, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useSpaces } from "../hooks/useSpaces";
import { useMaintenance } from "../hooks/useMaintenance";
import { useCreateMaintenance } from "../hooks/useCreateMaintenance";
import { useDeleteMaintenance } from "../hooks/useDeleteMaintenance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { useToast } from "./ui/toast";

function toIsoWithOffset(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

function MaintenanceManager() {
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const maintenanceQuery = useMaintenance();
  const createMaintenance = useCreateMaintenance();
  const deleteMaintenance = useDeleteMaintenance();

  const [spaceId, setSpaceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { addToast } = useToast();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMaintenance.mutate(
      {
        spaceId,
        startTime: toIsoWithOffset(date, startTime),
        endTime: toIsoWithOffset(date, endTime),
        reason,
      },
      {
        onSuccess: () => {
          addToast({ title: "Maintenance window created", variant: "success" });
          setDate("");
          setStartTime("");
          setEndTime("");
          setReason("");
        },
      },
    );
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    deleteMaintenance.mutate(deleteTargetId, {
      onSuccess: () => {
        addToast({ title: "Maintenance window removed", variant: "success" });
        setDeleteTargetId(null);
      },
      onError: () => {
        addToast({
          title: "Could not remove maintenance window",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  }

  const spaceNameById = new Map((spacesQuery.data?.data ?? []).map((s) => [s.id, s.name]));

  const isConflict =
    createMaintenance.isError &&
    (createMaintenance.error as { response?: { status?: number } })?.response?.status === 409;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Schedule Form */}
      <div className="xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule Window</CardTitle>
            <CardDescription>Block off availability for a space.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance-space">Space</Label>
                <Select value={spaceId} onValueChange={setSpaceId} required>
                  <SelectTrigger id="maintenance-space">
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent>
                    {(spacesQuery.data?.data ?? []).map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-date">Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maintenance-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenance-start">Start time</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="maintenance-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-end">End time</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="maintenance-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-reason">Reason</Label>
                <Input
                  id="maintenance-reason"
                  type="text"
                  placeholder="e.g. Deep cleaning, HVAC repair..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              {createMaintenance.isError && (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive font-medium" role="alert">
                  {isConflict
                    ? "This window overlaps an existing booking or maintenance window."
                    : "Could not schedule maintenance. Please check the details and try again."}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createMaintenance.isPending || !spaceId}>
                {createMaintenance.isPending ? "Scheduling..." : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Schedule Maintenance
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Calendar List */}
      <div className="xl:col-span-2">
        <div className="rounded-md border overflow-x-auto">
          {maintenanceQuery.isLoading && (
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {maintenanceQuery.isError && (
            <div className="p-8">
              <ErrorState 
                title="Failed to load maintenance" 
                message="Could not load maintenance windows. Please try again."
                onRetry={() => maintenanceQuery.refetch()} 
              />
            </div>
          )}

          {!maintenanceQuery.isLoading &&
            !maintenanceQuery.isError &&
            (!maintenanceQuery.data || maintenanceQuery.data.length === 0) && (
              <EmptyState 
                title="No active maintenance" 
                description="No maintenance windows are currently scheduled."
              />
            )}

          {!maintenanceQuery.isLoading && maintenanceQuery.data && maintenanceQuery.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...maintenanceQuery.data]
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((window) => (
                    <TableRow key={window.id}>
                      <TableCell className="font-medium">
                        {spaceNameById.get(window.spaceId) ?? <span className="font-mono text-xs">{window.spaceId.substring(0,8)}</span>}
                      </TableCell>
                      <TableCell>{format(new Date(window.startTime), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(window.startTime), "h:mm a")} - {format(new Date(window.endTime), "h:mm a")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={window.reason}>
                        {window.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteMaintenance.isPending}
                          onClick={() => setDeleteTargetId(window.id)}
                          title="Remove maintenance window"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Remove this maintenance window?"
        description="The space will become bookable for this time slot again."
        confirmLabel="Remove"
        destructive
        isConfirming={deleteMaintenance.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default MaintenanceManager;
