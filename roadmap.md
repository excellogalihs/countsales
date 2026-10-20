# Current tasks
- [x] Persist store settings and apply them to receipts.
- [x] Add username login with master/Admin and kasir/Cashier accounts.
- [x] Enforce backend permissions and provide Admin user management.
- [x] Verify authenticated flows, permission denial and existing tests.

## Notes
- The first Admin is created from the login screen ("Penyiapan awal"); afterwards only
  an Admin can add users from **Pengaturan → Pengguna**.
- Passwords are stored as Supabase Auth hashes (never in the app tables).
- Access rules live in RLS policies (migration 0003) and in the guarded server
  functions under `src/api/`; the sidebar/route checks are only UX.