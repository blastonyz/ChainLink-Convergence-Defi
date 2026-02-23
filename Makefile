include .env

MAINNET_RPC_URL ?= $(VIR_RPC_URL)
RPC_URL ?= $(MAINNET_RPC_URL)
PRIVATE_KEY ?= $(PK)
EXECUTOR_MAINNET ?= 0xdc7a67547ADDB28B8334ae9C046426Ca87B35227
EXECUTOR_ARB ?= 0xdc7a67547ADDB28B8334ae9C046426Ca87B35227
GMX_EXECUTOR ?= 0x21131aB05A31E97902e04f9dA60a2D53ADD82121
EXECUTOR ?= $(EXECUTOR_MAINNET)
SUSHI_ROUTER ?= 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F
GMX_ROUTER ?= 0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41
GMX_ROUTER_SPENDER ?= 0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6
GMX_DATA_STORE ?= 0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8
BENEFICIARY ?= $(shell cast wallet address --private-key $(PRIVATE_KEY) 2> /dev/null)
FLASH_AMOUNT_USDC ?= 1000000000
MIN_WETH_OUT ?= 0
MIN_USDC_OUT ?= 0
FLASH_FEE_BPS ?= 5
MIN_PROFIT_BPS ?= 0
FEE_USDC_TO_ETH ?= 3000
FEE_ETH_TO_USDC ?= 3000
START_ON_UNISWAP ?= true
AUTO_TUNE_FLASH ?= true
FAIL_IF_NO_OPPORTUNITY ?= false
BORROW_AMOUNT_USDC ?= 1000000000
COLLATERAL_IN_ETH ?= 1000000000000000000
FEE_USDC_TO_WETH ?= 3000
WETH_TOKEN ?= 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
GMX_ORDER_VAULT ?= 0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5
GMX_MARKET ?= 0x70d95587d40A2caf56bd97485aB3Eec10Bee6336
GMX_OPERATION ?= long
GMX_ORDER_TYPE ?= market-increase
GMX_RECEIVER ?= $(GMX_EXECUTOR)
GMX_CANCELLATION_RECEIVER ?= 0x0000000000000000000000000000000000000000
GMX_CALLBACK_CONTRACT ?= 0x0000000000000000000000000000000000000000
GMX_UI_FEE_RECEIVER ?= 0x0000000000000000000000000000000000000000
GMX_COLLATERAL_TOKEN ?= $(WETH_TOKEN)
GMX_COLLATERAL_AMOUNT ?= $(AMOUNT_IN_ETH)
GMX_EXECUTION_FEE ?= 1000000000000000
GMX_SIZE_DELTA_USD ?= 1000000000000000000000000000000
GMX_INITIAL_COLLATERAL_DELTA ?= 0
GMX_TRIGGER_PRICE ?= 4000000000000000000000000000000
GMX_ACCEPTABLE_PRICE ?= 4000000000000000000000000000000
GMX_CALLBACK_GAS_LIMIT ?= 0
GMX_MIN_OUTPUT_AMOUNT ?= 0
GMX_VALID_FROM_TIME ?= 0
GMX_IS_LONG ?= true
GMX_SHOULD_UNWRAP_NATIVE ?= false
GMX_AUTO_CANCEL ?= false
GMX_REFERRAL_CODE ?= 0x0000000000000000000000000000000000000000000000000000000000000000
AMOUNT_IN_ETH ?= 10000000000000000000
AAVE_POOL ?= 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
POSITION_ACCOUNT ?= $(EXECUTOR_MAINNET)
GMX_POSITION_ACCOUNT ?= $(GMX_EXECUTOR)
GMX_POSITION_KEY ?=
GMX_ORDER_KEY ?=

define GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET
encoded_list=$$(cast abi-encode 'f(string)' 'ACCOUNT_POSITION_LIST'); \
list_const=$$(cast keccak $$encoded_list); \
encoded_key=$$(cast abi-encode 'f(bytes32,address)' $$list_const $(GMX_POSITION_ACCOUNT)); \
list_key=$$(cast keccak $$encoded_key)
endef

define GMX_ACCOUNT_ORDER_LIST_KEY_SNIPPET
encoded_list=$$(cast abi-encode 'f(string)' 'ACCOUNT_ORDER_LIST'); \
list_const=$$(cast keccak $$encoded_list); \
encoded_key=$$(cast abi-encode 'f(bytes32,address)' $$list_const $(GMX_POSITION_ACCOUNT)); \
list_key=$$(cast keccak $$encoded_key)
endef

.PHONY: deploy-executor deploy-executor-mainnet deploy-executor-arb deploy-gmx-executor-preflight deploy-gmx-executor-arb arbitrage-flow position-flow trading-flow trading-flow-preflight position-info gmx-position-key gmx-position-count gmx-position-keys gmx-order-keys gmx-order-raw gmx-order-position-key gmx-position-raw gmx-position-metrics

deploy-executor:
	PRIVATE_KEY=$(PRIVATE_KEY) SUSHI_ROUTER=$(SUSHI_ROUTER) GMX_ROUTER=$(GMX_ROUTER) forge script script/DeployExecutor.s.sol --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

deploy-executor-mainnet:
	PRIVATE_KEY=$(PRIVATE_KEY) SUSHI_ROUTER=$(SUSHI_ROUTER) GMX_ROUTER=$(GMX_ROUTER) forge script script/DeployExecutor.s.sol --rpc-url $(MAINNET_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

deploy-executor-arb:
	PRIVATE_KEY=$(PRIVATE_KEY) SUSHI_ROUTER=$(SUSHI_ROUTER) GMX_ROUTER=$(GMX_ROUTER) forge script script/DeployExecutor.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

deploy-gmx-executor-arb:
	PRIVATE_KEY=$(PRIVATE_KEY) GMX_ROUTER=$(GMX_ROUTER) GMX_ROUTER_SPENDER=$(GMX_ROUTER_SPENDER) forge script script/DeployGmxExecutor.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

trading-flow: 
	PRIVATE_KEY=$(PRIVATE_KEY) GMX_EXECUTOR=$(GMX_EXECUTOR) WETH_TOKEN=$(WETH_TOKEN) AMOUNT_IN_ETH=$(AMOUNT_IN_ETH) GMX_OPERATION=$(GMX_OPERATION) GMX_ORDER_TYPE=$(GMX_ORDER_TYPE) GMX_ORDER_VAULT=$(GMX_ORDER_VAULT) GMX_MARKET=$(GMX_MARKET) GMX_RECEIVER=$(GMX_RECEIVER) GMX_CANCELLATION_RECEIVER=$(GMX_CANCELLATION_RECEIVER) GMX_CALLBACK_CONTRACT=$(GMX_CALLBACK_CONTRACT) GMX_UI_FEE_RECEIVER=$(GMX_UI_FEE_RECEIVER) GMX_COLLATERAL_TOKEN=$(GMX_COLLATERAL_TOKEN) GMX_COLLATERAL_AMOUNT=$(GMX_COLLATERAL_AMOUNT) GMX_EXECUTION_FEE=$(GMX_EXECUTION_FEE) GMX_SIZE_DELTA_USD=$(GMX_SIZE_DELTA_USD) GMX_INITIAL_COLLATERAL_DELTA=$(GMX_INITIAL_COLLATERAL_DELTA) GMX_TRIGGER_PRICE=$(GMX_TRIGGER_PRICE) GMX_ACCEPTABLE_PRICE=$(GMX_ACCEPTABLE_PRICE) GMX_CALLBACK_GAS_LIMIT=$(GMX_CALLBACK_GAS_LIMIT) GMX_MIN_OUTPUT_AMOUNT=$(GMX_MIN_OUTPUT_AMOUNT) GMX_VALID_FROM_TIME=$(GMX_VALID_FROM_TIME) GMX_IS_LONG=$(GMX_IS_LONG) GMX_SHOULD_UNWRAP_NATIVE=$(GMX_SHOULD_UNWRAP_NATIVE) GMX_AUTO_CANCEL=$(GMX_AUTO_CANCEL) GMX_REFERRAL_CODE=$(GMX_REFERRAL_CODE) forge script script/TradingFlowGMX.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --slow

position-info:
	cast call $(AAVE_POOL) "getUserAccountData(address)(uint256,uint256,uint256,uint256,uint256,uint256)" $(POSITION_ACCOUNT) --rpc-url $(MAINNET_RPC_URL)

gmx-position-key:
	@set -eu; \
	$(GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET); \
	echo $$list_key

gmx-position-count:
	@set -eu; \
	$(GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET); \
	cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)

gmx-position-keys:
	@set -eu; \
	$(GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET); \
	count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	echo "GMX_POSITION_ACCOUNT=$(GMX_POSITION_ACCOUNT)"; \
	echo "ACCOUNT_POSITION_LIST_KEY=$$list_key"; \
	echo "OPEN_POSITIONS_COUNT=$$count"; \
	if [ "$$count" = "0" ]; then exit 0; fi; \
	cast call $(GMX_DATA_STORE) "getBytes32ValuesAt(bytes32,uint256,uint256)(bytes32[])" $$list_key 0 $$count --rpc-url $(ARB_RPC_URL)

gmx-order-keys:
	@set -eu; \
	$(GMX_ACCOUNT_ORDER_LIST_KEY_SNIPPET); \
	count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	echo "GMX_POSITION_ACCOUNT=$(GMX_POSITION_ACCOUNT)"; \
	echo "ACCOUNT_ORDER_LIST_KEY=$$list_key"; \
	echo "OPEN_ORDERS_COUNT=$$count"; \
	if [ "$$count" = "0" ]; then exit 0; fi; \
	cast call $(GMX_DATA_STORE) "getBytes32ValuesAt(bytes32,uint256,uint256)(bytes32[])" $$list_key 0 $$count --rpc-url $(ARB_RPC_URL)

gmx-order-raw:
	@set -eu; \
	if [ -z "$(strip $(GMX_ORDER_KEY))" ]; then \
		echo "Error: set GMX_ORDER_KEY. Example: make gmx-order-raw GMX_ORDER_KEY=0x..."; \
		exit 1; \
	fi; \
	account_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'ACCOUNT')"); \
	market_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'MARKET')"); \
	collateral_token_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'INITIAL_COLLATERAL_TOKEN')"); \
	size_delta_usd_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_DELTA_USD')"); \
	trigger_price_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'TRIGGER_PRICE')"); \
	acceptable_price_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'ACCEPTABLE_PRICE')"); \
	execution_fee_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'EXECUTION_FEE')"); \
	order_type_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'ORDER_TYPE')"); \
	is_long_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'IS_LONG')"); \
	updated_at_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'UPDATED_AT_TIME')"); \
	account_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$account_f)"); \
	market_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$market_f)"); \
	collateral_token_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$collateral_token_f)"); \
	size_delta_usd_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$size_delta_usd_f)"); \
	trigger_price_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$trigger_price_f)"); \
	acceptable_price_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$acceptable_price_f)"); \
	execution_fee_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$execution_fee_f)"); \
	order_type_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$order_type_f)"); \
	is_long_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$is_long_f)"); \
	updated_at_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$updated_at_f)"); \
	echo "ORDER_KEY=$(GMX_ORDER_KEY)"; \
	echo "account=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$account_k --rpc-url $(ARB_RPC_URL))"; \
	echo "market=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$market_k --rpc-url $(ARB_RPC_URL))"; \
	echo "initialCollateralToken=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$collateral_token_k --rpc-url $(ARB_RPC_URL))"; \
	echo "sizeDeltaUsd=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_delta_usd_k --rpc-url $(ARB_RPC_URL))"; \
	echo "triggerPrice=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$trigger_price_k --rpc-url $(ARB_RPC_URL))"; \
	echo "acceptablePrice=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$acceptable_price_k --rpc-url $(ARB_RPC_URL))"; \
	echo "executionFee=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$execution_fee_k --rpc-url $(ARB_RPC_URL))"; \
	echo "orderType=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$order_type_k --rpc-url $(ARB_RPC_URL))"; \
	echo "isLong=$$(cast call $(GMX_DATA_STORE) 'getBool(bytes32)(bool)' $$is_long_k --rpc-url $(ARB_RPC_URL))"; \
	echo "updatedAtTime=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$updated_at_k --rpc-url $(ARB_RPC_URL))"

gmx-order-position-key:
	@set -eu; \
	if [ -z "$(strip $(GMX_ORDER_KEY))" ]; then \
		echo "Error: set GMX_ORDER_KEY. Example: make gmx-order-position-key GMX_ORDER_KEY=0x..."; \
		exit 1; \
	fi; \
	account_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'ACCOUNT')"); \
	market_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'MARKET')"); \
	collateral_token_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'INITIAL_COLLATERAL_TOKEN')"); \
	is_long_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'IS_LONG')"); \
	account_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$account_f)"); \
	market_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$market_f)"); \
	collateral_token_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$collateral_token_f)"); \
	is_long_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_ORDER_KEY) $$is_long_f)"); \
	account=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$account_k --rpc-url $(ARB_RPC_URL)); \
	market=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$market_k --rpc-url $(ARB_RPC_URL)); \
	collateral_token=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$collateral_token_k --rpc-url $(ARB_RPC_URL)); \
	is_long=$$(cast call $(GMX_DATA_STORE) 'getBool(bytes32)(bool)' $$is_long_k --rpc-url $(ARB_RPC_URL)); \
	position_key=$$(cast keccak "$$(cast abi-encode 'f(address,address,address,bool)' $$account $$market $$collateral_token $$is_long)"); \
	echo "ORDER_KEY=$(GMX_ORDER_KEY)"; \
	echo "derivedPositionKey=$$position_key"; \
	echo "hint=use: make gmx-position-raw GMX_POSITION_KEY=$$position_key"

gmx-position-raw:
	@set -eu; \
	if [ -z "$(strip $(GMX_POSITION_KEY))" ]; then \
		echo "Error: set GMX_POSITION_KEY. Example: make gmx-position-raw GMX_POSITION_KEY=0x..."; \
		exit 1; \
	fi; \
	position_list_const=$$(cast keccak "$$(cast abi-encode 'f(string)' 'POSITION_LIST')"); \
	exists=$$(cast call $(GMX_DATA_STORE) 'containsBytes32(bytes32,bytes32)(bool)' $$position_list_const $(GMX_POSITION_KEY) --rpc-url $(ARB_RPC_URL)); \
	if [ "$$exists" != "true" ]; then \
		echo "Error: GMX_POSITION_KEY is not in POSITION_LIST (no open position with that key)."; \
		echo "Hint: use make gmx-order-keys, then make gmx-order-position-key GMX_ORDER_KEY=0x..., then retry."; \
		exit 1; \
	fi; \
	account_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'ACCOUNT')"); \
	market_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'MARKET')"); \
	collateral_token_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'COLLATERAL_TOKEN')"); \
	size_usd_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_IN_USD')"); \
	size_tokens_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_IN_TOKENS')"); \
	collateral_amount_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'COLLATERAL_AMOUNT')"); \
	is_long_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'IS_LONG')"); \
	increased_at_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'INCREASED_AT_TIME')"); \
	account_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$account_f)"); \
	market_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$market_f)"); \
	collateral_token_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$collateral_token_f)"); \
	size_usd_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$size_usd_f)"); \
	size_tokens_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$size_tokens_f)"); \
	collateral_amount_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$collateral_amount_f)"); \
	is_long_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$is_long_f)"); \
	increased_at_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$increased_at_f)"); \
	echo "POSITION_KEY=$(GMX_POSITION_KEY)"; \
	echo "account=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$account_k --rpc-url $(ARB_RPC_URL))"; \
	echo "market=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$market_k --rpc-url $(ARB_RPC_URL))"; \
	echo "collateralToken=$$(cast call $(GMX_DATA_STORE) 'getAddress(bytes32)(address)' $$collateral_token_k --rpc-url $(ARB_RPC_URL))"; \
	echo "sizeInUsd=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_usd_k --rpc-url $(ARB_RPC_URL))"; \
	echo "sizeInTokens=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_tokens_k --rpc-url $(ARB_RPC_URL))"; \
	echo "collateralAmount=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$collateral_amount_k --rpc-url $(ARB_RPC_URL))"; \
	echo "isLong=$$(cast call $(GMX_DATA_STORE) 'getBool(bytes32)(bool)' $$is_long_k --rpc-url $(ARB_RPC_URL))"; \
	echo "increasedAtTime=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$increased_at_k --rpc-url $(ARB_RPC_URL))"

gmx-position-metrics:
	@set -eu; \
	if [ -z "$(strip $(GMX_POSITION_KEY))" ]; then \
		echo "Error: set GMX_POSITION_KEY. Example: make gmx-position-metrics GMX_POSITION_KEY=0x..."; \
		exit 1; \
	fi; \
	position_list_const=$$(cast keccak "$$(cast abi-encode 'f(string)' 'POSITION_LIST')"); \
	exists=$$(cast call $(GMX_DATA_STORE) 'containsBytes32(bytes32,bytes32)(bool)' $$position_list_const $(GMX_POSITION_KEY) --rpc-url $(ARB_RPC_URL)); \
	if [ "$$exists" != "true" ]; then \
		echo "Error: GMX_POSITION_KEY is not in POSITION_LIST (no open position with that key)."; \
		echo "Hint: use make gmx-order-keys, then make gmx-order-position-key GMX_ORDER_KEY=0x..., then retry."; \
		exit 1; \
	fi; \
	size_usd_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_IN_USD')"); \
	size_tokens_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_IN_TOKENS')"); \
	collateral_amount_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'COLLATERAL_AMOUNT')"); \
	size_usd_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$size_usd_f)"); \
	size_tokens_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$size_tokens_f)"); \
	collateral_amount_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $(GMX_POSITION_KEY) $$collateral_amount_f)"); \
	size_usd=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_usd_k --rpc-url $(ARB_RPC_URL)); \
	size_tokens=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_tokens_k --rpc-url $(ARB_RPC_URL)); \
	collateral_amount=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$collateral_amount_k --rpc-url $(ARB_RPC_URL)); \
	echo "POSITION_KEY=$(GMX_POSITION_KEY)"; \
	echo "sizeInUsd=$$size_usd"; \
	echo "sizeInTokens=$$size_tokens"; \
	echo "collateralAmount=$$collateral_amount"; \
	if command -v python3 >/dev/null 2>&1; then \
		python3 -c "size_usd=int('$$size_usd'); size_tokens=int('$$size_tokens'); collateral=int('$$collateral_amount'); entry=(0 if size_tokens==0 else size_usd//size_tokens); lev=(0 if collateral==0 else size_usd//collateral); print(f'entryPriceUsd(1e30)={entry}'); print(f'leverageApprox(sizeUsd/collateralAmount)={lev}')"; \
	else \
		echo "entryPriceUsd(1e30)=N/A (python3 required for big-int division)"; \
		echo "leverageApprox(sizeUsd/collateralAmount)=N/A (python3 required for big-int division)"; \
	fi; \
	echo "note=liquidationPrice requires Reader+oracle prices, not just DataStore raw fields"
