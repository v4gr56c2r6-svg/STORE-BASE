# Firestore setup before using real inventory

The inventory screen reads and writes documents under:

`users/{authenticatedUserId}/products/{productId}`

Each product document contains:

- `name`: string, required, up to 80 characters
- `sku`: string, optional, up to 40 characters
- `quantity`: integer from 0 through 999,999
- `createdAt` and `updatedAt`: Firestore timestamps

## Access rules still need review

This repository does not include a Firestore rules file, so the effective rules in the Firebase project could not be verified from the source. The client scopes every query to the signed-in user's UID, but client-side scoping is not an access-control boundary by itself.

Before entering real product or inventory information, an administrator must confirm in Firebase Console that:

- Requests must be authenticated.
- A signed-in user can read or write only the `users/{uid}` path matching their own UID.
- Product fields and types are validated, including nonnegative integer quantities.
- Access to all other users' paths and unknown fields is denied.

No Firebase security rules are changed by this project update. If reads are denied, the inventory form stays disabled. If writes are denied, the page shows an error and the failed change is not treated as saved.
