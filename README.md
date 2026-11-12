# FULLBACK

**Transfer fees that collect and split themselves, on NEAR.**

FULLBACK turns a football transfer agreement into a NEAR smart contract. The contract holds the buying club's collateral, collects every installment on time, and pays the seller, the academies that trained the player (academy royalties), and any sell-on holder in a single transaction. Federations get a read-only view of every deal.

Built at NEAR HACKATHON "Build Beyond Boundaries" (November 2026). Runs on **NEAR testnet** with play-money fEUR (1 fEUR stands for €1).

> **Live demo:** `[VERCEL_URL]` · **Video (≤3 min):** `[VIDEO_URL]` · **Contract:** `[CONTRACT_ID]` on testnet

---

## Why

- In April 2026, FIFA banned Botafogo from registering players for three windows after it failed to pay Ludogorets €8m for Rwan Cruz.
- In September 2026, Fenerbahçe was banned until it paid Sevilla an overdue installment on Youssef En-Nesyri's €19.5m transfer.
- FIFA's Clearing House has allocated almost $1bn in training rewards since 2022. It does not touch transfer installments or sell-on clauses; those are still a promise between two clubs, and a selling club that isn't paid has to go to the FIFA Football Tribunal and wait.

Sources: [`docs/bukti-masalah.md`](docs/bukti-masalah.md). How FULLBACK differs from other projects: [`docs/pembeda.md`](docs/pembeda.md).

## Try it (about 5 minutes, no wallet)

Open the live demo and click **Judge demo → Start the demo**. Every run creates its own deal, so you won't collide with other judges.

| Do this | You should see |
|---|---|
| 1. Start the demo. The signed PDF `deal1-nordvik-portoalegre.pdf` is read by the AI Reader. | Every number (fee, installments, collateral, sell-on) with the clause it was quoted from. |
| 2. Click through **Approve**, **Deposit collateral**, **Pay installment 1**. | Installment 1 splits into Nordvik IF 2,375,000 · Kota FC 100,000 · Akademi Desa 25,000, with a nearblocks link. |
| 3. Wait for the countdown (the schedule is compressed: installment *i* is due *i* × 2 minutes after activation, so installment 2 is due at 4:00; keep the page open). | The collector agent calls `settle_due`; collateral drops from 2,500,000 to 0 and the buyer gets a yellow card ("must top up"). |
| 4. Click **Try a rogue agent**. | NEAR rejects an `ft_transfer` from the collector's restricted key. The raw error and the failed transaction are shown. |
| 5. **Top up**, then pay installments 3 and 4. | Deal completes; collateral can be released. |
| 6. **Sell to Club Z** for 20,000,000. | One transaction pays Porto Alegre FC 16,000,000 · Nordvik IF 3,000,000 (15% sell-on) · Kota FC 800,000 · Akademi Desa 200,000. |
| 7. Open **Verify** and upload `sample-agreements/deal1-nordvik-portoalegre.pdf`, then `deal1-TAMPERED.pdf`. | ✓ matches the on-chain fingerprint · ✗ does not (one number was changed). |

Lucas, the clubs, and the agreements are fictional demo data. Real clubs only appear in the "Why" section above.

## Run it yourself

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm run dev
```

This starts the web app in `DEMO_MODE`, reading the contract the team already deployed on testnet. Open http://localhost:3000.

Optional:

- `npm run setup:demo` creates fresh testnet accounts (via faucet) and deploys `contract/res/fullback.wasm`, so you can run the story on your own accounts.
- `npm run demo` plays the full story from the command line and prints an explorer link for every step.
- `npm run collector` runs the collector agent in a loop every 15 seconds.
- Contract tests: `cd contract && cargo test` (needs Rust).

## How it works

```
PDF agreement ──► AI Reader (NEAR AI Cloud) ──► terms + clause quotes ──► web
                                                                          │ create_deal (+ PDF SHA-256)
buyer ── ft_transfer_call (fEUR) ──► FULLBACK contract ◄── settle_due ── collector agent (function-call key)
                                          │
                                          └── ft_transfer ──► seller · academies · sell-on holder
```

- **Contract (Rust, near-sdk 5):** holds collateral, schedules installments, splits each payment by basis points, falls back to collateral on late payment, marks `Defaulted` when collateral runs out, pays resales, stores the PDF fingerprint, and records failed payouts as claimable `pending` balances.
- **AI Reader:** extracts terms with a zod schema and checks every quote appears verbatim in the PDF text. Academy royalty percentages are computed by code from the age history, not by the model.
- **Collector agent:** a NEAR account whose only key is a function-call access key for `settle_due` on the FULLBACK contract.
- **Web (Next.js):** Home, Sign in (wallet + role), Dashboard, New deal, Deal, Verify, Resale, and a read-only Federation view.

## NEAR tools used

| Tool | Used for |
|---|---|
| NEAR testnet | All accounts, contracts and transactions |
| near-sdk (Rust) v5 | FULLBACK contract and the fEUR NEP-141 token |
| near-workspaces | Contract integration tests |
| near-cli-rs | Deploying contracts and adding the collector's restricted key |
| Function-call access keys | Restricting the collector agent to `settle_due` |
| NEP-141 (`ft_transfer_call` / `ft_on_transfer`) | All payments in fEUR |
| NEP-297 events | Deal history shown in the app |
| `[near-api-js or near-kit]` | Server routes, scripts and the collector agent |
| @hot-labs/near-connect | Wallet sign-in |
| NEAR AI Cloud | The AI Reader (OpenAI-compatible API) |
| testnet.nearblocks.io | Explorer links for every transaction |

## Libraries and templates

See [`docs/libraries.md`](docs/libraries.md) for the full list with versions and licenses.

## Prior work

None. Everything in this repository was written during the hackathon.

## Team

`[Orang 1 — contract]` · `[Orang 2 — AI agents]` · `[Orang 3 — frontend]` · `[Orang 4 — design & coordination]`

## License

[MIT](LICENSE)
