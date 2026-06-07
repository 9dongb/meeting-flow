"use client";

export function clearClientAuthState() {
  // Auth is stored in an httpOnly cookie by the backend.
  // This hook remains as a small client-side extension point for future UI state.
  return undefined;
}
