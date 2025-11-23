# Triviacast Deploy & Production Checklist

A pragmatic, high-signal runbook for deploying and operating Triviacast (Next.js + Chainlink VRF v2.5 Jackpot on Base). Treat this as a pre-flight plus recurring ops list. Each section lists MUST (blocker), SHOULD (strongly recommended), and NICE (optional) items.

---
## 1. Source Control & Branch Hygiene
- MUST: All changes merged into an immutable release branch (e.g. `jackpot` → `main`) via PR with review.
- MUST: No uncommitted or local-only hotfixes.
- SHOULD: Tag release (`vYYYYMMDD-x`) after successful production deployment.
- NICE: Generate a changelog from PR titles.

## 2. Environment Variables
Front-End (Vercel / `env.local`):
- MUST: `NEXT_PUBLIC_JACKPOT_ADDRESS` – Deployed Jackpot contract.
- MUST: `NEXT_PUBLIC_USDC_ADDRESS` – Base USDC (default baked-in is fine).
- MUST: `NEXT_PUBLIC_CHAIN_ID` – `8453` for Base mainnet.
- SHOULD: `NEXT_PUBLIC_TRIV_ADDRESS` – TRIV ERC20.
- SHOULD: `NEXT_PUBLIC_DISTRIBUTOR_ADDRESS` – Trivia distributor (for daily claims UI if exposed).
- SHOULD: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – WalletConnect project id.
- SHOULD: `NEXT_PUBLIC_RPC_URL` – Custom RPC if latency reasons (fallback: public).
- NICE: `NEXT_PUBLIC_NEYNAR_CLIENT_ID`, `NEXT_PUBLIC_NEYNAR_API_KEY` – Farcaster enhancements.

Backend / API Routes / Scripts:
- MUST: `NEYNAR_API_KEY` – Farcaster profile & user lookups.
- MUST: `ADMIN_API_SECRET` – Protect admin airdrop endpoints.
- SHOULD: `NEYNAR_BACKEND_SIGNER_UUID` – Backend signer for cast interactions (if used).

Hardhat / Contracts (`hardhat/.env`):
- MUST: `PRIVATE_KEY` – Deployer EOA (never the Safe key). Secure storage.
- MUST: `BASE_MAINNET_RPC_URL` – Stable provider (Alchemy/Infura/Base).
- MUST: `VRF_COORDINATOR`, `VRF_SUBSCRIPTION_ID`, `VRF_KEYHASH` – Chainlink VRF v2.5 config.
- MUST: `USDC_ADDRESS` – Base USDC contract.
- MUST: `TRIV_TOKEN_ADDRESS` – TRIV ERC20.
- MUST: `TRIVIAPOINTS_ADDRESS` – TriviaPoints logic (eligibility source).
- MUST: `FEE_RECEIVER_ADDRESS` – Treasury/Safe receiving USDC spin fees.
- MUST: `SPIN_PRICE_USDC` – 0.5 USDC in 6 decimals (`500000`).
- MUST: `POINTS_THRESHOLD` – Eligibility (e.g. `100000`).
- SHOULD: `ETHERSCAN_API_KEY` – For optional verification.
- NICE: `BASE_SEPOLIA_RPC_URL` – Testnet fallback; `NEW_OWNER` if automating ownership transfers.

Security Hygiene:
- MUST: No secrets committed (audit `git grep -i key=` and `.env*`).
- SHOULD: Rotate `PRIVATE_KEY` if leaked in CI logs.
- NICE: Set up secret scanning (GitHub Advanced Security).

## 3. Smart Contract Readiness
- MUST: Jackpot contract deployed, address recorded in `env.local` & Vercel env.
- MUST: Contract added as VRF consumer; subscription funded (LINK or native) with buffer ≥ 30 spins worth.
- MUST: TRIV balance seeded (cover several medium prizes + one jackpot attempt; recommend ≥ 15% of jackpot tier initially, top-up later).
- MUST: Prize tiers configured and sum to 10,000 basis points; verify via read (`getTiers()` if viewfn available or manual review of deployment script).
- SHOULD: Fee receiver set correctly (read `feeReceiver()`).
- SHOULD: Callback gas limit adequate (monitor first fulfill; adjust if near limit).
- NICE: Source verification on BaseScan.

## 4. Frontend Application
- MUST: Build succeeds (`npm run build`) with zero type errors.
- MUST: No usage of testnet chain id in production env.
- MUST: Jackpot page wheel animates correctly using mock local spin result (dev smoke before prod).
- SHOULD: Graceful handling of insufficient points (blur overlay) & cooldown state.
- SHOULD: Display of spin credits badge updating post-purchase.
- NICE: Loading skeletons / optimistic UI for spin initiation.

## 5. Monitoring & Observability
- MUST: Sentry DSN configured & events flowing (trigger sample error page once post-deploy).
- MUST: Set alerts: high error rate, failed API calls, jackpot payout attempt failures.
- SHOULD: Log VRF fulfill latency (difference between request block and fulfill block) to detect congestion.
- SHOULD: Track USDC fee revenue and TRIV payout sums daily (simple script or dashboard).
- NICE: Onchain event indexer / TheGraph subgraph for analytics.

## 6. Operational Scripts Validation
Run locally against production (READ operations, minimal WRITE):
- MUST: `vrf_add_consumer.ts` previously executed; re-run with a dry-run flag (optional enhancement) if script supports.
- SHOULD: `fund-address.ts` for emergency ETH top-ups (keep minimal ETH for gas on deployer & safe).
- NICE: `sweep-and-transfer.ts` audited (no accidental token sweeps when not intended).

## 7. Security & Risk Checks
- MUST: Deployer holds no large TRIV/USDC balances post-deploy (migrate to Safe).
- MUST: Ownership of Jackpot (if Ownable) points to intended admin (Safe or governance address).
- MUST: Review allowance flows: users approve USDC only to Jackpot, not arbitrary spender.
- SHOULD: Validate reentrancy absence around `fulfillRandomWords` & payouts (Chainlink callback pattern already mitigates; confirm no external calls before state updates except trusted ERC20 transfers).
- SHOULD: Confirm no infinite mint pathways for TRIV via jackpots (payouts require existing balance).
- NICE: Run static analysis (Slither / MythX) once before major tier changes.

## 8. Performance & Cost
- MUST: Average spin request gas < target budget (record first 5 spins). Optimize if > 250k.
- SHOULD: Fulfill callback gas usage < configured limit with 20% headroom.
- NICE: Bundle size review; tree-shake unused libs, remove example Sentry page for production if not needed.

## 9. Smoke Test (Production)
Perform with a funded, eligible address (≥ threshold points):
1. Buy 5 spins (check USDC balance decrement + event `SpinPurchased`).
2. Spin once (check `SpinRequested` event + VRF request id logged).
3. Observe wheel animation -> wait for `SpinResult` event; verify prize mapping.
4. Confirm TRIV payout if prize > 0 (check TRIV balance increment / Jackpot balance decrement).
5. Attempt second spin immediately (expect cooldown error) OR use remaining credits after cooldown.
6. Validate UI states: credits reduce, cooldown overlay appears, explorer links correct.

Record results (block numbers, transaction hashes) in a deployment log.

## 10. Post-Deployment Tasks
- MUST: Announce release with contract address & audit summary.
- MUST: Schedule tier review (weekly) + TRIV balance top-up check.
- SHOULD: Set up dashboard for daily spins, win distribution, USDC revenue.
- NICE: A/B test spin price or eligibility threshold with feature flags in future.

## 11. Incident Response
- MUST: Define rollback: front-end env var switch to disable spin button (feature flag `JACKPOT_DISABLED` – add if missing).
- SHOULD: Emergency script to pause payouts (if contract has a setter; else set tiers to 0 except consolation until fix).
- NICE: Status page integration.

## 12. Compliance & Legal (If Applicable)
- SHOULD: Confirm terms-of-service updated for game of chance mechanics & payout rules.
- SHOULD: Add disclaimer for VRF delays / network congestion.

---
## Quick Pre-Flight Table (Copy/Paste)
| Section | Item | Status |
|---------|------|--------|
| Env | Frontend vars present | ☐ |
| Env | Hardhat vars present | ☐ |
| VRF | Subscription funded | ☐ |
| VRF | Consumer added | ☐ |
| Contract | TRIV funded | ☐ |
| Contract | Fee receiver correct | ☐ |
| Frontend | Build passes | ☐ |
| Frontend | Wheel animates | ☐ |
| Monitoring | Sentry events flowing | ☐ |
| Security | Ownership set to Safe | ☐ |
| Security | No secrets leaked | ☐ |
| Smoke | Purchase spin works | ☐ |
| Smoke | VRF fulfillment works | ☐ |
| Ops | Dashboard metrics ready | ☐ |

---
## Future Enhancements
- Feature flag framework for dynamic tier adjustments without redeploy.
- Native payment toggle for VRF (set `nativePayment=true` in extraArgs when ready).
- Onchain merkle-based proof for eligibility snapshot (if TriviaPoints becomes expensive to query).
- Subgraph + real-time leaderboard of jackpot wins.

Keep this file updated with each production cycle.
