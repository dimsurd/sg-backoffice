import createClient, { type Middleware } from "openapi-fetch";
import type { components, paths } from "./schema";

/**
 * Typed client generated from sg-api's openapi.yaml (`pnpm gen:api`).
 * Requests go to /api/* on this origin and are proxied to Express.
 */
export const api = createClient<paths>({
  baseUrl: "/api",
  credentials: "include",
  headers: { "X-SG-Client": "backoffice" },
});

export type Schemas = components["schemas"];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// An expired/invalid session anywhere sends the admin back to the login page.
const sessionGuard: Middleware = {
  async onResponse({ response, request }) {
    if (response.status === 401 && !request.url.includes("/auth/")) {
      await fetch("/api/auth/logout", { method: "POST", headers: { "X-SG-Client": "backoffice" } });
      // Full reload on purpose: drops cached data from the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    return response;
  },
};
api.use(sessionGuard);

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result: returns data or throws ApiError with the API's message. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await promise;
  } catch {
    // fetch() rejects on network failure; show words, not "Failed to fetch".
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const { data, error, response } = result;
  if (error !== undefined || !response.ok) {
    const e = (error as { error?: { message?: string; details?: unknown } } | undefined)?.error;
    throw new ApiError(response.status, e?.message ?? "Something went wrong", e?.details);
  }
  return data as T;
}
