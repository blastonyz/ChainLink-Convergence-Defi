# Quick Action Plan: Complete Your CRE Integration

## 🎯 Your Goal
Make real on-chain GMX trades execute automatically when your CRE workflow triggers

## 📋 What You Have Now ✓
- ✅ Workflow logic (Gemini + CoinGecko OHLC)
- ✅ Action switcher (short/long/close resolution)
- ✅ GMXExecutor with `onReport` callback (IReceiver)
- ✅ Payload encoding (viem encodeAbiParameters)
- ✅ Simulation shows correct workflow execution

## ❌ What's Missing
- ❌ CRE Forwarder address in executor (currently 0x0)
- ❌ Workflow ID configuration in executor
- ❌ Workflow owner configuration in executor
- ❌ GMX order configuration (vault, execution fee, etc.)
- ❌ Workflow deployed to real CRE (only simulated)

---

## 🚀 5 Steps to Complete Integration

### STEP 1: Get CRE Deployment Details
**Time: 5 minutes**

Find these from your CRE deployment:
1. **CRE Forwarder Address** - The address that receives your reports and calls `onReport`
   - Check your CRE deployment dashboard
   - Format: `0x...` (42 characters)
   
2. **Workflow ID** - Your deployed workflow's unique identifier
   - From CRE: `cre workflow list` or dashboard
   - Format: `0x...` (66 characters, 32 bytes)
   
3. **Workflow Owner** - Your account address
   - Same as the account deploying the workflow
   - Format: `0x...` (42 characters)

4. **GMX Order Vault** - Where GMX orders are placed
   - For Arbitrum: `0x6324340f3271b0263a05f4e50b50d475d426c08c`

**Save these to a safe place** (you'll reuse them)

---

### STEP 2: Redeploy GMXExecutor with CRE Forwarder
**Time: 2 minutes + chain confirmation**

```bash
cd /path/to/Convergence

export PRIVATE_KEY="0x..."                                    # Your private key
export CRE_FORWARDER="0x..."                                  # From STEP 1
export GMX_ROUTER="0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41"
export GMX_ROUTER_SPENDER="0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6"

make deploy-gmx-executor-arb
```

**Save the new address printed in the output**

Example output:
```
GMXExecutor deployed at 0xNewAddress...
```

---

### STEP 3: Configure Executor with Workflow Metadata
**Time: 3 minutes + chain confirmations**

**Option A: Manual (using cast)**

```bash
export RPC="https://arbitrum.llamarpc.com"
export PRIVATE_KEY="0x..."
export GMX_EXECUTOR="0x..."  # From STEP 2
export CRE_FORWARDER="0x..."  # From STEP 1
export CRE_WORKFLOW_ID="0x1111111111111111111111111111111111111111111111111111111111111111"
export CRE_WORKFLOW_OWNER="0xaaaa..."  # From STEP 1

# Set forwarder
cast send $GMX_EXECUTOR "setCreForwarder(address)" $CRE_FORWARDER \
  --rpc-url $RPC --private-key $PRIVATE_KEY

# Set workflow ID
cast send $GMX_EXECUTOR "setCreWorkflowId(bytes32)" $CRE_WORKFLOW_ID \
  --rpc-url $RPC --private-key $PRIVATE_KEY

# Set workflow owner
cast send $GMX_EXECUTOR "setCreWorkflowOwner(address)" $CRE_WORKFLOW_OWNER \
  --rpc-url $RPC --private-key $PRIVATE_KEY
```

**Option B: Automated (using helper script)**

```bash
export PRIVATE_KEY="0x..."
export CRE_FORWARDER="0x..."
export CRE_WORKFLOW_ID="0x..."
export CRE_WORKFLOW_OWNER="0x..."
export GMX_EXECUTOR="0x..."

bash scripts/configure-cre.sh
```

---

### STEP 4: Configure GMX Order Parameters
**Time: 2 minutes + chain confirmation**

```bash
export RPC="https://arbitrum.llamarpc.com"
export PRIVATE_KEY="0x..."
export GMX_EXECUTOR="0x..."  # From STEP 2

cast send $GMX_EXECUTOR \
  "setCreOrderConfig((address,address,address,address,address,uint256,uint256,uint256,uint256,bool,bool,bytes32,bool))" \
  "(
    0x6324340f3271b0263a05f4e50b50d475d426c08c,  // orderVault (Arbitrum standard)
    0x0000000000000000000000000000000000000000,  // receiver (contract itself)
    0x0000000000000000000000000000000000000000,  // cancellationReceiver
    0x0000000000000000000000000000000000000000,  // callbackContract
    0x0000000000000000000000000000000000000000,  // uiFeeReceiver
    1000000000000000,                            // executionFee (0.001 ETH)
    2500000,                                     // callbackGasLimit
    0,                                           // minOutputAmount
    0,                                           // validFromTime
    false,                                       // shouldUnwrapNativeToken
    false,                                       // autoCancel
    0x0,                                        // referralCode
    true                                         // closeIsLong
  )" \
  --rpc-url $RPC --private-key $PRIVATE_KEY
```

---

### STEP 5: Deploy Workflow to CRE (Stop Simulating)
**Time: 5 minutes**

```bash
cd my-workflow

# Publish/deploy your workflow to CRE
cre workflow publish \
  --workflow-directory . \
  --config staging-settings \
  --env-file ../.env \
  --version 2.0.0
```

This will output your **CRE Workflow ID** - save it!

---

## ✅ Verification

### Before You Submit Real Triggers

```bash
export RPC="https://arbitrum.llamarpc.com"
export GMX_EXECUTOR="0x..."  # Your new executor address

# Check forwarder is set
cast call $GMX_EXECUTOR "creForwarder()(address)" --rpc-url $RPC
# Should NOT be: 0x0000000000000000000000000000000000000000

# Check workflow ID is set
cast call $GMX_EXECUTOR "creWorkflowId()(bytes32)" --rpc-url $RPC
# Should NOT be: 0x0000000000000000000000000000000000000000000000000000000000000000

# Check workflow owner is set
cast call $GMX_EXECUTOR "creWorkflowOwner()(address)" --rpc-url $RPC
# Should NOT be: 0x0000000000000000000000000000000000000000

# Check order config is set
cast call $GMX_EXECUTOR "creOrderConfig()(address,address,address,address,address,uint256,uint256,uint256,uint256,bool,bool,bytes32,bool)" --rpc-url $RPC
# orderVault should be: 0x6324340f3271b0263a05f4e50b50d475d426c08c
# executionFee should be: 1000000000000000
```

All should be non-zero and correct!

---

## 🔄 What Happens Next

### Before (Simulation Mode)
```
Trigger (HTTP) → Workflow simulates → writeReport simulated → txHash: 0x000...
```

### After (Real Mode)
```
Trigger (HTTP) 
  → Workflow runs on CRE network
    → Gemini API called
      → Action determined (short/long/close)
        → Payload encoded
          → writeReport submitted (REAL transaction)
            → CRE Forwarder calls onReport on Arbitrum
              → onReport validates sender/workflow/owner
                → createShortOrder/createLongOrder called
                  → GMX order created ✓✓✓
                    → CreReportConsumed event emitted
                      → Real txHash returned
```

---

## 📞 Troubleshooting

### "Variable expr_38823_mpos is 1 too deep in the stack"
✅ **Already Fixed** - Added `"memory-safe"` to assembly blocks

### "InvalidCreSender" when real tx runs
- CRE_FORWARDER address doesn't match
- Verify with: `cast call $GMX_EXECUTOR "creForwarder()(address)"`

### "InvalidCreWorkflowId" when real tx runs
- Workflow ID doesn't match your deployed workflow
- Verify with: `cast call $GMX_EXECUTOR "creWorkflowId()(bytes32)"`

### "InvalidCreOrderVault"
- Order config not set (STEP 4 skipped)
- Verify with: `cast call $GMX_EXECUTOR "creOrderConfig()..."`

### Still seeing txHash: 0x000...
- Workflow still in simulation (not deployed to CRE)
- Still sending to simulator instead of real CRE
- Check: Are you using `cre workflow publish`? Not `cre workflow simulate`?

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Workflow deployed to CRE (real, not simulation)
2. ✅ HTTP trigger received by real workflow
3. ✅ Logs show action resolution (short/long/close)
4. ✅ Transaction submitted to Arbitrum (real txHash)
5. ✅ GMXExecutor.onReport called successfully
6. ✅ GMX order created
7. ✅ CreReportConsumed event emitted
8. ✅ Order visible in GMX interface

---

## 📚 Reference Files

- **Setup Guide**: [CRE_SETUP_GUIDE.md](./CRE_SETUP_GUIDE.md)
- **Why No Execution**: [WHY_NO_EXECUTION.md](./WHY_NO_EXECUTION.md)
- **GMXExecutor**: [src/strategy/GMXExecutor.sol](./src/strategy/GMXExecutor.sol)
- **Config Helper**: [scripts/configure-cre.sh](./scripts/configure-cre.sh)

---

**Questions? Check the detailed guides above or review your CRE deployment dashboard.**

Let's get those trades executing! 🚀
