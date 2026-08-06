import { api, unwrapData } from "./axios";
import { Booking, BookingStatus } from "./bookings";

export interface Maintenance {
  id: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenancePayload {
  spaceId: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export async function listAllBookingsRequest(status?: BookingStatus) {
  const { data } = await api.get("/bookings", { params: status ? { status } : {} });
  return unwrapData<Booking[]>(data);
}

export async function approveBookingRequest(id: string) {
  const { data } = await api.put(`/bookings/${id}/approve`);
  return unwrapData<Booking>(data);
}

export async function rejectBookingRequest(id: string) {
  const { data } = await api.put(`/bookings/${id}/reject`);
  return unwrapData<Booking>(data);
}

export async function listMaintenanceRequest(spaceId?: string) {
  const { data } = await api.get("/maintenance", { params: spaceId ? { spaceId } : {} });
  return unwrapData<Maintenance[]>(data);
}

export async function createMaintenanceRequest(payload: CreateMaintenancePayload) {
  const { data } = await api.post("/maintenance", payload);
  return unwrapData<Maintenance>(data);
}

export async function deleteMaintenanceRequest(id: string) {
  await api.delete(`/maintenance/${id}`);
}
