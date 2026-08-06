import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { refreshClient } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { useSessionRestore } from "./useSessionRestore";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return {
    ...actual,
    refreshClient: { post: vi.fn() },
  };
});

function makeAccessToken(userId: string, role: "MEMBER" | "ADMIN") {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ userId, role }));
  return `${header}.${payload}.signature`;
}

describe("useSessionRestore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isRestoring: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anonymous visitor: no refresh cookie leaves the user logged out without navigating away", async () => {
    const originalHref = window.location.href;
    const postMock = refreshClient.post as unknown as ReturnType<typeof vi.fn>;
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { success: false, error: { code: "UNAUTHORIZED" } } },
    });

    renderHook(() => useSessionRestore());

    await waitFor(() => {
      expect(useAuthStore.getState().isRestoring).toBe(false);
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(postMock).toHaveBeenCalledWith("/auth/refresh");
    // Restoration must call refreshClient (no interceptors) directly, never
    // the intercepted `api` instance -- otherwise a 401 here would trigger
    // api's response interceptor and its unconditional redirect to /login,
    // which is exactly the regression this fix resolves. A single call to
    // refreshClient.post, with no window navigation, proves that path was
    // never taken.
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(originalHref);
  });

  it("expired refresh cookie: a 401 from refresh leaves the store logged out, not stuck restoring", async () => {
    const postMock = refreshClient.post as unknown as ReturnType<typeof vi.fn>;
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { success: false, error: { code: "UNAUTHORIZED" } } },
    });

    renderHook(() => useSessionRestore());

    await waitFor(() => {
      expect(useAuthStore.getState().isRestoring).toBe(false);
    });

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("valid refresh cookie: restores the session by decoding the returned access token", async () => {
    const token = makeAccessToken("user-123", "MEMBER");
    const postMock = refreshClient.post as unknown as ReturnType<typeof vi.fn>;
    postMock.mockResolvedValueOnce({
      data: { success: true, data: { accessToken: token } },
    });

    renderHook(() => useSessionRestore());

    await waitFor(() => {
      expect(useAuthStore.getState().isRestoring).toBe(false);
    });

    expect(useAuthStore.getState().accessToken).toBe(token);
    expect(useAuthStore.getState().user).toEqual({ id: "user-123", role: "MEMBER" });
  });

  it("authenticated page reload: a fresh mount with a still-valid cookie repopulates user and token", async () => {
    const token = makeAccessToken("user-456", "ADMIN");
    const postMock = refreshClient.post as unknown as ReturnType<typeof vi.fn>;
    postMock.mockResolvedValueOnce({
      data: { success: true, data: { accessToken: token } },
    });

    useAuthStore.setState({ user: null, accessToken: null, isRestoring: true });

    renderHook(() => useSessionRestore());

    await waitFor(() => {
      expect(useAuthStore.getState().isRestoring).toBe(false);
    });

    expect(useAuthStore.getState().user?.role).toBe("ADMIN");
    expect(useAuthStore.getState().accessToken).toBe(token);
  });
});
