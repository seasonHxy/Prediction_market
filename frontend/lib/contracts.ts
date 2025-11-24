import { parseAbi } from "viem"

export const BASE_SEPOLIA_CHAIN_ID = 84532

// Contract addresses (Base Sepolia)
export const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) || "0xfc70C42bC2355Cbc98Bc575032dA8Dc33F0a11F4"
export const ORACLE_ADDRESS =
  (process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}`) || "0x0a0F049dFfB9cD7E15948c1683167DDBEFEf968e"
export const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

// Market states enum
export const MARKET_STATE = {
  PENDING: 0,
  ACTIVE: 1,
  CLOSED: 2,
  RESOLVED: 3,
  CANCELLED: 4,
} as const

export const MARKET_SIDE = {
  YES: 0,
  NO: 1,
} as const

// Contract ABIs
export const FACTORY_ABI = parseAbi([
  "function createSimpleMarket(string description, string category, uint256 duration) returns (address, bytes32)",
  "function getAllMarkets(uint256 offset, uint256 limit) view returns (address[])",
  "function getTotalMarkets() view returns (uint256)",
  "function getStatistics() view returns (uint256 totalMarkets, uint256 totalVolume, uint256 totalFees, address treasury)",
  "event MarketCreated(address indexed marketAddress, bytes32 indexed marketId, address indexed creator, string description, uint256 duration, string category)",
])

export const MARKET_ABI = parseAbi([
  "function stake(uint8 side, uint256 amount) payable",
  "function claim() nonpayable",
  "function endsAt() view returns (uint256)",
  "function state() view returns (uint8)",
  "function getStake(address user) view returns (uint256 amount, uint8 side)",
  "function getPoolSizes() view returns (uint256 yesPool, uint256 noPool)",
  "function getResolution() view returns (uint8)",
  "event Staked(address indexed user, uint8 side, uint256 amount, uint256 poolSize)",
  "event MarketResolved(uint8 resolution, uint256 totalPool, uint256 winnerPool)",
])

export const ORACLE_ABI = parseAbi([
  "function getResolution(bytes32 marketId) view returns (uint8)",
  "function isResolutionFinalized(bytes32 marketId) view returns (bool)",
  "function proposedResolutions(bytes32 marketId) view returns (uint8 side, uint256 timestamp, address proposer, uint256 votes, bool challenged)",
])

export const USDC_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
])
