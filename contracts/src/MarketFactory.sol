// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Market.sol";
import "./MarketTypes.sol";
import "./AIOracle.sol";

/**
 * @title MarketFactory
 * @notice Factory contract for creating prediction markets using EIP-1167 minimal proxies
 * @dev Uses clone pattern for gas-efficient market deployment
 */
contract MarketFactory is AccessControl, ReentrancyGuard {
    using Clones for address;

    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Configuration
    address public immutable usdc;
    address public immutable aiOracle;
    address public treasury;
    address public marketImplementation;

    // Default market parameters
    uint16 public defaultFeeBP = 200; // 2%
    uint256 public defaultMaxStakePerUser = 10_000 * 1e6; // 10k USDC
    uint256 public defaultMaxTotalPool = 1_000_000 * 1e6; // 1M USDC
    uint256 public minMarketDuration = 1 hours;
    uint256 public maxMarketDuration = 365 days;

    // Market registry
    mapping(bytes32 => address) public markets;
    mapping(address => bool) public isMarket;
    address[] public allMarkets;
    mapping(address => bytes32[]) public creatorMarkets;
    mapping(string => bytes32[]) public categoryMarkets;

    // Statistics
    uint256 public totalMarketsCreated;
    uint256 public totalVolumeUSDC;

    event MarketCreated(
        address indexed marketAddress,
        bytes32 indexed marketId,
        address indexed creator,
        string question,
        uint256 endsAt,
        string category
    );
    
    event MarketImplementationUpdated(address indexed oldImpl, address indexed newImpl);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DefaultsUpdated(uint16 feeBP, uint256 maxStakePerUser, uint256 maxTotalPool);

    error MarketAlreadyExists();
    error InvalidDuration();
    error InvalidParameters();
    error NotAMarket();
    error ZeroAddress();

    constructor(
        address _usdc,
        address _aiOracle,
        address _treasury,
        address _marketImplementation,
        address admin
    ) {
        if (_usdc == address(0) || _aiOracle == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }

        usdc = _usdc;
        aiOracle = _aiOracle;
        treasury = _treasury;
        marketImplementation = _marketImplementation;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(CREATOR_ROLE, admin);
    }

    /**
     * @notice Create a new prediction market
     * @param question Market question
     * @param category Market category (e.g., "Sports", "Crypto", "Politics")
     * @param sources AI verification sources
     * @param endsAt Timestamp when market closes for new stakes
     * @param customFeeBP Custom fee in basis points (0 = use default)
     * @param customMaxStakePerUser Custom max stake (0 = use default)
     * @param customMaxTotalPool Custom max pool (0 = use default)
     */
    function createMarket(
        string calldata question,
        string calldata category,
        string[] calldata sources,
        uint256 endsAt,
        uint16 customFeeBP,
        uint256 customMaxStakePerUser,
        uint256 customMaxTotalPool
    ) external nonReentrant onlyRole(CREATOR_ROLE) returns (address marketAddress, bytes32 marketId) {
        // Validate parameters
        uint256 duration = endsAt - block.timestamp;
        if (duration < minMarketDuration || duration > maxMarketDuration) {
            revert InvalidDuration();
        }

        // Generate unique market ID
        marketId = keccak256(
            abi.encodePacked(
                question,
                category,
                endsAt,
                block.timestamp,
                totalMarketsCreated
            )
        );

        if (markets[marketId] != address(0)) revert MarketAlreadyExists();

        // Use custom or default parameters
        uint16 feeBP = customFeeBP > 0 ? customFeeBP : defaultFeeBP;
        uint256 maxStakePerUser = customMaxStakePerUser > 0 ? customMaxStakePerUser : defaultMaxStakePerUser;
        uint256 maxTotalPool = customMaxTotalPool > 0 ? customMaxTotalPool : defaultMaxTotalPool;

        // Validate custom parameters
        if (feeBP > 1000) revert InvalidParameters(); // Max 10% fee

        // Deploy market using clone
        marketAddress = Clones.clone(marketImplementation);

        // Prepare configuration
        MarketTypes.MarketConfig memory config = MarketTypes.MarketConfig({
            usdc: usdc,
            aiOracle: aiOracle,
            endsAt: endsAt,
            feeBP: feeBP,
            maxStakePerUser: maxStakePerUser,
            maxTotalPool: maxTotalPool
        });

        MarketTypes.MarketMetadata memory metadata = MarketTypes.MarketMetadata({
            question: question,
            category: category,
            sources: sources,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        // Initialize market
        Market(marketAddress).initialize(config, metadata, treasury, msg.sender, marketId);

        // Register market
        markets[marketId] = marketAddress;
        isMarket[marketAddress] = true;
        allMarkets.push(marketAddress);
        creatorMarkets[msg.sender].push(marketId);
        categoryMarkets[category].push(marketId);
        totalMarketsCreated++;

        emit MarketCreated(marketAddress, marketId, msg.sender, question, endsAt, category);

        return (marketAddress, marketId);
    }

    /**
     * @notice Create market with default parameters (simplified)
     */
    function createSimpleMarket(
        string calldata question,
        string calldata category,
        uint256 endsAt
    ) external returns (address marketAddress, bytes32 marketId) {
        string[] memory emptySources = new string[](0);
        return createMarket(
            question,
            category,
            emptySources,
            endsAt,
            0, // Use default fee
            0, // Use default max stake
            0  // Use default max pool
        );
    }

    /**
     * @notice Update market implementation for future deployments
     */
    function updateMarketImplementation(address newImplementation) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (newImplementation == address(0)) revert ZeroAddress();
        
        address oldImpl = marketImplementation;
        marketImplementation = newImplementation;
        
        emit MarketImplementationUpdated(oldImpl, newImplementation);
    }

    /**
     * @notice Update treasury address
     */
    function updateTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Update default market parameters
     */
    function updateDefaults(
        uint16 newDefaultFeeBP,
        uint256 newDefaultMaxStakePerUser,
        uint256 newDefaultMaxTotalPool
    ) external onlyRole(ADMIN_ROLE) {
        if (newDefaultFeeBP > 1000) revert InvalidParameters();
        
        defaultFeeBP = newDefaultFeeBP;
        defaultMaxStakePerUser = newDefaultMaxStakePerUser;
        defaultMaxTotalPool = newDefaultMaxTotalPool;
        
        emit DefaultsUpdated(newDefaultFeeBP, newDefaultMaxStakePerUser, newDefaultMaxTotalPool);
    }

    /**
     * @notice Update market duration limits
     */
    function updateDurationLimits(uint256 newMin, uint256 newMax) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (newMin >= newMax) revert InvalidParameters();
        minMarketDuration = newMin;
        maxMarketDuration = newMax;
    }

    /**
     * @notice Get all markets by creator
     */
    function getCreatorMarkets(address creator) external view returns (bytes32[] memory) {
        return creatorMarkets[creator];
    }

    /**
     * @notice Get all markets in category
     */
    function getCategoryMarkets(string calldata category) external view returns (bytes32[] memory) {
        return categoryMarkets[category];
    }

    /**
     * @notice Get market address by ID
     */
    function getMarket(bytes32 marketId) external view returns (address) {
        return markets[marketId];
    }

    /**
     * @notice Get all markets (paginated)
     */
    function getAllMarkets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 end = offset + limit;
        if (end > allMarkets.length) {
            end = allMarkets.length;
        }

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allMarkets[i];
        }

        return result;
    }

    /**
     * @notice Get total number of markets
     */
    function getTotalMarkets() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Check if address is a market
     */
    function verifyMarket(address marketAddress) external view returns (bool) {
        return isMarket[marketAddress];
    }

    /**
     * @notice Get factory statistics
     */
    function getStatistics() external view returns (
        uint256 totalMarkets,
        uint256 totalVolume,
        uint256 avgFee,
        address treasuryAddr
    ) {
        return (
            totalMarketsCreated,
            totalVolumeUSDC,
            defaultFeeBP,
            treasury
        );
    }

    /**
     * @notice Grant creator role to address
     */
    function addCreator(address creator) external onlyRole(ADMIN_ROLE) {
        grantRole(CREATOR_ROLE, creator);
    }

    /**
     * @notice Revoke creator role from address
     */
    function removeCreator(address creator) external onlyRole(ADMIN_ROLE) {
        revokeRole(CREATOR_ROLE, creator);
    }
}