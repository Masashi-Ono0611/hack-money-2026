# トークノミクス設計ガイド

DeFiプロトコルのトークン経済設計。
価値獲得、インセンティブ設計、持続可能性を考慮した設計原則。

## 1. トークンユーティリティの設計

### 1.1 ユーティリティの種類

| タイプ | 説明 | 例 |
|--------|------|-----|
| ガバナンス | プロトコル決定への投票権 | UNI, AAVE |
| 手数料共有 | プロトコル収益の分配 | CRV (veCRV) |
| 手数料割引 | 取引手数料の削減 | BNB |
| 担保 | プロトコル内での担保資産 | MKR |
| ステーキング報酬 | ネットワーク参加報酬 | ETH |
| アクセス権 | 特定機能へのアクセス | API利用権等 |

### 1.2 価値獲得メカニズム

```solidity
// 手数料スイッチ: プロトコル手数料をトークンホルダーに分配
contract FeeDistributor {
    IERC20 public token;
    IERC20 public rewardToken;

    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // プロトコル手数料の受け取り
    function notifyRewardAmount(uint256 reward) external onlyProtocol {
        if (totalSupply() > 0) {
            rewardPerTokenStored += reward * 1e18 / totalSupply();
        }
    }

    function claimReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
        }
    }
}
```

## 2. トークン配分設計

### 2.1 典型的な配分構造

```
総供給量: 1,000,000,000 (10億)

┌─────────────────────────────────────────┐
│ コミュニティ/エコシステム: 40%          │
│ - 流動性マイニング: 25%                 │
│ - エアドロップ: 5%                      │
│ - グラント/パートナーシップ: 10%        │
├─────────────────────────────────────────┤
│ チーム/アドバイザー: 20%                │
│ - 4年ベスティング、1年クリフ           │
├─────────────────────────────────────────┤
│ 投資家: 20%                             │
│ - シード: 5% (2年ベスティング)          │
│ - プライベート: 10% (18ヶ月ベスティング)│
│ - パブリック: 5% (6ヶ月ベスティング)    │
├─────────────────────────────────────────┤
│ トレジャリー: 15%                       │
│ - DAO管理                               │
├─────────────────────────────────────────┤
│ 初期流動性: 5%                          │
│ - DEX流動性提供                         │
└─────────────────────────────────────────┘
```

### 2.2 ベスティングの実装

```solidity
contract TokenVesting {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 released;
    }

    IERC20 public token;
    mapping(address => VestingSchedule) public vestingSchedules;

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) external onlyOwner {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule exists");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: block.timestamp,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            released: 0
        });

        token.transferFrom(msg.sender, address(this), amount);
    }

    function release() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        uint256 releasable = _computeReleasableAmount(schedule);

        require(releasable > 0, "Nothing to release");

        schedule.released += releasable;
        token.transfer(msg.sender, releasable);
    }

    function _computeReleasableAmount(
        VestingSchedule memory schedule
    ) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - schedule.startTime;
        if (elapsedTime >= schedule.vestingDuration) {
            return schedule.totalAmount - schedule.released;
        }

        uint256 vestedAmount = schedule.totalAmount * elapsedTime / schedule.vestingDuration;
        return vestedAmount - schedule.released;
    }
}
```

## 3. インセンティブ設計

### 3.1 流動性マイニング

```solidity
contract LiquidityMining {
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
    }

    IERC20 public rewardToken;
    uint256 public rewardPerSecond;
    uint256 public totalAllocPoint;

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    function deposit(uint256 pid, uint256 amount) external {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];

        updatePool(pid);

        if (user.amount > 0) {
            uint256 pending = user.amount * pool.accRewardPerShare / 1e12 - user.rewardDebt;
            if (pending > 0) {
                safeRewardTransfer(msg.sender, pending);
            }
        }

        if (amount > 0) {
            pool.lpToken.transferFrom(msg.sender, address(this), amount);
            user.amount += amount;
        }

        user.rewardDebt = user.amount * pool.accRewardPerShare / 1e12;
    }

    function updatePool(uint256 pid) public {
        PoolInfo storage pool = poolInfo[pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 multiplier = block.timestamp - pool.lastRewardTime;
        uint256 reward = multiplier * rewardPerSecond * pool.allocPoint / totalAllocPoint;

        pool.accRewardPerShare += reward * 1e12 / lpSupply;
        pool.lastRewardTime = block.timestamp;
    }
}
```

### 3.2 排出スケジュール

```python
def calculate_emission_schedule(
    initial_rate: float,
    decay_rate: float,  # 年間減少率
    years: int
) -> list:
    """
    減衰型排出スケジュールの計算

    例: 初期 100M/年、年率20%減少
    Year 1: 100M
    Year 2: 80M
    Year 3: 64M
    ...
    """
    schedule = []
    rate = initial_rate
    for year in range(years):
        schedule.append({
            "year": year + 1,
            "emission": rate,
            "cumulative": sum(s["emission"] for s in schedule) + rate
        })
        rate *= (1 - decay_rate)
    return schedule

# 例: 4年で総供給の60%を排出
schedule = calculate_emission_schedule(
    initial_rate=200_000_000,  # 2億/年
    decay_rate=0.25,           # 年25%減少
    years=4
)
```

## 4. veToken モデル

### 4.1 Vote-Escrow Token

```solidity
contract VotingEscrow {
    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

    uint256 public constant MAXTIME = 4 * 365 * 86400;  // 4年
    uint256 public constant WEEK = 7 * 86400;

    IERC20 public token;
    mapping(address => LockedBalance) public locked;
    uint256 public totalSupply;

    // Point: 特定時点での投票力
    struct Point {
        int128 bias;      // 投票力
        int128 slope;     // 減少率
        uint256 ts;       // タイムスタンプ
        uint256 blk;      // ブロック番号
    }

    // グローバル状態
    uint256 public epoch;
    mapping(uint256 => Point) public pointHistory;
    mapping(address => mapping(uint256 => Point)) public userPointHistory;
    mapping(address => uint256) public userPointEpoch;

    function createLock(uint256 value, uint256 unlockTime) external {
        require(value > 0, "Need non-zero value");
        require(locked[msg.sender].amount == 0, "Withdraw old tokens first");

        unlockTime = (unlockTime / WEEK) * WEEK;  // 週単位に丸め
        require(unlockTime > block.timestamp, "Lock time in past");
        require(unlockTime <= block.timestamp + MAXTIME, "Lock time > max");

        _depositFor(msg.sender, value, unlockTime, locked[msg.sender], 1);
    }

    function increaseAmount(uint256 value) external {
        LockedBalance memory _locked = locked[msg.sender];
        require(value > 0, "Need non-zero value");
        require(_locked.amount > 0, "No existing lock");
        require(_locked.end > block.timestamp, "Lock expired");

        _depositFor(msg.sender, value, 0, _locked, 2);
    }

    function increaseUnlockTime(uint256 unlockTime) external {
        LockedBalance memory _locked = locked[msg.sender];
        unlockTime = (unlockTime / WEEK) * WEEK;

        require(_locked.end > block.timestamp, "Lock expired");
        require(unlockTime > _locked.end, "Can only increase lock");
        require(unlockTime <= block.timestamp + MAXTIME, "Lock time > max");

        _depositFor(msg.sender, 0, unlockTime, _locked, 3);
    }

    function withdraw() external {
        LockedBalance memory _locked = locked[msg.sender];
        require(block.timestamp >= _locked.end, "Lock not expired");

        uint256 value = uint256(int256(_locked.amount));
        locked[msg.sender] = LockedBalance(0, 0);
        totalSupply -= value;

        token.transfer(msg.sender, value);
    }

    // 投票力計算（時間と共に線形減少）
    function balanceOf(address addr) public view returns (uint256) {
        uint256 _epoch = userPointEpoch[addr];
        if (_epoch == 0) {
            return 0;
        }

        Point memory lastPoint = userPointHistory[addr][_epoch];
        lastPoint.bias -= lastPoint.slope * int128(int256(block.timestamp - lastPoint.ts));

        if (lastPoint.bias < 0) {
            lastPoint.bias = 0;
        }

        return uint256(int256(lastPoint.bias));
    }
}
```

### 4.2 Gauge System（報酬配分）

```solidity
contract GaugeController {
    struct GaugeWeight {
        uint256 weight;
        uint256 total;
    }

    VotingEscrow public votingEscrow;
    mapping(address => mapping(address => uint256)) public voteUserSlopes;
    mapping(address => uint256) public gaugeWeights;

    // ゲージへの投票
    function voteForGaugeWeights(address gauge, uint256 userWeight) external {
        require(userWeight <= 10000, "Max weight exceeded");

        uint256 slope = uint256(int256(votingEscrow.getLastUserSlope(msg.sender)));
        uint256 power = slope * userWeight;

        // 古い投票を削除
        uint256 oldWeight = voteUserSlopes[msg.sender][gauge];
        gaugeWeights[gauge] -= oldWeight;

        // 新しい投票を追加
        voteUserSlopes[msg.sender][gauge] = power;
        gaugeWeights[gauge] += power;
    }

    // ゲージの相対的な重み
    function gaugeRelativeWeight(address gauge) public view returns (uint256) {
        uint256 totalWeight = _getTotalWeight();
        if (totalWeight == 0) return 0;
        return gaugeWeights[gauge] * 1e18 / totalWeight;
    }
}
```

## 5. 手数料構造設計

### 5.1 手数料の種類

| 手数料タイプ | 説明 | 典型的な範囲 |
|-------------|------|-------------|
| スワップ手数料 | 取引ごとの手数料 | 0.01% - 1% |
| 借入金利 | レンディングの金利 | 変動 |
| 清算ペナルティ | 清算時のボーナス | 5% - 15% |
| プロトコル手数料 | プロトコルの取り分 | 10% - 30% |
| 出金手数料 | 早期出金ペナルティ | 0.1% - 0.5% |

### 5.2 手数料分配モデル

```solidity
contract FeeDistribution {
    uint256 public constant PRECISION = 10000;

    // 分配比率
    uint256 public stakersShare = 5000;    // 50%
    uint256 public treasuryShare = 3000;   // 30%
    uint256 public buybackShare = 2000;    // 20%

    address public stakingContract;
    address public treasury;
    address public buybackContract;

    function distributeFees(address token, uint256 amount) external {
        uint256 toStakers = amount * stakersShare / PRECISION;
        uint256 toTreasury = amount * treasuryShare / PRECISION;
        uint256 toBuyback = amount - toStakers - toTreasury;

        IERC20(token).transfer(stakingContract, toStakers);
        IERC20(token).transfer(treasury, toTreasury);
        IERC20(token).transfer(buybackContract, toBuyback);

        // ステーキングコントラクトに通知
        IStaking(stakingContract).notifyRewardAmount(toStakers);
    }
}
```

### 5.3 バイバック＆バーン

```solidity
contract BuybackAndBurn {
    IERC20 public governanceToken;
    ISwapRouter public swapRouter;

    uint256 public totalBurned;

    event Buyback(uint256 amountIn, uint256 amountBurned);

    function executeBuyback(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlyOperator {
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: address(governanceToken),
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );

        // バーン
        governanceToken.transfer(address(0xdead), amountOut);
        totalBurned += amountOut;

        emit Buyback(amountIn, amountOut);
    }
}
```

## 6. ガバナンス設計

### 6.1 投票パラメータ

```solidity
contract GovernorSettings {
    uint256 public votingDelay = 1 days;        // 投票開始までの遅延
    uint256 public votingPeriod = 7 days;       // 投票期間
    uint256 public proposalThreshold = 100000e18; // 提案に必要なトークン量
    uint256 public quorumNumerator = 4;         // 定足数 4%
}
```

### 6.2 提案の種類

```solidity
enum ProposalType {
    STANDARD,           // 通常の提案（7日投票、2日タイムロック）
    FAST_TRACK,         // 緊急提案（2日投票、1日タイムロック）
    CONSTITUTIONAL      // 憲法変更（14日投票、7日タイムロック、67%超多数）
}
```

## 7. 持続可能性の考慮

### 7.1 インフレーション管理

```python
def sustainable_emission_model(
    initial_supply: int,
    target_terminal_inflation: float,  # 例: 2%
    years_to_terminal: int              # 例: 10年
) -> dict:
    """
    持続可能な排出モデル

    初期は高排出でブートストラップ
    徐々に減少して長期的に低インフレーションへ
    """
    emissions = []
    supply = initial_supply

    for year in range(years_to_terminal):
        # 指数減衰で目標インフレーションへ
        progress = year / years_to_terminal
        current_inflation = (1 - progress) * 0.2 + progress * target_terminal_inflation

        emission = supply * current_inflation
        emissions.append({
            "year": year + 1,
            "emission": emission,
            "inflation_rate": current_inflation,
            "total_supply": supply + emission
        })
        supply += emission

    return {
        "emissions": emissions,
        "final_supply": supply,
        "terminal_inflation": target_terminal_inflation
    }
```

### 7.2 トレジャリー管理

```solidity
contract Treasury {
    // 資産配分ターゲット
    struct AllocationTarget {
        address asset;
        uint256 targetPercent;  // basis points
    }

    AllocationTarget[] public allocations;

    // リバランス
    function rebalance() external onlyKeeper {
        uint256 totalValue = getTotalValue();

        for (uint256 i = 0; i < allocations.length; i++) {
            AllocationTarget memory target = allocations[i];
            uint256 currentValue = getAssetValue(target.asset);
            uint256 targetValue = totalValue * target.targetPercent / 10000;

            if (currentValue > targetValue * 105 / 100) {
                // 5%以上オーバー: 売却
                _sellExcess(target.asset, currentValue - targetValue);
            } else if (currentValue < targetValue * 95 / 100) {
                // 5%以上アンダー: 購入
                _buyDeficit(target.asset, targetValue - currentValue);
            }
        }
    }
}
```

## チェックリスト: トークノミクス設計

- [ ] **価値獲得**: トークンがプロトコル価値をどう獲得するか明確
- [ ] **ユーティリティ**: 保有・使用の明確なインセンティブ
- [ ] **配分**: 公平で持続可能な配分
- [ ] **ベスティング**: インサイダーの適切なロックアップ
- [ ] **インフレーション**: 長期的に持続可能な排出
- [ ] **ガバナンス**: 適切な投票パラメータ
- [ ] **手数料構造**: 競争力のある手数料設計
- [ ] **エコシステム**: 成長を促進するインセンティブ
