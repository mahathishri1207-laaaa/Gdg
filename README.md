# Recruitment Portal — Round 2 Improvements

## 1. Project Overview

This project is a full-stack recruitment portal built using Next.js, React, Better Auth, Firebase Firestore, and Tailwind CSS.

The application provides two main user flows:

### Applicant

* Sign in
* Select up to two departments
* Fill in common and department-specific questions
* Submit applications
* View application/submission status

### Administrator

* Access the admin dashboard
* View applicant applications
* Filter and sort applicants
* Select applicants
* View complete applicant responses
* Shortlist/unshortlist applicants
* Export applicant data
* Send emails to selected applicants

---

# 2. Technology Stack

* Next.js 14
* React 18
* Better Auth
* Firebase Firestore
* Firebase Admin SDK
* Tailwind CSS
* React Table
* React Hook Form
* Zod
* Nodemailer
* Radix UI

---

# 3. Original Application Flow

The original application followed this architecture:

```text
Applicant
    ↓
React Application Form
    ↓
Next.js API Route
    ↓
Firebase Admin SDK
    ↓
Firestore
    ↓
Admin Dashboard
    ↓
Response Viewer / Shortlist
```

The main data collection used for applications is:

```text
formData
```

Each application contains applicant information, department information, questionnaire responses, preference information, and shortlist status.

---

# 4. Main Problems Identified

During review of the original project, the following issues were identified:

1. Applicant identification depended on array indexes.
2. The response viewer maintained a separate shortlist state.
3. React Table relied on positional row identification.
4. Application submission used a check-then-write pattern.
5. Application documents used random Firestore IDs.
6. Department selection order could be lost.
7. Department preference was not populated correctly.
8. Admin APIs did not consistently enforce server-side authorization.
9. The admin page fetched applicant data before performing the client-side role check.
10. Firestore rules allowed unrestricted direct access.
11. The DataTable maintained multiple redundant copies of applicant data.
12. Filter reset caused a complete page reload.
13. Several unnecessary CPU-heavy calculations existed in React components.
14. The email API lacked sufficient validation and authorization.
15. Some unused/dead files were present in the project.

The changes below address these problems while preserving the original Next.js and Firestore architecture.

---

# 5. Response Identification Fix

## Problem

The original response viewer identified applicants using their array position.

Example:

```text
Index 0 → Applicant A
Index 1 → Applicant B
Index 2 → Applicant C
```

The shortlist handler used:

```js
handleShortlist(index)
```

and then:

```js
selectedApplicants()[index]
```

This is unreliable because array indexes can change when data is:

* sorted
* filtered
* paginated
* reordered

For example:

```text
Before sorting:

0 → A
1 → B
2 → C
```

After sorting:

```text
0 → C
1 → A
2 → B
```

The same index no longer necessarily represents the same applicant.

---

## Fix

Applicant operations now use the stable Firestore document ID:

```js
onShortlistChange(data._id, data.shortlisted)
```

The ID is passed through the application instead of the array position.

The new flow is:

```text
Applicant
   ↓
Firestore document ID (_id)
   ↓
Response Viewer
   ↓
Shortlist Handler
   ↓
/api/shortlist/[id]
   ↓
Exact Firestore document
```

This ensures that the operation always targets the correct applicant regardless of the applicant's current position in the UI.

---

# 6. Shortlist State Synchronization

## Original Problem

`DialogComp` maintained its own:

```js
shortlistStatus
```

while the main table maintained applicant data separately.

This created two sources of truth.

The two states could potentially become inconsistent.

## Fix

The separate shortlist state was removed from `DialogComp`.

The parent DataTable now owns the applicant state.

The response viewer receives:

```js
selectedApplicants
onShortlistChange
```

and updates the parent's applicant state using the applicant's stable `_id`.

Therefore:

```text
DataTable applicant state
        ↓
Selected applicants
        ↓
Response dialog
        ↓
Carousel
        ↓
Shortlist by _id
        ↓
DataTable applicant state
```

Both the table and response viewer now use the same source of truth.

---

# 7. React Table Stable Row Identification

The DataTable now explicitly defines:

```js
getRowId: (row) => row._id
```

This prevents React Table from relying on numeric row positions.

Applicant rows are now identified by:

```text
Firestore document ID
```

instead of:

```text
0, 1, 2, 3...
```

This is particularly important because the table supports filtering, sorting, pagination, checkbox selection, and shortlist updates.

---

# 8. Preserving Row Selection

The DataTable also uses:

```js
autoResetSelectedRows: false
```

Previously, updating the table data could cause the current checkbox selection to reset.

For example:

```text
☑ Applicant A
☑ Applicant B
☑ Applicant C
```

After updating one applicant's shortlist status, the selection could be lost.

Stable row IDs combined with disabled automatic selection reset allow the current selection to remain associated with the correct applicants.

---

# 9. Response Storage Race-Condition Fix

## Original Problem

The original submission logic followed a check-then-write pattern:

```text
Check existing applications
        ↓
Check application limit
        ↓
Create Firestore document
```

The check and write were separate operations.

The frontend can submit multiple department requests concurrently using:

```js
Promise.allSettled(...)
```

Rapid repeated requests could therefore cause multiple requests to perform the validation before their writes were completed.

This could result in inconsistent application storage.

---

# 10. Firestore Transaction

The submission process now uses:

```js
await db.runTransaction(async (transaction) => {
    ...
});
```

The transaction performs the relevant database operations together:

```text
Read existing applications
        ↓
Validate
        ↓
Check duplicate application
        ↓
Check maximum application count
        ↓
Write application
```

The response is no longer handled as an independent check followed by an unrelated write.

The transaction provides atomic handling of the database operation and allows Firestore to retry the transaction when a conflicting transaction is detected.

---

# 11. Deterministic Application ID

The original code used:

```js
collection.doc()
```

which generated a random document ID for every submission.

The improved implementation creates an application ID using:

```text
Email + Department
```

and SHA-256 hashing:

```js
const applicationId = crypto
    .createHash("sha256")
    .update(`${normalizedEmail}::${normalizedDepartment}`)
    .digest("hex");
```

The Firestore document is then created using:

```js
const newDocRef = collection.doc(applicationId);
```

This gives each logical user/department application a deterministic identity.

For the same normalized email and department, the same application ID is generated.

This complements the Firestore transaction by providing a stable identity for the application itself.

---

# 12. Normalization of Email and Department

Before creating the application ID, the values are normalized:

```js
const normalizedEmail = userEmail.trim().toLowerCase();
const normalizedDepartment = Department.trim();
```

This prevents simple formatting differences from producing different application identities.

For example:

```text
USER@example.com
user@example.com
 user@example.com
```

are normalized before being used for application identification.

---

# 13. Department Preference Fix

The original join-page logic could resolve departments according to their order in the configured department list instead of the order selected by the applicant.

The improved implementation passes:

```jsx
dept1={resolvedDepartment1}
dept2={resolvedDepartment2}
```

This preserves the applicant's actual department selection order.

Example:

```text
Applicant selects:

1st → AI/ML
2nd → Web Development
```

The form now receives the departments in that same order.

---

# 14. Preference (`Pref`) Fix

The admin table and CSV export expected a preference value, but the submission flow did not previously populate it correctly.

The form now calculates:

```js
const preference =
    departmentNames.indexOf(department) === 0
        ? "1st"
        : "2nd";
```

and sends:

```js
Pref: preference
```

Therefore the stored application now contains the correct preference.

Example:

```text
AI/ML
Pref = "1st"

Web Development
Pref = "2nd"
```

---

# 15. DataTable State Management Improvement

## Original

The DataTable maintained multiple copies of filtered data:

```text
tableData
deptFiltered
shortFiltered
```

It also used a manually implemented array intersection function.

This created unnecessary synchronization between multiple states.

## Improved

The DataTable now maintains:

```js
const [applicants, setApplicants] = useState(data);
const [deptFilter, setDeptFilter] = useState(null);
const [shortFilter, setShortFilter] = useState(null);
```

The displayed table is derived using:

```js
const tableData = useMemo(() => {
    return applicants.filter(...);
}, [applicants, deptFilter, shortFilter]);
```

The architecture is therefore:

```text
Applicant data
      +
Filter values
      ↓
Derived table data
```

This provides a single source of truth and reduces redundant state.

---

# 16. Filter Reset Improvement

The original reset operation used:

```js
window.location.reload()
```

This caused the entire page to reload simply to clear the filters.

The improved implementation resets the React state directly:

```js
setDeptFilter(null);
setShortFilter(null);
setGlobalFilter(undefined);
```

This avoids:

* unnecessary page reloads
* unnecessary network requests
* loss of current client-side state

---

# 17. Performance Cleanup in DataTable

The original DataTable contained unnecessary processing such as:

* nested array comparisons
* artificial checksum calculations
* unnecessary telemetry state
* unnecessary processing effects

These were removed.

The table now derives the displayed data directly from the source applicant list and active filters.

---

# 18. Removal of Unnecessary Form Processing

The original `FormComp` contained an unnecessary loop of approximately 200,000 iterations for an artificial validation/entropy calculation.

This processing was not required for form validation or application functionality.

It was removed so that form rendering no longer performs unnecessary CPU work.

Actual form validation continues to use:

```text
React Hook Form
+
Zod
```

---

# 19. Removal of Unnecessary Admin Processing

The original `AdminContent` contained an unnecessary 80,000-iteration permission-signature calculation.

This did not provide actual security.

It was removed.

Actual authorization is now performed through server-side authentication and role checks.

---

# 20. Admin API Security

The original admin applicant endpoint did not verify whether the caller was an administrator.

The following reusable helper was added:

```text
lib/auth-helpers.js
```

which provides:

```js
requireAdminSession()
```

Admin APIs now verify the session before performing sensitive operations.

---

# 21. Protected Applicant API

The endpoint:

```text
GET /api/admin/applicants
```

is now protected by:

```js
requireAdminSession()
```

The server verifies:

```text
Is the user authenticated?
        ↓
Is the user an admin?
        ↓
Allow access
```

Unauthorized users receive an appropriate error response instead of applicant data.

---

# 22. Protected Shortlist API

The endpoint:

```text
PATCH /api/shortlist/[id]
```

is now restricted to administrators.

The API also validates:

```js
typeof body.shortlisted === "boolean"
```

before updating Firestore.

The endpoint checks that the applicant document exists before attempting the update.

This prevents malformed requests and updates to non-existent applicants.

---

# 23. Protected Email API

The endpoint:

```text
POST /api/send-email
```

previously lacked proper authorization.

It now requires an administrator session.

Basic validation was also added for:

* recipients
* email subject
* email body

This prevents unauthorized users from using the application's email server functionality.

---

# 24. Admin Page Server-Side Protection

The original admin page fetched applicant data before the client-side role check.

The improved page checks authorization on the server first:

```js
const authResult = await requireAdminSession();
```

Only after the user is confirmed as an administrator does the application fetch the applicant collection.

The new flow is:

```text
Request /admin
      ↓
Server-side admin verification
      ↓
Not admin → redirect
      ↓
Admin
      ↓
Fetch applicant data
      ↓
Render dashboard
```

This protects the data itself rather than only hiding the admin interface.

---

# 25. Firestore Security Rules

The original Firestore rules allowed unrestricted access:

```js
allow read, write: if true;
```

The rules were changed to:

```js
allow read, write: if false;
```

The application uses the Firebase Admin SDK on the Next.js server.

Therefore the intended architecture is:

```text
Browser
   ↓
Next.js server/API
   ↓
Firebase Admin SDK
   ↓
Firestore
```

There is no legitimate browser-side Firestore access path in the current implementation.

The restrictive rules therefore prevent direct client access while server-side Admin SDK operations continue to function.

---

# 26. Email Error Handling

The email generation code was made more defensive.

Instead of assuming a department always exists:

```js
dept.name
```

the code now safely handles a missing department:

```js
dept?.name ?? depart ?? "your department"
```

Applicant names are also safely handled:

```js
recipient.Name ?? ""
```

This prevents malformed applicant records from unnecessarily crashing the email operation.

---

# 27. Cleanup of Unused Files

The following unused/dead files were removed:

```text
lib/actions/data.action.js
lib/actions/form.action.js
lib/actions/user.action.js
lib/modals/form.modal.ts
lib/modals/user.modal.js
```

Removing unused code reduces project complexity and makes the active application architecture easier to understand.

---

# 28. Final Architecture After Changes

The improved architecture is:

```text
                         APPLICANT

                     ┌──────────────┐
                     │    User      │
                     └──────┬───────┘
                            ↓
                     React Form
                            ↓
                  POST /api/submit-form
                            ↓
                 Authentication Check
                            ↓
                  Validate Submission
                            ↓
              Deterministic Application ID
                            ↓
                    Firestore Transaction
                            ↓
                      Firestore
                       formData


                         ADMIN

                     ┌──────────────┐
                     │    Admin     │
                     └──────┬───────┘
                            ↓
                       /admin
                            ↓
                 Server-side Auth Check
                            ↓
                       DataTable
                            ↓
                 Stable Firestore _id
                    ↙              ↘
           View Responses       Shortlist
                 ↓                   ↓
             Carousel        /api/shortlist/[id]
                 ↓                   ↓
                 └─────────┬─────────┘
                           ↓
                       Firestore
```

---

# 29. Before vs After

| Area                     | Before                     | After                           |
| ------------------------ | -------------------------- | ------------------------------- |
| Applicant identification | Array index                | Stable Firestore `_id`          |
| Carousel shortlist       | Index based                | `_id` based                     |
| Table row identity       | Positional                 | `_id`                           |
| Shortlist state          | Multiple states            | Single source of truth          |
| Submission               | Check then write           | Firestore transaction           |
| Application ID           | Random                     | Deterministic                   |
| Department order         | Could be reordered         | User-selected order             |
| Preference               | Not populated correctly    | `1st` / `2nd`                   |
| Admin API                | Not consistently protected | Server-side admin auth          |
| `/admin` data access     | Client-side role check     | Server-side role check          |
| Firestore rules          | Public read/write          | Direct access denied            |
| DataTable state          | Multiple copies            | Source + filters + derived data |
| Filter reset             | Full page reload           | React state reset               |
| Form CPU work            | Unnecessary 200k loop      | Removed                         |
| Admin CPU work           | Unnecessary 80k loop       | Removed                         |
| Dead code                | Present                    | Removed                         |

---

# 30. Important Technical Concepts Learned

The main concepts behind these changes are:

### Stable Identity

An array index is a position, not an identity.

A database document ID is a stable identity.

```text
Index → position
_id   → identity
```

### Atomicity

A transaction groups related database operations so that the validation and write are handled consistently.

```text
Read → Check → Write
```

### Authentication vs Authorization

Authentication answers:

```text
Who are you?
```

Authorization answers:

```text
Are you allowed to perform this action?
```

The admin APIs require both.

### Source of Truth

Applicant data should exist in one authoritative state instead of multiple independently maintained copies.

### Server-Side Security

Hiding a component in React is not security.

Sensitive operations must be protected on the server.

---

# 31. Testing Performed / Recommended

The important scenarios for this version are:

### Response identification

* Sort applicants.
* Filter applicants.
* Select applicants.
* Open the response viewer.
* Move through the carousel.
* Shortlist one applicant.
* Verify that the exact applicant is updated.

### Submission

* Submit one department.
* Submit a second department.
* Try submitting the same department again.
* Send concurrent submissions.
* Verify the correct number of Firestore documents.

### Authorization

* Access `/admin` while logged out.
* Access `/admin` as a normal user.
* Call admin APIs without authentication.
* Call admin APIs as a normal user.
* Confirm access is denied.

### Data consistency

* Verify department order.
* Verify `Pref` is `1st` or `2nd`.
* Verify response questions and answers.
* Verify shortlist status in both table and response viewer.

---

# 32. Main Improvement Summary

The project was improved without replacing its original architecture.

The most important improvements are:

```text
1. Stable applicant identification
          ↓
   Firestore _id instead of array index

2. Reliable response storage
          ↓
   Firestore transaction

3. Stable application identity
          ↓
   Deterministic email + department ID

4. Consistent UI state
          ↓
   Single applicant source of truth

5. Secure admin operations
          ↓
   Server-side authentication + authorization

6. Protected database
          ↓
   Firestore direct client access denied

7. Correct application metadata
          ↓
   Department order + preference

8. Cleaner React state
          ↓
   Derived filtering with useMemo
```

The project therefore focuses on improving **correctness, response identification, response storage, data consistency, security, and maintainability** while retaining the existing Next.js + Firestore architecture.
