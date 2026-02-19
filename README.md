## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://paritytech.github.io/foundry-book-polkadot/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```


## ROCKET POOL

Storage
Storage
Type
Protocol
Name
RocketStorage
Mainnet
0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46
Hoodi
0x594Fb75D3dc2DFa0150Ad03F99F97817747dd4E1
Deposit
Deposit
Type
Protocol
Name
RocketDepositPool
Mainnet
0xDD3f50F8A6CafbE9b31a427582963f465E745AF8
Hoodi
0x594Fb75D3dc2DFa0150Ad03F99F97817747dd4E1
RPL Token
RPL Token
Type
Token
Name
RocketTokenRPL
Mainnet
0xD33526068D116cE69F19A9ee46F0bd304F21A51f
Hoodi
0x1Cc9cF5586522c6F483E84A19c3C2B0B6d027bF0
rETH Token
rETH Token
Type
Token
Name
RocketTokenRETH
Mainnet
0xae78736Cd615f374D3085123A210448E74Fc6393
Hoodi
0x7322c24752f79c05FFD1E2a6FCB97020C1C264F1
Exchanges

## Address Registry (Hackathon DeFi Integrator)

- Frontend JSON (separado por red):
	- `data/networks/index.json`
	- `data/networks/sepolia.json`
	- `data/networks/arbitrum-sepolia.json`
- Libraries Solidity por red:
	- `src/libraries/addresses/SepoliaAddresses.sol`
	- `src/libraries/addresses/ArbitrumSepoliaAddresses.sol`
	- `src/libraries/addresses/DeFiAddresses.sol`

### Notas

- Este catálogo es estático y debe actualizarse si cambian deployments en testnet.
- En Arbitrum Sepolia, algunas direcciones pueden ser bridged o experimentales; validar con docs/faucet antes de usar en demos críticas.
- Rocket Pool no está estandarizado en Sepolia / Arbitrum Sepolia para este setup y se deja referenciado como pendiente.
- Para mantener versatilidad sin crecer demasiado, mantener activas 2-4 testnets máximo y priorizar Base Sepolia / Unichain Sepolia como siguientes candidatas.