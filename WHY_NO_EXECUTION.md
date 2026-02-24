# Why Your Transactions Aren't Executing (and How to Fix It)

## Summary

Your workflow **simulates correctly** but transactions show `txHash: 0x000...` because:

1. **CRE Simulation ≠ Real Execution**: The simulator doesn't actually submit transactions to the blockchain
2. **Missing CRE Configuration**: Your executor contracts were deployed with `CRE_FORWARDER=0x0`, so real transactions would fail anyway

## What's Currently Happening

### In Simulation Mode (Current)
```
Workflow Simulation
    ↓ (offchain)
Gemini determines: SHORT
    ↓ (offchain)
Payload encoded: action=1, market=..., size=1500, prices=...
    ↓ (simulated)
writeReport called (but simulation skips actual blockchain call)
    ↓
Result: txHash = 0x000...000 (zero hash = no real execution)
```

### What Would Happen If Deployed (What We Want)
```
Real CRE Trigger (HTTP POST)
    ↓
Workflow runs on CRE network
    ↓
Gemini returns: { action: "short", ... }
    ↓
Action switcher validates: short ✓
    ↓
Payload encoded: 0x00<params>
    ↓
writeReport(receiver=GMXExecutor, report=0x00<params>)
    ↓
CRE submits transaction to Arbitrum
    ↓
CRE Forwarder calls: GMXExecutor.onReport(metadata, report)
    ↓
onReport validates CRE sender ✓, workflow ID ✓, owner ✓
    ↓
onReport decodes payload → action=SHORT
    ↓
Calls: createShortOrder(market, collateral, size, prices)
    ↓
GMX processes order ✓✓✓ (REAL EXECUTION)
    ↓
Event: CreReportConsumed(action=1, orderKey=0x..., size=1500, isLong=false)
```

## The Validation Chain That Must Work

Your `onReport` function performs these checks:

```solidity
// 1. Sender validation
if (creForwarder != address(0) && msg.sender != creForwarder) {
    revert InvalidCreSender(msg.sender, creForwarder);
}

// 2. Workflow ID validation
if (creWorkflowId != bytes32(0) && workflowId != creWorkflowId) {
    revert InvalidCreWorkflowId(workflowId, creWorkflowId);
}

// 3. Workflow owner validation
if (creWorkflowOwner != address(0) && workflowOwner != creWorkflowOwner) {
    revert InvalidCreWorkflowOwner(workflowOwner, creWorkflowOwner);
}

// 4. Order configuration
if (config.orderVault == address(0)) revert InvalidCreOrderVault();

// 5. Execution fee check
if (config.executionFee == 0) revert InvalidCreExecutionFee();
```

**Currently all these checks would PASS because:**
- ✓ `creForwarder = 0x0` (zero address check skipped)
- ✓ `creWorkflowId = 0x0` (zero check skipped)
- ✓ `creWorkflowOwner = 0x0` (zero check skipped)

**But validation should be STRICT in production**. Once set to real values, any mismatch will reject the transaction.

## Setup Required

### 1. Redeploy Executors with CRE_FORWARDER

Your current deployment (from broadcast logs):
```json
"arguments": [
  "0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41",      // GMX Router
  "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",      // GMX Router Spender
  "0x0000000000000000000000000000000000000000"        // ❌ CRE Forwarder (ZERO!)
]
```

You need:
```bash
export CRE_FORWARDER="0x..." # Get from CRE dashboard

forge script script/DeployGmxExecutor.s.sol \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 2. Configure Workflow Metadata

After new deployment, set the workflow values:

```bash
# Get these from your CRE deployment
export CRE_WORKFLOW_ID="0x1111111111111111111111111111111111111111111111111111111111111111"
export CRE_WORKFLOW_OWNER="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

# Run configuration
source scripts/configure-cre.sh
```

### 3. Set GMX Order Config

This is critical for `onReport` to execute:

```bash
cast send 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "setCreOrderConfig((address,address,address,address,address,uint256,uint256,uint256,uint256,bool,bool,bytes32,bool))" \
  "(
    0x...,                          // orderVault (required)
    0x...,                          // receiver
    0x...,                          // cancellationReceiver
    0x...,                          // callbackContract
    0x...,                          // uiFeeReceiver
    1000000000000000,               // executionFee (required, 0.001 ETH)
    2500000,                        // callbackGasLimit
    0,                              // minOutputAmount
    0,                              // validFromTime
    false,                          // shouldUnwrapNativeToken
    false,                          // autoCancel
    0x0,                            // referralCode
    true                            // closeIsLong (for close operations)
  )" \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY
```

### 4. Deploy Workflow to CRE

Once workflow is tested in simulation, deploy it:

```bash
cre workflow publish ./my-workflow -T staging-settings -e .env
```

### 5. Trigger for Real

Instead of simulation, send a real HTTP trigger to your CRE workflow:

```bash
curl -X POST https://your-cre-workflow-endpoint/trigger \
  -H "Content-Type: application/json" \
  -d '{"action":"long","minConfidence":60}'
```

## Verification Checklist

- [ ] CRE_FORWARDER is set to a real address (not 0x0)
- [ ] Executors redeployed with CRE_FORWARDER in constructor
- [ ] `setCreWorkflowId` called with your workflow ID
- [ ] `setCreWorkflowOwner` called with your account
- [ ] `setCreOrderConfig` called with valid GMX parameters
- [ ] GMX execution fee is > 0
- [ ] Order vault address is valid (not 0x0)
- [ ] Workflow deployed to CRE (cre workflow publish)
- [ ] HTTP trigger sent to real workflow (not simulation)

## Expected Result After Setup

When you send a real trigger, you should see:

1. Workflow logs show action resolution (short/long/close)
2. writeReport is called with encoded payload
3. Transaction submitted to Arbitrum
4. `GMXExecutor.onReport` receives the call
5. Validations pass
6. `createShortOrder` / `createLongOrder` executed
7. `CreReportConsumed` event emitted on-chain
8. GMX order visible in GMX interface
9. Real txHash (not 0x000...) in results

## Files You'll Need

- `CRE_SETUP_GUIDE.md` - Detailed setup instructions
- `scripts/configure-cre.sh` - Automation helper
- `src/strategy/GMXExecutor.sol` - Executor with onReport callback
- `my-workflow/config.staging.json` - Workflow config with CRE section

Good luck! This is a big milestone getting the full CRE → onchain flow working. 🚀
