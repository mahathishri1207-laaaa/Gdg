import { connect, serializeFirestoreData } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // SECURITY FIX: this endpoint previously returned every applicant's full
  // application (name, email, phone, registration number, and all free-text
  // question responses) to any caller -- authenticated or not, admin or not.
  // It is now gated behind a server-verified admin session.
  const authResult = await requireAdminSession();
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const db = await connect();
    const snapshot = await db.collection("formData").get();
    const applicants = snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));

    return NextResponse.json({ applicants });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return NextResponse.json(
      { error: "Failed to fetch applicants" },
      { status: 500 }
    );
  }
}
