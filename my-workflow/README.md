# CRE Multi-Chain Strategy Workflow

This workflow does the following in one CRE flow:

1. Fetches historical OHLC candles from CoinGecko.
2. Sends market context to Gemini.
3. Returns strategy recommendations for:
   - Mainnet -> long-term positioning for Aave + Uniswap (`StrategyExecutor`).
   - Arbitrum -> active trading for GMX (`GMXExecutor`).

It supports two HTTP triggers:

- `position` trigger (Aave/Uniswap recommendation route).
- `trading` trigger (GMX route with typed action controls).

## Required secrets

Configure these secrets for simulation/deployment:

- `COINGECKO_API_KEY`
- `GEMINI_API_KEY`

Config files already reference these IDs:

- `config.staging.json`
- `config.production.json`

## HTTP trigger auth

Set your authorized EVM public key in `httpAuthorizedKeys` in config files (replace the placeholder `0x000...000`).

## Run locally

From `my-workflow`:

```bash
bun install
```

From project root (`Convergence`):

**Simulation mode (no on-chain execution, zero txHash):**
```bash
make workflow-simulate
```

**Broadcast mode (actual on-chain execution, real txHash):**
```bash
make workflow-simulate-broadcast
```

Or run directly:
```bash
# Simulates without executing transactions
cre workflow simulate ./my-workflow -T staging-settings -e .env -v

# Simulates AND executes transactions on-chain
cre workflow simulate ./my-workflow -T staging-settings -e .env -v --broadcast
```

### Key Difference

| Mode | Transactions | txHash | Use Case |
|------|---|---|---|
| `simulate` | Never executed | `0x000...000` | Development/testing |
| `simulate --broadcast` | Executed on-chain | Real hash | Testing with real transactions |
| `deploy` | Deployed to CRE | Real hash | Production |

The `--broadcast` flag is what enables **actual blockchain execution during simulation**. Without it, you get zero txHash.

## Optional HTTP payload

When using the `position` trigger, you can send:

```json
{
  "reason": "manual-check-before-open"
}
```

When using the `trading` trigger, you can send:

```json
{
  "reason": "manual-short-check",
  "action": "short",
  "minConfidence": 55
}
```

`action` is strictly validated and must be one of: `auto | long | short | close`.

## Execution toggle

- `enableExecution: true` enables `runtime.report + writeReport` for GMX recommendations.
- `defaultTradingMinConfidence` sets the default confidence threshold if `minConfidence` is not provided.
- `gmxExecution.chainSelectorName` and `gmxExecution.gasLimit` control EVM write target settings.
