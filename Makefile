include .env

RPC_URL ?= $(ARB_RPC_URL)
PRIVATE_KEY ?= $(PK)
EXECUTOR_ARB ?= 0x2157b12b8841b22a64af4d049f2914829c8fdc79
GMX_EXECUTOR ?= 0x1d315D963d7462F2931dF237B54736F90eE67faA
UNISWAP_ROUTER ?= 0xE592427A0AEce92De3Edee1F18E0157C05861564
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
GMX_CANCELLATION_RECEIVER ?= 0x0000000000000000000000000000000000000000
GMX_CALLBACK_CONTRACT ?= 0x0000000000000000000000000000000000000000
GMX_UI_FEE_RECEIVER ?= 0x0000000000000000000000000000000000000000
GMX_COLLATERAL_TOKEN ?= $(WETH_TOKEN)
GMX_COLLATERAL_AMOUNT ?= $(AMOUNT_IN_ETH)
GMX_EXECUTION_FEE ?= 3000000000000000
GMX_SIZE_DELTA_USD ?= 5000000000000000000000000000000
GMX_INITIAL_COLLATERAL_DELTA ?= $(GMX_COLLATERAL_AMOUNT)
GMX_TRIGGER_PRICE ?= 4000000000000000000000000000000
GMX_ACCEPTABLE_PRICE ?= 5000000000000000000000000000000
GMX_CALLBACK_GAS_LIMIT ?= 0
GMX_MIN_OUTPUT_AMOUNT ?= 0
GMX_VALID_FROM_TIME ?= 0
GMX_IS_LONG ?= true
GMX_SHOULD_UNWRAP_NATIVE ?= false
GMX_AUTO_CANCEL ?= false
GMX_REFERRAL_CODE ?= 0x0000000000000000000000000000000000000000000000000000000000000000
GMX_SAFE_EXECUTION_FEE ?= 10000000000000000
GMX_SAFE_ACCEPTABLE_PRICE_LONG ?= 100000000000000000000000000000000
AMOUNT_IN_ETH ?= 10000000000000000000
AAVE_POOL_ARB ?= 0x794a61358D6845594F94dc1DB02A252b5b4814aD
AAVE_POOL ?= $(AAVE_POOL_ARB)
POSITION_ACCOUNT ?= $(EXECUTOR_ARB)
GMX_POSITION_ACCOUNT ?= $(GMX_EXECUTOR)
USDC_TOKEN ?= 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
FUND_USDC_AMOUNT ?= 1000000000
FUND_WETH_AMOUNT ?= 1000000000000000000

# CRE Configuration
CRE_FORWARDER ?= 0xd770499057619c9a76205fd4168161cf94abc532
CRE_WORKFLOW_ID ?= 0x33317d48575741e79956a801306cdc72f9592f9e7745057a1488ccb2c4022665
CRE_WORKFLOW_OWNER ?= $(BENEFICIARY)

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

# ================================================================
# DEPLOYMENT TARGETS
# ================================================================

deploy-executor-arb:
	PRIVATE_KEY=$(PRIVATE_KEY) UNISWAP_ROUTER=$(UNISWAP_ROUTER) SUSHI_ROUTER=$(SUSHI_ROUTER) AAVE_POOL=$(AAVE_POOL_ARB) forge script script/DeployExecutor.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

deploy-gmx-executor-arb:
	PRIVATE_KEY=$(PRIVATE_KEY) GMX_ROUTER=$(GMX_ROUTER) GMX_ROUTER_SPENDER=$(GMX_ROUTER_SPENDER) forge script script/DeployGmxExecutor.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast

# ================================================================
# POSITION FLOW TARGETS
# ================================================================
# Funding targets for USDC and WETH
fund-usdc:
	cast send $(USDC_TOKEN) "transfer(address,uint256)" $(POSITION_ACCOUNT) $(FUND_USDC_AMOUNT) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)

fund-weth:
	cast send $(WETH_TOKEN) "deposit()" --value 1ether --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(WETH_TOKEN) "transfer(address,uint256)" $(POSITION_ACCOUNT) $(FUND_WETH_AMOUNT) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)

fund-usdc-and-weth: fund-usdc fund-weth

configure-cre-position:
	cast send $(EXECUTOR_ARB) "setCreForwarder(address)" $(CRE_FORWARDER) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(EXECUTOR_ARB) "setCreWorkflowId(bytes32)" $(CRE_WORKFLOW_ID) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(EXECUTOR_ARB) "setCreWorkflowOwner(address)" $(CRE_WORKFLOW_OWNER) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)

position-flow:
	PRIVATE_KEY=$(PRIVATE_KEY) EXECUTOR=$(EXECUTOR_ARB) BENEFICIARY=$(BENEFICIARY) COLLATERAL_IN_ETH=$(COLLATERAL_IN_ETH) BORROW_AMOUNT_USDC=$(BORROW_AMOUNT_USDC) MIN_WETH_OUT=$(MIN_WETH_OUT) FEE_USDC_TO_WETH=$(FEE_USDC_TO_WETH) forge script script/PositionFlow.s.sol --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --slow

aave-position-info:
	cast call $(AAVE_POOL_ARB) "getUserAccountData(address)(uint256,uint256,uint256,uint256,uint256,uint256)" $(POSITION_ACCOUNT) --rpc-url $(RPC_URL)

close-position: aave-position-info
	PRIVATE_KEY=$(PRIVATE_KEY) EXECUTOR=$(EXECUTOR_ARB) forge script script/ClosePositionFlow.s.sol --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --slow


# ================================================================
# GMX TRADING TARGETS
# ================================================================

trading-flow: 
	PRIVATE_KEY=$(PRIVATE_KEY) GMX_EXECUTOR=$(GMX_EXECUTOR) WETH_TOKEN=$(WETH_TOKEN) AMOUNT_IN_ETH=$(AMOUNT_IN_ETH) GMX_OPERATION=$(GMX_OPERATION) GMX_ORDER_TYPE=$(GMX_ORDER_TYPE) GMX_ORDER_VAULT=$(GMX_ORDER_VAULT) GMX_MARKET=$(GMX_MARKET) GMX_CANCELLATION_RECEIVER=$(GMX_CANCELLATION_RECEIVER) GMX_CALLBACK_CONTRACT=$(GMX_CALLBACK_CONTRACT) GMX_UI_FEE_RECEIVER=$(GMX_UI_FEE_RECEIVER) GMX_COLLATERAL_TOKEN=$(GMX_COLLATERAL_TOKEN) GMX_COLLATERAL_AMOUNT=$(GMX_COLLATERAL_AMOUNT) GMX_EXECUTION_FEE=$(GMX_EXECUTION_FEE) GMX_SIZE_DELTA_USD=$(GMX_SIZE_DELTA_USD) GMX_INITIAL_COLLATERAL_DELTA=$(GMX_INITIAL_COLLATERAL_DELTA) GMX_TRIGGER_PRICE=$(GMX_TRIGGER_PRICE) GMX_ACCEPTABLE_PRICE=$(GMX_ACCEPTABLE_PRICE) GMX_CALLBACK_GAS_LIMIT=$(GMX_CALLBACK_GAS_LIMIT) GMX_MIN_OUTPUT_AMOUNT=$(GMX_MIN_OUTPUT_AMOUNT) GMX_VALID_FROM_TIME=$(GMX_VALID_FROM_TIME) GMX_IS_LONG=$(GMX_IS_LONG) GMX_SHOULD_UNWRAP_NATIVE=$(GMX_SHOULD_UNWRAP_NATIVE) GMX_AUTO_CANCEL=$(GMX_AUTO_CANCEL) GMX_REFERRAL_CODE=$(GMX_REFERRAL_CODE) forge script script/TradingFlowGMX.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --slow

gmx-open-long-safe:
	$(MAKE) --no-print-directory trading-flow \
		GMX_OPERATION=long \
		GMX_ORDER_TYPE=market-increase \
		GMX_IS_LONG=true \
		GMX_EXECUTION_FEE=$(GMX_SAFE_EXECUTION_FEE) \
		GMX_ACCEPTABLE_PRICE=$(GMX_SAFE_ACCEPTABLE_PRICE_LONG)

gmx-close-flow:
	PRIVATE_KEY=$(PRIVATE_KEY) GMX_EXECUTOR=$(GMX_EXECUTOR) WETH_TOKEN=$(WETH_TOKEN) AMOUNT_IN_ETH=0 GMX_OPERATION=close GMX_ORDER_TYPE=market-decrease GMX_ORDER_VAULT=$(GMX_ORDER_VAULT) GMX_MARKET=$(GMX_MARKET) GMX_CANCELLATION_RECEIVER=$(GMX_CANCELLATION_RECEIVER) GMX_CALLBACK_CONTRACT=$(GMX_CALLBACK_CONTRACT) GMX_UI_FEE_RECEIVER=$(GMX_UI_FEE_RECEIVER) GMX_COLLATERAL_TOKEN=$(GMX_COLLATERAL_TOKEN) GMX_COLLATERAL_AMOUNT=0 GMX_EXECUTION_FEE=$(GMX_EXECUTION_FEE) GMX_SIZE_DELTA_USD=$(GMX_SIZE_DELTA_USD) GMX_INITIAL_COLLATERAL_DELTA=0 GMX_TRIGGER_PRICE=$(GMX_TRIGGER_PRICE) GMX_ACCEPTABLE_PRICE=$(GMX_ACCEPTABLE_PRICE) GMX_CALLBACK_GAS_LIMIT=$(GMX_CALLBACK_GAS_LIMIT) GMX_MIN_OUTPUT_AMOUNT=$(GMX_MIN_OUTPUT_AMOUNT) GMX_VALID_FROM_TIME=$(GMX_VALID_FROM_TIME) GMX_IS_LONG=$(GMX_IS_LONG) GMX_SHOULD_UNWRAP_NATIVE=$(GMX_SHOULD_UNWRAP_NATIVE) GMX_AUTO_CANCEL=$(GMX_AUTO_CANCEL) GMX_REFERRAL_CODE=$(GMX_REFERRAL_CODE) forge script script/TradingFlowGMX.s.sol --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --slow

gmx-close-auto:
	@set -eu; \
	$(GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET); \
	count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	if [ "$$count" = "0" ]; then echo "No open GMX positions for GMX_POSITION_ACCOUNT=$(GMX_POSITION_ACCOUNT)"; exit 1; fi; \
	position_key=$$(cast call $(GMX_DATA_STORE) "getBytes32ValuesAt(bytes32,uint256,uint256)(bytes32[])" $$list_key 0 1 --rpc-url $(ARB_RPC_URL) | grep -oE '0x[0-9a-fA-F]{64}' | head -n 1); \
	if [ -z "$$position_key" ]; then echo "Could not derive position key"; exit 1; fi; \
	size_usd_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'SIZE_IN_USD')"); \
	is_long_f=$$(cast keccak "$$(cast abi-encode 'f(string)' 'IS_LONG')"); \
	size_usd_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $$position_key $$size_usd_f)"); \
	is_long_k=$$(cast keccak "$$(cast abi-encode 'f(bytes32,bytes32)' $$position_key $$is_long_f)"); \
	size_usd=$$(cast call $(GMX_DATA_STORE) 'getUint(bytes32)(uint256)' $$size_usd_k --rpc-url $(ARB_RPC_URL)); \
	is_long=$$(cast call $(GMX_DATA_STORE) 'getBool(bytes32)(bool)' $$is_long_k --rpc-url $(ARB_RPC_URL)); \
	if [ "$$size_usd" = "0" ]; then echo "Position size is zero; nothing to close"; exit 1; fi; \
	echo "Closing GMX position"; \
	echo "positionKey=$$position_key"; \
	echo "sizeDeltaUsd=$$size_usd"; \
	echo "isLong=$$is_long"; \
	$(MAKE) --no-print-directory gmx-close-flow GMX_SIZE_DELTA_USD=$$size_usd GMX_IS_LONG=$$is_long

configure-cre-gmx-executor:
	ARB_RPC_URL=$(RPC_URL) GMX_EXECUTOR=$(GMX_EXECUTOR) PRIVATE_KEY=$(PRIVATE_KEY) bash scripts/configure-cre.sh

# ================================================================
# GMX POSITION QUERIES
# ================================================================

gmx-position-list-key:
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

gmx-status:
	@set -eu; \
	echo "=== GMX STATUS ==="; \
	$(GMX_ACCOUNT_ORDER_LIST_KEY_SNIPPET); \
	orders_count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	$(GMX_ACCOUNT_POSITION_LIST_KEY_SNIPPET); \
	positions_count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	if [ -z "$$orders_count" ] || [ -z "$$positions_count" ]; then \
		echo "diagnosis=error-reading-gmx-counts"; \
		exit 1; \
	fi; \
	echo "openOrders=$$orders_count"; \
	echo "openPositions=$$positions_count"; \
	if [ "$$orders_count" = "0" ] && [ "$$positions_count" != "0" ]; then \
		echo "diagnosis=position-open"; \
	elif [ "$$orders_count" != "0" ] && [ "$$positions_count" = "0" ]; then \
		echo "diagnosis=orders-pending-keeper-execution"; \
	elif [ "$$orders_count" = "0" ] && [ "$$positions_count" = "0" ]; then \
		echo "diagnosis=no-open-order-no-open-position"; \
	else \
		echo "diagnosis=orders-and-positions-present"; \
	fi

gmx-order-keys:
	@set -eu; \
	$(GMX_ACCOUNT_ORDER_LIST_KEY_SNIPPET); \
	count=$$(cast call $(GMX_DATA_STORE) "getBytes32Count(bytes32)(uint256)" $$list_key --rpc-url $(ARB_RPC_URL)); \
	echo "GMX_POSITION_ACCOUNT=$(GMX_POSITION_ACCOUNT)"; \
	echo "ACCOUNT_ORDER_LIST_KEY=$$list_key"; \
	echo "OPEN_ORDERS_COUNT=$$count"; \
	if [ "$$count" = "0" ]; then exit 0; fi; \
	cast call $(GMX_DATA_STORE) "getBytes32ValuesAt(bytes32,uint256,uint256)(bytes32[])" $$list_key 0 $$count --rpc-url $(ARB_RPC_URL)

# ================================================================
# CRE WORKFLOW TARGETS
# ================================================================

fundingGMXExecutor:
	cast send $(GMX_EXECUTOR) --value 1ether --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(WETH_TOKEN) "deposit()" --value 10ether --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(WETH_TOKEN) "transfer(address,uint256)" $(GMX_EXECUTOR) 1000000000000000000 --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY)
	cast send $(WETH_TOKEN) "approve(address,uint256)" $(GMX_ROUTER_SPENDER) 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff --rpc-url $(ARB_RPC_URL) --private-key $(PRIVATE_KEY)

workflow-simulate:
	cre workflow simulate ./my-workflow -T staging-settings -e .env -v

workflow-simulate-broadcast:
	cre workflow simulate ./my-workflow -T staging-settings -e .env -v --broadcast

workflow-publish:
	cre workflow publish ./my-workflow -T staging-settings -e .env

workflow-list:
	cre workflow list
