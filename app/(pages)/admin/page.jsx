import React from "react";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import { connect, serializeFirestoreData } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth-helpers";
import AdminContent from "@/components/AdminContent";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // SECURITY FIX: this server component previously fetched every
  // applicant's full record unconditionally and passed it as a prop to
  // <AdminContent>, which only *hid the rendering* behind a client-side
  // `session.user.role === "admin"` check. Because the data was already
  // fetched server-side and embedded in the page's RSC payload, anyone
  // could view the raw applicant data by inspecting the network
  // response or disabling JS -- the client check never actually
  // protected the data, only the UI.
  //
  // The data is now only fetched after a server-verified admin session
  // check, so a non-admin visiting /admin never receives applicant data
  // at all.
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    redirect(authResult.status === 401 ? "/auth/signin" : "/");
  }

  const db = await connect();
  const snapshot = await db.collection("formData").get();
  const applicants = snapshot.docs.map((doc) => ({
    id: doc.id,
    _id: doc.id,
    ...serializeFirestoreData(doc.data()),
  }));

  return (
    <main>
      <NavBar />
      <AdminContent applicants={applicants} />
    </main>
  );
}
