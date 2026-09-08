import { NextResponse } from 'next/server';
import { connect, serializeFirestoreData } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth-helpers';

export async function PATCH(req, { params }) {
    // SECURITY FIX: this endpoint previously allowed *anyone* -- no session,
    // no role check -- to shortlist/unshortlist any applicant by guessing or
    // scraping a Firestore document id (which was itself exposed by the
    // unauthenticated GET /api/admin/applicants). Now requires an admin
    // session, matching how the rest of the admin surface is protected.
    const authResult = await requireAdminSession();
    if ('error' in authResult) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { id } = params;
    const body = await req.json().catch(() => null);

    // INPUT VALIDATION FIX: previously any value sent for `shortlisted`
    // (a string, an object, undefined) was written straight to Firestore
    // with no type check, which could silently corrupt the field used
    // everywhere else (DataTable filters/sorts on it with `String(...)`
    // and `item.shortlisted` truthiness checks).
    if (!body || typeof body.shortlisted !== 'boolean') {
        return NextResponse.json(
            { success: false, message: '"shortlisted" must be a boolean' },
            { status: 400 }
        );
    }
    const { shortlisted } = body;

    try {
        const db = await connect();
        const docRef = db.collection('formData').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) {
            return NextResponse.json({ success: false, message: 'Applicant not found' }, { status: 404 });
        }

        await docRef.update({ shortlisted });
        const snapshot = await docRef.get();

        const applicant = {
            id: snapshot.id,
            _id: snapshot.id,
            ...serializeFirestoreData(snapshot.data()),
        };

        return NextResponse.json({ success: true, data: applicant });
    } catch (error) {
        console.error('Error updating applicant:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
}
