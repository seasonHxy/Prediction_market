import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import {
  FACTORY_ADDRESS,
  FACTORY_ABI,
  MARKET_ABI,
  ORACLE_ABI,
  USDC_ABI,
  ORACLE_ADDRESS,
  USDC_ADDRESS,
} from "./contracts"

// Create public client for reads
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://sepolia.base.org"),
})

// Helper to format USDC amounts (6 decimals)
export const parseUsdc = (amount: string | number) => {
  return BigInt(Math.floor(Number(amount) * 1e6))
}

export const formatUsdc = (amount: bigint | number) => {
  return Number(amount) / 1e6
}

// Get all markets
export async function getAllMarkets(offset = 0, limit = 50) {
  try {
    const markets = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "getAllMarkets",
      args: [BigInt(offset), BigInt(limit)],
    })
    return markets
  } catch (error) {
    console.error("[v0] Error fetching markets:", error)
    return []
  }
}

// Get total markets count
export async function getTotalMarkets() {
  try {
    const total = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "getTotalMarkets",
    })
    return Number(total)
  } catch (error) {
    console.error("[v0] Error fetching total markets:", error)
    return 0
  }
}

// Get factory statistics
export async function getFactoryStats() {
  try {
    const stats = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "getStatistics",
    })
    return {
      totalMarkets: Number(stats[0]),
      totalVolume: formatUsdc(stats[1]),
      totalFees: formatUsdc(stats[2]),
      treasury: stats[3],
    }
  } catch (error) {
    console.error("[v0] Error fetching factory stats:", error)
    return null
  }
}

// Get market details
export async function getMarketDetails(marketAddress: string) {
  try {
    const [endsAt, state, poolSizes] = await Promise.all([
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "endsAt",
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "state",
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "getPoolSizes",
      }),
    ])

    const yesPool = formatUsdc(poolSizes[0])
    const noPool = formatUsdc(poolSizes[1])
    const totalPool = yesPool + noPool
    const yesProbability = totalPool > 0 ? (yesPool / totalPool) * 100 : 50

    return {
      endsAt: Number(endsAt),
      state: Number(state),
      yesPool,
      noPool,
      totalPool,
      yesProbability,
    }
  } catch (error) {
    console.error("[v0] Error fetching market details:", error)
    return null
  }
}

// Get user stake in market
export async function getUserStake(marketAddress: string, userAddress: string) {
  try {
    const stake = await publicClient.readContract({
      address: marketAddress as `0x${string}`,
      abi: MARKET_ABI,
      functionName: "getStake",
      args: [userAddress as `0x${string}`],
    })
    return {
      amount: formatUsdc(stake[0]),
      side: Number(stake[1]),
    }
  } catch (error) {
    console.error("[v0] Error fetching user stake:", error)
    return null
  }
}

// Get USDC balance
export async function getUsdcBalance(userAddress: string) {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    })
    return formatUsdc(balance)
  } catch (error) {
    console.error("[v0] Error fetching USDC balance:", error)
    return 0
  }
}

// Get AI Oracle resolution
export async function getOracleResolution(marketId: string) {
  try {
    const resolution = await publicClient.readContract({
      address: ORACLE_ADDRESS,
      abi: ORACLE_ABI,
      functionName: "getResolution",
      args: [marketId as `0x${string}`],
    })
    return Number(resolution)
  } catch (error) {
    console.error("[v0] Error fetching oracle resolution:", error)
    return null
  }
}
