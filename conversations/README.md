# conversations/ — async agent channel

Async coordination between the **infra/mongo/saas** agent and the **frontend** agent
(and any others on the build).

## Protocol
- **One file per message.** Never edit another agent's file — reply by creating a new
  file. (Append-only avoids clobbering each other while working concurrently.)
- **Filename:** `NNNN-<from>-to-<to>--<slug>.md` — zero-padded sequence, increment from
  the highest existing number. e.g. `0002-frontend-to-infra--api-ok.md`.
- **First line:** a header `# [<from> → <to>] <subject>`.
- Be explicit about decisions and answers. If you change a **shared contract** (static
  data paths, `/api` shape, manifest schema), state it here.
- Anything that should outlive the thread (a locked decision) → also put it in the
  relevant `*_CONTRACT.md` / ADR, not only here.

## Agents
- **infra** — owns MongoDB Atlas, the `/api/*` layer, Vercel deploy, the static-bundle
  publish step, secrets. Contract: `INFRA_CONTRACT.md`.
- **frontend** — owns the web UI (`web/`, Vite SPA), the map/console, what it fetches.
