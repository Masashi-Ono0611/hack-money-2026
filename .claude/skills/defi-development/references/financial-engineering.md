# DeFi金融工学ガイド

DeFiプロトコル設計に必要な金融工学の基礎と応用。
数学的原理から実装パターンまでを詳述。

## 1. AMM（自動マーケットメーカー）の数学

### 1.1 Constant Product (x * y = k)

最も基本的なAMM曲線。Uniswap V1/V2で採用。

```python
# 基本原理
# 取引前: x * y = k
# 取引後: (x + dx) * (y - dy) = k
# よって: dy = y * dx / (x + dx)

def constant_product_swap(reserve_in, reserve_out, amount_in, fee=0.003):
    """
    Constant Product AMMでのスワップ計算

    Args:
        reserve_in: 入力トークンのリザーブ
        reserve_out: 出力トークンのリザーブ
        amount_in: 入力量
        fee: 手数料率（デフォルト0.3%）

    Returns:
        出力量
    """
    amount_in_with_fee = amount_in * (1 - fee)
    numerator = amount_in_with_fee * reserve_out
    denominator = reserve_in + amount_in_with_fee
    return numerator / denominator


def get_price_impact(reserve_in, reserve_out, amount_in, fee=0.003):
    """
    価格インパクト（スリッページ）の計算

    Returns:
        価格インパクト（パーセント）
    """
    spot_price = reserve_out / reserve_in
    amount_out = constant_product_swap(reserve_in, reserve_out, amount_in, fee)
    execution_price = amount_out / amount_in
    return (spot_price - execution_price) / spot_price * 100
```

**特徴**:
- 価格は無限大まで変動可能
- 流動性は全価格帯に分散
- 大口取引で高いスリッページ

### 1.2 Constant Sum (x + y = k)

```python
def constant_sum_swap(reserve_in, reserve_out, amount_in):
    """
    理論上はスリッページゼロだが、リザーブが枯渇する
    """
    return min(amount_in, reserve_out)
```

**実用性**: ペグが完全に維持される前提でのみ機能。現実には使用されない。

### 1.3 StableSwap (Curve)

Constant ProductとConstant Sumのハイブリッド。

```python
import numpy as np

def get_D(xp, amp):
    """
    StableSwap不変量Dを計算

    D = A * n^n * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))

    Args:
        xp: 正規化されたリザーブのリスト
        amp: 増幅係数A

    Returns:
        不変量D
    """
    n = len(xp)
    S = sum(xp)
    if S == 0:
        return 0

    D = S
    Ann = amp * n ** n

    for _ in range(255):  # Newton法による収束
        D_P = D
        for x in xp:
            D_P = D_P * D // (x * n)

        D_prev = D
        D = (Ann * S + D_P * n) * D // ((Ann - 1) * D + (n + 1) * D_P)

        if abs(D - D_prev) <= 1:
            return D

    raise Exception("D calculation did not converge")


def stableswap_get_y(i, j, x, xp, amp):
    """
    StableSwapでのスワップ後のリザーブを計算

    Args:
        i: 入力トークンのインデックス
        j: 出力トークンのインデックス
        x: 入力後の新しいリザーブ
        xp: 現在のリザーブ
        amp: 増幅係数

    Returns:
        出力後のリザーブ
    """
    n = len(xp)
    D = get_D(xp, amp)
    Ann = amp * n ** n

    c = D
    S = 0
    for k in range(n):
        if k == j:
            continue
        if k == i:
            _x = x
        else:
            _x = xp[k]
        S += _x
        c = c * D // (_x * n)

    c = c * D // (Ann * n)
    b = S + D // Ann

    y = D
    for _ in range(255):
        y_prev = y
        y = (y * y + c) // (2 * y + b - D)
        if abs(y - y_prev) <= 1:
            return y

    raise Exception("y calculation did not converge")
```

**Aパラメータの影響**:
- A = 0: Constant Productと同等
- A = ∞: Constant Sumに近づく
- 実際のCurveプール: A = 100〜2000

### 1.4 Concentrated Liquidity (Uniswap V3)

```python
import math

def calculate_liquidity(amount0, amount1, sqrt_price_current, sqrt_price_lower, sqrt_price_upper):
    """
    指定された範囲での流動性を計算

    L = sqrt(x * y)（範囲内の場合）
    """
    if sqrt_price_current <= sqrt_price_lower:
        # 価格が範囲より下: token0のみ
        liquidity = amount0 * sqrt_price_lower * sqrt_price_upper / (sqrt_price_upper - sqrt_price_lower)
    elif sqrt_price_current >= sqrt_price_upper:
        # 価格が範囲より上: token1のみ
        liquidity = amount1 / (sqrt_price_upper - sqrt_price_lower)
    else:
        # 価格が範囲内
        liquidity0 = amount0 * sqrt_price_current * sqrt_price_upper / (sqrt_price_upper - sqrt_price_current)
        liquidity1 = amount1 / (sqrt_price_current - sqrt_price_lower)
        liquidity = min(liquidity0, liquidity1)

    return liquidity


def tick_to_sqrt_price(tick):
    """
    tickからsqrtPriceX96を計算
    price = 1.0001^tick
    """
    return math.sqrt(1.0001 ** tick)


def calculate_capital_efficiency(price_range_percent):
    """
    フルレンジ対比の資本効率を計算

    例: ±5%の範囲 → 約10倍の資本効率
    """
    sqrt_lower = math.sqrt(1 - price_range_percent / 100)
    sqrt_upper = math.sqrt(1 + price_range_percent / 100)
    return 1 / (sqrt_upper - sqrt_lower)
```

## 2. インパーマネントロス

### 2.1 理論

```python
import math

def impermanent_loss(price_ratio):
    """
    インパーマネントロス計算

    IL = 2 * sqrt(r) / (1 + r) - 1

    Args:
        price_ratio: 現在価格 / 初期価格

    Returns:
        IL率（負の値）
    """
    return 2 * math.sqrt(price_ratio) / (1 + price_ratio) - 1


def concentrated_impermanent_loss(price_ratio, range_factor):
    """
    Concentrated LiquidityでのIL（範囲内の場合）

    より狭い範囲 = より高いIL
    """
    # 簡略化: 範囲が狭いほどILが増幅
    base_il = impermanent_loss(price_ratio)
    return base_il * range_factor


# 価格変動ごとのIL
price_changes = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0]
for ratio in price_changes:
    il = impermanent_loss(ratio) * 100
    print(f"価格変動 {ratio}x: IL = {il:.2f}%")

# 出力:
# 価格変動 0.5x: IL = -5.72%
# 価格変動 0.75x: IL = -1.03%
# 価格変動 1.0x: IL = 0.00%
# 価格変動 1.25x: IL = -0.62%
# 価格変動 1.5x: IL = -2.02%
# 価格変動 2.0x: IL = -5.72%
# 価格変動 3.0x: IL = -13.40%
# 価格変動 4.0x: IL = -20.00%
# 価格変動 5.0x: IL = -25.46%
```

### 2.2 ILを考慮した収益計算

```python
def calculate_lp_returns(
    initial_investment,
    price_ratio,
    trading_fees_earned,
    farming_rewards,
    time_period_days
):
    """
    LP収益の総合計算
    """
    il = impermanent_loss(price_ratio) * initial_investment

    # 価格変動による資産価値変化（IL考慮前）
    hodl_value = initial_investment * (1 + price_ratio) / 2

    # LP後の実際の価値
    lp_value = initial_investment * 2 * math.sqrt(price_ratio) / (1 + price_ratio)

    total_return = lp_value + trading_fees_earned + farming_rewards - initial_investment
    apr = total_return / initial_investment * 365 / time_period_days

    return {
        "hodl_value": hodl_value,
        "lp_value": lp_value,
        "il": il,
        "fees": trading_fees_earned,
        "rewards": farming_rewards,
        "total_return": total_return,
        "apr": apr
    }
```

## 3. 金利モデル

### 3.1 利用率ベースモデル（Aave/Compound型）

```python
def calculate_borrow_rate(
    utilization,
    base_rate=0.02,      # 2%
    slope1=0.04,          # 4%
    slope2=0.75,          # 75%
    optimal_utilization=0.8  # 80%
):
    """
    キンク型金利モデル

    利用率 <= 最適利用率: 緩やかな上昇
    利用率 > 最適利用率: 急激な上昇
    """
    if utilization <= optimal_utilization:
        return base_rate + (utilization / optimal_utilization) * slope1
    else:
        excess = utilization - optimal_utilization
        max_excess = 1 - optimal_utilization
        return base_rate + slope1 + (excess / max_excess) * slope2


def calculate_supply_rate(borrow_rate, utilization, reserve_factor=0.1):
    """
    預け入れ金利 = 借入金利 * 利用率 * (1 - 準備金率)
    """
    return borrow_rate * utilization * (1 - reserve_factor)


# 利用率ごとの金利
utilizations = [0.2, 0.4, 0.6, 0.8, 0.85, 0.9, 0.95, 1.0]
for u in utilizations:
    borrow = calculate_borrow_rate(u) * 100
    supply = calculate_supply_rate(calculate_borrow_rate(u), u) * 100
    print(f"利用率 {u*100:.0f}%: 借入金利 {borrow:.2f}%, 預入金利 {supply:.2f}%")
```

### 3.2 複利計算

```solidity
// 連続複利（レンディングプロトコルの標準）
library MathUtils {
    uint256 internal constant SECONDS_PER_YEAR = 365 days;
    uint256 internal constant RAY = 1e27;

    // e^(rate * time) をTaylor展開で近似
    function calculateCompoundedInterest(
        uint256 rate,
        uint256 lastUpdateTimestamp
    ) internal view returns (uint256) {
        uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
        uint256 ratePerSecond = rate / SECONDS_PER_YEAR;

        // Taylor展開: e^x ≈ 1 + x + x²/2 + x³/6
        uint256 exp = ratePerSecond * timeDelta;
        uint256 expSquared = exp * exp / RAY;
        uint256 expCubed = expSquared * exp / RAY;

        return RAY + exp + expSquared / 2 + expCubed / 6;
    }
}
```

## 4. 清算メカニズム

### 4.1 Health Factor計算

```python
def calculate_health_factor(
    collateral_value_usd,
    debt_value_usd,
    liquidation_threshold=0.825  # 82.5%
):
    """
    Health Factor = (担保価値 * 清算閾値) / 借入価値

    HF < 1: 清算対象
    """
    if debt_value_usd == 0:
        return float('inf')
    return (collateral_value_usd * liquidation_threshold) / debt_value_usd


def max_borrowable(collateral_value_usd, ltv=0.75):
    """
    最大借入可能額 = 担保価値 * LTV
    """
    return collateral_value_usd * ltv


def liquidation_price(
    collateral_amount,
    debt_usd,
    liquidation_threshold=0.825
):
    """
    清算価格の計算

    清算価格 = 借入額 / (担保量 * 清算閾値)
    """
    return debt_usd / (collateral_amount * liquidation_threshold)
```

### 4.2 清算シミュレーション

```python
def simulate_liquidation(
    collateral_amount,
    collateral_price,
    debt_amount,
    close_factor=0.5,      # 一度に清算可能な割合
    liquidation_bonus=1.05  # 清算ボーナス5%
):
    """
    清算のシミュレーション
    """
    debt_to_liquidate = debt_amount * close_factor
    collateral_to_seize = debt_to_liquidate * liquidation_bonus / collateral_price

    remaining_collateral = collateral_amount - collateral_to_seize
    remaining_debt = debt_amount - debt_to_liquidate

    new_health_factor = calculate_health_factor(
        remaining_collateral * collateral_price,
        remaining_debt
    )

    return {
        "debt_liquidated": debt_to_liquidate,
        "collateral_seized": collateral_to_seize,
        "remaining_collateral": remaining_collateral,
        "remaining_debt": remaining_debt,
        "new_health_factor": new_health_factor,
        "liquidator_profit": collateral_to_seize * collateral_price - debt_to_liquidate
    }
```

## 5. オプション価格モデル

### 5.1 Black-Scholes

```python
from scipy.stats import norm
import math

def black_scholes(S, K, T, r, sigma, option_type='call'):
    """
    Black-Scholesオプション価格モデル

    Args:
        S: スポット価格
        K: 行使価格
        T: 満期までの時間（年）
        r: 無リスク金利
        sigma: ボラティリティ

    Returns:
        オプション価格
    """
    d1 = (math.log(S/K) + (r + sigma**2/2)*T) / (sigma*math.sqrt(T))
    d2 = d1 - sigma*math.sqrt(T)

    if option_type == 'call':
        price = S * norm.cdf(d1) - K * math.exp(-r*T) * norm.cdf(d2)
    else:  # put
        price = K * math.exp(-r*T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    return price


def calculate_greeks(S, K, T, r, sigma):
    """
    オプションのギリシャ文字を計算
    """
    d1 = (math.log(S/K) + (r + sigma**2/2)*T) / (sigma*math.sqrt(T))
    d2 = d1 - sigma*math.sqrt(T)

    return {
        "delta": norm.cdf(d1),  # 価格感応度
        "gamma": norm.pdf(d1) / (S * sigma * math.sqrt(T)),  # デルタの変化率
        "theta": -(S * norm.pdf(d1) * sigma) / (2 * math.sqrt(T)),  # 時間減衰
        "vega": S * norm.pdf(d1) * math.sqrt(T),  # ボラティリティ感応度
        "rho": K * T * math.exp(-r*T) * norm.cdf(d2)  # 金利感応度
    }
```

## 6. 永久契約のファンディングレート

```python
def calculate_funding_rate(
    mark_price,
    index_price,
    funding_interval_hours=8
):
    """
    永久契約のファンディングレート計算

    Premium = (Mark Price - Index Price) / Index Price
    Funding Rate = Premium / Funding Interval
    """
    premium = (mark_price - index_price) / index_price
    funding_rate = premium / (24 / funding_interval_hours)
    return funding_rate


def calculate_pnl(
    position_size,
    entry_price,
    current_price,
    is_long,
    funding_paid
):
    """
    永久契約のPnL計算
    """
    if is_long:
        unrealized_pnl = position_size * (current_price - entry_price) / entry_price
    else:
        unrealized_pnl = position_size * (entry_price - current_price) / entry_price

    net_pnl = unrealized_pnl - funding_paid
    return net_pnl
```

## 7. veToken経済学

```python
def calculate_voting_power(locked_amount, lock_duration_weeks, max_lock_weeks=208):
    """
    veTokenの投票力計算

    投票力 = ロック量 * (残りロック期間 / 最大ロック期間)

    例: 4年ロック = 100% 投票力、2年ロック = 50% 投票力
    """
    return locked_amount * (lock_duration_weeks / max_lock_weeks)


def voting_power_decay(initial_voting_power, weeks_passed, total_lock_weeks):
    """
    投票力の時間減衰

    投票力は線形に減少
    """
    remaining_weeks = total_lock_weeks - weeks_passed
    if remaining_weeks <= 0:
        return 0
    return initial_voting_power * (remaining_weeks / total_lock_weeks)
```

## まとめ: 設計時の考慮事項

| 要素 | 考慮事項 |
|------|---------|
| AMM曲線選択 | ペア特性、資本効率、スリッページ許容度 |
| 金利モデル | 利用率の安定性、借り手/貸し手のインセンティブ |
| 清算パラメータ | バッドデットリスク、清算者インセンティブ |
| IL管理 | 範囲設定、リバランス戦略、報酬補填 |
| ファンディング | 価格収束速度、ポジション偏りの管理 |
