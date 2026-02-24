# Strategy Architecture Reference (CRE Handoff)

Date: 2026-02-23  
Scope: authoritative English reference for contract roles, router instances, and function responsibilities.

## 1) High-Level Split

There are two independent execution surfaces:

1. **Uniswap-Sushi-Aave strategy surface** (`StrategyExecutor`):
   - Arbitrage via Aave flashloan.
   - Position flow (collateral -> borrow -> optional swap).

2. **GMX strategy surface** (`GMXExecutor`):
   - GMX v2 order creation (`long`, `short`, `close`) on Arbitrum.

This split is intentional: GMX order routing is isolated from the generic strategy executor.

## 2) Router and Instance Map

### `StrategyExecutor` constructor instances

- `uniswapRouter` -> stored as immutable `uniswap` (`IUniswap`):
  - **Entry point for Uniswap v3 swaps** (`exactInputSingle`) and multicall.
- `sushiRouter` -> stored as immutable `sushi` (`ISushi`):
  - **Entry point for Sushi v2 path swaps** (`swapExactTokensForTokens`).
- `aavePool` -> stored as immutable `aave` (`IAave`):
  - **Entry point for Aave v3 actions** (`supply`, `borrow`, `repay`, `flashLoanSimple`).
- `permit2Address` -> stored as immutable `permit2` (`IPermit2`):
  - **Entry point for signature-based token pull** into the executor.

### `GMXExecutor` constructor instances

- `router` -> stored as immutable `gmxRouter`; wrapped as immutable `exchangeRouter` (`IGMXExchangeRouter`):
  - **Entry point for GMX exchange router calls** (`sendWnt`, `sendTokens`, `createOrder`).
- `routerSpender` -> stored as immutable `gmxRouterSpender`:
  - **Approval target used before `sendTokens`**.
  - Critical detail: this is not always equal to `gmxRouter` and must match GMX router token spender.

### Operational addresses used by scripts/Makefile

- `GMX_ORDER_VAULT`: receiver for `sendWnt` execution fee and `sendTokens` collateral.
- `GMX_DATA_STORE`: read-only source for order/position diagnostics.
- `EXECUTOR` / `GMX_EXECUTOR`: deployed contract addresses used by flow scripts.

## 3) Contract-by-Contract Function Roles

### `src/strategy/StrategyExecutor.sol`

Role: main orchestrator for non-GMX execution.

#### Public functions

- `setOwner(address newOwner)`
  - Admin-only owner rotation (`onlyOwner`).
  - Does not gate execution functions.

- `execute(OperationType op, Action[] actions)`
  - Direct execution entrypoint.
  - Accepts only `Arbitrage` and `Position`.
  - Calls `_execute(...)` with `msg.sender` as beneficiary.

- `executeWithPermit(OperationType op, Action[] actions, Permit2Data permitData)`
  - Signature-funded execution entrypoint.
  - Validates permit payload, pulls funds through Permit2, then calls `_execute(...)`.

#### Internal orchestrator functions

- `_validatePermit(...)`
  - Verifies signer ownership and recipient target (`address(this)`).
  - For non-arbitrage ops, enforces token and amount alignment between permit and first action.

- `_execute(...)`
  - Dispatches by operation type.
  - `Arbitrage`: requires metadata + 2 legs and calls `_executeArbitrage(...)`.
  - `Position`: calls `_executePosition(...)`.
  - Emits `OperationExecuted`.

- `_pullWithPermit(...)`
  - Executes `permitTransferFrom` and emits pull event.

#### Strategy primitives inside `StrategyExecutor`

- `_swapByDex(...)`
  - Shared DEX switch:
    - `dexId = 0` -> Uniswap (`_uniswapSwapExactTokensForTokens`).
    - `dexId = 1` -> Sushi (`_sushiSwapExactTokensForTokens`).

- `_requestFlashloan(...)`
  - Bridges arbitrage request into Aave simple flashloan.

- `_aavePoolAddress()`
  - Exposes current Aave pool address to arbitrage callback guard logic.

- `_executePosition(...)`
  - Position flow implementation:
    1. Validate action count and required fields.
    2. Approve/supply collateral to Aave.
    3. Mark reserve as collateral.
    4. Borrow asset from Aave.
    5. Optionally swap borrowed amount via `_swapByDex`.
    6. Emit position lifecycle events.

### `src/strategy/ArbitrageCase.sol`

Role: abstract flashloan arbitrage engine and callback repayment logic.

- `_executeArbitrage(...)`
  - Validates legs, flash amount, and beneficiary.
  - Encodes two-leg context and requests flashloan.

- `executeOperation(...)`
  - Aave flashloan callback implementation.
  - Security checks:
    - caller must be Aave pool.
    - initiator must be `address(this)`.
  - Executes leg A then leg B swaps.
  - Repays `amount + premium`.
  - Sends positive residual profit to beneficiary.

### `src/strategy/AaveBase.sol`

Role: minimal Aave v3 wrapper used by strategy orchestrators.

- `_aaveSupply(...)`: wraps `aave.supply`.
- `_aaveSetUseReserveAsCollateral(...)`: toggles collateral usage.
- `_aaveBorrow(...)`: wraps variable-rate borrow.
- `_aaveRepay(...)`: wraps repayment and returns repaid amount.
- `_aaveFlashloanSimple(...)`: wraps simple flashloan entrypoint.

### `src/strategy/UniswapBase.sol`

Role: Uniswap v3 execution adapter.

- `_uniswapSwapExactTokensForTokens(...)`
  - Approves `tokenIn` to router.
  - Builds `ExactInputSingleParams`.
  - Calls `exactInputSingle` and returns amount out.

- `_uniswapMulticall(...)`
  - Pass-through wrapper for batch router calls.

### `src/strategy/SushiBase.sol`

Role: Sushi v2 execution adapter.

- `_sushiSwapExactTokensForTokens(...)`
  - Approves `tokenIn` to router.
  - Builds 2-token path `[tokenIn, tokenOut]`.
  - Calls `swapExactTokensForTokens` and returns last amount.

### `src/strategy/GMXExecutor.sol`

Role: GMX v2 order builder/sender.

#### Public functions

- `createLongOrder(CreateOrderRequest request)`
  - Requires `isLong = true`.
  - Allows only increase order types.
  - Calls `_createOrder(...)`.

- `createShortOrder(CreateOrderRequest request)`
  - Requires `isLong = false`.
  - Allows only increase order types.
  - Calls `_createOrder(...)`.

- `createCloseOrder(CreateOrderRequest request)`
  - Allows only decrease order types.
  - Calls `_createOrder(...)`.

#### Internal function

- `_createOrder(CreateOrderRequest request)`
  - Sends execution fee in WNT to order vault (`sendWnt`).
  - Approves collateral token to `gmxRouterSpender`.
  - Sends collateral token to order vault (`sendTokens`).
  - Calls GMX `createOrder` and returns `orderKey`.

## 4) Shared Types and Meaning

### `src/strategy/StrategyTypes.sol`

- `OperationType`
  - `Arbitrage`: flashloan two-leg cycle.
  - `Position`: collateral/borrow/swap style flow.

- `Action`
  - Generic step descriptor reused by arbitrage and position logic.
  - Important fields by context:
    - `dexId`: router selector.
    - `tokenIn`, `tokenOut`: swap leg assets.
    - `amountIn`: amount for supply/borrow/swap entry.
    - `minOut`: slippage floor for swap calls.
    - `fee`: Uniswap v3 fee tier.

- `Permit2Data`
  - Signature payload used by `executeWithPermit` to pull funding tokens.

## 5) Deploy and Wiring Context

### `script/DeployExecutor.s.sol`

- Instantiates `StrategyExecutor(uniswapRouter, sushiRouter, aavePool, permit2)`.
- Sources addresses from env vars with safe defaults from focus-address libraries.

### `script/DeployGmxExecutor.s.sol`

- Instantiates `GMXExecutor(gmxRouter, gmxRouterSpender)`.
- Explicitly validates both addresses are non-zero.

## 6) Practical Notes for Future Work

- Keep `StrategyExecutor` and `GMXExecutor` separated unless there is a deliberate product decision to merge.
- If execution starts failing on GMX transfers, check spender-target mismatch first (`gmxRouterSpender` approvals).
- If adding new operation types, update:
  1. `OperationType` enum.
  2. `_execute(...)` dispatch and guard clauses.
  3. Any flow scripts and Makefile targets using operation selectors.



