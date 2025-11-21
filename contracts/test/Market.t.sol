// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../src/Market.sol";
import "../src/MarketFactory.sol";
import "../src/AIOracle.sol";
import "../src/MarketTypes.sol";
import "./mocks/MockUSDC.sol";

contract MarketTest is Test {
    Market public marketImplementation;
    Market public market;
    MarketFactory public factory;
    AIOracle public oracle;
    MockUSDC public usdc;

    address public admin = address(1);
    address public treasury = address(2);
    address public aiSigner1 = address(3);
    address public aiSigner2 = address(4);
    address public aiSigner3 = address(5);
    address public user1 = address(10);
    address public user2 = address(11);
    address public user3 = address(12);

    bytes32 public marketId;
    uint256 public constant INITIAL_BALANCE = 100_000 * 1e6; // 100k USDC
    uint256 public endsAt;

    event Staked(address indexed user, MarketTypes.Side side, uint256 amount, uint256 totalPool);
    event MarketResolved(MarketTypes.Side result, uint256 feeAmount, uint256 distributableAmount);
    event Claimed(address indexed user, uint256 payout);

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        
        // Deploy AI Oracle with 3 signers
        address[] memory signers = new address[](3);
        signers[0] = aiSigner1;
        signers[1] = aiSigner2;
        signers[2] = aiSigner3;
        oracle = new AIOracle(signers, admin);

        // Deploy market implementation
        marketImplementation = new Market();

        // Deploy factory
        factory = new MarketFactory(
            address(usdc),
            address(oracle),
            treasury,
            address(marketImplementation),
            admin
        );

        // Grant creator role to this test contract
        vm.prank(admin);
        factory.grantRole(factory.CREATOR_ROLE(), address(this));

        // Mint USDC to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);

        // Create a market
        endsAt = block.timestamp + 7 days;
        string[] memory sources = new string[](0);
        
        (address marketAddr, bytes32 _marketId) = factory.createMarket(
            "Will BTC reach $100k by end of year?",
            "Crypto",
            sources,
            endsAt,
            200, // 2% fee
            10_000 * 1e6, // 10k max per user
            1_000_000 * 1e6 // 1M max pool
        );

        market = Market(marketAddr);
        marketId = _marketId;
    }

    function testStakeYes() public {
        uint256 stakeAmount = 1000 * 1e6;

        vm.startPrank(user1);
        usdc.approve(address(market), stakeAmount);
        
        vm.expectEmit(true, false, false, true);
        emit Staked(user1, MarketTypes.Side.Yes, stakeAmount, stakeAmount);
        
        market.stake(MarketTypes.Side.Yes, stakeAmount);
        vm.stopPrank();

        assertEq(market.yesPool(), stakeAmount);
        assertEq(market.noPool(), 0);
        assertEq(usdc.balanceOf(address(market)), stakeAmount);
    }

    function testStakeNo() public {
        uint256 stakeAmount = 2000 * 1e6;

        vm.startPrank(user2);
        usdc.approve(address(market), stakeAmount);
        market.stake(MarketTypes.Side.No, stakeAmount);
        vm.stopPrank();

        assertEq(market.yesPool(), 0);
        assertEq(market.noPool(), stakeAmount);
    }

    function testStakeBothSides() public {
        uint256 yesAmount = 1000 * 1e6;
        uint256 noAmount = 1500 * 1e6;

        // User1 stakes YES
        vm.startPrank(user1);
        usdc.approve(address(market), yesAmount);
        market.stake(MarketTypes.Side.Yes, yesAmount);
        vm.stopPrank();

        // User2 stakes NO
        vm.startPrank(user2);
        usdc.approve(address(market), noAmount);
        market.stake(MarketTypes.Side.No, noAmount);
        vm.stopPrank();

        assertEq(market.yesPool(), yesAmount);
        assertEq(market.noPool(), noAmount);
        
        (uint256 yesOdds, uint256 noOdds) = market.getCurrentOdds();
        assertEq(yesOdds, 4000); // 40%
        assertEq(noOdds, 6000); // 60%
    }

    function testCannotStakeAfterEnd() public {
        vm.warp(endsAt + 1);

        vm.startPrank(user1);
        usdc.approve(address(market), 1000 * 1e6);
        
        vm.expectRevert(Market.MarketEnded.selector);
        market.stake(MarketTypes.Side.Yes, 1000 * 1e6);
        vm.stopPrank();
    }

    function testCannotStakeZero() public {
        vm.startPrank(user1);
        usdc.approve(address(market), 1000 * 1e6);
        
        vm.expectRevert(Market.ZeroAmount.selector);
        market.stake(MarketTypes.Side.Yes, 0);
        vm.stopPrank();
    }

    function testCannotExceedUserLimit() public {
        uint256 maxStake = 10_000 * 1e6;
        uint256 excessStake = maxStake + 1;

        vm.startPrank(user1);
        usdc.approve(address(market), excessStake);
        
        vm.expectRevert(Market.ExceedsUserLimit.selector);
        market.stake(MarketTypes.Side.Yes, excessStake);
        vm.stopPrank();
    }

    function testLockMarket() public {
        vm.warp(endsAt + 1);
        
        market.lockMarket();
        
        assertEq(uint8(market.state()), uint8(MarketTypes.MarketState.Locked));
    }

    function testCannotLockBeforeEnd() public {
        vm.expectRevert(Market.MarketNotEnded.selector);
        market.lockMarket();
    }

    function testFullResolutionFlow() public {
        // 1. Users stake
        uint256 yesAmount = 3000 * 1e6;
        uint256 noAmount = 2000 * 1e6;

        vm.startPrank(user1);
        usdc.approve(address(market), yesAmount);
        market.stake(MarketTypes.Side.Yes, yesAmount);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), noAmount);
        market.stake(MarketTypes.Side.No, noAmount);
        vm.stopPrank();

        // 2. Time passes
        vm.warp(endsAt + 1);

        // 3. Lock market
        market.lockMarket();

        // 4. AI oracle resolves (3 signers vote YES)
        uint256 timestamp = block.timestamp;
        uint256 nonce1 = 1;
        uint256 nonce2 = 2;
        uint256 nonce3 = 3;

        bytes32 msgHash1 = keccak256(abi.encodePacked(address(oracle), marketId, uint8(MarketTypes.Side.Yes), timestamp, nonce1));
        bytes32 msgHash2 = keccak256(abi.encodePacked(address(oracle), marketId, uint8(MarketTypes.Side.Yes), timestamp, nonce2));
        bytes32 msgHash3 = keccak256(abi.encodePacked(address(oracle), marketId, uint8(MarketTypes.Side.Yes), timestamp, nonce3));

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(uint256(uint160(aiSigner1)), MessageHashUtils.toEthSignedMessageHash(msgHash1));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(uint256(uint160(aiSigner2)), MessageHashUtils.toEthSignedMessageHash(msgHash2));
        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(uint256(uint160(aiSigner3)), MessageHashUtils.toEthSignedMessageHash(msgHash3));

        vm.prank(aiSigner1);
        oracle.submitResolution(marketId, MarketTypes.Side.Yes, timestamp, nonce1, abi.encodePacked(r1, s1, v1));
        
        vm.prank(aiSigner2);
        oracle.submitResolution(marketId, MarketTypes.Side.Yes, timestamp, nonce2, abi.encodePacked(r2, s2, v2));
        
        vm.prank(aiSigner3);
        oracle.submitResolution(marketId, MarketTypes.Side.Yes, timestamp, nonce3, abi.encodePacked(r3, s3, v3));

        // 5. Wait for challenge period
        vm.warp(block.timestamp + 24 hours + 1);

        // 6. Finalize oracle
        oracle.finalizeResolution(marketId);

        // 7. Resolve market
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        
        market.resolveMarket();
        
        assertEq(uint8(market.state()), uint8(MarketTypes.MarketState.Resolved));
        
        // Check fee was transferred
        uint256 totalPool = yesAmount + noAmount;
        uint256 expectedFee = (totalPool * 200) / 10000; // 2%
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + expectedFee);

        // 8. Winner claims
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        
        vm.prank(user1);
        market.claim();
        
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        assertTrue(user1BalanceAfter > user1BalanceBefore);
        
        // Check payout calculation
        uint256 distributable = totalPool - expectedFee;
        uint256 expectedPayout = (yesAmount * distributable) / yesAmount; // user1 is only YES bettor
        assertEq(user1BalanceAfter - user1BalanceBefore, expectedPayout);
    }

    function testCannotClaimTwice() public {
        // Setup: stake and resolve
        uint256 yesAmount = 1000 * 1e6;
        
        vm.startPrank(user1);
        usdc.approve(address(market), yesAmount);
        market.stake(MarketTypes.Side.Yes, yesAmount);
        vm.stopPrank();

        // Fast forward and resolve (simplified)
        vm.warp(endsAt + 1);
        market.lockMarket();
        
        // Mock oracle resolution
        vm.prank(admin);
        oracle.adminResolve(marketId, MarketTypes.Side.Yes);
        
        market.resolveMarket();

        // First claim succeeds
        vm.prank(user1);
        market.claim();

        // Second claim fails
        vm.prank(user1);
        vm.expectRevert(Market.AlreadyClaimed.selector);
        market.claim();
    }

    function testZeroWinningPoolRefund() public {
        // Only NO bets placed
        uint256 noAmount = 5000 * 1e6;
        
        vm.startPrank(user2);
        usdc.approve(address(market), noAmount);
        market.stake(MarketTypes.Side.No, noAmount);
        vm.stopPrank();

        // Market resolves to YES (no one bet on YES)
        vm.warp(endsAt + 1);
        market.lockMarket();
        
        vm.prank(admin);
        oracle.adminResolve(marketId, MarketTypes.Side.Yes);
        
        market.resolveMarket();

        // NO bettor gets refunded
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.prank(user2);
        market.claim();
        
        uint256 user2BalanceAfter = usdc.balanceOf(user2);
        assertEq(user2BalanceAfter - user2BalanceBefore, noAmount);
    }

    function testCancelMarket() public {
        // Users stake
        vm.startPrank(user1);
        usdc.approve(address(market), 1000 * 1e6);
        market.stake(MarketTypes.Side.Yes, 1000 * 1e6);
        vm.stopPrank();

        // Admin cancels
        vm.prank(admin);
        market.cancelMarket("Test cancellation");

        assertEq(uint8(market.state()), uint8(MarketTypes.MarketState.Canceled));

        // User gets refund
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        vm.prank(user1);
        market.refundAfterCancel();
        
        assertEq(usdc.balanceOf(user1) - balanceBefore, 1000 * 1e6);
    }

    function testBatchClaim() public {
        // Multiple users stake YES
        uint256 stakeAmount = 1000 * 1e6;
        
        vm.startPrank(user1);
        usdc.approve(address(market), stakeAmount);
        market.stake(MarketTypes.Side.Yes, stakeAmount);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), stakeAmount);
        market.stake(MarketTypes.Side.Yes, stakeAmount);
        vm.stopPrank();

        // Resolve to YES
        vm.warp(endsAt + 1);
        market.lockMarket();
        
        vm.prank(admin);
        oracle.adminResolve(marketId, MarketTypes.Side.Yes);
        
        market.resolveMarket();

        // Batch claim
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;

        market.batchClaim(users);

        assertTrue(market.claimed(user1));
        assertTrue(market.claimed(user2));
    }

    function testPositionTokens() public {
        uint256 stakeAmount = 1000 * 1e6;
        
        vm.startPrank(user1);
        usdc.approve(address(market), stakeAmount);
        market.stake(MarketTypes.Side.Yes, stakeAmount);
        vm.stopPrank();

        // Check ERC1155 balance
        uint256 yesTokenId = market.yesTokenId();
        assertEq(market.balanceOf(user1, yesTokenId), stakeAmount);
    }

    function testGetMarketInfo() public {
        (
            MarketTypes.MarketState currentState,
            uint256 totalPool,
            uint256 yesBets,
            uint256 noBets,
            uint256 endTime,
            bool isResolved
        ) = market.getMarketInfo();

        assertEq(uint8(currentState), uint8(MarketTypes.MarketState.Active));
        assertEq(totalPool, 0);
        assertEq(yesBets, 0);
        assertEq(noBets, 0);
        assertEq(endTime, endsAt);
        assertFalse(isResolved);
    }

    function testFuzzStake(uint256 amount) public {
        amount = bound(amount, 1, 10_000 * 1e6);
        
        vm.startPrank(user1);
        usdc.approve(address(market), amount);
        market.stake(MarketTypes.Side.Yes, amount);
        vm.stopPrank();

        assertEq(market.yesPool(), amount);
    }
}