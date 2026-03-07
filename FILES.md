# Chainlink / CRE File Index (Convergence)

This list includes the files that use Chainlink services directly (CRE SDK, workflow simulation/publish, report delivery/reception), plus the modularized `my-workflow/shared` layer that supports the CRE flow.

Repository base used for links:
`https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/`

## 1) Workflow Entry, Triggers, and Orchestration

CRE runner bootstrap.
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/my-workflow/main.ts

HTTP trigger handlers and authorized key wiring (`HTTPCapability`).
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/my-workflow/httpTriggers.ts

Core strategy flow: market fetch + model call + execution decision + operation logs.
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/my-workflow/strategyFlow.ts


## 2) Shared Module Layer (Modularized in `my-workflow/shared`)

Shared architecture root (data, prompt, parsers, execution) used by the workflow.
https://github.com/blastonyz/ChainLink-Convergence-Defi/tree/main/my-workflow/shared


## 3) On-Chain Receivers (Contracts)

GMX receiver contract with CRE `onReport` callback and CRE config setters.
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/src/strategy/GMXExecutor.sol

Position receiver contract with CRE `onReport` callback and CRE config setters.
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/src/strategy/StrategyExecutor.sol

Shared receiver interface for CRE callbacks.
https://github.com/blastonyz/ChainLink-Convergence-Defi/blob/main/src/strategy/interfaces/IReceiver.sol


## 5) Pinned Example Transactions

GMX Short Tx
https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x6dfdb8630fd8decbdd720952f0509de9c527ed76353151a8c43e81661aee77d0

AAVE+UNISWAP Short Tx
https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x6d4fd62beedbb9d424a3c3b8c1fc6ac40a64101656ef609773827338371e6108

AAVE+UNISWAP Short Tx
https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0xc9c82a2e4c5d0eb56a7805a5391dea95b88c236218cf5854083c9b8f1740989a

GMX Executor - Contract Creation Tx
https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x46ec469e9ddae03c278dfccde239c8528e5b5f0ab0d2b85e4c734ad481ac9f9d

AAVE+UNISWAP StrategyExecutor - Contract Creation Tx
https://dashboard.tenderly.co/explorer/vnet/ecbbba79-a3a5-42d7-bf6c-e7a7656bb0ae/tx/0x0d0f7b373f17688bb843570a72d0d5df4e71fb9ff6262c7a7b3cbc3cdcb7dd8b