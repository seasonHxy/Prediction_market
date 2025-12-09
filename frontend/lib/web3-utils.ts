import { createPublicClient, http } from "viem"
import { baseSepolia } from "viem/chains"
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
  chain: baseSepolia,
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
    }) as readonly `0x${string}`[]
    
    return markets
  } catch (error) {
    console.error("Error fetching markets:", error)
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
    }) as bigint
    
    return Number(total)
  } catch (error) {
    console.error("Error fetching total markets:", error)
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
    }) as readonly [bigint, bigint, bigint, `0x${string}`]
    
    return {
      totalMarkets: Number(stats[0]),
      totalVolume: formatUsdc(stats[1]),
      totalFees: formatUsdc(stats[2]),
      treasury: stats[3],
    }
  } catch (error) {
    console.error("Error fetching factory stats:", error)
    return null
  }
}

// Get market details
export async function getMarketDetails(marketAddress: string) {
  try {
    const [endsAt, state, yesPool, noPool] = await Promise.all([
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
        functionName: "yesPool",
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "noPool",
      }),
    ]) as [bigint, number, bigint, bigint]

    const yesPoolFormatted = formatUsdc(yesPool)
    const noPoolFormatted = formatUsdc(noPool)
    const totalPool = yesPoolFormatted + noPoolFormatted
    const yesProbability = totalPool > 0 ? (yesPoolFormatted / totalPool) * 100 : 50

    return {
      endsAt: Number(endsAt),
      state: Number(state),
      yesPool: yesPoolFormatted,
      noPool: noPoolFormatted,
      totalPool,
      yesProbability,
    }
  } catch (error) {
    console.error("Error fetching market details:", error)
    return null
  }
}

// Get user stake in market
export async function getUserStake(marketAddress: string, userAddress: string) {
  try {
    const [yesStake, noStake] = await Promise.all([
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "stakes",
        args: [userAddress as `0x${string}`, 0], // YES
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "stakes",
        args: [userAddress as `0x${string}`, 1], // NO
      }),
    ]) as [bigint, bigint]
    
    const yesStakeFormatted = formatUsdc(yesStake)
    const noStakeFormatted = formatUsdc(noStake)
    const totalStake = yesStakeFormatted + noStakeFormatted
    const side = yesStakeFormatted > 0 ? 0 : noStakeFormatted > 0 ? 1 : null
    
    return {
      yesStake: yesStakeFormatted,
      noStake: noStakeFormatted,
      totalStake,
      side,
    }
  } catch (error) {
    console.error("Error fetching user stake:", error)
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
    }) as bigint
    
    return formatUsdc(balance)
  } catch (error) {
    console.error("Error fetching USDC balance:", error)
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
    }) as number
    
    return Number(resolution)
  } catch (error) {
    console.error("Error fetching oracle resolution:", error)
    return null
  }
}