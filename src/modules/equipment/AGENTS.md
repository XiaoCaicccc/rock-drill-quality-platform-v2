# Equipment Module Rules

## Always

- Keep Equipment and flat EquipmentPosition in this one module, with UUID identity separate from generated `EQ-` numbers.
- Use the existing Numbering public API and transaction-bound Audit recorder.
- Lock Equipment before Position for create/reactivation; never add hard delete or position moves.

## Never

- Expose Prisma types, transaction clients, raw SQL helpers, hierarchy, Installation, history, Batch, PartInstance, Revision, QR or cross-organization access from the public API.
