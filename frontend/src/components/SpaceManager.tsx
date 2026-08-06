import { FormEvent, useState } from "react";
import { useSpaces } from "../hooks/useSpaces";
import { useCreateSpace } from "../hooks/useCreateSpace";
import { useUpdateSpace } from "../hooks/useUpdateSpace";
import { useDeleteSpace } from "../hooks/useDeleteSpace";
import { useDeletedSpaces } from "../hooks/useDeletedSpaces";
import { useRestoreSpace } from "../hooks/useRestoreSpace";
import { Space, SpaceType } from "../api/spaces";

interface SpaceFormState {
  name: string;
  type: SpaceType;
  capacity: string;
  amenities: string;
}

const EMPTY_FORM: SpaceFormState = { name: "", type: "DESK", capacity: "", amenities: "" };

function toAmenitiesArray(value: string) {
  return value
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

function SpaceManager() {
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const deletedSpacesQuery = useDeletedSpaces();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const restoreSpace = useRestoreSpace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpaceFormState>(EMPTY_FORM);

  function startEdit(space: Space) {
    setEditingId(space.id);
    setForm({
      name: space.name,
      type: space.type,
      capacity: String(space.capacity),
      amenities: space.amenities.join(", "),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = {
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity),
      amenities: toAmenitiesArray(form.amenities),
    };

    if (editingId) {
      updateSpace.mutate(
        { id: editingId, input },
        { onSuccess: () => cancelEdit() },
      );
    } else {
      createSpace.mutate(input, { onSuccess: () => setForm(EMPTY_FORM) });
    }
  }

  const activeMutation = editingId ? updateSpace : createSpace;
  const spaces = spacesQuery.data?.data ?? [];

  return (
    <div>
      <h3>{editingId ? "Edit Space" : "Create Space"}</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="space-name">Name</label>
        <input
          id="space-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />

        <label htmlFor="space-type">Type</label>
        <select
          id="space-type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SpaceType }))}
          required
        >
          <option value="DESK">Desk</option>
          <option value="MEETING_ROOM">Meeting Room</option>
        </select>

        <label htmlFor="space-capacity">Capacity</label>
        <input
          id="space-capacity"
          type="number"
          min={1}
          step={1}
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          required
        />

        <label htmlFor="space-amenities">Amenities (comma-separated)</label>
        <input
          id="space-amenities"
          type="text"
          placeholder="wifi, projector"
          value={form.amenities}
          onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
        />

        {activeMutation.isError && (
          <p role="alert">Could not save this space. Please check the details and try again.</p>
        )}

        <button type="submit" disabled={activeMutation.isPending}>
          {activeMutation.isPending
            ? "Saving..."
            : editingId
              ? "Save Changes"
              : "Create Space"}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} disabled={activeMutation.isPending}>
            Cancel
          </button>
        )}
      </form>

      <h3>Spaces</h3>

      {spacesQuery.isLoading && <p role="status">Loading spaces...</p>}

      {spacesQuery.isError && (
        <div role="alert">
          <p>Could not load spaces. Please try again.</p>
          <button type="button" onClick={() => spacesQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {!spacesQuery.isLoading && !spacesQuery.isError && spaces.length === 0 && (
        <p>No spaces yet.</p>
      )}

      {!spacesQuery.isLoading && spaces.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Amenities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((space) => (
              <tr key={space.id}>
                <td>{space.name}</td>
                <td>{space.type === "DESK" ? "Desk" : "Meeting Room"}</td>
                <td>{space.capacity}</td>
                <td>{space.amenities.join(", ") || "—"}</td>
                <td>
                  <button type="button" onClick={() => startEdit(space)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deleteSpace.isPending}
                    onClick={() => deleteSpace.mutate(space.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Deleted Spaces</h3>

      {deletedSpacesQuery.isLoading && <p role="status">Loading deleted spaces...</p>}

      {deletedSpacesQuery.isError && (
        <div role="alert">
          <p>Could not load deleted spaces. Please try again.</p>
          <button type="button" onClick={() => deletedSpacesQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {!deletedSpacesQuery.isLoading &&
        !deletedSpacesQuery.isError &&
        (!deletedSpacesQuery.data || deletedSpacesQuery.data.length === 0) && (
          <p>No deleted spaces.</p>
        )}

      {!deletedSpacesQuery.isLoading &&
        deletedSpacesQuery.data &&
        deletedSpacesQuery.data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {deletedSpacesQuery.data.map((space) => (
                <tr key={space.id}>
                  <td>{space.name}</td>
                  <td>{space.type === "DESK" ? "Desk" : "Meeting Room"}</td>
                  <td>{space.capacity}</td>
                  <td>
                    <button
                      type="button"
                      disabled={restoreSpace.isPending}
                      onClick={() => restoreSpace.mutate(space.id)}
                    >
                      Restore
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

export default SpaceManager;
