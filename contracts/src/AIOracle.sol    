// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./MarketTypes.sol";

/**
 * @title AIOracle
 * @notice Multi-signature oracle for AI-powered market resolution with challenge mechanism
 * @dev Implements optimistic resolution with challenge period and fallback governance
 */
contract AIOracle is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint8 public constant REQUIRED_CONFIRMATIONS = 3;
    uint256 public constant CHALLENGE_PERIOD = 24 hours;
    uint256 public constant MAX_SIGNATURE_AGE = 1 hours;
    uint256 public constant RESOLUTION_WINDOW = 7 days;

    // Market resolution tracking
    mapping(bytes32 => mapping(address => MarketTypes.Side)) public resolutionVotes;
    mapping(bytes32 => mapping(MarketTypes.Side => uint8)) public voteCount;
    mapping(bytes32 => MarketTypes.Resolution) public proposedResolutions;
    mapping(bytes32 => bool) public finalizedResolutions;
    mapping(uint256 => bool) public usedNonces;

    // AI signer addresses (multi-sig)
    mapping(address => bool) public authorizedSigners;
    uint8 public signerCount;

    event ResolutionProposed(
        bytes32 indexed marketId,
        MarketTypes.Side result,
        address indexed proposer,
        uint256 challengeDeadline
    );
    
    event ResolutionVoted(
        bytes32 indexed marketId,
        address indexed resolver,
        MarketTypes.Side result,
        uint8 voteCount
    );
    
    event ResolutionFinalized(
        bytes32 indexed marketId,
        MarketTypes.Side result,
        uint8 confirmations
    );
    
    event ResolutionChallenged(
        bytes32 indexed marketId,
        address indexed challenger,
        string reason
    );
    
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);

    error InvalidSignature();
    error SignatureExpired();
    error SignatureTooOld();
    error NonceAlreadyUsed();
    error NotAuthorizedResolver();
    error ResolutionAlreadyFinalized();
    error ChallengeWindowActive();
    error ChallengeWindowExpired();
    error InvalidResult();
    error AlreadyVoted();

    constructor(address[] memory initialSigners, address admin) {
        require(initialSigners.length >= REQUIRED_CONFIRMATIONS, "Not enough signers");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(RESOLVER_ROLE, admin);

        for (uint256 i = 0; i < initialSigners.length; i++) {
            authorizedSigners[initialSigners[i]] = true;
            _grantRole(RESOLVER_ROLE, initialSigners[i]);
            signerCount++;
            emit SignerAdded(initialSigners[i]);
        }
    }

    /**
     * @notice Submit resolution with AI signature (optimistic approach)
     * @param marketId Unique market identifier
     * @param result Resolution result (1=Yes, 2=No)
     * @param timestamp Signature timestamp
     * @param nonce Unique nonce to prevent replay
     * @param signature ECDSA signature from authorized signer
     */
    function submitResolution(
        bytes32 marketId,
        MarketTypes.Side result,
        uint256 timestamp,
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (finalizedResolutions[marketId]) revert ResolutionAlreadyFinalized();
        if (result != MarketTypes.Side.Yes && result != MarketTypes.Side.No) revert InvalidResult();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        if (resolutionVotes[marketId][msg.sender] != MarketTypes.Side.None) revert AlreadyVoted();

        // Verify signature
        address signer = _verifySignature(marketId, result, timestamp, nonce, signature);
        if (!authorizedSigners[signer]) revert NotAuthorizedResolver();

        // Mark nonce as used
        usedNonces[nonce] = true;

        // Record vote
        resolutionVotes[marketId][msg.sender] = result;
        voteCount[marketId][result]++;

        emit ResolutionVoted(marketId, msg.sender, result, voteCount[marketId][result]);

        // Check if we reached consensus
        if (voteCount[marketId][result] >= REQUIRED_CONFIRMATIONS) {
            _proposeResolution(marketId, result, msg.sender);
        }
    }

    /**
     * @notice Finalize resolution after challenge period
     * @param marketId Market to finalize
     */
    function finalizeResolution(bytes32 marketId) external {
        MarketTypes.Resolution storage resolution = proposedResolutions[marketId];
        
        if (resolution.result == MarketTypes.Side.None) revert InvalidResult();
        if (finalizedResolutions[marketId]) revert ResolutionAlreadyFinalized();
        if (block.timestamp < resolution.challengeDeadline) revert ChallengeWindowActive();
        if (resolution.challenged) revert("Resolution disputed");

        finalizedResolutions[marketId] = true;
        
        emit ResolutionFinalized(marketId, resolution.result, voteCount[marketId][resolution.result]);
    }

    /**
     * @notice Challenge a proposed resolution
     * @param marketId Market to challenge
     * @param reason Reason for challenge
     */
    function challengeResolution(bytes32 marketId, string calldata reason) external {
        MarketTypes.Resolution storage resolution = proposedResolutions[marketId];
        
        if (resolution.result == MarketTypes.Side.None) revert InvalidResult();
        if (block.timestamp > resolution.challengeDeadline) revert ChallengeWindowExpired();
        if (finalizedResolutions[marketId]) revert ResolutionAlreadyFinalized();

        resolution.challenged = true;
        
        emit ResolutionChallenged(marketId, msg.sender, reason);
    }

    /**
     * @notice Admin override for disputed resolutions
     * @param marketId Market to resolve
     * @param result Final result
     */
    function adminResolve(bytes32 marketId, MarketTypes.Side result) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (result != MarketTypes.Side.Yes && result != MarketTypes.Side.No) revert InvalidResult();
        
        proposedResolutions[marketId] = MarketTypes.Resolution({
            result: result,
            timestamp: block.timestamp,
            proposer: msg.sender,
            challengeDeadline: block.timestamp, // Immediate
            challenged: false
        });
        
        finalizedResolutions[marketId] = true;
        
        emit ResolutionFinalized(marketId, result, 0);
    }

    /**
     * @notice Check if resolution is finalized
     */
    function isResolutionFinalized(bytes32 marketId) external view returns (bool) {
        return finalizedResolutions[marketId];
    }

    /**
     * @notice Get finalized result
     */
    function getResolution(bytes32 marketId) external view returns (MarketTypes.Side) {
        require(finalizedResolutions[marketId], "Not finalized");
        return proposedResolutions[marketId].result;
    }

    /**
     * @notice Add authorized signer
     */
    function addSigner(address signer) external onlyRole(ADMIN_ROLE) {
        require(!authorizedSigners[signer], "Already signer");
        authorizedSigners[signer] = true;
        _grantRole(RESOLVER_ROLE, signer);
        signerCount++;
        emit SignerAdded(signer);
    }

    /**
     * @notice Remove authorized signer
     */
    function removeSigner(address signer) external onlyRole(ADMIN_ROLE) {
        require(authorizedSigners[signer], "Not a signer");
        require(signerCount > REQUIRED_CONFIRMATIONS, "Cannot remove, would break consensus");
        authorizedSigners[signer] = false;
        _revokeRole(RESOLVER_ROLE, signer);
        signerCount--;
        emit SignerRemoved(signer);
    }

    /**
     * @dev Internal function to propose resolution
     */
    function _proposeResolution(bytes32 marketId, MarketTypes.Side result, address proposer) private {
        proposedResolutions[marketId] = MarketTypes.Resolution({
            result: result,
            timestamp: block.timestamp,
            proposer: proposer,
            challengeDeadline: block.timestamp + CHALLENGE_PERIOD,
            challenged: false
        });

        emit ResolutionProposed(marketId, result, proposer, block.timestamp + CHALLENGE_PERIOD);
    }

    /**
     * @dev Verify ECDSA signature
     */
    function _verifySignature(
        bytes32 marketId,
        MarketTypes.Side result,
        uint256 timestamp,
        uint256 nonce,
        bytes calldata signature
    ) private view returns (address) {
        // Validate timestamp
        if (timestamp > block.timestamp) revert SignatureExpired();
        if (block.timestamp - timestamp > MAX_SIGNATURE_AGE) revert SignatureTooOld();

        // Reconstruct message
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(this),
                marketId,
                uint8(result),
                timestamp,
                nonce
            )
        );

        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);

        if (signer == address(0)) revert InvalidSignature();
        
        return signer;
    }
}