> ## Documentation Index
> Fetch the complete documentation index at: https://docs.coingecko.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Authentication (Pro API)

> Authentication method for CoinGecko Pro API (Paid plan subscribers with Pro-API keys)

<Note>
  ### **Notes**

  * Pro API Key is only available for [CoinGecko API paid plan](https://www.coingecko.com/en/api/pricing) subscribers, the root URL for CoinGecko Pro API must be `https://pro-api.coingecko.com/api/v3/`.
  * You are recommended to store the API key securely in your own backend and use a proxy to insert the key into the request URL.
  * It's highly recommended to use the Headers method when making API requests for better security. Using query string parameters can risk exposing your API key.
</Note>

## CoinGecko API Authentication Method

If this is your first time using the Pro API key, you can supply API Key to the root URL using one of these ways:

1. Header (Recommended): `x-cg-pro-api-key`
2. Query String Parameter: `x_cg_pro_api_key`

| Authentication Method  | Example using [Ping](/reference/ping-server) Endpoint                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Header (cURL)          | `curl -X GET "https://pro-api.coingecko.com/api/v3/ping" -H "x-cg-pro-api-key: YOUR_API_KEY"` |
| Query String Parameter | `https://pro-api.coingecko.com/api/v3/ping?x_cg_pro_api_key=YOUR_API_KEY`                     |

## 🔥 Accessing Onchain DEX data

You can now use the Pro-API key (exclusive to any paid plan subscriber) to call onchain DEX data powered by [GeckoTerminal](https://www.geckoterminal.com/).

<Note>
  ### **Notes**

  * Authentication method for onchain endpoints is exactly same as other endpoints.
  * When using the CG Pro API to access onchain DEX data, include the `/onchain` endpoint path in the request.
</Note>

| Authentication Method  | Example using [Simple Token Price](/reference/onchain-simple-price) Endpoint                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header (cURL)          | `curl -X GET "<https://pro-api.coingecko.com/api/v3/onchain/simple/networks/eth/token_price/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2>" -H "x-cg-pro-api-key: YOUR_API_KEY"` |
| Query String Parameter | `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/eth/token_price/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2?x_cg_pro_api_key=YOUR_API_KEY`                       |

## API Key Usage Credits

* Each request made to any endpoint counts as a single call (1 call = 1 credit).
* Each successful API request (Status 200) will deduct 1 credit from your monthly credit allowance.
* Unsuccessful Requests (Status 4xx, 5xx, etc) will not count towards credit deduction.
* Regardless of the HTTP status code returned (including 4xx and 5xx errors), all API requests will count towards your **minute rate limit**.
* Your monthly credit & rate limit are determined by the paid plan to which you subscribe. For more details, please refer to this [page](https://www.coingecko.com/en/api/pricing).
* To check the API usage, please go to the [developer dashboard](https://www.coingecko.com/en/developers/dashboard) or follow the guide [here](/reference/setting-up-your-api-key#4-api-usage-report)

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.coingecko.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Endpoint Overview

<Note>
  ### Notes

  In the API reference pages, the plan-specific endpoint access will be marked as below:

  * 💼 — exclusive for [Analyst Plan & above](https://www.coingecko.com/en/api/pricing) subscribers only (excluding Basic plan).
  * 👑 — exclusive for [Enterprise Plan](https://www.coingecko.com/en/api/enterprise) subscribers only.

  Some endpoints may have parameters or data access that are exclusive to different plan subscribers, please refer to the endpoint reference page for details.
</Note>

## CoinGecko Endpoints: Coins

| Endpoint                                                                                               | Description                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [/ping](/reference/ping-server)                                                                        | Check the API server status                                                                                                                                                            |
| 💼 [/key](/reference/api-usage)                                                                        | Check account's API usage                                                                                                                                                              |
| [/simple/price](/reference/simple-price)                                                               | Query the prices of one or more coins by using their unique Coin API IDs                                                                                                               |
| [/simple/token\_price/\{id}](/reference/simple-token-price)                                            | Query the prices of one or more coins by using their unique Coin API IDs                                                                                                               |
| [/simple/supported\_vs\_currencies](/reference/simple-supported-currencies)                            | Query all the supported currencies on CoinGecko                                                                                                                                        |
| [/coins/list](/reference/coins-list)                                                                   | Query all the supported coins on CoinGecko with coins ID, name and symbol                                                                                                              |
| 💼 [/coins/top\_gainers\_losers](/reference/coins-top-gainers-losers)                                  | Query the top 30 coins with largest price gain and loss by a specific time duration                                                                                                    |
| 💼 [/coins/list/new](/reference/coins-list-new)                                                        | Query the latest 200 coins that recently listed on CoinGecko                                                                                                                           |
| [/coins/markets](/reference/coins-markets)                                                             | Query all the supported coins with price, market cap, volume and market related data                                                                                                   |
| [/coins/\{id}](/reference/coins-id)                                                                    | Query all the metadata (image, websites, socials, description, contract address, etc.) from the CoinGecko coin page based on a particular coin ID                                      |
| [/coins/\{id}/tickers](/reference/coins-id-tickers)                                                    | Query the coin tickers on both centralized exchange (CEX) and decentralized exchange (DEX) based on a particular coin ID                                                               |
| [/coins/\{id}/history](/reference/coins-id-history)                                                    | Query the historical data (price, market cap, 24hr volume, ...) at a given date for a coin based on a particular coin ID                                                               |
| [/coins/\{id}/market\_chart](/reference/coins-id-market-chart)                                         | Get the historical chart data of a coin including time in UNIX, price, market cap and 24hr volume based on particular coin ID                                                          |
| [/coins/\{id}/market\_chart/range](/reference/coins-id-market-chart-range)                             | Get the historical chart data of a coin within certain time range in UNIX along with price, market cap and 24hr volume based on particular coin ID                                     |
| [/coins-id-ohlc](/reference/coins-id-ohlc)                                                             | Get the OHLC chart (Open, High, Low, Close) of a coin based on particular coin ID                                                                                                      |
| 💼 [/coins/\{id}/ohlc/range](/reference/coins-id-ohlc-range)                                           | Get the OHLC chart (Open, High, Low, Close) of a coin within a range of timestamp based on particular coin ID                                                                          |
| 👑 [/coins/\{id}/circulating\_supply\_chart](/reference/coins-id-circulating-supply-chart)             | Query historical circulating supply of a coin by number of days away from now based on provided coin ID                                                                                |
| 👑 [/coins/\{id}/circulating\_supply\_chart/range](/reference/coins-id-circulating-supply-chart-range) | Query historical circulating supply of a coin, within a range of timestamp based on the provided coin ID                                                                               |
| 👑 [/coins/\{id}/total\_supply\_chart](/reference/coins-id-total-supply-chart)                         | Query historical total supply of a coin by number of days away from now based on provided coin ID                                                                                      |
| 👑 [/coins/\{id}/total\_supply\_chart/range](/reference/coins-id-total-supply-chart-range)             | Query historical total supply of a coin, within a range of timestamp based on the provided coin ID                                                                                     |
| [/coins/../contract/..](/reference/coins-contract-address)                                             | Query all the metadata (image, websites, socials, description, contract address, etc.) from the CoinGecko coin page based on an asset platform and a particular token contract address |
| [/coins/../contract/../market\_chart](/reference/contract-address-market-chart)                        | Get the historical chart data including time in UNIX, price, market cap and 24hr volume based on asset platform and particular token contract address                                  |
| [/coins/../contract/../market\_chart/range](/reference/contract-address-market-chart-range)            | Get the historical chart data within certain time range in UNIX along with price, market cap and 24hr volume based on asset platform and particular token contract address             |
| [/coins/categories/list](/reference/coins-categories-list)                                             | Query all the coins categories on CoinGecko                                                                                                                                            |
| [/coins/categories](/reference/coins-categories)                                                       | Query all the coins categories with market data (market cap, volume, ...) on CoinGecko                                                                                                 |

## CoinGecko Endpoints: NFT

| Endpoint                                                                               | Description                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [/nfts/list](/reference/nfts-list)                                                     | Query all supported NFTs with ID, contract address, name, asset platform ID and symbol on CoinGecko                                                                          |
| [/nfts/..](/reference/nfts-id)                                                         | Query all the NFT data (name, floor price, 24hr volume, ...) based on the NFT collection ID                                                                                  |
| [/nfts/../contract/..](/reference/nfts-contract-address)                               | Query all the NFT data (name, floor price, 24hr volume, ...) based on the NFT collection contract address and respective asset platform                                      |
| 💼 [/nfts/markets](/reference/nfts-markets)                                            | Query all the supported NFT collections with floor price, market cap, volume and market related data on CoinGecko                                                            |
| 💼 [/nfts/../market\_chart](/reference/nfts-id-market-chart)                           | Query historical market data of a NFT collection, including floor price, market cap, and 24hr volume, by number of days away from now                                        |
| 💼 [/nfts/../contract/../market\_chart](/reference/nfts-contract-address-market-chart) | Query historical market data of a NFT collection, including floor price, market cap, and 24hr volume, by number of days away from now based on the provided contract address |
| 💼 [/nfts/../tickers](/reference/nfts-id-tickers)                                      | Query the latest floor price and 24hr volume of a NFT collection, on each NFT marketplace, e.g. OpenSea and LooksRare                                                        |

## CoinGecko Endpoints: Exchanges & Derivatives

| Endpoint                                                                              | Description                                                                                                                   |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [/exchanges](/reference/exchanges)                                                    | Query all the supported exchanges with exchanges' data (ID, name, country, ...) that have active trading volumes on CoinGecko |
| [/exchanges/list](/reference/exchanges-list)                                          | Query all the exchanges with ID and name                                                                                      |
| [/exchanges/\{id}](/reference/exchanges-id)                                           | Query exchange's data (name, year established, country, ...), exchange volume in BTC and tickers based on exchange's ID       |
| [/exchanges/\{id}/tickers](/reference/exchanges-id-tickers)                           | Query exchange's tickers based on exchange's ID                                                                               |
| [/exchanges/\{id}/volume\_chart](/reference/exchanges-id-volume-chart)                | Query the historical volume chart data with time in UNIX and trading volume data in BTC based on exchange's ID                |
| 💼 [/exchanges/\{id}/volume\_chart/range](/reference/exchanges-id-volume-chart-range) | Query the historical volume chart data in BTC by specifying date range in UNIX based on exchange's ID                         |
| [/derivatives](/reference/derivatives-tickers)                                        | Query all the tickers from derivatives exchanges on CoinGecko                                                                 |
| [/derivatives/exchanges](/reference/derivatives-exchanges)                            | Query all the derivatives exchanges with related data (ID, name, open interest, ...) on CoinGecko                             |
| [/derivatives/exchanges/\{id}](/reference/derivatives-exchanges-id)                   | Query the derivatives exchange's related data (ID, name, open interest, ...) based on the exchanges' ID                       |
| [/derivatives/exchanges/list](/reference/derivatives-exchanges-list)                  | Query all the derivatives exchanges with ID and name on CoinGecko                                                             |

## CoinGecko Endpoints: Public Treasuries

| Endpoint                                                                                               | Description                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [/entities/list](/reference/entities-list)                                                             | Query all the supported entities on CoinGecko with entities ID, name, symbol, and country         |
| [/\{entity}/public\_treasury/\{coin\_id}](/reference/companies-public-treasury)                        | Query public companies & governments' cryptocurrency holdings by coin ID                          |
| [/public\_treasury/\{entity\_id}](/reference/public-treasury-entity)                                   | Query public companies & governments' cryptocurrency holdings by entity ID                        |
| [/public\_treasury/\{entity\_id}/.../holding\_chart](/reference/public-treasury-entity-chart)          | Query public companies & governments' cryptocurrency historical holdings by entity ID and coin ID |
| [/public\_treasury/\{entity\_id}/transaction\_history](/reference/public-treasury-transaction-history) | Query public companies & governments' cryptocurrency transaction history by entity ID             |

## CoinGecko Endpoints: General

| Endpoint                                                                | Description                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [/asset\_platforms](/reference/asset-platforms-list)                    | Query all the asset platforms (blockchain networks) on CoinGecko                                                   |
| [/token\_lists/\{asset\_platform\_id}/all.json](/reference/token-lists) | Get full list of tokens of a blockchain network (asset platform) that is supported by Ethereum token list standard |
| [/exchange\_rates](/reference/exchange-rates)                           | Query BTC exchange rates with other currencies                                                                     |
| [/search](/reference/search-data)                                       | Search for coins, categories and markets listed on CoinGecko                                                       |
| [/search/trending](/reference/trending-search)                          | Query trending search coins, NFTs and categories on CoinGecko in the last 24 hours                                 |
| [/global](/reference/crypto-global)                                     | Query cryptocurrency global data including active cryptocurrencies, markets, total crypto market cap and etc.      |
| [/global/decentralized\_finance\_defi](/reference/global-defi)          | Query cryptocurrency global decentralized finance (DeFi) data including DeFi market cap, trading volume            |
| 💼 [/global/market\_cap\_chart](/reference/global-market-cap-chart)     | Query historical global market cap and volume data by number of days away from now                                 |

## Onchain DEX Endpoints (GeckoTerminal)

| Endpoint                                                                                         | Description                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [/onchain/simple/networks/../token\_price/..](/reference/onchain-simple-price)                   | Get token price based on the provided token contract address on a network                                                                                                |
| [/onchain/networks](/reference/networks-list)                                                    | Query all the supported networks on GeckoTerminal                                                                                                                        |
| [/onchain/networks/../dexes](/reference/dexes-list)                                              | Query all the supported decentralized exchanges (DEXs) based on the provided network on GeckoTerminal                                                                    |
| [/onchain/networks/../pools/..](/reference/pool-address)                                         | Query the specific pool based on the provided network and pool address                                                                                                   |
| [/onchain/networks/../pools/multi/..](/reference/pools-addresses)                                | Query multiple pools based on the provided network and pool address                                                                                                      |
| [/onchain/networks/trending\_pools](/reference/trending-pools-list)                              | Query all the trending pools across all networks on GeckoTerminal                                                                                                        |
| [/onchain/networks/../trending\_pools](/reference/trending-pools-network)                        | Query the trending pools based on the provided network                                                                                                                   |
| [/onchain/networks/../pools](/reference/top-pools-network)                                       | Query all the top pools based on the provided network                                                                                                                    |
| [/onchain/networks/../dexes/../pools](/reference/top-pools-dex)                                  | Query all the top pools based on the provided network and decentralized exchange (DEX)                                                                                   |
| [/onchain/networks/new\_pools](/reference/latest-pools-list)                                     | Query all the latest pools across all networks on GeckoTerminal                                                                                                          |
| [/onchain/networks/../new\_pools](/reference/latest-pools-network)                               | Query all the latest pools based on provided network                                                                                                                     |
| 🔥 💼 [/onchain/pools/megafilter](/reference/pools-megafilter)                                   | Query pools based on various filters across all networks on GeckoTerminal                                                                                                |
| [/onchain/search/pools](/reference/search-pools)                                                 | Search for pools on a network                                                                                                                                            |
| 💼 [/onchain/pools/trending\_search](/reference/trending-search-pools)                           | Query all the trending search pools across all networks on GeckoTerminal                                                                                                 |
| [/onchain/networks/../tokens/../pools](/reference/top-pools-contract-address)                    | Query top pools based on the provided token contract address on a network                                                                                                |
| [/onchain/networks/../tokens/..](/reference/token-data-contract-address)                         | Query specific token data based on the provided token contract address on a network                                                                                      |
| [/onchain/networks/../tokens/multi/..](/reference/tokens-data-contract-addresses)                | Query multiple tokens data based on the provided token contract addresses on a network                                                                                   |
| [/onchain/networks/../tokens/../info](/reference/token-info-contract-address)                    | Query token metadata (name, symbol, CoinGecko ID, image, socials, websites, description, etc.) based on a provided token contract address on a network                   |
| [/onchain/networks/../pools/../info](/reference/pool-token-info-contract-address)                | Query pool metadata (base and quote token details, image, socials, websites, description, contract address, etc.) based on a provided pool contract address on a network |
| [/onchain/tokens/info\_recently\_updated](/reference/tokens-info-recent-updated)                 | Query 100 most recently updated tokens info across all networks on GeckoTerminal                                                                                         |
| 💼 [/onchain/networks/../tokens/../top\_traders](/reference/top-token-traders-token-address)     | Query top token traders based on the provided token contract address on a network                                                                                        |
| 💼 [/onchain/networks/../tokens/../top\_holders](/reference/top-token-holders-token-address)     | Query top token holders based on the provided token contract address on a network                                                                                        |
| 💼 [/onchain/networks/../tokens/../holders\_chart](/reference/token-holders-chart-token-address) | Get the historical token holders chart based on the provided token contract address on a network                                                                         |
| [/onchain/networks/../pools/../ohlcv/..](/reference/pool-ohlcv-contract-address)                 | Get the OHLCV chart (Open, High, Low, Close, Volume) of a pool based on the provided pool address on a network                                                           |
| 💼 [/onchain/networks/../tokens/../ohlcv/..](/reference/token-ohlcv-token-address)               | Get the OHLCV chart (Open, High, Low, Close, Volume) of a token based on the provided token address on a network                                                         |
| [/onchain/networks/../pools/../trades](/reference/pool-trades-contract-address)                  | Query the last 300 trades in the past 24 hours based on the provided pool address                                                                                        |
| 💼 [/onchain/networks/../tokens/../trades](/reference/token-trades-contract-address)             | Query the last 300 trades in the past 24 hours across all pools, based on the provided token contract address on a network                                               |
| 💼 [/onchain/categories](/reference/categories-list)                                             | Query all the supported categories on GeckoTerminal                                                                                                                      |
| 💼 [/onchain/categories/../pools](/reference/pools-category)                                     | Query all the pools based on the provided category ID                                                                                                                    |

⚡️ Need Real-time Data Streams? Try [WebSocket API](https://docs.coingecko.com/websocket)

<a href="/websocket">
  <Frame>
    <img src="https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=2c88f667113256b6285720c468fb53a1" noZoom data-og-width="2400" width="2400" data-og-height="470" height="470" data-path="images/wss-banner-2.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=280&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=d2eafb93fcd670d5df221d617fd6f6a7 280w, https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=560&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=24f635622a42c0ae03695cc940112699 560w, https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=840&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=82ef1c05b6f45d6d8ec0bcef0f19d49a 840w, https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=1100&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=b119e8746bb1a78b759e6d94d96b7c8b 1100w, https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=1650&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=95797e7366c7f280e3e4b570b6db2b49 1650w, https://mintcdn.com/coingecko/VlaOc2UnIs8mj72v/images/wss-banner-2.png?w=2500&fit=max&auto=format&n=VlaOc2UnIs8mj72v&q=85&s=2f120e8a31b5793213494d4ae2d46fb3 2500w" />
  </Frame>
</a>

With WebSocket, you can now stream ultra-low latency, real-time prices, trades, and OHLCV chart data. <br />
Subscribe to our [paid API plan](https://www.coingecko.com/en/api/pricing) (Analyst plan & above) to access WebSocket and REST API data delivery methods.

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.coingecko.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Token Price by Token Addresses

> This endpoint allows you to **get token price based on the provided token contract address on a network**

<Note>
  ### Note

  * If the token's market cap is not verified by the team, the API response will return `null` for its market cap value, even though it has a displayed value on GeckoTerminal, which might not be accurate as it often matches the Fully Diluted Valuation (FDV).
    * If you require `market_cap_usd` to return FDV value (as seen in [GeckoTerminal.com](https://www.geckoterminal.com/)) when market cap data is unavailable, please specify this parameter `mcap_fdv_fallback=true`.
  * The returned price currency is in USD.
  * Addresses not found in GeckoTerminal will be ignored.
  * This endpoint allows querying **up to 100 contract addresses** per request. This limit is exclusive for [paid plan](https://www.coingecko.com/en/api/pricing) subscribers (Analyst plan & above).
  * When using this endpoint, GeckoTerminal's routing decides the best pool for token price. The price source may change based on liquidity and pool activity. For full control over the price, you may use [`/networks/{network}/pools/{address}`](/reference/pool-address) endpoint by providing a specific pool address.
  * If `include_inactive_source=true` is set and no top pool is found for a token, the search will expand to include recently active pools up to the past 1 year.
  * Cache/Update Frequency: Real-time (Cacheless) for Pro API (Basic, Analyst, Lite, Pro, Enterprise).
</Note>


## OpenAPI

````yaml reference/api-reference/onchain-pro.json get /simple/networks/{network}/token_price/{addresses}
openapi: 3.0.0
info:
  title: Onchain DEX API (Pro)
  version: 3.0.0
servers:
  - url: https://pro-api.coingecko.com/api/v3/onchain
security:
  - apiKeyAuth: []
  - apiKeyQueryParam: []
paths:
  /simple/networks/{network}/token_price/{addresses}:
    get:
      tags:
        - Simple
      summary: Token Price by Token Addresses
      description: >-
        This endpoint allows you to **get token price based on the provided
        token contract address on a network**
      operationId: onchain-simple-price
      parameters:
        - name: network
          in: path
          description: |-
            network ID 
             *refers to [/networks](/reference/networks-list)
          required: true
          schema:
            type: string
            example: eth
            default: eth
        - name: addresses
          in: path
          description: >-
            token contract address, comma-separated if more than one token
            contract address
          required: true
          schema:
            type: string
            default: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
          examples:
            one value:
              value: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
            multiple values:
              value: >-
                0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2,0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
        - name: include_market_cap
          in: query
          description: 'include market capitalization, default: false'
          required: false
          schema:
            type: boolean
        - name: mcap_fdv_fallback
          in: query
          description: 'return FDV if market cap is not available, default: false'
          required: false
          schema:
            type: boolean
        - name: include_24hr_vol
          in: query
          description: 'include 24hr volume, default: false'
          required: false
          schema:
            type: boolean
        - name: include_24hr_price_change
          in: query
          description: 'include 24hr price change, default: false'
          required: false
          schema:
            type: boolean
        - name: include_total_reserve_in_usd
          in: query
          description: 'include total reserve in USD, default: false'
          required: false
          schema:
            type: boolean
        - name: include_inactive_source
          in: query
          required: false
          description: >-
            include token price data from inactive pools using the most recent
            swap, default: false
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Get current USD prices of multiple tokens on a network
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OnchainSimplePrice'
components:
  schemas:
    OnchainSimplePrice:
      type: object
      properties:
        data:
          type: object
          properties:
            id:
              type: string
            type:
              type: string
            attributes:
              type: object
              properties:
                token_prices:
                  type: object
                  additionalProperties:
                    type: string
                market_cap_usd:
                  type: object
                  additionalProperties:
                    type: string
                h24_volume_usd:
                  type: object
                  additionalProperties:
                    type: string
                h24_price_change_percentage:
                  type: object
                  additionalProperties:
                    type: string
                total_reserve_in_usd:
                  type: object
                  additionalProperties:
                    type: string
                last_trade_timestamp:
                  type: object
                  additionalProperties:
                    type: integer
      example:
        data:
          id: 1ba898f0-eda2-4291-9491-9a5b323f66ef
          type: simple_token_price
          attributes:
            token_prices:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '2289.33'
            market_cap_usd:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '6692452895.779648'
            h24_volume_usd:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '965988358.733808'
            h24_price_change_percentage:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '3.3870290336'
            total_reserve_in_usd:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '1576179559.94669772339136684208'
            last_trade_timestamp:
              '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 1712534400
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: x-cg-pro-api-key
    apiKeyQueryParam:
      type: apiKey
      in: query
      name: x_cg_pro_api_key

````