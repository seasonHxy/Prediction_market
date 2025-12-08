"use client"

import { useState, useCallback } from 'react'
import { useContract } from './use-contract'
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts'
import { formatUsdc } from '@/lib/web3-utils'
import type { Address } from 'viem'

export function useFactory() {
  const { writeContract, waitForTransaction } = useContract()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const [isLoading, setIsLoading] = useState(false)

  // Read Functions
  const getAllMarkets = useCallback(
    async (offset = 0, limit = 50) => {
      if (!publicClient) return []

      try {
        const markets = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getAllMarkets',
          args: [BigInt(offset), BigInt(limit)],
        })
        return markets as Address[]
      } catch (error) {
        console.error('Error fetching markets:', error)
        return []
      }
    },
    [publicClient]
  )

  const getTotalMarkets = useCallback(async () => {
    if (!publicClient) return 0

    try {
      const total = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getTotalMarkets',
      })
      return Number(total)
    } catch (error) {
      console.error('Error fetching total markets:', error)
      return 0
    }
  }, [publicClient])

  const getStatistics = useCallback(async () => {
    if (!publicClient) return null

    try {
      const stats = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getStatistics',
      })

      const [totalMarkets, totalVolume, avgFee, treasury] = stats as [bigint, bigint, bigint, Address]

      return {
        totalMarkets: Number(totalMarkets),
        totalVolume: formatUsdc(totalVolume),
        avgFee: formatUsdc(avgFee),
        treasury,
      }
    } catch (error) {
      console.error('Error fetching factory statistics:', error)
      return null
    }
  }, [publicClient])

  const getMarket = useCallback(
    async (marketId: string) => {
      if (!publicClient) return null

      try {
        const marketAddress = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getMarket',
          args: [marketId as `0x${string}`],
        })
        return marketAddress as Address
      } catch (error) {
        console.error('Error fetching market by ID:', error)
        return null
      }
    },
    [publicClient]
  )

  const getCategoryMarkets = useCallback(
    async (category: string) => {
      if (!publicClient) return []

      try {
        const marketIds = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getCategoryMarkets',
          args: [category],
        })
        return marketIds as string[]
      } catch (error) {
        console.error('Error fetching category markets:', error)
        return []
      }
    },
    [publicClient]
  )

  const getCreatorMarkets = useCallback(
    async (creator: Address) => {
      if (!publicClient) return []

      try {
        const marketIds = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getCreatorMarkets',
          args: [creator],
        })
        return marketIds as string[]
      } catch (error) {
        console.error('Error fetching creator markets:', error)
        return []
      }
    },
    [publicClient]
  )

  // Write Functions
  const createSimpleMarket = useCallback(
    async (question: string, category: string, endsAt: number) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'createSimpleMarket',
          args: [question, category, BigInt(endsAt)],
        })

        const receipt = await waitForTransaction(hash)

        // Extract market address and ID from events
        const logs = receipt.logs
        let marketAddress: Address | null = null
        let marketId: string | null = null

        for (const log of logs) {
          if (log.topics[0] === '0x...') {
            // MarketCreated event signature
            // Parse the event to get market address and ID
            // This requires proper event parsing
          }
        }

        setIsLoading(false)
        return { receipt, marketAddress, marketId }
      } catch (error) {
        setIsLoading(false)
        console.error('Error creating market:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  const createMarket = useCallback(
    async (
      question: string,
      category: string,
      sources: string[],
      endsAt: number,
      customFeeBP?: number,
      customMaxStakePerUser?: number,
      customMaxTotalPool?: number
    ) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'createMarket',
          args: [
            question,
            category,
            sources,
            BigInt(endsAt),
            customFeeBP || 0,
            customMaxStakePerUser ? BigInt(customMaxStakePerUser) : 0n,
            customMaxTotalPool ? BigInt(customMaxTotalPool) : 0n,
          ],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error creating market:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  return {
    // Read functions
    getAllMarkets,
    getTotalMarkets,
    getStatistics,
    getMarket,
    getCategoryMarkets,
    getCreatorMarkets,
    // Write functions
    createSimpleMarket,
    createMarket,
    // State
    isLoading,
  }
}