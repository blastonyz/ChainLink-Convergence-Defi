# 🎯 Execution Flows - Convergence

## Overview
This Makefile organizes two main execution flows:
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
- **Position Strategy**: `0x194479f02940FEEfa34e5931d24992E89726c051`
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

For a judge evaluating the strategy:

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

## 🔗 Related Files
- **Makefile**: Definition of all targets
- **scripts/configure-cre.sh**: Automatic CRE configuration for GMX
- **src/strategy/**: Smart contracts
- **script/**: Forge scripts for execution


