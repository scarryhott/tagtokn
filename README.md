# TagTokn App (React + Firebase)

This project is the UI prototype for TagTokn—an influencer/business token marketplace that combines social-value minting, local-business verification, and NFT-style rewards over a single Firebase-backed stack. It runs as a Create React App front end, and all persistence/integration points are designed to sit on Firestore, Firebase Auth, Storage, and Cloud Functions.

## Feature Overview

### Influencer Marketplace
- Anyone can connect Instagram, create an influencer profile, and launch a token card.
- Each influencer chooses a **Money Multiplier** that controls how much value existing holders fund vs. how much value is purely social. The UI shows `xMultiplier` plus the inverse dollars-flow (holders fund `$1/multiplier` per minted $1).
- Tokens track `earned`, `marketplaceBought`, total supply, and display ratios/prices derived from synthetic market data.
- Influencers can list their own tokens, request physical token cards, and manage bios/categories via the dashboard modal.

### Local Business Verification + Treasury Bands
- Businesses apply through a full intake form that uploads supporting documents to Firebase Storage and stores records in Firestore (`localBusinesses`).
- Admin view allows filtering by status, verifying/rejecting, and maintaining per-business notes.
- Verified businesses unlock a **treasury panel** with three lanes (self-funded, community-funded, TagTokn backstop) and can request platform liquidity (2.5% fee) via a callable function stub.
- They configure market bands with asset value, tolerance, and Earn/Buy sensitivity; the app computes effective bands and optional social multiples (accept social value instead of dollars).
- Market-maker configs and band settings persist via Firestore (`marketMakers`), ready for Cloud Functions to automate trades.

### Token Transactions & NFTs
- Businesses can record NFC/online token redemptions, mint buyer/seller NFT metadata, and attach product/service/event details plus optional tagged posts. Data lives in `tokenTransactions`.
- Influencer token detail modals show owned tokens, listing history, and multiplier context.

### Global Systems
- Global Earn/Bought ratio, daily raffle, and user inventory all run inside the React app today (mock state). They’re ready to be backed by Firestore/Functions when we wire up real-time data.

## Firebase Implementation Plan

We don’t mint on-chain yet, but the app expects Firebase to act as the single source of truth. Key steps for a production-ready Firebase version:

1. **Auth & User Metadata**
   - Continue using Firebase Auth with Google/GitHub/Twitter/email providers (already wired in `src/firebase.js`).
   - Store user docs under `users/{uid}` (currently seeded) and expand with influencer/business roles.

2. **Firestore Structure**
   - `localBusinesses/{businessId}`: submissions (already used), containing treasury, band, and verification fields.
   - `marketMakers/{businessId}`: live band config, sensitivity, funding source, payout mode, social multiple.
   - `tokenTransactions/{transactionId}`: NFC/online redemption records with buyer/seller NFTs.
   - `platformTokens/tagtokn`: global supply, Earn/Bought stats, treasury balance, last ledger event. (Already referenced in services but needs Cloud Function maintenance.)
   - `influencers/{influencerId}` (optional future move away from local state) to persist money multiplier, profile details, and stats.

3. **Cloud Functions**
   - `requestTagtoknLiquidity`: check `platformTokens/tagtokn.treasuryUsd`, enforce 2.5% fee, credit business `treasury.tagtoknCredit`, optionally enqueue `communityFunding` doc.
   - `mintTagTokens`: accept influencer ID + multiplier-adjusted amount, verify limits (band thresholds, treasury capacity), update `platformTokens/tagtokn` and influencer stats.
   - `marketMakerAutomation`: cron or event function that listens to `marketMakers/{id}` changes and, when price feeds are connected, auto-places buy/sell orders according to effective bands.
   - `transactionSettlement`: whenever `tokenTransactions` gets a new doc, issue NFTs/POAPs, push notifications, and adjust business reward pools.

4. **Storage & Security**
   - Continue storing business documents under `localBusinessDocs/{businessId}/file` (already set up). Add security rules limiting access to the submitting business + admins.
   - Firestore rules to ensure:
     - Only verified business owners update their `treasury`/`marketMakers` docs.
     - Liquidity requests can be made only by the business owner or TagTokn admin.
     - NFT transaction writes require logged-in users with associated businesses.

5. **Realtime Sync**
   - Replace local influencer arrays with Firestore listeners once the backend is ready.
   - Use Firestore snapshots for marketplace listings, trade history, and raffle stats.

6. **Testing/Tooling**
   - Set up Firebase Emulators (Firestore/Auth/Functions/Storage) for local dev.
   - Add integration tests for callable functions (e.g., liquidity requests).

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` (if present) to `.env` and add Firebase config keys (already referenced in `src/firebase.js`).
3. Start the dev server:
   ```bash
   npm start
   ```
4. (Optional) Run Firebase emulators:
   ```bash
   firebase emulators:start
   ```

## Deployment

Use the standard CRA build/deploy flow:
```bash
npm run build
```
Host via Firebase Hosting, Vercel, Netlify, etc. Remember to deploy Cloud Functions/Rules when the backend plan above is implemented.

## Next Steps

- Finish the Firebase implementation (Functions, Firestore rules, storage security).
- Hook influencer/band data to real price feeds and automate market actions.
- Add documentation for the admin workflow (verifiers) and influencer onboarding.
