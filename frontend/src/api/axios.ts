import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_URL ?? "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// A separate, non-intercepted instance for the refresh call itself. If the
// refresh call used `api` (with this same response interceptor attached),
// a 401 on /auth/refresh would recurse back into this interceptor -- and
// since `isRefreshing` is already true at that point, it would queue
// itself rather than surfacing as a rejection, leaving both the refresh
// call and every request queued behind it pending forever.
export const refreshClient = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function settleQueue(token: string | null, error?: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  pendingQueue = [];
}

/**
 * Every endpoint's success response is documented (Implementation Design
 * v1.1) as { success: true, data: ... }. This guards the unwrap instead of
 * letting a malformed/envelope-less body (a misconfigured proxy, an
 * unexpected empty response) throw an opaque "Cannot destructure property
 * of undefined" deep inside a component with no useful message.
 */
export function unwrapData<T>(body: unknown): T {
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    (body as { data: unknown }).data === undefined
  ) {
    throw new Error("Unexpected response shape from server");
  }
  return (body as { data: T }).data;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh");
      const { accessToken: newAccessToken } = unwrapData<{ accessToken: string }>(data);
      useAuthStore.getState().setAccessToken(newAccessToken);
      settleQueue(newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      settleQueue(null, refreshError);
      useAuthStore.getState().logout();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
