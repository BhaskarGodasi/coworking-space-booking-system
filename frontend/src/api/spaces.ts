import { api, unwrapData } from "./axios";

export type SpaceType = "DESK" | "MEETING_ROOM";

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  amenities: string[];
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
}

export interface SpaceAvailability {
  bookings: Array<{ startTime: string; endTime: string }>;
  maintenance: Array<{ startTime: string; endTime: string }>;
}

export async function listSpacesRequest(params: ListSpacesParams) {
  const { data } = await api.get("/spaces", { params });
  if (!data || !Array.isArray(data.data) || typeof data.meta !== "object" || data.meta === null) {
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
