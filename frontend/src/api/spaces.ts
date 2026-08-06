import { api, unwrapData } from "./axios";

export type SpaceType = "DESK" | "MEETING_ROOM";

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  amenities: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListSpacesParams {
  page?: number;
  limit?: number;
  type?: SpaceType;
  search?: string;
  minCapacity?: number;
  /** YYYY-MM-DD. When set, only spaces free of any active booking or
   * maintenance window on that day are returned. */
  date?: string;
}

export interface SpaceInput {
  name: string;
  type: SpaceType;
  capacity: number;
  amenities: string[];
}

export interface SpaceAvailability {
  bookings: Array<{ startTime: string; endTime: string }>;
  maintenance: Array<{ startTime: string; endTime: string }>;
}

function isSpaceListMeta(meta: unknown): meta is SpaceListMeta {
  return (
    typeof meta === "object" &&
    meta !== null &&
    typeof (meta as SpaceListMeta).total === "number" &&
    typeof (meta as SpaceListMeta).page === "number" &&
    typeof (meta as SpaceListMeta).limit === "number" &&
    typeof (meta as SpaceListMeta).totalPages === "number"
  );
}

function isSpace(item: unknown): item is Space {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as Space).id === "string" &&
    typeof (item as Space).name === "string" &&
    typeof (item as Space).capacity === "number" &&
    Array.isArray((item as Space).amenities)
  );
}

/**
 * A deeper guard than unwrapData: the paginated shape here has two nested
 * pieces (an array of items, a meta object) that unwrapData's single-level
 * "does `data` exist" check doesn't validate. Checking only Array.isArray on
 * the outer list would let a response with malformed items (e.g. `[null]`)
 * or a malformed meta (e.g. `{}`) pass through and blow up later, deep
 * inside SpaceCard/SpaceListPage instead of here with a clear error.
 */
export async function listSpacesRequest(params: ListSpacesParams) {
  const { data } = await api.get("/spaces", { params });
  if (
    !data ||
    !Array.isArray(data.data) ||
    !data.data.every(isSpace) ||
    !isSpaceListMeta(data.meta)
  ) {
    throw new Error("Unexpected response shape from server");
  }
  return data as { data: Space[]; meta: SpaceListMeta };
}

export async function getSpaceRequest(id: string) {
  const { data } = await api.get(`/spaces/${id}`);
  return unwrapData<Space>(data);
}

export async function getSpaceAvailabilityRequest(id: string, date: string) {
  const { data } = await api.get(`/spaces/${id}/availability`, { params: { date } });
  return unwrapData<SpaceAvailability>(data);
}

export async function createSpaceRequest(input: SpaceInput) {
  const { data } = await api.post("/spaces", input);
  return unwrapData<Space>(data);
}

export async function updateSpaceRequest(id: string, input: Partial<SpaceInput>) {
  const { data } = await api.put(`/spaces/${id}`, input);
  return unwrapData<Space>(data);
}

export async function deleteSpaceRequest(id: string) {
  await api.delete(`/spaces/${id}`);
}

export async function listDeletedSpacesRequest() {
  const { data } = await api.get("/spaces/deleted");
  return unwrapData<Space[]>(data);
}

export async function restoreSpaceRequest(id: string) {
  const { data } = await api.put(`/spaces/${id}/restore`);
  return unwrapData<Space>(data);
}
