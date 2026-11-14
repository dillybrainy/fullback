<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-C-goal-frame-icon-white.svg">
  <img src="docs/brand/logo-C-goal-frame-icon.svg" alt="FULLBACK logo" width="72">
</picture>

# FULLBACK

### Transfer fees that collect and split themselves, on NEAR.

A football transfer agreement becomes a NEAR smart contract. It holds the buyer's collateral,<br>
collects every installment on time, and pays the seller, the academies and the sell-on holder in one transaction.

[![NEAR testnet](https://img.shields.io/badge/NEAR-testnet-13235B?style=flat-square)](https://testnet.nearblocks.io/address/fullback.fullback-team.testnet)
[![Built at NEAR HACKATHON](https://img.shields.io/badge/built%20at-NEAR%20HACKATHON%202026-FFD60A?style=flat-square&labelColor=13235B)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](LICENSE)

**[Live demo](https://[VERCEL_URL])** &nbsp;·&nbsp; **[Judge demo (5 min, no wallet)](https://[VERCEL_URL]/demo)** &nbsp;·&nbsp; **[Video](https://[VIDEO_URL])** &nbsp;·&nbsp; **[Contract on nearblocks](https://testnet.nearblocks.io/address/fullback.fullback-team.testnet)**

</div>

<br>

> [!NOTE]
> Everything runs on **NEAR testnet** with play-money **fEUR** (1 fEUR stands for €1). Lucas, the clubs in the demo and every agreement PDF are fictional. Real clubs only appear in the "Why" section.

---

## Why

Selling a player on installments is normal in football. Getting paid is not guaranteed.

- **Botafogo, April 2026:** FIFA banned the club from registering players for three windows after it failed to pay Ludogorets €8m for Rwan Cruz.
- **Fenerbahçe, September 2026:** the club was banned until it paid Sevilla an overdue installment on Youssef En-Nesyri's €19.5m transfer.
- **FIFA's Clearing House** has allocated almost $1bn in training rewards since 2022, but it does not touch transfer installments or sell-on clauses. Those are still a promise between two clubs. A club that isn't paid has to go to the FIFA Football Tribunal and wait.

<sub>Sources: [`docs/bukti-masalah.md`](docs/bukti-masalah.md) · How FULLBACK differs from other projects: [`docs/pembeda.md`](docs/pembeda.md)</sub>

## What FULLBACK does

| | |
|---|---|
| **Reads the agreement** | An AI Reader turns the signed PDF into terms. Every number comes with the clause it was quoted from, and the clubs check them before anything goes on-chain. |
| **Locks collateral** | The buying club deposits one installment as collateral before the deal goes live. |
| **Collects on time** | If an installment is late, a collector agent calls `settle_due` and the collateral pays it within seconds. The buyer must top up, or the deal defaults in public. |
| **Pays everyone at once** | Each payment is split by the contract: seller, the academies that trained the player, and the sell-on holder on a resale. |
| **Proves the paperwork** | The PDF's SHA-256 fingerprint is stored on-chain. Change one number in the file and it no longer matches. |
| **Lets federations watch** | A read-only view of every deal: what was promised, paid, covered by collateral, and how much reached academies. |

## Try it — about 5 minutes, no wallet

Open **[`/demo`](https://[VERCEL_URL]/demo)**. Every run creates its own deal, so you won't collide with other judges.

| # | Click | What you should see |
|:-:|---|---|
| 1 | **Start the story** | Porto Alegre FC proposes buying Lucas from Nordvik IF for 10,000,000 fEUR in 4 installments. The AI-read terms and the PDF fingerprint are stored on testnet. |
| 2 | **Approve as Nordvik IF** → **Deposit collateral** → **Pay installment 1** | Installment 1 splits into Nordvik IF 2,375,000 · Kota FC 100,000 · Akademi Desa 25,000, with a nearblocks link for every step. |
| 3 | *Nothing — wait for the countdown* | Porto Alegre FC skips installment 2. The collector agent calls `settle_due`; the collateral drops from 2,500,000 to 0 and the deal shows **Must top up**. |
| 4 | **Try the rogue agent** | NEAR refuses a transfer from the collector's restricted key: it may only call `settle_due`. |
| 5 | **Top up collateral** → pay 3 and 4 → **Withdraw the collateral** | The deal is Completed and the buyer gets its collateral back. |
| 6 | **Resell Lucas to Club Z** | One transaction pays Porto Alegre FC 16,000,000 · Nordvik IF 3,000,000 (15% sell-on) · Kota FC 800,000 · Akademi Desa 200,000. The balance table checks every party against the agreement. |
| 7 | Open **[Verify](https://[VERCEL_URL]/verify)** and drop [`OK-01-basic.pdf`](sample-agreements/tests/OK-01-basic.pdf), then [`VERIFY-OK-01-TAMPERED.pdf`](sample-agreements/tests/VERIFY-OK-01-TAMPERED.pdf) | Two different fingerprints, although only the sell-on (10% vs 5%) was changed. |

<sub>The schedule is compressed for the demo: installment *i* is due *i* × 2 minutes after the collateral is deposited, so step 3 takes about 4 minutes. Keep the page open.</sub>

**Testing the AI Reader:** [`sample-agreements/tests/`](sample-agreements/tests/README.md) holds 19 fictional agreements — 7 correct, 7 faulty that the Reader must flag, 4 known gaps, 1 tampered copy — each with its expected result.

## How it works

```
 PDF agreement ──► AI Reader (NEAR AI Cloud) ──► terms + clause quotes ──► web
                                                                           │  create_deal (+ PDF SHA-256)
                                                                           ▼
 buying club ── ft_transfer_call (fEUR) ──►  FULLBACK contract  ◄── settle_due ── collector agent
                                                   │                               (function-call key)
                                                   └── ft_transfer ──► seller · academies · sell-on holder
```

| Part | Built with | What it does |
|---|---|---|
| **Contract** | Rust, near-sdk 5 | Holds collateral, schedules installments, splits each payment by basis points, falls back to collateral on late payment, marks `Defaulted` when collateral runs out, pays resales, stores the PDF fingerprint, and keeps failed payouts as claimable `pending` balances. |
| **AI Reader** | NEAR AI Cloud, zod | Extracts the terms and checks every quote appears verbatim in the PDF. Academy royalties are computed by code from the player's age history (0.25% a year at 12–15, 0.5% a year at 16–23, capped at 5%), not by the model. |
| **Collector agent** | near-api-js | A NEAR account whose only key is a function-call access key for `settle_due`. It can keep deals on time but cannot move money anywhere else. |
| **Web** | Next.js, near-connect | Home, Sign in (wallet + role), Dashboard, New deal, Deal, Verify, Resale, a read-only Federation view, and the Judge demo. |

### Deployed on testnet

| Contract | Account |
|---|---|
| FULLBACK | [`fullback.fullback-team.testnet`](https://testnet.nearblocks.io/address/fullback.fullback-team.testnet) |
| fEUR token (NEP-141) | [`feur.fullback-team.testnet`](https://testnet.nearblocks.io/address/feur.fullback-team.testnet) |
| Collector agent | [`keeper.fullback-team.testnet`](https://testnet.nearblocks.io/address/keeper.fullback-team.testnet) |

Method reference: [`contract/INTERFACE.md`](contract/INTERFACE.md)

## Run it yourself

<details>
<summary>Requires Node.js 20+ — click to expand</summary>

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000, DEMO_MODE, uses the contract already on testnet
```

| Command | What it does |
|---|---|
| `npm run setup:demo` | Creates fresh testnet accounts and deploys `contract/res/fullback.wasm`, so you can run the story on your own accounts. |
| `npm run demo` | Plays the full story from the command line, with an explorer link for every step. |
| `npm run make:deal -- --pdf <file>` | Creates a deal from any PDF, so its fingerprint can be checked on Verify. |
| `npm run collector` | Runs the collector agent every 15 seconds. |
| `npm test` | Runs the agent, web and script tests. Contract tests: `cd contract && cargo test` (needs Rust). |

To run the AI Reader on your own PDFs, set `DEMO_MODE=false` and an API key; see [`agent/README.md`](agent/README.md).

</details>

## NEAR tools used

<details>
<summary>10 tools — click to expand</summary>

| Tool | Used for |
|---|---|
| NEAR testnet | All accounts, contracts and transactions |
| near-sdk (Rust) v5 | FULLBACK contract and the fEUR NEP-141 token |
| near-cli-rs | Deploying contracts and adding the collector's restricted key |
| Function-call access keys | Restricting the collector agent to `settle_due` |
| NEP-141 (`ft_transfer_call` / `ft_on_transfer`) | All payments in fEUR |
| NEP-297 events | Deal history shown in the app |
| near-api-js v7 | Server routes, scripts and the collector agent |
| @hot-labs/near-connect | Wallet sign-in |
| NEAR AI Cloud | The AI Reader (OpenAI-compatible API), model `google/gemini-2.5-flash-lite` |
| testnet.nearblocks.io | Explorer links for every transaction |

Full list of libraries with versions and licenses: [`docs/libraries.md`](docs/libraries.md)

</details>

## What's next

FULLBACK today solves one problem well: a transfer that was agreed gets paid, on time, to everyone owed. The roadmap grows it in three directions.

<table>
<tr>
<th width="33%">1 · Trust<br><sub>who is allowed in</sub></th>
<th width="33%">2 · Market<br><sub>where deals start</sub></th>
<th width="33%">3 · Safety<br><sub>stronger checks before money moves</sub></th>
</tr>
<tr valign="top">
<td>

**Verified clubs.** A federation approves a club's wallet once (on-chain allowlist). Only approved wallets can create or accept deals.

**Academies only need a wallet.** Register it once; royalties arrive automatically from every transfer of every player they trained.

**Signed agreements.** Both clubs sign the PDF fingerprint with their wallets (NEP-413).

</td>
<td>

**Transfer market.** Clubs list players for sale with a public career record: academies, clubs and years, taken from deals already on FULLBACK.

**Deals from a listing.** A buying club opens a deal straight from a listing, with terms, collateral and royalties set up from the start.

**Player history that can't be faked.** Each completed transfer adds a line to the player's on-chain history.

</td>
<td>

**More Reader checks.** Turn the gaps from our test set into warnings: amounts in words vs digits, collateral smaller than one installment, due dates before signing, overlapping academy years.

**Contract hardening.** Storage deposit on `create_deal`, plus `cancel_deal` / `cancel_resale`.

**Mainnet.** Real stablecoins (USDC or EURe on NEAR) and an audit before any real money.

</td>
</tr>
</table>

## Team

| | Name | Role |
|:-:|---|---|
| 1 | Ranggawikan Wastusatwika | Smart contract and testnet scripts |
| 2 | Rio Meidi Ataurrahman | AI Reader and collector agent |
| 3 | Sadhani Girindh | Web app |
| 4 | R. Dilly Dzatfantara Brainy Mas | Project lead: product, design and coordination |

## Prior work

None. Everything in this repository was written during NEAR HACKATHON "Build Beyond Boundaries", November 2026.

## License

[MIT](LICENSE)

<div align="center">
<br>
<sub><b>FULLBACK</b> · The club that raised him gets paid. Every time.</sub>
</div>
