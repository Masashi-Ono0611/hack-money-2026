"""
Uniswap Subgraph Query Examples

This script demonstrates common queries to the Uniswap v3 Subgraph API.
It includes examples for fetching pool data, swap history, and analytics.
"""

import requests
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

# Subgraph endpoints
UNISWAP_V3_MAINNET = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3"
UNISWAP_V3_ARBITRUM = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum"
UNISWAP_V3_OPTIMISM = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-optimism"
UNISWAP_V3_POLYGON = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon"


class UniswapSubgraph:
    """Wrapper for Uniswap Subgraph queries"""

    def __init__(self, endpoint: str = UNISWAP_V3_MAINNET):
        self.endpoint = endpoint

    def query(self, query: str, variables: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute a GraphQL query against the subgraph"""
        response = requests.post(
            self.endpoint,
            json={"query": query, "variables": variables or {}},
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL errors: {data['errors']}")

        return data["data"]

    def get_pool(self, pool_address: str) -> Dict[str, Any]:
        """Get pool information by address"""
        query = """
        query GetPool($id: ID!) {
            pool(id: $id) {
                id
                token0 {
                    id
                    symbol
                    name
                    decimals
                }
                token1 {
                    id
                    symbol
                    name
                    decimals
                }
                feeTier
                liquidity
                sqrtPrice
                tick
                token0Price
                token1Price
                volumeUSD
                volumeToken0
                volumeToken1
                feesUSD
                txCount
                totalValueLockedToken0
                totalValueLockedToken1
                totalValueLockedUSD
            }
        }
        """
        result = self.query(query, {"id": pool_address.lower()})
        return result["pool"]

    def get_top_pools(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top pools by volume"""
        query = """
        query GetTopPools($limit: Int!) {
            pools(
                first: $limit
                orderBy: volumeUSD
                orderDirection: desc
            ) {
                id
                token0 { symbol }
                token1 { symbol }
                feeTier
                volumeUSD
                totalValueLockedUSD
                token0Price
                token1Price
            }
        }
        """
        result = self.query(query, {"limit": limit})
        return result["pools"]

    def get_recent_swaps(
        self, pool_address: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent swaps for a pool"""
        query = """
        query GetRecentSwaps($pool: String!, $limit: Int!) {
            swaps(
                first: $limit
                orderBy: timestamp
                orderDirection: desc
                where: { pool: $pool }
            ) {
                id
                timestamp
                sender
                recipient
                amount0
                amount1
                amountUSD
                sqrtPriceX96
                tick
                transaction {
                    id
                    blockNumber
                }
            }
        }
        """
        result = self.query(query, {"pool": pool_address.lower(), "limit": limit})
        return result["swaps"]

    def get_token_price_history(
        self, token_address: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get token price history"""
        query = """
        query GetTokenHistory($token: String!, $limit: Int!) {
            tokenDayDatas(
                first: $limit
                orderBy: date
                orderDirection: desc
                where: { token: $token }
            ) {
                date
                priceUSD
                volumeUSD
                totalValueLockedUSD
                open
                high
                low
                close
            }
        }
        """
        result = self.query(query, {"token": token_address.lower(), "limit": days})
        return result["tokenDayDatas"]

    def get_pool_day_data(
        self, pool_address: str, days: int = 7
    ) -> List[Dict[str, Any]]:
        """Get pool statistics over time"""
        query = """
        query GetPoolDayData($pool: String!, $limit: Int!) {
            poolDayDatas(
                first: $limit
                orderBy: date
                orderDirection: desc
                where: { pool: $pool }
            ) {
                date
                volumeUSD
                tvlUSD
                feesUSD
                txCount
                open
                high
                low
                close
            }
        }
        """
        result = self.query(query, {"pool": pool_address.lower(), "limit": days})
        return result["poolDayDatas"]

    def get_user_positions(
        self, user_address: str, active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """Get liquidity positions for a user"""
        where_clause = '{ owner: $owner, liquidity_gt: "0" }' if active_only else '{ owner: $owner }'

        query = f"""
        query GetUserPositions($owner: String!) {{
            positions(where: {where_clause}) {{
                id
                owner
                pool {{
                    id
                    token0 {{ symbol }}
                    token1 {{ symbol }}
                }}
                liquidity
                tickLower {{ tickIdx }}
                tickUpper {{ tickIdx }}
                depositedToken0
                depositedToken1
                withdrawnToken0
                withdrawnToken1
                collectedFeesToken0
                collectedFeesToken1
            }}
        }}
        """
        result = self.query(query, {"owner": user_address.lower()})
        return result["positions"]

    def get_token_info(self, token_address: str) -> Dict[str, Any]:
        """Get token information and statistics"""
        query = """
        query GetToken($id: ID!) {
            token(id: $id) {
                id
                symbol
                name
                decimals
                totalSupply
                volume
                volumeUSD
                feesUSD
                txCount
                totalValueLocked
                totalValueLockedUSD
                derivedETH
            }
        }
        """
        result = self.query(query, {"id": token_address.lower()})
        return result["token"]

    def get_large_swaps(
        self, min_usd: float = 100000, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get large swaps (whale tracking)"""
        query = """
        query GetLargeSwaps($minUSD: String!, $limit: Int!) {
            swaps(
                first: $limit
                orderBy: amountUSD
                orderDirection: desc
                where: { amountUSD_gt: $minUSD }
            ) {
                timestamp
                pool {
                    token0 { symbol }
                    token1 { symbol }
                }
                amount0
                amount1
                amountUSD
                sender
                origin
                transaction { id }
            }
        }
        """
        result = self.query(query, {"minUSD": str(min_usd), "limit": limit})
        return result["swaps"]

    def get_protocol_stats(self) -> Dict[str, Any]:
        """Get overall protocol statistics"""
        query = """
        query GetProtocolStats {
            factory(id: "0x1F98431c8aD98523631AE4a59f267346ea31F984") {
                poolCount
                txCount
                totalVolumeUSD
                totalFeesUSD
                totalValueLockedUSD
            }
        }
        """
        result = self.query(query)
        return result["factory"]

    def search_tokens(self, search_term: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for tokens by symbol or name"""
        query = """
        query SearchTokens($search: String!, $limit: Int!) {
            tokens(
                where: {
                    symbol_contains_nocase: $search
                }
                first: $limit
                orderBy: volumeUSD
                orderDirection: desc
            ) {
                id
                symbol
                name
                volumeUSD
                totalValueLockedUSD
            }
        }
        """
        result = self.query(query, {"search": search_term, "limit": limit})
        return result["tokens"]


# Example usage functions
def example_get_pool_info():
    """Example: Get USDC/WETH pool info"""
    subgraph = UniswapSubgraph()

    # USDC/WETH 0.05% pool
    pool_address = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"

    pool = subgraph.get_pool(pool_address)

    print("=== Pool Information ===")
    print(f"Pool: {pool['token0']['symbol']}/{pool['token1']['symbol']}")
    print(f"Fee Tier: {int(pool['feeTier']) / 10000}%")
    print(f"TVL: ${float(pool['totalValueLockedUSD']):,.2f}")
    print(f"24h Volume: ${float(pool['volumeUSD']):,.2f}")
    print(f"Total Fees: ${float(pool['feesUSD']):,.2f}")
    print(f"Price: 1 {pool['token0']['symbol']} = {pool['token0Price']} {pool['token1']['symbol']}")


def example_track_swaps():
    """Example: Track recent swaps"""
    subgraph = UniswapSubgraph()

    pool_address = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
    swaps = subgraph.get_recent_swaps(pool_address, limit=10)

    print("\n=== Recent Swaps ===")
    for swap in swaps:
        timestamp = datetime.fromtimestamp(int(swap["timestamp"]))
        print(f"{timestamp}: ${float(swap['amountUSD']):,.2f}")


def example_portfolio_tracking():
    """Example: Track user's positions"""
    subgraph = UniswapSubgraph()

    user_address = "0x..."  # Replace with actual address
    positions = subgraph.get_user_positions(user_address)

    print("\n=== Active Positions ===")
    for pos in positions:
        pool = pos["pool"]
        print(f"\nPosition #{pos['id']}")
        print(f"Pool: {pool['token0']['symbol']}/{pool['token1']['symbol']}")
        print(f"Deposited: {pos['depositedToken0']} {pool['token0']['symbol']}, "
              f"{pos['depositedToken1']} {pool['token1']['symbol']}")
        print(f"Fees Collected: {pos['collectedFeesToken0']} {pool['token0']['symbol']}, "
              f"{pos['collectedFeesToken1']} {pool['token1']['symbol']}")


def example_token_analytics():
    """Example: Get token analytics"""
    subgraph = UniswapSubgraph()

    # USDC
    token_address = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    token = subgraph.get_token_info(token_address)

    print("\n=== Token Analytics ===")
    print(f"Token: {token['name']} ({token['symbol']})")
    print(f"TVL: ${float(token['totalValueLockedUSD']):,.2f}")
    print(f"Volume: ${float(token['volumeUSD']):,.2f}")
    print(f"Fees: ${float(token['feesUSD']):,.2f}")
    print(f"Transactions: {token['txCount']}")


def example_whale_watching():
    """Example: Track large swaps"""
    subgraph = UniswapSubgraph()

    swaps = subgraph.get_large_swaps(min_usd=1000000, limit=5)

    print("\n=== Large Swaps (>$1M) ===")
    for swap in swaps:
        timestamp = datetime.fromtimestamp(int(swap["timestamp"]))
        pool = swap["pool"]
        print(f"\n{timestamp}")
        print(f"Pool: {pool['token0']['symbol']}/{pool['token1']['symbol']}")
        print(f"Amount: ${float(swap['amountUSD']):,.2f}")
        print(f"From: {swap['origin']}")


def example_protocol_overview():
    """Example: Get protocol-wide stats"""
    subgraph = UniswapSubgraph()

    stats = subgraph.get_protocol_stats()

    print("\n=== Protocol Statistics ===")
    print(f"Total Pools: {stats['poolCount']}")
    print(f"Total Transactions: {stats['txCount']}")
    print(f"Total Volume: ${float(stats['totalVolumeUSD']):,.2f}")
    print(f"Total Fees: ${float(stats['totalFeesUSD']):,.2f}")
    print(f"Total Value Locked: ${float(stats['totalValueLockedUSD']):,.2f}")


if __name__ == "__main__":
    # Run examples
    try:
        example_get_pool_info()
        example_track_swaps()
        # example_portfolio_tracking()  # Requires valid user address
        example_token_analytics()
        example_whale_watching()
        example_protocol_overview()
    except Exception as e:
        print(f"Error: {e}")
