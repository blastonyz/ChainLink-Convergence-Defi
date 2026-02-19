include .env
SIMPLE_SWAP?=0x2157b12b8841b22a64af4d049f2914829c8fdc79
CONTRACT?=0xf3dFD47811E4C07bFeB6Db7442164Cdf5520df0e
WETH?=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
SWAP_ETH_IN_WEI?=1000000000000000000
MIN_USDC_OUT?=0
SWAP_FEE?=500
SWAP_RECIPIENT?=
MIN_USDC_OUT_FROM_ETH?=0
FLASH_AMOUNT_USDC?=1000000000000
MIN_WETH_OUT?=0
MIN_USDC_OUT_AFTER_FLASH?=0
FEE_ETH_TO_USDC?=500
FEE_USDC_TO_WETH?=500
FEE_WETH_TO_USDC?=500
BENEFICIARY?=$(shell cast wallet address --private-key $(PK) 2> /dev/null)
BORROW_AMOUNT?=1000000000000000000
BORROW_ETH_IN_WEI?=100000000000000000000

deploySimpleSwap:
	PRIVATE_KEY=$(PK) forge script script/DeploySimpleSwap.s.sol:DeploySimpleSwap --broadcast --rpc-url $(VIR_RPC_URL)

simpleSwapRouter:
	cast call $(SIMPLE_SWAP) "swapRouter()(address)" --rpc-url $(VIR_RPC_URL)

swapEthToUsdc:
	cast send $(SIMPLE_SWAP) \
	"swapEthToUsdc(uint256)(uint256)" \
	$(MIN_USDC_OUT) \
	--value $(SWAP_ETH_IN_WEI) \
	--rpc-url $(VIR_RPC_URL) \
	--private-key $(PK)

swapEthToUsdcWithRecipient:
	cast send $(SIMPLE_SWAP) \
	"swapEthToUsdcWithFeeAndRecipient(uint256,uint24,address)(uint256)" \
	$(MIN_USDC_OUT) $(SWAP_FEE) $(SWAP_RECIPIENT) \
	--value $(SWAP_ETH_IN_WEI) \
	--rpc-url $(VIR_RPC_URL) \
	--private-key $(PK)

runSwapSimpleSwapScript:
	PRIVATE_KEY=$(PK) SWAP_ETH_IN_WEI=$(SWAP_ETH_IN_WEI) MIN_USDC_OUT=$(MIN_USDC_OUT) SWAP_FEE=$(SWAP_FEE) SWAP_RECIPIENT=$(SWAP_RECIPIENT) forge script script/SwapSimpleSwap.s.sol:SwapSimpleSwap --broadcast --rpc-url $(VIR_RPC_URL)

deploySwapAndFlash:
	forge script script/deploySwapAndFlash.s.sol:DeploySwapAndFlash --broadcast --rpc-url $(VIR_RPC_URL) --private-key $(PK)

runSwapAndLoan:
	PRIVATE_KEY=$(PK) \
	SWAP_ETH_IN_WEI=$(SWAP_ETH_IN_WEI) \
	MIN_USDC_OUT_FROM_ETH=$(MIN_USDC_OUT_FROM_ETH) \
	FLASH_AMOUNT_USDC=$(FLASH_AMOUNT_USDC) \
	MIN_WETH_OUT=$(MIN_WETH_OUT) \
	MIN_USDC_OUT_AFTER_FLASH=$(MIN_USDC_OUT_AFTER_FLASH) \
	FEE_ETH_TO_USDC=$(FEE_ETH_TO_USDC) \
	FEE_USDC_TO_WETH=$(FEE_USDC_TO_WETH) \
	FEE_WETH_TO_USDC=$(FEE_WETH_TO_USDC) \
	BENEFICIARY=$(BENEFICIARY) \
	forge script script/SwapAndLoan.s.sol:SwapAndLoan --broadcast --rpc-url $(VIR_RPC_URL)

runBorrow:
	@test -n "$(WETH)" || (echo "WETH is empty. Set WETH=0x..."; exit 1)
	@test -n "$(BENEFICIARY)" || (echo "BENEFICIARY is empty. Set BENEFICIARY=0x... or PK in .env"; exit 1)
	cast send $(CONTRACT) \
	"swapSupplyBorrowSwap(uint256,address,uint256,uint256,uint24,uint24,address)" \
	$(MIN_USDC_OUT_FROM_ETH) \
	$(WETH) \
	$(BORROW_AMOUNT) \
	$(MIN_USDC_OUT_AFTER_FLASH) \
	$(FEE_ETH_TO_USDC) \
	$(FEE_USDC_TO_WETH) \
	$(BENEFICIARY) \
	--value $(BORROW_ETH_IN_WEI) \
	--rpc-url $(VIR_RPC_URL) \
	--private-key $(PK)