import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";


export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return new Response(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const deadline = new Date("2026-08-23T23:59:59+05:30");
    if (new Date() > deadline)
      return new Response(
        JSON.stringify({
          message: "The submission deadline has passed"
        }),
        { status: 403 }
      );


    const db = await connect();
    const data = await req.json();

    const { Department, Questions, ...formFields } = data;

    if (!Department || typeof Department !== "string") {
      return new Response(
        JSON.stringify({ message: "Department is required" }),
        { status: 400 }
      );
    }

    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
    if (formFields.RegistrationNumber && !regNoRegex.test(formFields.RegistrationNumber)) {
      return new Response(
        JSON.stringify({
          message: "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
        }),
        { status: 400 }
      );
    }

    const collection = db.collection("formData");

    // --- HIDDEN BUG FIX: response-storage race condition -----------------
    //
    // BUG: the previous implementation read the user's existing submissions
    // ("SELECT ... WHERE Email = ?"), decided in application code whether a
    // new submission was allowed, and then performed a *separate* `add()`
    // write -- classic check-then-act with no atomicity between the two.
    //
    // ROOT CAUSE: the frontend (components/FormComp.jsx `handleSubmit`)
    // fires one POST per department concurrently via `Promise.allSettled`,
    // and users can also double-click submit or have a flaky connection
    // trigger a client-side retry. Any two POSTs for the same
    // user (e.g. two rapid submissions for the *same* department caused by
    // a double click/retry) can both read "0 existing submissions for this
    // department" before either write has committed, so both checks pass
    // and both `add()` calls succeed -- producing duplicate application
    // documents for one department, or letting a user exceed the 2-department
    // cap, silently corrupting response storage and making "how many/which
    // applications did this person submit" unanswerable from the data.
    //
    // FIX: wrap the read-check-write sequence in a Firestore transaction.
    // Firestore transactions are serializable: if another transaction
    // commits a new document matching the same `where("Email", ...)` query
    // while this one is still running, Firestore detects the conflict and
    // retries this transaction automatically, so the re-run always sees
    // the up-to-date submission count/department list before deciding
    // whether to write. This makes "at most 2 applications, at most 1 per
    // department" an atomic guarantee instead of a best-effort check.
    //
    // TEST: fire two concurrent POST /api/submit-form requests for the same
    // authenticated user and the same Department (simulating a double
    // click) -- exactly one should succeed with 200 and the other should
    // receive the 400 "already submitted" response; `formData` should end
    // up with exactly one document for that Email+Department pair. Repeat
    // with two different departments to confirm both legitimate
    // submissions still succeed concurrently.
    const normalizedEmail = userEmail.trim().toLowerCase();
    const normalizedDepartment = Department.trim();

    const applicationId = crypto
     .createHash("sha256")
     .update(`${normalizedEmail}::${normalizedDepartment}`)
     .digest("hex");

    const newDocRef = collection.doc(applicationId);

    try {
      await db.runTransaction(async (transaction) => {
      const existingSubmissions = await transaction.get(
        collection.where("Email", "==", normalizedEmail)
    );

    const existingApplication = await transaction.get(newDocRef);

    if (existingApplication.exists) {
        throw new SubmissionError(
            400,
            `You have already submitted an application for ${normalizedDepartment}`
        );
    }

    if (existingSubmissions.size >= 2) {
        throw new SubmissionError(
            400,
            "Remember that you can only submit upto 2 unique applications"
        );
    }

    transaction.set(newDocRef, {
        ...formFields,
        Department: normalizedDepartment,
        Questions,
        Email: normalizedEmail,
        createdAt: new Date(),
    });
    });
    } catch (error) {
      if (error instanceof SubmissionError) {
        return new Response(
          JSON.stringify({ message: error.message }),
          { status: error.status }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({
        message: "Form submitted successfully!",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Form submission error:", error);
    return new Response(JSON.stringify({ message: "Error submitting form" }), {
      status: 500,
    });
  }
}

class SubmissionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
