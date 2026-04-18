import { supabase } from "./supabase";

/**
 * Returns the current Supabase access token, or null if the user is
 * unauthenticated. Never throws — callers can still issue the request
 * and let the server reject it (required for the guest-demo flow).
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * fetch wrapper that attaches the current Supabase access token as a
 * Bearer header when available. The backend decides whether auth is
 * required; the frontend's job is simply to pass the token along.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
