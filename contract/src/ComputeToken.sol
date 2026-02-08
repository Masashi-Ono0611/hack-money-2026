// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMockOracle} from "./MockOracle.sol";

/// @title IComputeToken
/// @notice CPT (Compute Token) インターフェース
interface IComputeToken is IERC20 {
    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    function mint(uint256 amount) external;

    /// @notice 発行権限を持つアドレスを返す
    /// @return owner アドレス
    function owner() external view returns (address);
}

/// @title ComputeToken
/// @notice Compute Token (CPT) - 計算リソースをトークン化したERC20
/// @dev OpenZeppelin ERC20 + Ownable を継承。キャパシティベースのエポックミント上限を実装。
///
///  Compute Central Bank Model:
///    MaxMintPerEpoch = epochCapacity
///    ActualMintCap   = epochCapacity × (100 - utilization) / 100
///
///  L2の余剰計算能力に裏付けられた量だけミント可能。
contract ComputeToken is ERC20, Ownable {
    // ─── Capacity-based mint cap ───

    /// @notice Oracle providing L2 utilization rate (0-100)
    IMockOracle public oracle;

    /// @notice Maximum CPT mintable per epoch at 0% utilization (in token wei)
    uint256 public epochCapacity;

    /// @notice Duration of one epoch in seconds
    uint256 public epochDuration;

    /// @notice Timestamp when the current epoch started
    uint256 public currentEpochStart;

    /// @notice Cumulative amount minted in the current epoch
    uint256 public mintedThisEpoch;

    /// @notice Whether capacity-based minting is enforced
    bool public capacityEnforced;

    event EpochRolled(uint256 newEpochStart, uint256 previousMinted);
    event CapacityConfigUpdated(uint256 epochCapacity, uint256 epochDuration);
    event OracleUpdated(address indexed newOracle);
    event CapacityEnforcementToggled(bool enforced);

    error ExceedsEpochCapacity(uint256 requested, uint256 remaining);

    /// @notice コンストラクタ
    /// @param name トークン名
    /// @param symbol トークンシンボル
    /// @param initialOwner 初期オーナーアドレス
    constructor(string memory name, string memory symbol, address initialOwner)
        ERC20(name, symbol)
        Ownable(initialOwner)
    {
        // Capacity enforcement is off by default for backward compatibility.
        // Call configureCapacity() then setCapacityEnforced(true) to enable.
        capacityEnforced = false;
    }

    // ─── Admin configuration ───

    /// @notice Set capacity parameters
    /// @param _epochCapacity Max CPT per epoch at 0% utilization
    /// @param _epochDuration Epoch length in seconds
    function configureCapacity(uint256 _epochCapacity, uint256 _epochDuration) external onlyOwner {
        require(_epochDuration > 0, "epoch duration must be > 0");
        epochCapacity = _epochCapacity;
        epochDuration = _epochDuration;
        if (currentEpochStart == 0) {
            currentEpochStart = block.timestamp;
        }
        emit CapacityConfigUpdated(_epochCapacity, _epochDuration);
    }

    /// @notice Set oracle address
    function setOracle(IMockOracle _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleUpdated(address(_oracle));
    }

    /// @notice Toggle capacity enforcement on/off
    function setCapacityEnforced(bool _enforced) external onlyOwner {
        capacityEnforced = _enforced;
        emit CapacityEnforcementToggled(_enforced);
    }

    // ─── Mint ───

    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    /// @dev onlyOwner modifier により、ownerのみ実行可能。
    ///      capacityEnforced が true の場合、エポックごとのミント上限を適用。
    function mint(uint256 amount) external onlyOwner {
        if (capacityEnforced) {
            _rollEpochIfNeeded();
            uint256 maxMint = currentEpochMaxMint();
            if (mintedThisEpoch + amount > maxMint) {
                revert ExceedsEpochCapacity(amount, maxMint - mintedThisEpoch);
            }
            mintedThisEpoch += amount;
        }
        _mint(msg.sender, amount);
    }

    // ─── View helpers ───

    /// @notice Current epoch's maximum mintable amount based on utilization
    /// @return maxMint = epochCapacity × (100 - utilization) / 100
    function currentEpochMaxMint() public view returns (uint256) {
        if (epochCapacity == 0) return 0;
        uint256 utilization = _getUtilization();
        return (epochCapacity * (100 - utilization)) / 100;
    }

    /// @notice Remaining mintable amount in the current epoch
    function remainingMintableThisEpoch() external view returns (uint256) {
        uint256 maxMint = currentEpochMaxMint();
        if (mintedThisEpoch >= maxMint) return 0;
        return maxMint - mintedThisEpoch;
    }

    // ─── Internal ───

    function _rollEpochIfNeeded() internal {
        if (epochDuration == 0 || currentEpochStart == 0) return;
        if (block.timestamp >= currentEpochStart + epochDuration) {
            emit EpochRolled(block.timestamp, mintedThisEpoch);
            currentEpochStart = block.timestamp;
            mintedThisEpoch = 0;
        }
    }

    function _getUtilization() internal view returns (uint256) {
        if (address(oracle) == address(0)) return 0;
        try oracle.getUtilization() returns (uint256 u) {
            return u > 100 ? 100 : u;
        } catch {
            return 0;
        }
    }
}
