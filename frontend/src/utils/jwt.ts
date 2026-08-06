interface DecodedAccessToken {
  userId: string;
  role: "MEMBER" | "ADMIN";
}

/**
 * Decodes the payload segment of a JWT without verifying its signature.
 * This is safe here because the result is only ever used for client-side
 * UI gating (which pages to show) -- every real authorization decision is
 * enforced server-side by requireAuth/requireRole regardless of what this
 * returns.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const decoded = JSON.parse(json);
    if (typeof decoded.userId === "string" && typeof decoded.role === "string") {
      return { userId: decoded.userId, role: decoded.role };
    }
    return null;
  } catch {
    return null;
  }
}
