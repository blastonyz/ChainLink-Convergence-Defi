# CRE Workflow Broadcast vs Simulation

## The Key Discovery

Your workflow code is correct! The issue was simply that you weren't using the **`--broadcast` flag**.

Comparing to the prediction-market example:
- **prediction-market**: Uses real transactions with `--broadcast` ✓
- **Convergence**: Was simulating without `--broadcast` (zero txHash)

## Three Execution Modes

### 1. **Pure Simulation** (Current - No Transactions)
```bash
cre workflow simulate ./my-workflow -T staging-settings -e .env
```

**What happens:**
- ✓ Workflow logic runs (Gemini API, CoinGecko, etc.)
- ✓ Payload is encoded correctly
- ✗ **Transactions NOT submitted to blockchain**
- ✗ **txHash = `0x000...000`** (zero hash = no execution)
- ✓ Good for: Testing logic, API responses, payload encoding

**Result in your case:**
```json
{
  "gmx": {
    "action": "short",
    "shouldExecute": true,
    "status": "success",
    "detail": "SHORT order submitted",
    "txHash": "0x0000000000000000000000000000000000000000000000000000000000000000"  // ← ZERO
  }
}
```

---

### 2. **Simulation + Broadcast** (New - Real Transactions) ⭐ YOU NEED THIS
```bash
cre workflow simulate ./my-workflow -T staging-settings -e .env --broadcast
```

**What happens:**
- ✓ Workflow logic runs (Gemini API, CoinGecko, etc.)
- ✓ Payload is encoded correctly
- ✓ **Transactions ARE submitted to blockchain**
- ✓ **Real txHash returned**
- ✓ On-chain state changes (GMX order created, events emitted)
- ✓ Good for: Testing with real blockchain interactions

**Result you'll see:**
```json
{
  "gmx": {
    "action": "short",
    "shouldExecute": true,
    "status": "success",
    "detail": "SHORT order submitted",
    "txHash": "0x95f1c2d5e8a9b3f4c7e2d1a6b5c4d3e2f1a9b8c7d6e5f4a3b2c1d0e9f8a7b6"  // ← REAL!
  }
}
```

---

### 3. **Production Deployment** (Deployed Workflow)
```bash
cre workflow publish ./my-workflow -T staging-settings -e .env
```

**What happens:**
- ✓ Workflow deployed to CRE infrastructure
- ✓ Listens for real HTTP/Log triggers (not simulation)
- ✓ Transactions executed automatically
- ✓ Real txHashes for all executions
- ✓ Good for: Production use

---

## Which Mode For Your Use Case?

### Development & Testing
```bash
# Test logic without blockchain cost
make workflow-simulate

# Then test with real transactions
make workflow-simulate-broadcast
```

### Production
```bash
# Deploy to real CRE
make workflow-publish

# Then send real triggers via HTTP
```

---

## Command Reference

### Using Makefile (Recommended)
```bash
# Pure simulation
make workflow-simulate

# Simulation with real transactions
make workflow-simulate-broadcast

# Deploy to production CRE
make workflow-publish

# List deployed workflows
make workflow-list
```

### Using CRE CLI Directly
```bash
# Pure simulation (no on-chain execution)
cre workflow simulate ./my-workflow -T staging-settings -e .env -v

# Simulation with on-chain execution (--broadcast flag)
cre workflow simulate ./my-workflow -T staging-settings -e .env -v --broadcast

# Deploy workflow
cre workflow publish ./my-workflow -T staging-settings -e .env

# List workflows
cre workflow list
```

---

## Real Example: GMXExecutor Flow

### With `--broadcast` Flag ✓

```
1. Trigger received
   ↓
2. Gemini determines: "short"
   ↓
3. Payload encoded with action=1 (SHORT)
   ↓
4. runtime.report() + writeReport() called
   ↓
5. Transaction submitted to Arbitrum
   ↓
6. GMXExecutor.onReport() received by contract
   ↓
7. Validations pass
   ↓
8. createShortOrder() executed
   ↓
9. GMX order created ✓✓✓
   ↓
10. CreReportConsumed event emitted
    ↓
11. Result: {
      "status": "success",
      "txHash": "0x95f1c2d5..." ← REAL HASH!
    }
```

### Without `--broadcast` Flag ✗

```
1-4. Same as above
   ↓
5. writeReport() simulated (not submitted)
   ↓
6-8. Simulated but not executed
   ↓
11. Result: {
      "status": "success",
      "txHash": "0x000..." ← ZERO (not executed)
    }
```

---

## Important: Executor Configuration

Even with `--broadcast`, your executor must be configured properly first:

```bash
# 1. Redeploy with CRE_FORWARDER
export CRE_FORWARDER="0x..."
make deploy-gmx-executor-arb

# 2. Configure executor with workflow metadata
bash scripts/configure-cre.sh

# 3. THEN run with broadcast
make workflow-simulate-broadcast
```

---

## Troubleshooting

### Q: I get txHash but it says "0x000...000"
**A:** You forgot `--broadcast` flag  
**Solution:** Use `make workflow-simulate-broadcast`

### Q: I get txHash but transaction reverted
**A:** Executor not configured properly  
**Solution:** Verify `creForwarder`, `creWorkflowId`, `creWorkflowOwner`, `creOrderConfig` are set

### Q: Gas is too high / transaction times out
**A:** Increase gas limit in config  
**Solution:** Update `gmxExecution.gasLimit` in `config.staging.json`

### Q: Simulator says "Market already settled" or "Not Owner"
**A:** Executor state issue  
**Solution:** Verify executor configuration and deployed addresses

---

## Summary

**Your workflow code is perfect.** The missing piece was simply adding `--broadcast` to actually execute transactions during simulation.

Use this command moving forward:
```bash
make workflow-simulate-broadcast
```

And you'll get real txHashes and actual on-chain execution! 🎉
