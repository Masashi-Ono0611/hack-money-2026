// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ENS Contract Integration Template
 * @notice Production-ready template for integrating ENS into your smart contracts
 * @dev Uses ENS Registry and Resolver interfaces for name resolution
 */

/// @notice ENS Registry interface
interface IENS {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function ttl(bytes32 node) external view returns (uint64);
}

/// @notice ENS Resolver interface for address resolution
interface IResolver {
    function addr(bytes32 node) external view returns (address);
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
}

/// @notice Extended resolver interface for text records
interface ITextResolver {
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

/// @notice Extended resolver interface for content hash
interface IContentHashResolver {
    function contenthash(bytes32 node) external view returns (bytes memory);
}

/**
 * @title ENSIntegrationExample
 * @notice Example contract demonstrating ENS integration patterns
 */
contract ENSIntegrationExample {
    /// @notice ENS Registry contract
    IENS public immutable ens;

    /// @notice Events
    event PaymentSentToENS(bytes32 indexed node, address indexed recipient, uint256 amount);
    event ENSNameUpdated(bytes32 indexed oldNode, bytes32 indexed newNode);

    /// @notice Errors
    error ENSResolutionFailed(bytes32 node);
    error InvalidResolver(address resolver);
    error ZeroAddress();

    /**
     * @notice Constructor
     * @param _ens Address of ENS Registry (0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e on mainnet)
     */
    constructor(address _ens) {
        if (_ens == address(0)) revert ZeroAddress();
        ens = IENS(_ens);
    }

    /**
     * @notice Resolve ENS name to Ethereum address
     * @param node Namehash of the ENS name
     * @return Resolved Ethereum address
     */
    function resolve(bytes32 node) public view returns (address) {
        address resolverAddress = ens.resolver(node);
        if (resolverAddress == address(0)) revert InvalidResolver(address(0));

        return IResolver(resolverAddress).addr(node);
    }

    /**
     * @notice Resolve ENS name to address for specific coin type
     * @param node Namehash of the ENS name
     * @param coinType SLIP-44 coin type (60 for Ethereum, 0 for Bitcoin)
     * @return Address bytes for specified coin type
     */
    function resolveMultichain(bytes32 node, uint256 coinType) public view returns (bytes memory) {
        address resolverAddress = ens.resolver(node);
        if (resolverAddress == address(0)) revert InvalidResolver(address(0));

        return IResolver(resolverAddress).addr(node, coinType);
    }

    /**
     * @notice Get text record from ENS name
     * @param node Namehash of the ENS name
     * @param key Text record key (e.g., "com.twitter", "url")
     * @return Text record value
     */
    function getText(bytes32 node, string calldata key) public view returns (string memory) {
        address resolverAddress = ens.resolver(node);
        if (resolverAddress == address(0)) revert InvalidResolver(address(0));

        return ITextResolver(resolverAddress).text(node, key);
    }

    /**
     * @notice Get content hash from ENS name
     * @param node Namehash of the ENS name
     * @return Content hash (IPFS/Swarm)
     */
    function getContentHash(bytes32 node) public view returns (bytes memory) {
        address resolverAddress = ens.resolver(node);
        if (resolverAddress == address(0)) revert InvalidResolver(address(0));

        return IContentHashResolver(resolverAddress).contenthash(node);
    }

    /**
     * @notice Send ETH to ENS name owner
     * @param node Namehash of recipient's ENS name
     * @dev Resolves ENS name and sends entire msg.value to resolved address
     */
    function sendToENSName(bytes32 node) external payable {
        address recipient = resolve(node);
        if (recipient == address(0)) revert ENSResolutionFailed(node);

        (bool success, ) = recipient.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit PaymentSentToENS(node, recipient, msg.value);
    }

    /**
     * @notice Verify ENS name resolves to expected address
     * @param node Namehash of the ENS name
     * @param expectedAddress Expected resolved address
     * @return True if resolution matches expected address
     */
    function verifyENSName(bytes32 node, address expectedAddress) public view returns (bool) {
        address resolved = resolve(node);
        return resolved == expectedAddress;
    }

    /**
     * @notice Batch resolve multiple ENS names (gas optimized)
     * @param nodes Array of namehashes to resolve
     * @return addresses Array of resolved addresses
     * @dev Limited to 50 names to prevent gas limit issues
     */
    function batchResolve(bytes32[] calldata nodes) external view returns (address[] memory addresses) {
        require(nodes.length <= 50, "Too many names");

        addresses = new address[](nodes.length);
        for (uint256 i = 0; i < nodes.length; i++) {
            addresses[i] = resolve(nodes[i]);
        }
    }

    /**
     * @notice Check if ENS name has a resolver set
     * @param node Namehash of the ENS name
     * @return True if resolver is set
     */
    function hasResolver(bytes32 node) public view returns (bool) {
        return ens.resolver(node) != address(0);
    }

    /**
     * @notice Get ENS name owner
     * @param node Namehash of the ENS name
     * @return Owner address
     */
    function getOwner(bytes32 node) public view returns (address) {
        return ens.owner(node);
    }
}

/**
 * @title ENSPaymentSplitter
 * @notice Example: Split payments to multiple ENS names
 */
contract ENSPaymentSplitter {
    IENS public immutable ens;

    struct Split {
        bytes32 node;      // ENS name (namehash)
        uint256 share;     // Share in basis points (10000 = 100%)
    }

    Split[] public splits;
    uint256 public totalShares;

    error InvalidShares();
    error SplitFailed(bytes32 node);

    constructor(address _ens, Split[] memory _splits) {
        ens = IENS(_ens);

        uint256 _totalShares;
        for (uint256 i = 0; i < _splits.length; i++) {
            splits.push(_splits[i]);
            _totalShares += _splits[i].share;
        }

        if (_totalShares != 10000) revert InvalidShares();
        totalShares = _totalShares;
    }

    /**
     * @notice Distribute received ETH to all ENS names according to shares
     */
    function distribute() external payable {
        uint256 amount = msg.value;

        for (uint256 i = 0; i < splits.length; i++) {
            Split memory split = splits[i];

            // Resolve ENS name
            address resolverAddress = ens.resolver(split.node);
            require(resolverAddress != address(0), "No resolver");

            address recipient = IResolver(resolverAddress).addr(split.node);
            require(recipient != address(0), "Resolution failed");

            // Calculate share
            uint256 payment = (amount * split.share) / totalShares;

            // Send payment
            (bool success, ) = recipient.call{value: payment}("");
            if (!success) revert SplitFailed(split.node);
        }
    }

    receive() external payable {
        distribute();
    }
}

/**
 * @title ENSGatedAccess
 * @notice Example: Gate access based on ENS name ownership
 */
contract ENSGatedAccess {
    IENS public immutable ens;
    bytes32 public immutable requiredNode;

    error Unauthorized(address caller);

    constructor(address _ens, bytes32 _requiredNode) {
        ens = IENS(_ens);
        requiredNode = _requiredNode;
    }

    /**
     * @notice Modifier to restrict access to ENS name owner
     */
    modifier onlyENSOwner() {
        if (ens.owner(requiredNode) != msg.sender) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    /**
     * @notice Protected function - only ENS name owner can call
     */
    function protectedFunction() external onlyENSOwner {
        // Your protected logic here
    }
}

/**
 * @title ENSNamehashHelper
 * @notice Helper functions for ENS namehash calculation
 * @dev Use offchain for gas savings, but included here for reference
 */
library ENSNamehashHelper {
    /**
     * @notice Calculate namehash for a label under a parent node
     * @param parent Parent node hash
     * @param label Label to hash (use keccak256(bytes(labelString)))
     * @return Namehash of label.parent
     */
    function namehash(bytes32 parent, bytes32 label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, label));
    }

    /**
     * @notice Root node (0x0000...0000)
     */
    function rootNode() internal pure returns (bytes32) {
        return bytes32(0);
    }

    /**
     * @notice .eth TLD node
     * @dev namehash of "eth"
     */
    function ethNode() internal pure returns (bytes32) {
        return 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
    }
}
