#!/bin/bash

# CRE Executor Configuration Helper  
# This script configures deployed executors with CRE metadata

set -e

# Load .env if it exists - use proc substitution to convert line endings
if [ -f .env ]; then
    # Use sed to remove \r characters while sourcing
    source <(sed 's/\r$//' .env | grep -v '^$')
fi

# Defaults if not set (critical RPC_URL and EXECUTOR come from Makefile, NOT hardcoded here)
: ${PK:=}
: ${CRE_FORWARDER:=0xd770499057619c9a76205fd4168161cf94abc532}
: ${CRE_WORKFLOW_ID:=0x33317d48575741e79956a801306cdc72f9592f9e7745057a1488ccb2c4022665}
: ${GMX_ORDER_VAULT:=0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5}
: ${GMX_CANCELLATION_RECEIVER:=0x0000000000000000000000000000000000000000}
: ${GMX_CALLBACK_CONTRACT:=0x0000000000000000000000000000000000000000}
: ${GMX_UI_FEE_RECEIVER:=0x0000000000000000000000000000000000000000}
: ${GMX_EXECUTION_FEE:=1000000000000000}
: ${GMX_CALLBACK_GAS_LIMIT:=0}
: ${GMX_MIN_OUTPUT_AMOUNT:=0}
: ${GMX_VALID_FROM_TIME:=0}
: ${GMX_SHOULD_UNWRAP_NATIVE:=false}
: ${GMX_AUTO_CANCEL:=false}
: ${GMX_REFERRAL_CODE:=0x0000000000000000000000000000000000000000000000000000000000000000}

PRIVATE_KEY=${PRIVATE_KEY:-$PK}

echo "🔧 CRE Executor Configuration Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate required
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$GMX_EXECUTOR" ]; then
    echo "❌ Error: GMX_EXECUTOR not set (pass via Makefile or env)"
    exit 1
fi

if [ -z "$ARB_RPC_URL" ]; then
    echo "❌ Error: ARB_RPC_URL not set (pass via Makefile or env)"
    exit 1
fi

echo "✓ Configuration loaded"
echo ""

# Configure GMXExecutor
echo "📝 Configuring GMXExecutor at $GMX_EXECUTOR"
echo ""

echo "  → Setting CRE Forwarder..."
cast send "$GMX_EXECUTOR" "setCreForwarder(address)" "$CRE_FORWARDER" --rpc-url "$ARB_RPC_URL" --private-key "$PRIVATE_KEY"

echo ""
echo "  → Setting Workflow ID..."
cast send "$GMX_EXECUTOR" "setCreWorkflowId(bytes32)" "$CRE_WORKFLOW_ID" --rpc-url "$ARB_RPC_URL" --private-key "$PRIVATE_KEY"

echo ""
echo "  → Setting Workflow Owner..."
OWNER=$(cast wallet address --private-key "$PRIVATE_KEY")
cast send "$GMX_EXECUTOR" "setCreWorkflowOwner(address)" "$OWNER" --rpc-url "$ARB_RPC_URL" --private-key "$PRIVATE_KEY"

echo ""
echo "  → Setting Order Config..."
cast send "$GMX_EXECUTOR" \
  "setCreOrderConfig((address,address,address,address,uint256,uint256,uint256,uint256,bool,bool,bytes32,bool))" \
  "(0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5,0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000,1000000000000000,0,0,0,false,false,0x0000000000000000000000000000000000000000000000000000000000000000,false)" \
  --rpc-url "$ARB_RPC_URL" --private-key "$PRIVATE_KEY"

echo ""
echo "✅ GMXExecutor configuration complete!"
echo "🎉 All done! Your executor is ready for CRE callbacks."