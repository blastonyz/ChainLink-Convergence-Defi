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

## 🔗 Related Files
- **Makefile**: Definition of all targets
- **scripts/configure-cre.sh**: Automatic CRE configuration for GMX
- **src/strategy/**: Smart contracts
- **script/**: Forge scripts for execution


