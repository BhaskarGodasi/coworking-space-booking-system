import { api, unwrapData } from "./axios";

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  spaceId: string;
  startTime: string;
  endTime: string;
}

export async function createBookingRequest(payload: CreateBookingPayload) {
  const { data } = await api.post("/bookings", payload);
  return unwrapData<Booking>(data);
}

export async function listOwnBookingsRequest() {
  const { data } = await api.get("/bookings/me");
  return unwrapData<Booking[]>(data);
}

export async function cancelBookingRequest(id: string) {
  const { data } = await api.put(`/bookings/${id}/cancel`);
  return unwrapData<Booking>(data);
}
