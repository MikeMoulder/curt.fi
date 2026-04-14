# curt.fi

> Deposit like a bank. Earn 8%+ across 21 chains. Pull the curtain to see where your money really goes.

**Track:** AI x Earn
**Hackathon:** DeFi Mullet Hackathon #1 by LI.FI
**Submission Deadline:** April 14, 2026

---

## Concept

curt.fi is a neobank-style DeFi yield app. The front end looks and feels like a modern savings account — no chains, no protocols, no gas talk. Behind it, an AI strategy engine analyzes 672+ vaults across 21 chains and 20+ protocols, then routes deposits for optimal risk-adjusted yield via LI.FI Composer.

The signature feature: **"Pull the Curtain"** — a toggle that peels back the banking UI to reveal the full DeFi machinery underneath. Chains, protocols, APY breakdowns, fund flows, the AI's reasoning — all exposed.

Business in the front. Yield in the back. Pull the curtain to see it all.

---

## Core Features

### 1. The Banking View (Default)

The primary interface the user sees. Zero crypto jargon.

```
┌──────────────────────────────────────┐
│  curt.fi                             │
│                                      │
│  Your Balance          $5,000.00     │
│  Interest Earned         +$35.42     │
│  Current Rate            8.5% APY    │
│                                      │
│  ┌──────────┐    ┌──────────────┐    │
│  │ Deposit  │    │   Withdraw   │    │
│  └──────────┘    └──────────────┘    │
│                                      │
│         ↕ Pull the Curtain           │
└──────────────────────────────────────┘
```

**What the user sees:**
- Total deposited balance (aggregated across all chains/vaults)
- Total interest earned to date
- Blended APY across all positions
- A deposit button (pick token, enter amount, one click)
- A withdraw button (get everything back in your chosen token)
- Activity feed showing deposits, withdrawals, yield earned

**What the user does NOT see:**
- Chain names, vault addresses, protocol names
- Gas fees, bridge transactions, swap routes
- APY breakdowns, TVL metrics, risk scores

### 2. Pull the Curtain (The Reveal)

A smooth animation (slide/flip) that transforms the UI into a full DeFi dashboard.

**The curtain view shows:**

- **Fund Flow Visualization** — A sankey diagram or treemap showing where funds are allocated across chains and protocols. E.g., 40% → Morpho/Base, 30% → Aave/Arbitrum, 30% → Euler/Ethereum.
- **APY Breakdown per Position** — Base APY vs. reward APY, with 1d/7d/30d trend sparklines.
- **Risk Metrics** — Protocol concentration %, chain diversification score, TVL trend per vault.
- **AI Reasoning Log** — Plain-English explanations: *"Allocated 40% to Morpho on Base: APY rose 1.2% over 7 days while TVL grew 15%, signaling organic demand rather than incentive farming."*
- **Live Transaction History** — Every swap, bridge, and deposit Composer executed on your behalf.

### 3. AI Strategy Engine

The intelligence behind allocation decisions. This is what makes curt.fi more than a yield aggregator.

**Strategy Dimensions:**

| Dimension | What It Does | Data Source |
|---|---|---|
| **Yield Momentum** | Favors vaults where APY is trending UP over 7d/30d | `analytics.apy1d`, `apy7d`, `apy30d` snapshots |
| **TVL Safety** | Avoids vaults with declining TVL (smart money leaving) | `analytics.tvlUsd` tracked over time |
| **Protocol Diversification** | Caps exposure to any single protocol at 30% | `protocol.name` field |
| **Chain Diversification** | Spreads across chains to reduce single-chain risk | `chainId` field |
| **Stablecoin Preference** | Matches user risk profile — conservative = 100% stables | `tags[]` containing "stablecoin" |
| **Minimum TVL Threshold** | Only considers vaults with meaningful liquidity | `analytics.tvlUsd` > configurable minimum |
| **Transactional Filter** | Only routes to vaults that accept deposits | `isTransactional === true` |

**Risk Profiles:**

- **Safe** — Stablecoin-only vaults, top protocols (Aave, Morpho), high TVL, low APY volatility. Target: 4-8% APY.
- **Balanced** — Mix of stablecoin and blue-chip asset vaults, broader protocol selection. Target: 6-12% APY.
- **Aggressive** — Any qualifying vault, higher concentration in yield momentum plays. Target: 10%+ APY.

### 4. AI Chat Sidebar

A conversational interface for interacting with your yield strategy.

**Example Interactions:**

```
User: "What's my riskiest position right now?"
AI:   "Your Euler V2 position on Ethereum (18% of portfolio).
       APY dropped 3.1% over the past week and TVL declined 8%.
       Want me to move it to Morpho on Base? Currently 9.2% APY
       with stable TVL growth."
       [Move Funds →]

User: "Go conservative, I'm nervous about the market"
AI:   "I'll rebalance to stablecoin-only vaults across Aave and
       Morpho. This will lower your blended APY from 9.4% to ~6.8%
       but significantly reduces volatility exposure. Proceed?"
       [Rebalance →]

User: "Where's the best yield for ETH right now?"
AI:   "Top 3 ETH vaults by risk-adjusted yield:
       1. Aave V3 / Arbitrum — 4.8% APY (stable, high TVL)
       2. Euler V2 / Base — 7.2% APY (rising trend, moderate TVL)
       3. Pendle / Ethereum — 11.3% APY (volatile, reward-heavy)
       I'd recommend #2 for your balanced profile."
       [Deposit into Euler V2 →]
```

**Each AI recommendation includes a one-click action button** that constructs and executes the Composer transaction.

### 5. Deposit Flow

The core interaction, designed to be as simple as a bank deposit.

**User Journey:**

1. Connect wallet (RainbowKit — supports MetaMask, WalletConnect, Coinbase)
2. Click "Deposit"
3. Pick token from wallet (auto-detects balances across chains)
4. Enter amount
5. Select risk profile (Safe / Balanced / Aggressive) — or let AI choose
6. Click "Confirm"
7. Sign one transaction in wallet

**Behind the scenes:**
1. AI strategy engine selects optimal vault(s) based on risk profile
2. Composer API builds the transaction (handles swaps + bridges + deposits)
3. User signs a single transaction
4. Funds are routed to vault(s) across chains
5. Banking view updates with new balance and blended APY

### 6. Withdraw Flow

Equally simple — mirror of deposit.

1. Click "Withdraw"
2. Choose amount (partial or full)
3. Choose destination token and chain
4. Click "Confirm"
5. Sign one transaction
6. Funds arrive in wallet

---

## Technical Architecture

### System Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│             │     │                  │     │                 │
│  Frontend   │────▶│  AI Strategy     │────▶│  LI.FI Earn     │
│  (Next.js)  │     │  Engine          │     │  Data API       │
│             │     │  (Claude API)    │     │  earn.li.fi     │
│             │     │                  │     │                 │
│  Banking UI │     │  - Risk scoring  │     │  - Vault list   │
│  Curtain UI │     │  - Allocation    │     │  - APY data     │
│  AI Chat    │     │  - Rebalancing   │     │  - Portfolio    │
│             │     │  - NL responses  │     │  - Chains       │
│             │     │                  │     │  - Protocols    │
└──────┬──────┘     └──────────────────┘     └─────────────────┘
       │
       │ Sign tx
       ▼
┌──────────────┐     ┌─────────────────┐
│              │     │                 │
│  User Wallet │◀───▶│  LI.FI Composer │
│  (wagmi)     │     │  li.quest       │
│              │     │                 │
│              │     │  - Quote/build  │
│              │     │  - Swap+Bridge  │
│              │     │  - Deposit tx   │
└──────────────┘     └─────────────────┘
```

### Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Fast dev, Vercel deploy, API routes for AI proxy |
| **Styling** | Tailwind CSS | Rapid UI, easy theming for banking/curtain views |
| **Animation** | Framer Motion | Smooth curtain pull transition |
| **Wallet** | wagmi + viem + RainbowKit | Industry standard, multi-wallet support |
| **AI** | Claude API (claude-sonnet-4-6) | Strategy reasoning, chat, natural language |
| **Charts** | Recharts or Lightweight Charts | APY trend sparklines, allocation treemap |
| **State** | Zustand | Lightweight, no boilerplate |
| **Deploy** | Vercel | One-click deploy, free tier works |

### API Integration Map

**LI.FI Earn Data API** (`https://earn.li.fi`) — No auth required

| Endpoint | Used For | Where In App |
|---|---|---|
| `GET /v1/earn/vaults` | Discover & filter all available vaults | AI strategy engine scans on deposit |
| `GET /v1/earn/vaults/:network/:address` | Get specific vault details | Curtain view — vault detail cards |
| `GET /v1/earn/chains` | List supported chains | Deposit/withdraw chain selection |
| `GET /v1/earn/protocols` | List supported protocols | Curtain view — protocol breakdown |
| `GET /v1/earn/portfolio/:address/positions` | User's current positions | Balance display, portfolio analytics |

**LI.FI Composer** (`https://li.quest`) — API key required

| Endpoint | Used For | Where In App |
|---|---|---|
| `GET /v1/quote` | Build deposit/withdraw transactions | Deposit flow, withdraw flow, rebalance actions |

**Key Parameters for `/v1/quote`:**
- `fromChain` — user's current chain
- `toChain` — destination vault's chain
- `fromToken` — token user wants to deposit
- `toToken` — **vault address** (NOT the underlying token)
- `fromAddress` — user's wallet
- `toAddress` — user's wallet
- `fromAmount` — amount in smallest unit (respect decimals: USDC=6, ETH=18)

### AI Strategy Engine — Prompt Design

The AI receives structured context on each request:

```
System: You are the curt.fi yield strategy engine. You manage DeFi yield
allocations for users who want a simple banking experience.

You receive:
- User's current portfolio positions
- Available vault data (APY, TVL, trends, protocols, chains)
- User's risk profile (safe/balanced/aggressive)

Your job:
1. Analyze vaults using yield momentum, TVL safety, diversification
2. Recommend optimal allocation
3. Explain reasoning in plain English (no crypto jargon)
4. Return structured allocation as JSON for the frontend to execute

Rules:
- Max 30% in any single protocol
- Max 40% on any single chain
- Only use vaults where isTransactional is true
- Minimum TVL: $1M for safe, $500K for balanced, $100K for aggressive
- Favor rising APY trends (compare apy7d vs apy30d)
- Flag declining TVL as a warning signal
```

**Response format:**

```json
{
  "strategy": {
    "allocations": [
      {
        "vaultAddress": "0x...",
        "chain": "base",
        "protocol": "Morpho",
        "percentage": 40,
        "reasoning": "Rising APY trend (+1.2% over 7d), growing TVL, battle-tested protocol"
      }
    ],
    "blendedApy": 8.5,
    "riskScore": "low",
    "summary": "Your funds are spread across 3 protocols on 3 chains, targeting 8.5% blended yield with conservative risk."
  }
}
```

---

## UI/UX Design Details

### Color Palette

**Banking View (Clean, Trustworthy):**
- Background: `#FAFAFA` (warm white)
- Primary: `#1A1A2E` (deep navy)
- Accent: `#4ADE80` (green — money, growth)
- Text: `#1A1A2E` / `#6B7280`

**Curtain View (Technical, DeFi):**
- Background: `#0F0F1A` (dark)
- Primary: `#8B5CF6` (purple — DeFi energy)
- Accent: `#4ADE80` (same green — continuity)
- Text: `#E5E7EB` / `#9CA3AF`

### The Curtain Animation

The transition between views should feel theatrical:

1. User clicks "Pull the Curtain"
2. The banking UI splits vertically from the center
3. Each half slides outward like opening curtains
4. The dark DeFi dashboard fades in behind
5. Data points animate in with staggered delays
6. A subtle particle/grid effect activates in the background

Reverse animation when closing. Total duration: ~800ms.

### Responsive Design

- **Desktop:** Full layout with chat sidebar visible
- **Tablet:** Chat as a slide-out drawer
- **Mobile:** Bottom sheet for chat, stacked layout for banking/curtain views

---

## Page Structure

```
/                   → Landing page (hero + connect wallet CTA)
/dashboard          → Main banking view (post-connect)
/dashboard?curtain  → Curtain view toggle
```

Single-page app feel. No separate pages — just view transitions.

### Landing Page

```
┌──────────────────────────────────────────────┐
│  curt.fi                                     │
│                                              │
│  Your money. Working harder.                 │
│  No chains. No jargon.                       │
│  Just yield.                                 │
│                                              │
│  ┌────────────────────┐                      │
│  │  Connect Wallet →  │                      │
│  └────────────────────┘                      │
│                                              │
│  Powered by LI.FI · 21 chains · 20+ protocols│
└──────────────────────────────────────────────┘
```

---

## Implementation Plan

### Day 1 (April 10) — Foundation
- [x] Project scaffold (Next.js + Tailwind + wagmi)
- [ ] Wallet connection (RainbowKit)
- [ ] Earn Data API integration (vault fetching with pagination, caching)
- [ ] Portfolio positions fetching
- [ ] Basic data types and API client

### Day 2 (April 11) — Banking View
- [ ] Banking dashboard UI (balance, APY, earnings)
- [ ] Deposit flow UI (token select, amount input, risk profile)
- [ ] Withdraw flow UI
- [ ] Composer API integration (quote fetching + transaction execution)

### Day 3 (April 12) — AI + Curtain
- [ ] AI strategy engine (Claude API integration)
- [ ] Strategy allocation logic (diversification rules, yield momentum)
- [ ] Curtain view UI (fund flow visualization, APY charts, risk metrics)
- [ ] Curtain pull animation (Framer Motion)
- [ ] AI chat sidebar

### Day 4 (April 13) — Polish + Demo
- [ ] End-to-end testing with real small deposits
- [ ] Mobile responsive adjustments
- [ ] Error handling and edge cases
- [ ] Record demo video
- [ ] Draft tweet and write-up
- [ ] Deploy to Vercel

### Day 5 (April 14) — Submit
- [ ] Final testing on production
- [ ] Post tweet in submission window (9:00 AM–12:00 PM ET)
- [ ] Submit Google Form

---

## Demo Script (30 seconds)

1. **[0-5s]** Open curt.fi. Clean banking interface. "This looks like a savings account."
2. **[5-12s]** Connect wallet. Click Deposit. Enter $100 USDC. Pick "Balanced" risk. One click. Done.
3. **[12-17s]** Balance updates. Show blended APY: 8.5%. Interest ticking up in real time.
4. **[17-22s]** "But where did my money actually go?" Click **Pull the Curtain**.
5. **[22-28s]** Curtain animation reveals: funds split across Morpho/Base, Aave/Arbitrum, Euler/Ethereum. APY charts, risk scores, AI reasoning visible.
6. **[28-30s]** Close curtain. Back to the simple view. "curt.fi — yield made brief."

---

## Tweet Template

```
Your savings account is lying to you. 0.5% APY? In 2026?

curt.fi — deposit like a bank. Earn 8%+ across 21 chains.

Then pull the curtain. 🎭

See exactly where your money goes. Morpho, Aave, Euler —
an AI picks the best vaults so you don't have to.

Built on @lifiprotocol Earn API.

Track: AI x Earn

🎥 [demo video]
🔗 [live app / github]

@kenny_io
```

---

## Submission Write-Up (Draft)

**What curt.fi does:**
curt.fi is a neobank-style interface for DeFi yield. Users deposit like they would into a savings account — no chains, no protocols, no jargon. An AI strategy engine allocates their funds across the best risk-adjusted vaults. The "Pull the Curtain" feature lets curious users peek behind the simple UI to see exactly where their money is and why the AI put it there.

**How it uses the Earn Data API:**
- Fetches all available vaults with pagination to build a complete picture of the yield landscape
- Uses APY time-series data (1d/7d/30d snapshots) for yield momentum analysis
- Monitors TVL trends to assess vault health
- Pulls user portfolio positions for real-time balance and earnings display
- Queries chains and protocols endpoints for diversification constraints

**How it uses Composer:**
- Builds deposit transactions that handle any-token to vault routing (swap + bridge + deposit)
- Builds withdrawal transactions from any vault back to user's preferred token/chain
- Handles rebalancing by composing withdrawal + deposit sequences
- All complexity hidden behind a single "Confirm" button

**Future plans:**
- Automated rebalancing with user-set triggers (APY drops below X%, TVL drops Y%)
- Scheduled deposits (DCA into yield vaults)
- Push notifications for significant APY changes or risk events
- Multi-wallet portfolio aggregation
- Institutional mode with custom allocation constraints

**API feedback:**
[To be filled after building]
