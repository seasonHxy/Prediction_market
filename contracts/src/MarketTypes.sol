// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library MarketTypes {
    enum MarketState {
        Active,      // Accepting stakes
        Locked,      // Past endsAt, no new stakes
        Resolving,   // AI submitted, in challenge period
        Resolved,    // Final, claims open
        Disputed,    // Challenge raised
        Canceled     // Emergency cancel
    }

    enum Side {
        None,
        Yes,
        No
    }

    struct MarketMetadata {
        string question;
        string category;
        string[] sources;
        uint256 createdAt;
        address creator;
    }

    struct Resolution {
        Side result;
        uint256 timestamp;
        address proposer;
        uint256 challengeDeadline;
        bool challenged;
    }

    struct MarketConfig {
        address usdc;
        address aiOracle;
        uint256 endsAt;
        uint16 feeBP;
        uint256 maxStakePerUser;
        uint256 maxTotalPool;
    }
}