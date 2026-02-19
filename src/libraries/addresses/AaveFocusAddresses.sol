// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

library AaveFocusAddresses {
    uint256 internal constant MAINNET_CHAIN_ID = 1;
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

    // -------------------------
    // Aave v3 core - Mainnet
    // -------------------------0xA97684EaF56dFfA69520cB6b90d9B6d4a3BDd671

    address internal constant MAINNET_AAVE_POOL_ADDRESSES_PROVIDER = 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;
    address internal constant MAINNET_AAVE_POOL = 0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8;
    address internal constant MAINNET_AAVE_POOL2 = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    // -------------------------
    // Aave v3 core - Sepolia
    // -------------------------
    address internal constant SEPOLIA_AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address internal constant SEPOLIA_AAVE_POOL_ADDRESSES_PROVIDER = 0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A;
    address internal constant SEPOLIA_AAVE_ORACLE = 0x2da88497588bf89281816106C7259e31AF45a663;
    address internal constant SEPOLIA_AAVE_PROTOCOL_DATA_PROVIDER = 0x3e9708d80f7B3e43118013075F7e95CE3AB31F31;
    address internal constant SEPOLIA_AAVE_UI_POOL_DATA_PROVIDER = 0x69529987FA4A075D0C00B0128fa848dc9ebbE9CE;

    // -------------------------
    // Aave v3 core - Arbitrum Sepolia
    // -------------------------
    address internal constant ARBITRUM_SEPOLIA_AAVE_POOL = 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff;
    address internal constant ARBITRUM_SEPOLIA_AAVE_POOL_ADDRESSES_PROVIDER = 0xB25a5D144626a0D488e52AE717A051a2E9997076;
    address internal constant ARBITRUM_SEPOLIA_AAVE_ORACLE = 0xEf95A6B9e88Bd509Fd67BA741cf2b263DaC65c00;
    address internal constant ARBITRUM_SEPOLIA_AAVE_PROTOCOL_DATA_PROVIDER = 0x12373B5085e3b42D42C1D4ABF3B3Cf4Df0E0Fa01;
    address internal constant ARBITRUM_SEPOLIA_AAVE_UI_POOL_DATA_PROVIDER = 0x97Cf44bF6a9A3D2B4F32b05C480dBEdC018F72A9;

    // -------------------------
    // Sepolia assets of interest (Aave listed)
    // -------------------------
    // WETH (ETH proxy asset in Aave)
    address internal constant SEPOLIA_WETH_UNDERLYING = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;
    address internal constant SEPOLIA_WETH_A_TOKEN = 0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830;
    address internal constant SEPOLIA_WETH_V_TOKEN = 0x22a35DB253f4F6D0029025D6312A3BdAb20C2c6A;
    address internal constant SEPOLIA_WETH_ORACLE = 0xDde0E8E6d3653614878Bf5009EDC317BC129fE2F;

    // WBTC
    address internal constant SEPOLIA_WBTC_UNDERLYING = 0x29f2D40B0605204364af54EC677bD022dA425d03;
    address internal constant SEPOLIA_WBTC_A_TOKEN = 0x1804Bf30507dc2EB3bDEbbbdd859991EAeF6EefF;
    address internal constant SEPOLIA_WBTC_V_TOKEN = 0xEB016dFd303F19fbDdFb6300eB4AeB2DA7Ceac37;
    address internal constant SEPOLIA_WBTC_ORACLE = 0x784B90bA1E9a8cf3C9939c2e072F058B024C4b8a;

    // USDC
    address internal constant SEPOLIA_USDC_UNDERLYING = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    address internal constant SEPOLIA_USDC_A_TOKEN = 0x16dA4541aD1807f4443d92D26044C1147406EB80;
    address internal constant SEPOLIA_USDC_V_TOKEN = 0x36B5dE936eF1710E1d22EabE5231b28581a92ECc;
    address internal constant SEPOLIA_USDC_ORACLE = 0x98458D6A99489F15e6eB5aFa67ACFAcf6F211051;

    // DAI
    address internal constant SEPOLIA_DAI_UNDERLYING = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357;
    address internal constant SEPOLIA_DAI_A_TOKEN = 0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8;
    address internal constant SEPOLIA_DAI_V_TOKEN = 0x22675C506A8FC26447aFFfa33640f6af5d4D4cF0;
    address internal constant SEPOLIA_DAI_ORACLE = 0x9aF11c35c5d3Ae182C0050438972aac4376f9516;

    // USDT
    address internal constant SEPOLIA_USDT_UNDERLYING = 0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0;
    address internal constant SEPOLIA_USDT_A_TOKEN = 0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6;
    address internal constant SEPOLIA_USDT_V_TOKEN = 0x9844386d29EEd970B9F6a2B9a676083b0478210e;
    address internal constant SEPOLIA_USDT_ORACLE = 0x4e86D3Aa271Fa418F38D7262fdBa2989C94aa5Ba;

    // LINK
    address internal constant SEPOLIA_LINK_UNDERLYING = 0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5;
    address internal constant SEPOLIA_LINK_A_TOKEN = 0x3FfAf50D4F4E96eB78f2407c090b72e86eCaed24;
    address internal constant SEPOLIA_LINK_V_TOKEN = 0x34a4d932E722b9dFb492B9D8131127690CE2430B;
    address internal constant SEPOLIA_LINK_ORACLE = 0x14fC51b7df22b4D393cD45504B9f0A3002A63F3F;

    // -------------------------
    // Arbitrum Sepolia assets of interest (Aave listed)
    // -------------------------
    // WETH
    address internal constant ARBITRUM_SEPOLIA_WETH_UNDERLYING = 0x1dF462e2712496373A347f8ad10802a5E95f053D;
    address internal constant ARBITRUM_SEPOLIA_WETH_A_TOKEN = 0xf5f17EbE81E516Dc7cB38D61908EC252F150CE60;
    address internal constant ARBITRUM_SEPOLIA_WETH_V_TOKEN = 0x372eB464296D8D78acaa462b41eaaf2D3663dAD3;
    address internal constant ARBITRUM_SEPOLIA_WETH_ORACLE = 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165;

    // USDC
    address internal constant ARBITRUM_SEPOLIA_USDC_UNDERLYING = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address internal constant ARBITRUM_SEPOLIA_USDC_A_TOKEN = 0x460b97BD498E1157530AEb3086301d5225b91216;
    address internal constant ARBITRUM_SEPOLIA_USDC_V_TOKEN = 0x4fBE3A94C60A5085dA6a2D309965DcF34c36711d;
    address internal constant ARBITRUM_SEPOLIA_USDC_ORACLE = 0x0153002d20B96532C639313c2d54c3dA09109309;
}
