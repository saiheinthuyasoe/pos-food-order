# Create index for firebase

## Index 1 (the one causing the error) — Admin Delivery page

Click the link from your error message directly:

## Indexes 2–4 — create these manually in Firebase Console → Firestore → Indexes → Composite → Add index:

| Collection    | Fields                    | Order     |
| ------------- | ------------------------- | --------- |
| orders        | customerId ↑, createdAt ↓ | ASC, DESC |
| notifications | userId ↑, createdAt ↓     | ASC, DESC |
| notifications | userId ↑, read ↑          | ASC, ASC  |
| notifications | userId ↑, read ↑          | ASC, ASC  |

Once created, indexes take 1–2 minutes to build (status changes from "Building" to "Enabled"). After that all four query errors will be gone.
