# Firestore setup before using real inventory

The inventory screen reads and writes documents under:

`users/{authenticatedUserId}/products/{productId}`

Each product document contains:

- `name`: string, required, up to 80 characters
- `sku`: string, optional, up to 40 characters
- `quantity`: integer from 0 through 999,999
- `createdAt` and `updatedAt`: Firestore timestamps

## Proposed Firestore rules

`firestore.rules` contains the proposed rules. A signed-in user can read, create, update, and delete products only under their own `users/{uid}/products` path. Updates may change the product name, SKU, quantity, and update timestamp; the creation timestamp stays fixed. Product fields, lengths, timestamps, and the quantity range are checked. Deleting a product is permanent, and the app asks for confirmation first.

The previously published Firebase Console rules allow inventory reads and stock-count changes. This file's new edit and delete permissions are source code only; they do not change the Firebase project until an administrator reviews and publishes the updated rules in Firebase Console. If an edit or delete is denied before then, the page shows an error and does not treat the change as saved.
