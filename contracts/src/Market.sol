// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./MarketTypes.sol";
import "./AIOracle.sol";

/**
 * @title Market
 * @notice Individual prediction market with USDC stakes and ERC1155 position tokens
 * @dev Implements secure stake/resolve/claim flow with AI oracle integration
 */
contract Market is ERC1155, ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Immutable market configuration
    IERC20 public immutable usdc;
    AIOracle public immutable aiOracle;
    address public immutable factory;
    address public immutable treasury;
    bytes32 public immutable marketId;
    uint256 public immutable endsAt;
    uint256 public immutable createdAt;
    uint16 public immutable feeBP; // basis points (e.g., 200 = 2%)
    uint256 public immutable maxStakePerUser;
    uint256 public immutable maxTotalPool;

    // Market state
    MarketTypes.MarketState public state;
    MarketTypes.MarketMetadata public metadata;
    
    // Pool tracking
    uint256 public yesPool;
    uint256 public noPool;
    uint256 public feeAmount;
    uint256 public distributableAmount;

    // User tracking
    mapping(address => mapping(MarketTypes.Side => uint256)) public stakes;
    mapping(address => bool) public claimed;

    // ERC1155 token IDs
    uint256 public immutable yesTokenId;
    uint256 public immutable noTokenId;

    event Staked(address indexed user, MarketTypes.Side side, uint256 amount, uint256 totalPool);
    event MarketLocked(uint256 timestamp);
    event MarketResolved(MarketTypes.Side result, uint256 feeAmount, uint256 distributableAmount);
    event Claimed(address indexed user, uint256 payout);
    event Refunded(address indexed user, uint256 amount);
    event MarketCanceled(string reason);
    event StateChanged(MarketTypes.MarketState from, MarketTypes.MarketState to);

    error InvalidState();
    error InvalidSide();
    error ZeroAmount();
    error MarketEnded();
    error MarketNotEnded();
    error AlreadyResolved();
    error NotResolved();
    error AlreadyClaimed();
    error NoStake();
    error ExceedsUserLimit();
    error ExceedsPoolLimit();
    error TransferFailed();
    error NotFinalized();
    error Paused();

    modifier inState(MarketTypes.MarketState requiredState) {
        if (state != requiredState) revert InvalidState();
        _;
    }

    modifier notPaused() {
        if (state == MarketTypes.MarketState.Canceled) revert Paused();
        _;
    }

    // For EIP-1167 clone pattern, we use storage variables instead of immutables
    IERC20 private _usdc;
    AIOracle private _aiOracle;
    address private _factory;
    address private _treasury;
    bytes32 private _marketId;
    uint256 private _endsAt;
    uint256 private _createdAt;
    uint16 private _feeBP;
    uint256 private _maxStakePerUser;
    uint256 private _maxTotalPool;
    uint256 private _yesTokenId;
    uint256 private _noTokenId;
    bool private _initialized;

    // Override immutable getters
    function usdc() public view returns (IERC20) { return _usdc; }
    function aiOracle() public view returns (AIOracle) { return _aiOracle; }
    function factory() public view returns (address) { return _factory; }
    function treasury() public view returns (address) { return _treasury; }
    function marketId() public view returns (bytes32) { return _marketId; }
    function endsAt() public view returns (uint256) { return _endsAt; }
    function createdAt() public view returns (uint256) { return _createdAt; }
    function feeBP() public view returns (uint16) { return _feeBP; }
    function maxStakePerUser() public view returns (uint256) { return _maxStakePerUser; }
    function maxTotalPool() public view returns (uint256) { return _maxTotalPool; }
    function yesTokenId() public view returns (uint256) { return _yesTokenId; }
    function noTokenId() public view returns (uint256) { return _noTokenId; }

    constructor() ERC1155("") {
        // Implementation contract constructor
        _initialized = true; // Prevent initialization of implementation
    }

    /**
     * @notice Initialize cloned market (called by factory)
     */
    function initialize(
        MarketTypes.MarketConfig memory config,
        MarketTypes.MarketMetadata memory _metadata,
        address treasuryAddr,
        address admin,
        bytes32 marketIdValue
    ) external {
        require(!_initialized, "Already initialized");
        require(config.endsAt > block.timestamp, "Invalid end time");
        require(config.feeBP <= 1000, "Fee too high"); // Max 10%
        require(treasuryAddr != address(0), "Invalid treasury");

        _initialized = true;
        _usdc = IERC20(config.usdc);
        _aiOracle = AIOracle(config.aiOracle);
        _factory = msg.sender;
        _treasury = treasuryAddr;
        _marketId = marketIdValue;
        _endsAt = config.endsAt;
        _createdAt = block.timestamp;
        _feeBP = config.feeBP;
        _maxStakePerUser = config.maxStakePerUser;
        _maxTotalPool = config.maxTotalPool;
        metadata = _metadata;

        // Generate unique token IDs for positions
        _yesTokenId = uint256(keccak256(abi.encodePacked(marketIdValue, MarketTypes.Side.Yes)));
        _noTokenId = uint256(keccak256(abi.encodePacked(marketIdValue, MarketTypes.Side.No)));

        state = MarketTypes.MarketState.Active;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @notice Stake USDC on YES or NO outcome
     * @param side Which side to bet on (1=Yes, 2=No)
     * @param amount Amount of USDC to stake (must approve first)
     */
    function stake(MarketTypes.Side side, uint256 amount) 
        external 
        nonReentrant 
        notPaused
        inState(MarketTypes.MarketState.Active)
    {
        if (block.timestamp >= endsAt) revert MarketEnded();
        if (side != MarketTypes.Side.Yes && side != MarketTypes.Side.No) revert InvalidSide();
        if (amount == 0) revert ZeroAmount();

        // Check limits
        uint256 newUserStake = stakes[msg.sender][side] + amount;
        if (newUserStake > maxStakePerUser) revert ExceedsUserLimit();

        uint256 newTotalPool = yesPool + noPool + amount;
        if (newTotalPool > maxTotalPool) revert ExceedsPoolLimit();

        // Transfer USDC from user
        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        // Update state
        stakes[msg.sender][side] += amount;
        
        if (side == MarketTypes.Side.Yes) {
            yesPool += amount;
            _mint(msg.sender, yesTokenId, amount, "");
        } else {
            noPool += amount;
            _mint(msg.sender, noTokenId, amount, "");
        }

        emit Staked(msg.sender, side, amount, yesPool + noPool);
    }

    /**
     * @notice Lock market after end time (prevents new stakes)
     */
    function lockMarket() external {
        if (block.timestamp < endsAt) revert MarketNotEnded();
        if (state != MarketTypes.MarketState.Active) revert InvalidState();

        _changeState(MarketTypes.MarketState.Locked);
        emit MarketLocked(block.timestamp);
    }

    /**
     * @notice Resolve market using AI oracle
     * @dev Can only be called after oracle finalization
     */
    function resolveMarket() external nonReentrant {
        if (state != MarketTypes.MarketState.Locked && state != MarketTypes.MarketState.Resolving) {
            revert InvalidState();
        }
        if (block.timestamp < endsAt) revert MarketNotEnded();

        // Check oracle finalization
        if (!aiOracle.isResolutionFinalized(marketId)) {
            // If not finalized, update state to Resolving
            if (state == MarketTypes.MarketState.Locked) {
                _changeState(MarketTypes.MarketState.Resolving);
            }
            revert NotFinalized();
        }

        // Get result from oracle
        MarketTypes.Side result = aiOracle.getResolution(marketId);

        // Calculate fees
        uint256 totalPool = yesPool + noPool;
        feeAmount = (totalPool * feeBP) / 10000;
        distributableAmount = totalPool - feeAmount;

        // Transfer fees to treasury
        if (feeAmount > 0) {
            bool success = usdc.transfer(treasury, feeAmount);
            if (!success) revert TransferFailed();
        }

        _changeState(MarketTypes.MarketState.Resolved);
        
        emit MarketResolved(result, feeAmount, distributableAmount);
    }

    /**
     * @notice Claim winnings after resolution
     */
    function claim() external nonReentrant {
        if (state != MarketTypes.MarketState.Resolved) revert NotResolved();
        if (claimed[msg.sender]) revert AlreadyClaimed();

        MarketTypes.Side winSide = aiOracle.getResolution(marketId);
        uint256 winningPool = (winSide == MarketTypes.Side.Yes) ? yesPool : noPool;

        // Handle edge case: no one bet on winning side
        if (winningPool == 0) {
            _handleZeroWinningPool(winSide);
            return;
        }

        uint256 userStake = stakes[msg.sender][winSide];
        if (userStake == 0) revert NoStake();

        // Calculate proportional payout
        uint256 payout = (userStake * distributableAmount) / winningPool;

        claimed[msg.sender] = true;

        // Burn position tokens
        uint256 tokenId = (winSide == MarketTypes.Side.Yes) ? yesTokenId : noTokenId;
        _burn(msg.sender, tokenId, userStake);

        // Transfer payout
        bool success = usdc.transfer(msg.sender, payout);
        if (!success) revert TransferFailed();

        emit Claimed(msg.sender, payout);
    }

    /**
     * @notice Batch claim for multiple users (gas optimization)
     */
    function batchClaim(address[] calldata users) external nonReentrant {
        if (state != MarketTypes.MarketState.Resolved) revert NotResolved();

        MarketTypes.Side winSide = aiOracle.getResolution(marketId);
        uint256 winningPool = (winSide == MarketTypes.Side.Yes) ? yesPool : noPool;

        require(winningPool > 0, "Zero winning pool");

        uint256 tokenId = (winSide == MarketTypes.Side.Yes) ? yesTokenId : noTokenId;

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            
            if (claimed[user] || stakes[user][winSide] == 0) {
                continue;
            }

            uint256 userStake = stakes[user][winSide];
            uint256 payout = (userStake * distributableAmount) / winningPool;

            claimed[user] = true;
            _burn(user, tokenId, userStake);
            
            bool success = usdc.transfer(user, payout);
            if (!success) revert TransferFailed();

            emit Claimed(user, payout);
        }
    }

    /**
     * @notice Emergency cancel market (refund all stakes)
     */
    function cancelMarket(string calldata reason) external onlyRole(ADMIN_ROLE) {
        require(state != MarketTypes.MarketState.Resolved, "Already resolved");
        require(state != MarketTypes.MarketState.Canceled, "Already canceled");

        _changeState(MarketTypes.MarketState.Canceled);
        
        emit MarketCanceled(reason);
    }

    /**
     * @notice Refund stakes after cancellation
     */
    function refundAfterCancel() external nonReentrant {
        if (state != MarketTypes.MarketState.Canceled) revert InvalidState();
        if (claimed[msg.sender]) revert AlreadyClaimed();

        uint256 yesStake = stakes[msg.sender][MarketTypes.Side.Yes];
        uint256 noStake = stakes[msg.sender][MarketTypes.Side.No];
        uint256 totalStake = yesStake + noStake;

        if (totalStake == 0) revert NoStake();

        claimed[msg.sender] = true;

        // Burn position tokens
        if (yesStake > 0) {
            _burn(msg.sender, yesTokenId, yesStake);
        }
        if (noStake > 0) {
            _burn(msg.sender, noTokenId, noStake);
        }

        // Refund
        bool success = usdc.transfer(msg.sender, totalStake);
        if (!success) revert TransferFailed();

        emit Refunded(msg.sender, totalStake);
    }

    /**
     * @notice Get current AI probability (view function for UI)
     */
    function getCurrentOdds() external view returns (uint256 yesOdds, uint256 noOdds) {
        uint256 total = yesPool + noPool;
        if (total == 0) {
            return (5000, 5000); // 50/50 if no bets
        }
        yesOdds = (yesPool * 10000) / total;
        noOdds = (noPool * 10000) / total;
    }

    /**
     * @notice Check if user can claim
     */
    function canClaim(address user) external view returns (bool) {
        if (state != MarketTypes.MarketState.Resolved) return false;
        if (claimed[user]) return false;
        
        MarketTypes.Side winSide = aiOracle.getResolution(marketId);
        return stakes[user][winSide] > 0;
    }

    /**
     * @notice Get user's potential payout
     */
    function getPotentialPayout(address user) external view returns (uint256) {
        if (state != MarketTypes.MarketState.Resolved) return 0;
        
        MarketTypes.Side winSide = aiOracle.getResolution(marketId);
        uint256 winningPool = (winSide == MarketTypes.Side.Yes) ? yesPool : noPool;
        
        if (winningPool == 0) return stakes[user][winSide == MarketTypes.Side.Yes ? MarketTypes.Side.No : MarketTypes.Side.Yes];
        
        uint256 userStake = stakes[user][winSide];
        if (userStake == 0) return 0;
        
        return (userStake * distributableAmount) / winningPool;
    }

    /**
     * @dev Handle zero winning pool edge case (refund losing side)
     */
    function _handleZeroWinningPool(MarketTypes.Side winSide) private {
        MarketTypes.Side loseSide = (winSide == MarketTypes.Side.Yes) 
            ? MarketTypes.Side.No 
            : MarketTypes.Side.Yes;

        uint256 userStake = stakes[msg.sender][loseSide];
        if (userStake == 0) revert NoStake();

        claimed[msg.sender] = true;

        // Burn position tokens
        uint256 tokenId = (loseSide == MarketTypes.Side.Yes) ? yesTokenId : noTokenId;
        _burn(msg.sender, tokenId, userStake);

        // Refund stake
        bool success = usdc.transfer(msg.sender, userStake);
        if (!success) revert TransferFailed();

        emit Refunded(msg.sender, userStake);
    }

    /**
     * @dev Change state with event
     */
    function _changeState(MarketTypes.MarketState newState) private {
        MarketTypes.MarketState oldState = state;
        state = newState;
        emit StateChanged(oldState, newState);
    }

    /**
     * @notice Get market info
     */
    function getMarketInfo() external view returns (
        MarketTypes.MarketState currentState,
        uint256 totalPool,
        uint256 yesBets,
        uint256 noBets,
        uint256 endTime,
        bool isResolved
    ) {
        return (
            state,
            yesPool + noPool,
            yesPool,
            noPool,
            endsAt,
            state == MarketTypes.MarketState.Resolved
        );
    }
}