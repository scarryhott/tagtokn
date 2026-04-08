# NFC integration checklist

Items that are **partially done**, **API-only**, or **not wired** between the React app, Express API, SQLite graph/NFT engine, and external systems.

---

## Frontend ↔ internal graph & marketplace

- [x] **`POST /api/nft/mint`** — **Graph NFTs** nav: mint form + post fields.
- [x] **`POST /api/nft/list`** — Sell panel with token picker + USD price.
- [x] **`POST /api/nft/purchase`** — Buy on each listing row (non-seller).
- [x] **`GET /api/nft/listings`** — Listed under Graph NFTs → Listings.
- [x] **`GET /api/nft/inventory`** — My NFTs tab.
- [x] **`POST /api/nft/interconnect`** — Score & interconnect tab (from face NFT + to token).
- [x] **`POST /api/nft/score-candidate`** — Same tab, connectivity preview.

---

## Social & verification

- [x] **`POST /api/social/ingest`** — Graph NFTs → Mint & ingest → “Ingest post only” (+ optional admin key).
- [x] **`POST /api/social/scrape`** — Basic HTML fetch + text/meta sample; URL guard (`GET /api/social/scrape-check`). Mint tab **Scrape URL** preview.
- [ ] **Verified posts** — Production: webhook/OAuth vs admin header + dev `verified` when key unset.
- [x] **Bio verification** — **Paste bio** (same `NFC-…` code) **or** **`verify-bio-scrape`** using link `profile_url`.
- [ ] **OAuth / “login with …”** — Not implemented.

---

## Tutte / graph

- [x] **`POST /api/graph/connect`** — Tutte Atlas **Apply edge** after preview.
- [x] **Logged-out UX** — `fetchJson` surfaces **401** with sign-in hint for gated routes.

---

## Kimi & joint sessions

- [x] **`POST /api/kimi/joint-sessions`** + **messages** + **GET transcript** — **Joint rooms** nav; **GET /api/kimi/joint-sessions** lists your sessions.
- [ ] **`POST /api/kimi/translate-graph`** — Still primarily **My Profile**; not embedded next to each listing/token (optional polish).

---

## Public identity & pages

- [x] **Human-facing public page** — `/?u=<userId>` renders **`PublicProfileView`** (HTML UI); JSON remains at `/api/public/profile/:userId`.
- [ ] Share / OpenGraph meta for crawlers (optional).

---

## Simulation vs server graph (unification)

- [ ] **IVI / Digital Tap / L1–L2** — Still in-browser only; **verified `nfc_phy` taps** also logged to **`nfc_phy_taps`** (not full IVI state).
- [ ] **Human `user_id` vs agent `node_id`** — Still dual models; human agent is simulation-only.

---

## Chain & custody

- [ ] **Internal `nft_*`** — Off-chain ledger; no on-chain bridge.
- [ ] **Per-user wallets** — Not tied to internal marketplace.
- [ ] **`POST /api/init` / tx** — Agent economy separate from graph NFT sales.

---

## AI & operations

- [ ] **`OPENAI_API_KEY` missing** — Kimi returns fallback; optional dedicated empty-state in Joint rooms.
- [ ] **Admin UI** — Social admin key still env/header only.

---

## NotMainStreet / formal layer

- [ ] **`NotMainStreet/`** — Not connected to NFC runtime.

---

## SpacetimeDB (realtime)

- [x] **Module** — `nfc_live_ping`, **`public_graph_nft`** (+ `register_public_graph_nft`, `set_public_graph_nft_listing`). Identity owns on-chain-of-trust rows; listing price in cents.
- [x] **Client** — `NfcStdbRootProvider` in `main.jsx` (single connection). **SpacetimeDB** nav + **Graph NFT hub** pushes mint/list to STDB when connected.
- [ ] **Publish / ops** — After schema changes: `npm run spacetime:publish` (may need `--break-clients` if upgrading live DB).
- [ ] **Purchase → STDB** — SQLite transfer on buy; STDB owner still shows seller until a transfer reducer / manual re-sync (future).

---

## NFC physical tap (server log)

- [x] **`nfc_phy_taps`** table + **`POST /api/nfc/tap`** / **`GET /api/nfc/taps`** — Logged when an in-app **verified** `nfc_phy` Digital Tap runs (`App.jsx` → `nfcAuthHeaders`).

---

## Quality & automation

- [ ] E2E or integration tests (auth → mint → list → purchase).
- [x] CI (build + test) — `.github/workflows/ci.yml`.

---

## Done (reference)

- Server auth, profile, bio code social links, public JSON API.
- **Graph NFT hub** (`NfcMarketplace.jsx`): full internal marketplace UI.
- **Joint Kimi** UI + session list API.
- **Public profile page** via `?u=`.
- Tutte **Apply edge**, clearer **401** errors.
- NFT purchase/list/mint/interconnect/score server logic (existing).
