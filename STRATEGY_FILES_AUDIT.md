# Strategy Files Audit (CRE Handoff)

Date: 2026-02-23  
Scope: documentation and ghost-code audit for the strategy files discussed in this window.

## 1) File Responsibilities

### src/strategy/GMXExecutor.sol
- Role: GMX v2 execution adapter.
- Current surface: **non-Permit2 order flow only**:
  - `createLongOrder`
  - `createShortOrder`
  - `createCloseOrder`
- Key fix kept: token approvals are sent to `gmxRouterSpender` (not `gmxRouter`) to avoid allowance mismatch during `sendTokens`.

### src/strategy/StrategyExecutor.sol
- Role: high-level strategy orchestrator for `OperationType` (`Arbitrage`, `Position`, `Trading`).
- Keeps internal `_executePosition(...)` path (Aave + optional swap).
- Keeps `executeWithPermit(...)` for this executor path.

### src/strategy/StrategyTypes.sol
- Shared data model:
  - `OperationType`
  - `Action`
  - `Permit2Data`

### src/strategy/UniswapBase.sol
- Uniswap v3 wrapper for exact-input-single swap.

### src/strategy/SushiBase.sol
- Sushi wrapper for exact token swap through a 2-token path.

### src/strategy/AaveBase.sol
- Aave v3 wrapper (`supply`, `borrow`, `repay`, `flashLoanSimple`).

### src/strategy/TradingCase.sol
- Multi-step trading engine over `Action[]` with rolling amount forwarding.

### src/strategy/ArbitrageCase.sol
- Flashloan arbitrage engine and Aave callback repayment/profit handling.

