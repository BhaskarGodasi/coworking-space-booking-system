import { FormEvent, useState } from "react";
import { useSpaces } from "../hooks/useSpaces";
import { useMaintenance } from "../hooks/useMaintenance";
import { useCreateMaintenance } from "../hooks/useCreateMaintenance";
import { useDeleteMaintenance } from "../hooks/useDeleteMaintenance";

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
          setDate("");
          setStartTime("");
          setEndTime("");
          setReason("");
        },
      },
    );
  }

  const spaceNameById = new Map((spacesQuery.data?.data ?? []).map((s) => [s.id, s.name]));

  const isConflict =
    createMaintenance.isError &&
    (createMaintenance.error as { response?: { status?: number } })?.response?.status === 409;

  return (
    <div>
      <h3>Schedule Maintenance</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="maintenance-space">Space</label>
        <select
          id="maintenance-space"
          value={spaceId}
          onChange={(e) => setSpaceId(e.target.value)}
          required
        >
          <option value="">Select a space</option>
          {(spacesQuery.data?.data ?? []).map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>

        <label htmlFor="maintenance-date">Date</label>
        <input
          id="maintenance-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label htmlFor="maintenance-start">Start time</label>
        <input
          id="maintenance-start"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <label htmlFor="maintenance-end">End time</label>
        <input
          id="maintenance-end"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />

        <label htmlFor="maintenance-reason">Reason</label>
        <input
          id="maintenance-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {createMaintenance.isError && (
          <p role="alert">
            {isConflict
              ? "This window overlaps an existing booking or maintenance window."
              : "Could not schedule maintenance. Please check the details and try again."}
          </p>
        )}

        <button type="submit" disabled={createMaintenance.isPending}>
          {createMaintenance.isPending ? "Scheduling..." : "Schedule Maintenance"}
        </button>
      </form>

      <h3>Maintenance Calendar</h3>

      {maintenanceQuery.isLoading && <p role="status">Loading maintenance windows...</p>}

      {maintenanceQuery.isError && (
        <div role="alert">
          <p>Could not load maintenance windows. Please try again.</p>
          <button type="button" onClick={() => maintenanceQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {!maintenanceQuery.isLoading &&
        !maintenanceQuery.isError &&
        (!maintenanceQuery.data || maintenanceQuery.data.length === 0) && (
          <p>No maintenance windows scheduled.</p>
        )}

      {!maintenanceQuery.isLoading && maintenanceQuery.data && maintenanceQuery.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Space</th>
              <th>Start</th>
              <th>End</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {[...maintenanceQuery.data]
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((window) => (
                <tr key={window.id}>
                  <td>{spaceNameById.get(window.spaceId) ?? window.spaceId}</td>
                  <td>{new Date(window.startTime).toLocaleString()}</td>
                  <td>{new Date(window.endTime).toLocaleString()}</td>
                  <td>{window.reason}</td>
                  <td>
                    <button
                      type="button"
                      disabled={deleteMaintenance.isPending}
                      onClick={() => deleteMaintenance.mutate(window.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MaintenanceManager;
