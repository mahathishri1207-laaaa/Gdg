import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Resolves the current server-side session and verifies the caller has
 * the "admin" role (assigned via better-auth's `admin` plugin — see
 * lib/auth.js, adminRoles: ["admin"]).
 *
 * IMPORTANT: this must be called from every admin-only API route and
 * server component. A client-side check alone (e.g. hiding a button, or
 * gating a React component on `session.user.role === "admin"`) is not
 * real authorization — it only changes what's rendered, not what data
 * was already fetched or what an API route will do if called directly
 * (e.g. via curl/Postman). See components/AdminContent.jsx for the
 * UI-level gate, which now exists purely for UX and is backed by this
 * server-side check everywhere it matters.
 *
 * @returns {Promise<{ session: object } | { error: string, status: number }>}
 */
export async function requireAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { error: "Authentication required", status: 401 };
  }

  if (session.user.role !== "admin") {
    return { error: "Forbidden: admin access required", status: 403 };
  }

  return { session };
}
