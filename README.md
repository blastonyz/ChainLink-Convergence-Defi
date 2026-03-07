# Defiance - DeFi + CRE + AI (Gemini)

On-chain AI-assisted trading on an Arbitrum vNet fork.



## Frontend CRE Stream 

`frontend/app/api/cre/stream/route.ts` starts `cre workflow simulate` from a frontend `GET /api/cre/stream` request and streams execution logs live to the UI via SSE.

Flow summary:
- Spawns a child process (`cre ...`) from the project root.
- Streams `stdout`/`stderr` as SSE events (`start`, `log`, `operation`, `error`, `done`).
- Auto-answers interactive CLI prompts through `stdin` (`triggerChoice`, `httpPayload`).
- Parses `[OPERATION_LOG]` lines into structured `operation` events.
- Sends a final `done` event with exit status.

---

## 🧠 CRE Workflow Architecture (Detailed)

### End-to-End Flow

1. **HTTP trigger enters CRE**
   - Request is signed and validated against authorized public keys.
   - Entry handlers:
     - `position` route (Aave/Uniswap flow)
     - `trading` route (GMX flow)

2. **Runtime options are resolved**
   - `reason` is extracted from request payload (or defaulted).
   - `action` and `minConfidence` are validated/normalized.

3. **Market data is fetched (CoinGecko OHLC)**
   - CRE HTTP capability fetches OHLC data.
   - Data is summarized (trend/variation/high-low) for model context.

4. **Prompt is built and Gemini is called**
   - Prompt includes target route, coin, network, forced action rules, and recent candles.
   - Model response is parsed as strict JSON.

5. **Action resolution and risk gating**
   - Final action comes from: forced action > model action > text fallback.
   - Execution only proceeds if confidence threshold and receiver address checks pass.

6. **Intent encoding + onchain writeReport**
   - For GMX: payload is encoded with GMX action schema and submitted to `GMXExecutor`.
   - For Position: payload is encoded with position schema and submitted to `StrategyExecutor`.
   - Report signature/hashing is performed by CRE before `writeReport`.

7. **Structured result output**
   - Workflow returns recommendation + execution status + tx hash (if available).

### Architecture by File (Concrete Responsibilities)

#### Entry / Orchestration
- **`my-workflow/main.ts`**
  - Bootstraps CRE runner and starts workflow handlers.
- **`my-workflow/httpTriggers.ts`**
  - Defines HTTP triggers, key authorization, payload parsing, and mode dispatch (`position` / `trading`).
- **`my-workflow/strategyFlow.ts`**
  - Core orchestration: secrets, OHLC fetch, Gemini call, action resolution, confidence gating, execution routing, final response shaping.

#### Shared Domain Types
- **`my-workflow/types.ts`**
  - Central schema for config, request payloads, recommendation output, action enums, and OHLC summary types.

#### Data + Prompt Layer
- **`my-workflow/shared/data/marketDataClient.ts`**
  - CoinGecko fetch client, Gemini request client, OHLC summarization.
- **`my-workflow/shared/prompt/promptBuilder.ts`**
  - Deterministic prompt composition with route hints and risk/format constraints.

#### Parsing / Normalization Layer
- **`my-workflow/shared/parsers/valueParsers.ts`**
  - Primitive converters/validators (`asNumber`, `asAddress`, `parseMinConfidence`, etc.) used across modules.

#### Execution Layer - Trading
- **`my-workflow/shared/execution/trading/tradingExecutionConfig.ts`**
  - Prompt-level execution hints for trading route behavior.
- **`my-workflow/shared/execution/trading/tradingPayloadEncoder.ts`**
  - ABI payload encoding for GMX intent.
- **`my-workflow/shared/execution/trading/gmxReportExecution.ts`**
  - CRE report creation + EVM `writeReport` call for GMX executor.
- **`my-workflow/shared/execution/trading/executionUtils.ts`**
  - Tx hash normalization and simulator-safe handling.

#### Execution Layer - Position
- **`my-workflow/shared/execution/position/positionExecutionConfig.ts`**
  - Position defaults (tokens, amounts, chain selector).
- **`my-workflow/shared/execution/position/positionPayloadEncoder.ts`**
  - ABI payload encoding for position operations.
- **`my-workflow/shared/execution/position/positionReportExecution.ts`**
  - CRE report creation + EVM `writeReport` call for strategy executor.

#### Strategy Logic Helpers
- **`my-workflow/strategyHelpers.ts`**
  - Action inference from model text, switcher resolution, GMX intent building, and strategy report encoding helpers.

### Configuration Artifacts
- **`my-workflow/config.staging.json` / `my-workflow/config.production.json`**
  - Environment-specific runtime config (secrets ids, chains, execution settings, authorized keys).
- **`my-workflow/workflow.yaml`**
  - CRE workflow deployment/definition descriptor.

---

## 🔗 Pinned Example Transactions (Tenderly)

- **GMX Short Tx**  
  [View on Tenderly](https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x6dfdb8630fd8decbdd720952f0509de9c527ed76353151a8c43e81661aee77d0)

- **AAVE + UNISWAP Short Tx #1**  
  [View on Tenderly](https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x6d4fd62beedbb9d424a3c3b8c1fc6ac40a64101656ef609773827338371e6108)

- **AAVE + UNISWAP Short Tx #2**  
  [View on Tenderly](https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0xc9c82a2e4c5d0eb56a7805a5391dea95b88c236218cf5854083c9b8f1740989a)

- **GMX Executor - Contract Creation Tx**  
  [View on Tenderly](https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x46ec469e9ddae03c278dfccde239c8528e5b5f0ab0d2b85e4c734ad481ac9f9d)

- **AAVE + UNISWAP StrategyExecutor - Contract Creation Tx**  
  [View on Tenderly](https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x0d0f7b373f17688bb843570a72d0d5df4e71fb9ff6262c7a7b3cbc3cdcb7dd8b)

## 🔗 Related Files
- **Makefile**: Definition of all targets
- **scripts/configure-cre.sh**: Automatic CRE configuration for GMX
- **src/strategy/**: Smart contracts
- **script/**: Forge scripts for execution

---

# 🎯 Execution Flows - Convergence

## Overview
The Makefile organizes two main execution flows:
- **Position Strategy**: Leveraged trading AAVE + Sushi/Uniswap
- **GMX Trading**: Direct trading on GMX v2

Each flow has 5 phases: Deploy → Configure → Fund → Execute → Query

---

## 🔧 Initial Setup
Virtual net with forks of mainnet Arbitrum is used for the flows. 
You need to have one for testing, and fund it from the tap on the Tenderly dashboard.
[tenderly](https://tenderly.co/)
### 1. Verify `.env`
```bash
# Make sure you have the critical variables set
echo $PRIVATE_KEY
echo $ARB_RPC_URL
```

### 2. See all available options
```bash
make help  # Shows all targets
```
---

## 📍 POSITION STRATEGY (AAVE + UNISWAP)

### Full Flow (Recommended)
```bash
# 1️⃣ Deploy
make deploy-position-strategy

# 2️⃣ Configure (optional, only if using CRE)
make configure-position-strategy
# or for full production setup:
make configure-position-strategy-full

# 3️⃣ Fund
make fund-position-strategy

# 4️⃣ Check balances
make check-position-strategy-balance

# 5️⃣ Execute
make execute-position-strategy

# 6️⃣ See results
make query-position-info
```

### Custom Parameters
```bash
# Execute with different amounts
make fund-position-strategy COLLATERAL_IN_ETH=2000000000000000000
make execute-position-strategy BORROW_AMOUNT_USDC=5000000000
```

---

## 🏦 GMX TRADING

### Full Flow
```bash
# 1️⃣ Deploy
make deploy-gmx-trading

# 2️⃣ Configure CRE (automatically integrates configure-cre.sh)
make configure-gmx-trading

# 3️⃣ Fund
make fund-gmx-trading

# 4️⃣ Execute (Long/Short/Close)
# Long position (default)
make execute-gmx-trading

# Short position
make execute-gmx-trading GMX_OPERATION=short GMX_IS_LONG=false

# Close position (requires GMX_SIZE_DELTA_USD = size to close)
make execute-gmx-trading GMX_OPERATION=close GMX_IS_LONG=false
```

### Queries (Monitoring)
```bash
# See open positions
make query-gmx-positions

# See pending orders
make query-gmx-orders

# See details of a specific order
make query-gmx-order-details GMX_ORDER_KEY=0x...
```

### Custom Parameters
```bash
# Trading with different amounts
make execute-gmx-trading \
  AMOUNT_IN_ETH=2000000000000000000 \
  GMX_SIZE_DELTA_USD=2000000000000000000000000000000 \
  GMX_OPERATION=long

# Change market
make execute-gmx-trading GMX_MARKET=0x...

# Specify prices
make execute-gmx-trading \
  GMX_TRIGGER_PRICE=5000000000000000000000000000000 \
  GMX_ACCEPTABLE_PRICE=4900000000000000000000000000000
```

---

## 🔍 Quick Monitoring

### Position Strategy
```bash
# Current status
make query-position-info
```

### GMX Trading
```bash
# Open positions
make query-gmx-positions

# Pending orders
make query-gmx-orders

# Full order details
make query-gmx-order-details GMX_ORDER_KEY=<key>
```

---

## ⚠️ Important Notes

### 1. Default Addresses
- **Position Strategy**: `0x1d315D963d7462F2931dF237B54736F90eE67faA`
- **GMX Executor**: `0x2157b12B8841B22A64aF4d049F2914829C8Fdc79`
- Customizable via variables

### 2. CRE Integration
- **Position Strategy**: Optional, uses `setCreForwarder()`
- **GMX Trading**: Automatic via `scripts/configure-cre.sh`
- CRE values in config variables

### 3. Default Amounts
- **Position Strategy**: 10 ETH collateral, 10k USDC borrow
- **GMX Trading**: 10 ETH size delta in USD, 1 ETH execution

### 4. Networks
- All configured for **Arbitrum**
- RPC: `$(ARB_RPC_URL)` from `.env`

---

## 🚨 Troubleshooting

### "No open positions"
Normal if first time. Run the flow first.

### "Error: PRIVATE_KEY not set"
```bash
export PRIVATE_KEY=0x...
# or add to .env
```

### "Invalid RPC URL"
```bash
# Verify
echo $ARB_RPC_URL
make query-position-info  # Quick test
```

### Orders don't appear
```bash
# Wait for block confirmations
sleep 30
make query-gmx-orders
```

---

## 📋 Execution Checklist


```
POSITION STRATEGY
[ ] make deploy-position-strategy
[ ] make fund-position-strategy
[ ] make check-position-strategy-balance
[ ] make execute-position-strategy
[ ] make query-position-info

GMX TRADING
[ ] make deploy-gmx-trading
[ ] make configure-gmx-trading
[ ] make fund-gmx-trading
[ ] make execute-gmx-trading GMX_OPERATION=long
[ ] make query-gmx-positions
[ ] make execute-gmx-trading GMX_OPERATION=close
[ ] make query-gmx-orders
```

---

## 📦 Contract Overview

### `src/strategy/StrategyExecutor.sol`
- Main executor for the AAVE + Uniswap/Sushi position flow.
- Supports direct/manual execution through `execute(...)`.
- Supports CRE callback execution through `onReport(...)`.
- Stores CRE security/config values (`creForwarder`, `creWorkflowId`, `creWorkflowOwner`) and validates sender on report reception.

### `src/strategy/GMXExecutor.sol`
- Dedicated executor for GMX v2 trading operations (long, short, close).
- Supports manual order creation (`createLongOrder`, `createShortOrder`, `createCloseOrder`).
- Supports CRE callback execution through `onReport(...)`, decoding report payload and creating the corresponding GMX order.
- Uses `CreOrderConfig` for execution-level parameters (vault, execution fee, callback config, referral code, etc.).

### `src/strategy/interfaces/IReceiver.sol`
- Minimal callback interface used by CRE receiver contracts.
- Standard entrypoint: `onReport(bytes metadata, bytes report)`.

### Related Base Modules
- `UniswapBase`, `SushiBase`, `AaveBase`, `ArbitrageCase` provide reusable DeFi primitives used by `StrategyExecutor`.
- GMX-specific interfaces (`IGMXExecutor`, `IGMXExchangeRouter`) encapsulate GMX request/route structures used by `GMXExecutor`.





