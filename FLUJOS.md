# 🎯 Execution Flows - Convergence Strategy

## Overview
This Makefile organizes two main execution flows:
- **Position Strategy**: Leveraged trading AAVE + Sushi
- **GMX Trading**: Direct trading on GMX v2

Each flow has 5-6 phases: Deploy → Configure → Fund → Execute → Query → **Close**

---

## 🔧 Initial Setup

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

## 📍 POSITION STRATEGY (AAVE + SUSHI)

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

# 5️⃣ Execute (Open Position)
make execute-position-strategy

# 6️⃣ See results
make query-position-info

# 7️⃣ CLOSE POSITION (Repay Borrow + Withdraw Collateral)
make close-position-strategy
```

### Custom Parameters
```bash
# Execute with different amounts
make fund-position-strategy COLLATERAL_IN_ETH=2000000000000000000
make execute-position-strategy BORROW_AMOUNT_USDC=5000000000

# Close with dry-run first
make query-position-info  # See status before closing
make close-position-strategy
```

### Close Position Details
The `close-position-strategy` target will:
1. Repay all borrowed USDC (variable rate)
2. Withdraw all WETH collateral
3. Convert remaining WETH back to ETH
4. Display final account status

---

## 🏦 GMX TRADING

### Full Flow with Close
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

# 5️⃣ Check status
make query-gmx-positions
make query-gmx-orders

# 6️⃣ CLOSE POSITION (Market Decrease Order)
make close-gmx-position GMX_SIZE_DELTA_USD=1000000000000000000000000000000 GMX_IS_LONG=true
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

# Close a long position with specific size
make close-gmx-position \
  GMX_SIZE_DELTA_USD=1000000000000000000000000000000 \
  GMX_IS_LONG=true
```

### Close Position Details (GMX)
The `close-gmx-position` target will:
1. Create a **MarketDecrease** order (instant close)
2. Specify the exact size to close: `GMX_SIZE_DELTA_USD`
3. Set `isLong` parameter to match your position
4. Support partial closes
5. Emit `CreReportConsumed` event for CRE tracking

---

## 🔍 Quick Monitoring

### Position Strategy
```bash
# Current status
make query-position-info

# Before closing
make query-position-info  # Check health factor
make close-position-strategy
```

### GMX Trading
```bash
# Open positions
make query-gmx-positions

# Pending orders
make query-gmx-orders

# Full order details
make query-gmx-order-details GMX_ORDER_KEY=<key>

# Close with details
make close-gmx-position GMX_SIZE_DELTA_USD=<amount> GMX_IS_LONG=<true|false>
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

### 5. Permit2
- **Removed** - Not used in current execution flows
- Scripts use direct transfer model: deposit → transfer → execute

---

## 🚨 Troubleshooting

### Position Strategy Close
```bash
# Check debt status before closing
make query-position-info

# If insufficient balance to repay
# Fund more USDC: make fund-position-strategy-usdc

# If withdrawal fails
# Wait for health factor to improve or repay more debt
make close-position-strategy
```

### GMX Close Position
```bash
# Missing GMX_SIZE_DELTA_USD
make close-gmx-position GMX_SIZE_DELTA_USD=<required>

# Wrong isLong parameter
make close-gmx-position GMX_SIZE_DELTA_USD=<amount> GMX_IS_LONG=true  # for long
make close-gmx-position GMX_SIZE_DELTA_USD=<amount> GMX_IS_LONG=false # for short

# Orders don't execute
# Wait for block confirmations
sleep 30
make query-gmx-orders
make query-gmx-order-details GMX_ORDER_KEY=<key>
```

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

---

## 📋 Execution Checklist

For a judge evaluating the strategy:

```
POSITION STRATEGY - OPEN & CLOSE
[ ] make deploy-position-strategy
[ ] make fund-position-strategy
[ ] make check-position-strategy-balance
[ ] make execute-position-strategy
[ ] make query-position-info
[ ] make close-position-strategy

GMX TRADING - OPEN & CLOSE
[ ] make deploy-gmx-trading
[ ] make configure-gmx-trading
[ ] make fund-gmx-trading
[ ] make execute-gmx-trading GMX_OPERATION=long
[ ] make query-gmx-positions
[ ] make close-gmx-position GMX_SIZE_DELTA_USD=<amount> GMX_IS_LONG=true
[ ] make query-gmx-orders
```

---

## 🔗 Related Files
- **Makefile**: Definition of all targets
- **scripts/configure-cre.sh**: Automatic CRE configuration for GMX
- **script/PositionFlow.s.sol**: Open position script
- **script/ClosePositionFlow.s.sol**: Close position script (NEW)
- **script/TradingFlowGMX.s.sol**: GMX trading script
- **src/strategy/**: Smart contracts

---

Done. The Makefile is production-ready with complete close position support! 🎉
