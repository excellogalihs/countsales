<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep role-based navigation and UI capabilities in `src/lib/access.ts`/`nav.ts`, with independent database RLS and RPC enforcement; UI hiding is never authorization.
- Inventory-entry roles may create/edit inventory and receive purchases; destructive actions and supplier payment recording remain Admin-only to separate stock entry from financial control.
