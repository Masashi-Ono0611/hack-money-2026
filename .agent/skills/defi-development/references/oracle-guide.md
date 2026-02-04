# オラクル統合完全ガイド

DeFiプロトコルにおける価格オラクルの統合と運用。
セキュリティ考慮事項から実装パターンまで詳述。

## 1. オラクルの種類

### 1.1 プッシュ型オラクル

外部から価格が更新される。

**Chainlink**:
```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getLatestPrice() public view returns (int256, uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // 必須: データ検証
        require(price > 0, "Invalid price");
        require(updatedAt > 0, "Round not complete");
        require(answeredInRound >= roundId, "Stale price");

        return (price, updatedAt);
    }

    // 鮮度チェック付き
    function getPriceWithStalenessCheck(
        uint256 maxStaleness
    ) public view returns (int256) {
        (int256 price, uint256 updatedAt) = getLatestPrice();
        require(block.timestamp - updatedAt <= maxStaleness, "Price too stale");
        return price;
    }
}
```

**Pyth Network**:
```solidity
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PythConsumer {
    IPyth public pyth;

    constructor(address _pyth) {
        pyth = IPyth(_pyth);
    }

    function getPrice(bytes32 priceId) public view returns (int64, uint64) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(priceId);

        // 信頼区間のチェック
        require(price.conf < uint64(price.price) / 100, "Price confidence too low");

        return (price.price, price.publishTime);
    }

    // 更新付き（オフチェーンから価格データを受信）
    function updateAndGetPrice(
        bytes[] calldata updateData,
        bytes32 priceId
    ) public payable returns (int64) {
        uint256 fee = pyth.getUpdateFee(updateData);
        pyth.updatePriceFeeds{value: fee}(updateData);

        PythStructs.Price memory price = pyth.getPrice(priceId);
        return price.price;
    }
}
```

### 1.2 プル型オラクル（TWAP）

オンチェーンデータから価格を計算。

**Uniswap V3 TWAP**:
```solidity
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

contract UniswapV3TWAPOracle {
    IUniswapV3Pool public pool;
    address public token0;
    address public token1;

    uint32 public constant TWAP_INTERVAL = 30 minutes;

    constructor(address _pool) {
        pool = IUniswapV3Pool(_pool);
        token0 = pool.token0();
        token1 = pool.token1();
    }

    function getTWAP() public view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = TWAP_INTERVAL;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(TWAP_INTERVAL)));

        // tick から price への変換
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(arithmeticMeanTick);
        return _getPriceFromSqrtPrice(sqrtPriceX96);
    }

    function _getPriceFromSqrtPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        // sqrtPriceX96^2 / 2^192 = price
        return uint256(sqrtPriceX96) * uint256(sqrtPriceX96) >> 192;
    }

    // より精度の高いquote取得
    function getQuote(
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) public view returns (uint256 quoteAmount) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = TWAP_INTERVAL;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(TWAP_INTERVAL)));

        quoteAmount = OracleLibrary.getQuoteAtTick(
            arithmeticMeanTick,
            baseAmount,
            baseToken,
            quoteToken
        );
    }
}
```

### 1.3 ハイブリッドオラクル

複数のソースを組み合わせる。

```solidity
contract HybridOracle {
    AggregatorV3Interface public chainlinkFeed;
    IUniswapV3Pool public uniswapPool;

    uint256 public constant MAX_DEVIATION = 500;  // 5%
    uint256 public constant STALENESS_THRESHOLD = 1 hours;
    uint32 public constant TWAP_INTERVAL = 30 minutes;

    enum PriceSource {
        CHAINLINK,
        UNISWAP_TWAP,
        AGGREGATED
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        PriceSource source;
    }

    function getPrice() public view returns (PriceData memory) {
        (uint256 chainlinkPrice, uint256 chainlinkTimestamp) = _getChainlinkPrice();
        uint256 twapPrice = _getUniswapTWAP();

        // Chainlinkが新鮮な場合
        if (block.timestamp - chainlinkTimestamp <= STALENESS_THRESHOLD) {
            // 乖離チェック
            uint256 deviation = _calculateDeviation(chainlinkPrice, twapPrice);

            if (deviation <= MAX_DEVIATION) {
                // 両方が一致: 平均を使用
                return PriceData({
                    price: (chainlinkPrice + twapPrice) / 2,
                    timestamp: block.timestamp,
                    source: PriceSource.AGGREGATED
                });
            } else {
                // 乖離が大きい: Chainlinkを優先（より信頼性が高い）
                return PriceData({
                    price: chainlinkPrice,
                    timestamp: chainlinkTimestamp,
                    source: PriceSource.CHAINLINK
                });
            }
        }

        // Chainlinkが古い: TWAPを使用
        return PriceData({
            price: twapPrice,
            timestamp: block.timestamp,
            source: PriceSource.UNISWAP_TWAP
        });
    }

    function _getChainlinkPrice() internal view returns (uint256, uint256) {
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,

        ) = chainlinkFeed.latestRoundData();

        require(price > 0, "Invalid Chainlink price");
        return (uint256(price), updatedAt);
    }

    function _getUniswapTWAP() internal view returns (uint256) {
        // 前述のTWAP計算ロジック
    }

    function _calculateDeviation(uint256 price1, uint256 price2) internal pure returns (uint256) {
        if (price1 > price2) {
            return (price1 - price2) * 10000 / price1;
        }
        return (price2 - price1) * 10000 / price2;
    }
}
```

## 2. 主要オラクルプロバイダー

### 2.1 Chainlink

**特徴**:
- 最も広く使用される
- 分散型ノードネットワーク
- 高い信頼性

**主要フィード（Ethereum Mainnet）**:
| ペア | アドレス | Decimals |
|------|---------|----------|
| ETH/USD | 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 | 8 |
| BTC/USD | 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c | 8 |
| USDC/USD | 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6 | 8 |
| DAI/USD | 0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9 | 8 |
| LINK/USD | 0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c | 8 |

### 2.2 Pyth Network

**特徴**:
- 高頻度更新（400ms）
- 信頼区間を提供
- クロスチェーン対応

```solidity
// 主要Price IDs
bytes32 constant ETH_USD = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
bytes32 constant BTC_USD = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
```

### 2.3 Redstone

**特徴**:
- オンデマンド価格更新
- ガス効率が良い
- modularなデザイン

```solidity
import "@redstone-finance/evm-connector/contracts/data-services/MainDemoConsumerBase.sol";

contract RedstoneConsumer is MainDemoConsumerBase {
    function getETHPrice() public view returns (uint256) {
        return getOracleNumericValueFromTxMsg(bytes32("ETH"));
    }
}
```

## 3. セキュリティ考慮事項

### 3.1 必須チェック

```solidity
contract SecureOracleConsumer {
    AggregatorV3Interface public priceFeed;

    uint256 public constant MAX_STALENESS = 1 hours;
    uint256 public constant MIN_PRICE = 1;  // 最小価格（ゼロ除算防止）
    int256 public constant MAX_PRICE_CHANGE = 50;  // 50%の最大変動

    int256 public lastPrice;
    uint256 public lastUpdateTime;

    function getValidatedPrice() public returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // 1. 基本的な妥当性チェック
        require(price > 0, "Negative/zero price");
        require(updatedAt > 0, "Round not complete");
        require(answeredInRound >= roundId, "Stale round");

        // 2. 鮮度チェック
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Price stale");

        // 3. 急激な価格変動チェック
        if (lastPrice > 0) {
            int256 priceChange = ((price - lastPrice) * 100) / lastPrice;
            require(
                priceChange > -MAX_PRICE_CHANGE && priceChange < MAX_PRICE_CHANGE,
                "Price change too large"
            );
        }

        // 4. 状態更新
        lastPrice = price;
        lastUpdateTime = updatedAt;

        return uint256(price);
    }
}
```

### 3.2 フォールバック戦略

```solidity
contract OracleWithFallback {
    AggregatorV3Interface public primaryOracle;
    AggregatorV3Interface public fallbackOracle;
    IUniswapV3Pool public twapPool;

    uint256 public constant PRIMARY_STALENESS = 1 hours;
    uint256 public constant FALLBACK_STALENESS = 4 hours;

    event OracleFallback(string reason);

    function getPrice() public returns (uint256) {
        // 1. プライマリオラクルを試行
        try this._getPrimaryPrice() returns (uint256 price) {
            return price;
        } catch {
            emit OracleFallback("Primary oracle failed");
        }

        // 2. フォールバックオラクルを試行
        try this._getFallbackPrice() returns (uint256 price) {
            return price;
        } catch {
            emit OracleFallback("Fallback oracle failed");
        }

        // 3. TWAPを使用
        return _getTWAPPrice();
    }

    function _getPrimaryPrice() external view returns (uint256) {
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,

        ) = primaryOracle.latestRoundData();

        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= PRIMARY_STALENESS, "Stale");

        return uint256(price);
    }

    function _getFallbackPrice() external view returns (uint256) {
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,

        ) = fallbackOracle.latestRoundData();

        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= FALLBACK_STALENESS, "Stale");

        return uint256(price);
    }
}
```

### 3.3 サーキットブレーカー

```solidity
contract OracleCircuitBreaker {
    uint256 public constant PRICE_DEVIATION_THRESHOLD = 1000;  // 10%
    uint256 public constant CIRCUIT_BREAKER_DURATION = 1 hours;

    uint256 public lastValidPrice;
    uint256 public circuitBreakerTriggeredAt;
    bool public circuitBreakerActive;

    event CircuitBreakerTriggered(uint256 oldPrice, uint256 newPrice, uint256 deviation);
    event CircuitBreakerReset();

    modifier checkCircuitBreaker() {
        require(!circuitBreakerActive, "Circuit breaker active");
        _;
    }

    function updatePrice(uint256 newPrice) external checkCircuitBreaker {
        if (lastValidPrice > 0) {
            uint256 deviation = _calculateDeviation(lastValidPrice, newPrice);

            if (deviation > PRICE_DEVIATION_THRESHOLD) {
                circuitBreakerActive = true;
                circuitBreakerTriggeredAt = block.timestamp;
                emit CircuitBreakerTriggered(lastValidPrice, newPrice, deviation);
                return;
            }
        }

        lastValidPrice = newPrice;
    }

    function resetCircuitBreaker() external onlyAdmin {
        require(
            block.timestamp >= circuitBreakerTriggeredAt + CIRCUIT_BREAKER_DURATION,
            "Too early"
        );
        circuitBreakerActive = false;
        emit CircuitBreakerReset();
    }
}
```

## 4. 価格の正規化

### 4.1 Decimals処理

```solidity
library PriceNormalizer {
    function normalizePrice(
        int256 price,
        uint8 priceDecimals,
        uint8 targetDecimals
    ) internal pure returns (uint256) {
        require(price > 0, "Invalid price");

        if (priceDecimals == targetDecimals) {
            return uint256(price);
        }

        if (priceDecimals > targetDecimals) {
            return uint256(price) / (10 ** (priceDecimals - targetDecimals));
        }

        return uint256(price) * (10 ** (targetDecimals - priceDecimals));
    }

    // USD価値の計算
    function getUSDValue(
        uint256 amount,
        uint8 tokenDecimals,
        uint256 priceUSD,
        uint8 priceDecimals
    ) internal pure returns (uint256) {
        // amount * price / 10^(tokenDecimals + priceDecimals - 18)
        return amount * priceUSD / (10 ** (tokenDecimals + priceDecimals - 18));
    }
}
```

### 4.2 複数トークンの価格計算

```solidity
contract MultiAssetPricing {
    mapping(address => address) public priceFeeds;
    mapping(address => uint8) public feedDecimals;

    function getAssetPrice(address asset) public view returns (uint256) {
        address feed = priceFeeds[asset];
        require(feed != address(0), "No feed");

        (, int256 price, , , ) = AggregatorV3Interface(feed).latestRoundData();

        // 18 decimalsに正規化
        uint8 decimals = feedDecimals[asset];
        if (decimals < 18) {
            return uint256(price) * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            return uint256(price) / (10 ** (decimals - 18));
        }
        return uint256(price);
    }

    function getTotalValue(
        address[] calldata assets,
        uint256[] calldata amounts
    ) public view returns (uint256 totalUSD) {
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 price = getAssetPrice(assets[i]);
            uint8 tokenDecimals = IERC20Metadata(assets[i]).decimals();

            // amount * price / 10^tokenDecimals
            totalUSD += amounts[i] * price / (10 ** tokenDecimals);
        }
    }
}
```

## 5. オラクル選択ガイド

| 要件 | 推奨オラクル |
|------|-------------|
| メジャーペア、高信頼性 | Chainlink |
| 高頻度更新が必要 | Pyth |
| ガス効率重視 | Redstone |
| 操作耐性重視 | TWAP |
| 新規トークン | TWAP + Chainlink（利用可能な場合）|
| 高価値操作 | 複数オラクルのアグリゲーション |

## チェックリスト: オラクル統合

- [ ] 適切なオラクルタイプの選択
- [ ] 鮮度チェックの実装
- [ ] 価格妥当性チェックの実装
- [ ] フォールバック戦略の実装
- [ ] サーキットブレーカーの検討
- [ ] Decimals処理の確認
- [ ] ゼロ/負の価格のハンドリング
- [ ] ガスコストの最適化
- [ ] テスト（フォークテスト推奨）
