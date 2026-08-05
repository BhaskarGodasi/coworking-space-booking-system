import { api } from "./axios";
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
  return data.data.user as AuthUser;
}

export async function loginRequest(payload: LoginPayload) {
  const { data } = await api.post("/auth/login", payload);
  return data.data as { accessToken: string; user: AuthUser };
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}
