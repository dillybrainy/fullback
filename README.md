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

Open `[VERCEL_URL]/demo`. Every run creates its own deal, so you won't collide with other judges.

| Do this | You should see |
|---|---|
| 1. Click **Start the story**. | Porto Alegre FC proposes buying Lucas from Nordvik IF for 10,000,000 fEUR in 4 installments. The AI-read terms and the PDF fingerprint are stored on testnet. |
| 2. Click **Approve as Nordvik IF**, **Deposit collateral**, **Pay installment 1**. | Installment 1 splits into Nordvik IF 2,375,000 · Kota FC 100,000 · Akademi Desa 25,000, with a nearblocks link for every step. |
| 3. Wait for the countdown, no click needed (the schedule is compressed: installment *i* is due *i* × 2 minutes after the collateral is deposited). | Porto Alegre FC skips installment 2. The collector agent calls `settle_due`; the collateral drops from 2,500,000 to 0 and the deal shows **Must top up**. |
| 4. Click **Try the rogue agent**. | NEAR refuses a transfer from the collector's restricted key: it may only call `settle_due`. |
| 5. Click **Top up collateral**, pay installments 3 and 4, then **Withdraw the collateral**. | The deal is Completed and the buyer gets its collateral back. |
| 6. Click **Resell Lucas to Club Z**. | One transaction pays Porto Alegre FC 16,000,000 · Nordvik IF 3,000,000 (15% sell-on) · Kota FC 800,000 · Akademi Desa 200,000. The balance table compares every party with the agreement. |
| 7. Open **Verify** and drop `sample-agreements/tests/OK-01-basic.pdf`, then `VERIFY-OK-01-TAMPERED.pdf`. | Two different fingerprints, although only one number (the sell-on, 10% vs 5%) was changed. Run AI review on `BAD-01-installments-dont-add-up.pdf` to see a warning. |

More test agreements, correct and faulty, with the expected result for each: [`sample-agreements/tests/`](sample-agreements/tests/README.md).

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

## What's next

FULLBACK today solves one problem well: a transfer that was agreed gets paid, on time, to everyone owed. The roadmap grows it in three directions.

**1. Trust: who is allowed in**
- **Verified clubs.** A club signs in with its wallet, then a federation approves that wallet once (on-chain allowlist). Only approved wallets can create or accept deals, so nobody can pose as a club.
- **Academies only need a wallet.** An academy registers its wallet once with its federation; royalties then arrive automatically from every transfer of every player it trained. No dashboard, no claims, no paperwork.
- **Signed agreements.** Both clubs sign the PDF fingerprint with their wallets (NEP-413), not only the creator.

**2. Market: where deals start**
- **Transfer market.** Clubs list players for sale with a public career record: academies, clubs and years, taken from deals already on FULLBACK. A buying club can open a deal from a listing, so the terms, collateral and royalties are set up from the start.
- **Player history that can't be faked.** Each completed transfer adds a line to the player's on-chain history, which later deals use to calculate academy royalties.

**3. Safety: stronger checks before money moves**
- **More Reader checks.** Our test set ([`sample-agreements/tests/`](sample-agreements/tests/)) shows what the AI Reader catches today (installments that don't add up, net sell-ons, unknown academies) and what still needs a human: amounts in words that don't match the digits, collateral smaller than one installment, due dates before signing, overlapping academy years. These become automatic warnings.
- **Contract hardening.** Storage deposit on `create_deal`, plus `cancel_deal` / `cancel_resale` so a proposal that is never approved doesn't lock the player.
- **Mainnet.** Real stablecoin payments (USDC or EURe on NEAR) instead of fEUR, and an audit before any real money is used.

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
| near-api-js | Server routes, scripts and the collector agent |
| @hot-labs/near-connect | Wallet sign-in |
| NEAR AI Cloud | The AI Reader (OpenAI-compatible API), model `google/gemini-2.5-flash-lite` |
| testnet.nearblocks.io | Explorer links for every transaction |

## Libraries and templates

See [`docs/libraries.md`](docs/libraries.md) for the full list with versions and licenses.

## Prior work

None. Everything in this repository was written during the hackathon.

## Team

| Name | Role |
|---|---|
| Ranggawikan Wastusatwika | Smart contract and testnet scripts |
| Rio Meidi Ataurrahman | AI Reader and collector agent |
| Sadhani Girindh | Web app |
| R. Dilly Dzatfantara Brainy Mas | Project lead: product, design and coordination |

## License

[MIT](LICENSE)
