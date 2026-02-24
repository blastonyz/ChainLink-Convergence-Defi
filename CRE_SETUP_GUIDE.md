# CRE Integration Setup Guide

## Problem
The workflow simulates successfully with a `SHORT order submitted` message, but shows a zero txHash (`0x000...000`). This is because:
1. **Simulation ≠ Real Execution**: CRE simulation mode doesn't execute actual on-chain transactions
2. **Missing CRE Configuration**: Your executor contracts were deployed with `CRE_FORWARDER=0x0`, so even real transactions would fail validation in `onReport`

## Solution: Complete Integration Flow

### Step 1: Identify Your CRE Deployment Details

You need these values from your CRE setup:
- **CRE Forwarder Address**: The address that will call `onReport` on your contracts
- **Workflow ID**: Your deployed workflow's ID (usually in CRE dashboard)
- **Workflow Owner**: The account that owns the workflow

### Step 2: Re-deploy Executors with CRE Configuration

#### Option A: Redeploy GMXExecutor with CRE Forwarder
```bash
export CRE_FORWARDER="0x..." # Get this from your CRE deployment
export PRIVATE_KEY="0x..."
export GMX_ROUTER="0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41"
export GMX_ROUTER_SPENDER="0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6"

forge script script/DeployGmxExecutor.s.sol \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY \
  --broadcast
```

#### Option B: Redeploy StrategyExecutor with CRE Forwarder
```bash
export CRE_FORWARDER="0x..."
export SUSHI_ROUTER="0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
export GMX_ROUTER="0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41"
export PRIVATE_KEY="0x..."

forge script script/DeployExecutor.s.sol \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Step 3: Configure Executors with Workflow Metadata

After deployment, configure each executor with workflow IDs and owners:

#### For GMXExecutor:
```bash
# Set workflow ID
cast send 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "setCreWorkflowId(bytes32)" \
  "0x1111111111111111111111111111111111111111111111111111111111111111" \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY

# Set workflow owner  
cast send 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "setCreWorkflowOwner(address)" \
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY

# Set order config (required for onReport to execute)
cast send 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "setCreOrderConfig((address,address,address,address,address,uint256,uint256,uint256,uint256,bool,bool,bytes32,bool))" \
  "(0x6324340f3271b0263a05f4e50b50d475d426c08c, 0x..., 0x..., 0x..., 0x..., 1000000000000000, 0, 0, 0, false, false, 0x0, true)" \
  --rpc-url https://arbitrum.llamarpc.com \
  --private-key $PRIVATE_KEY
```

### Step 4: Verify the Integration

**Check GMXExecutor config:**
```bash
cast call 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "creForwarder()(address)" \
  --rpc-url https://arbitrum.llamarpc.com

cast call 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "creWorkflowId()(bytes32)" \
  --rpc-url https://arbitrum.llamarpc.com

cast call 0xB4e8A3B1f2F5b206dFC96A8Db9fC46caf59be5A1 \
  "creWorkflowOwner()(address)" \
  --rpc-url https://arbitrum.llamarpc.com
```

### Step 5: How It Will Work End-to-End

1. **Real Trigger** → Your deployed CRE workflow receives a real HTTP trigger (not simulation)
2. **Offchain Execution** → Workflow runs, calls Gemini, determines action (short/long/close)
3. **Payload Encoding** → Workflow encodes payload with action, market, sizes, prices
4. **CRE writeReport** → Workflow calls `writeReport` with the encoded payload
5. **Onchain Callback** → CRE Forwarder calls `executor.onReport(metadata, report)` with the payload
6. **Execution** → `onReport` decodes payload and executes GMX order via `createShortOrder/createLongOrder/createCloseOrder`
7. **Confirmation** → GMX order is submitted on-chain, emits `CreReportConsumed` event

## Key Differences: Simulation vs Real Execution

| Aspect | Simulation | Real Execution |
|--------|-----------|-----------------|
| txHash | All zeros (`0x000...`) | Real tx hash |
| Forwarder Validation | Skipped | Must match `creForwarder` |
| Workflow ID Check | Skipped | Must match `creWorkflowId` |
| On-chain Effects | None | GMX order created, tokens transferred |
| Gas Cost | Free | Actual gas fees |

## Troubleshooting

### Error: `InvalidCreSender`
- **Cause**: CRE Forwarder address doesn't match
- **Fix**: Verify CRE deployment gives you the correct forwarder address

### Error: `InvalidCreWorkflowId`  
- **Cause**: Workflow ID mismatch
- **Fix**: Call `setCreWorkflowId` with the correct workflow ID from CRE dashboard

### Error: `InvalidCreOrderVault`
- **Cause**: Order config not set
- **Fix**: Call `setCreOrderConfig` with proper GMX order vault and execution fee

### Transaction Still Not Executing
1. Check the Arbitrum chain selector is correct in your workflow config
2. Verify gas parameters: `gmxExecution.gasLimit` should be at least 2.5M
3. Ensure executor has WETH balance for the execution fee
4. Check that GMX market and collateral token addresses are valid

## Next Steps

1. **Get CRE Forwarder** from your CRE deployment
2. **Re-deploy executors** with `CRE_FORWARDER` env var set
3. **Configure workflow metadata** using the setter functions
4. **Set order config** with GMX parameters (vault, execution fee, etc.)
5. **Deploy workflow** to CRE (move beyond simulation)
6. **Send real trigger** to your deployed workflow
7. **Monitor events**: Watch for `CreReportConsumed` events on-chain
