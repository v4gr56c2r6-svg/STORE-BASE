# Firestore setup before using real inventory

The inventory screen reads and writes documents under:

`users/{authenticatedUserId}/products/{productId}`

Each product document contains:

- `name`: string, required, up to 80 characters
- `sku`: string, optional, up to 40 characters
- `quantity`: integer from 0 through 999,999
- `createdAt` and `updatedAt`: Firestore timestamps

## Proposed Firestore rules

`firestore.rules` contains the rules proposed with this PR. They allow a signed-in user to read and create products only under their own `users/{uid}/products` path. Updates are limited to the quantity and update timestamp; deletion and every other document path remain denied. Product fields, lengths, timestamps, and the quantity range are checked.

The active rules in Firebase Console have not been changed or verified. This file is source code only; it does not deploy rules to the Firebase project. Before entering real product or inventory information, an administrator must review the proposal and apply it in Firebase Console. If reads are denied, the inventory form stays disabled. If writes are denied, the page shows an error and the failed change is not treated as saved.
