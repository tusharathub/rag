import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api";

const API_BASE = getApiBaseUrl();

export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch (err) {
        console.warn("Could not retrieve Clerk JWT token:", err);
      }

      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const requestUrl = url.startsWith("http") ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;

      return fetch(requestUrl, {
        ...options,
        headers,
      });
    },
    [getToken]
  );

  return authFetch;
}
