<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Compliance status math (green/yellow/red, safety score) lives only in `src/lib/compliance.ts` and is covered by `src/test/compliance.test.ts`; UI never recomputes thresholds inline.
- Every company-scoped table is protected by RLS via `public.owns_company(company_id)`; storage paths start with `<company_id>/` so storage policies can reuse the same ownership check.
- Checklist rows are created by DB triggers when a driver/vehicle is inserted; the client only updates documents, never inserts them.
- Driver magic links are handled by public server functions in `src/lib/magic-link.functions.ts` that resolve the driver by `magic_token` and use the admin client only after that lookup.
- Signed-in app pages live under `src/routes/_authenticated/_shell/` (sidebar + company context); the active company id is kept in localStorage via `CompanyProvider`.
