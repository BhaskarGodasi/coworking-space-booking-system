import { api, unwrapData } from "./axios";
import { AuthUser } from "../store/authStore";

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerRequest(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return unwrapData<{ user: AuthUser }>(data).user;
}

export async function loginRequest(payload: LoginPayload) {
  const { data } = await api.post("/auth/login", payload);
  return unwrapData<{ accessToken: string; user: AuthUser }>(data);
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}
