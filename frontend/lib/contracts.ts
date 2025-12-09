import AIOracle from '@/contracts/abi/AIOracle.json'
import Market from '@/contracts/abi/Market.json'
import MarketFactory from '@/contracts/abi/MarketFactory.json'

export const BASE_SEPOLIA_CHAIN_ID = 84532

// Contract addresses from deployments
export const FACTORY_ADDRESS = '0xDb657bC5A74A81E919f9d671035dB0b6370c9d16' as const
export const ORACLE_ADDRESS = '0xfc70C42bC2355Cbc98Bc575032dA8Dc33F0a11F4' as const
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
export const MARKET_IMPLEMENTATION = '0x7F0ba204385d2f0c5d42572ed4ceEc622441A451' as const
export const TREASURY_ADDRESS = '0x8a7AEad289a7CFE47891C4a320c773b254581fcB' as const

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

// Import ABIs from JSON files
export const FACTORY_ABI = MarketFactory
export const MARKET_ABI = Market
export const ORACLE_ABI = AIOracle

// USDC ABI (ERC20)
export const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

// Role constants
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  CREATOR_ROLE: '0x828634d95e775031b9ff576b159a8509d3053581a8c9c4d7d86899e0afcd882f',
  RESOLVER_ROLE: '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041',
} as const

// Helper type for market state
export type MarketState = (typeof MARKET_STATE)[keyof typeof MARKET_STATE]

// Helper type for market side
export type MarketSide = (typeof MARKET_SIDE)[keyof typeof MARKET_SIDE]