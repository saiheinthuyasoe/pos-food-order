# Step 1 — Create the Firebase Auth user

Go to Firebase Console → your project → Authentication → Users → Add user. Enter the staff email and password.

# Step 2 — Add them to the admins Firestore collection

- Go to Firestore Database → Start collection → Collection ID: admins

Create a document with:

Document ID: paste the UID from Step 1
Add these fields:
| Field | Type | Value |
|-------|------|-------|
| uid | string | `<same UID>` |
| name | string | John Smith |
| email | string | john@restaurant.com |
| phone | string | +1 234 567 8900 |
| role | string | super_admin |
| active | boolean | true |
| createdAt | timestamp | (now) |

Valid roles are: super_admin, kitchen, delivery

# Step 3 — Test login

Go to /admin/login and sign in with that email and password. The [loginAdmin](src/lib/auth.ts) function checks that a matching document exists in the admins collection — if it does, access is granted; if not, it signs the user out and shows "Access Denied".

Later in Phase 3 (Staff Management page), admins with the super_admin role will be able to create new staff accounts directly from the UI — so you only need to do this manual setup once for the first admin.