"use client"

import { useState, useCallback } from 'react'
import { useContract } from './use-contract'
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { MARKET_ABI, USDC_ABI, USDC_ADDRESS, MARKET_SIDE } from '@/lib/contracts'
import { parseUsdc, formatUsdc } from '@/lib/web3-utils'
import type { Address } from 'viem'

export function useMarket(marketAddress: Address) {
  const { writeContract, waitForTransaction } = useContract()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const [isLoading, setIsLoading] = useState(false)

  // Read Functions
  const getMarketInfo = useCallback(async () => {
    if (!publicClient || !marketAddress) return null

    try {
      const [endsAt, state, yesPool, noPool, feeBP, maxStakePerUser] = await Promise.all([
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'endsAt',
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'state',
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'yesPool',
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'noPool',
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'feeBP',
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'maxStakePerUser',
        }),
      ])

      const yesPoolFormatted = formatUsdc(yesPool as bigint)
      const noPoolFormatted = formatUsdc(noPool as bigint)
      const totalPool = yesPoolFormatted + noPoolFormatted
      const yesProbability = totalPool > 0 ? (yesPoolFormatted / totalPool) * 100 : 50

      return {
        endsAt: Number(endsAt),
        state: Number(state),
        yesPool: yesPoolFormatted,
        noPool: noPoolFormatted,
        totalPool,
        yesProbability,
        feeBP: Number(feeBP),
        maxStakePerUser: formatUsdc(maxStakePerUser as bigint),
      }
    } catch (error) {
      console.error('Error fetching market info:', error)
      return null
    }
  }, [publicClient, marketAddress])

  const getUserStake = useCallback(
    async (userAddress: Address) => {
      if (!publicClient || !marketAddress) return null

      try {
        const stakes = await Promise.all([
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'stakes',
            args: [userAddress, MARKET_SIDE.YES],
          }),
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'stakes',
            args: [userAddress, MARKET_SIDE.NO],
          }),
        ])

        const yesStake = formatUsdc(stakes[0] as bigint)
        const noStake = formatUsdc(stakes[1] as bigint)
        const totalStake = yesStake + noStake
        const side = yesStake > 0 ? MARKET_SIDE.YES : noStake > 0 ? MARKET_SIDE.NO : null

        return {
          yesStake,
          noStake,
          totalStake,
          side,
        }
      } catch (error) {
        console.error('Error fetching user stake:', error)
        return null
      }
    },
    [publicClient, marketAddress]
  )

  const canClaim = useCallback(
    async (userAddress: Address) => {
      if (!publicClient || !marketAddress) return false

      try {
        const result = await publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'canClaim',
          args: [userAddress],
        })
        return result as boolean
      } catch (error) {
        console.error('Error checking claim status:', error)
        return false
      }
    },
    [publicClient, marketAddress]
  )

  const getPotentialPayout = useCallback(
    async (userAddress: Address) => {
      if (!publicClient || !marketAddress) return 0

      try {
        const payout = await publicClient.readContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'getPotentialPayout',
          args: [userAddress],
        })
        return formatUsdc(payout as bigint)
      } catch (error) {
        console.error('Error fetching potential payout:', error)
        return 0
      }
    },
    [publicClient, marketAddress]
  )

  // Write Functions
  const approveUSDC = useCallback(
    async (amount: number) => {
      setIsLoading(true)
      try {
        const amountBigInt = parseUsdc(amount)
        const hash = await writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [marketAddress, amountBigInt],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error approving USDC:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction, marketAddress]
  )

  const stake = useCallback(
    async (side: 'yes' | 'no', amount: number) => {
      setIsLoading(true)
      try {
        // First approve USDC
        await approveUSDC(amount)

        // Then stake
        const sideValue = side === 'yes' ? MARKET_SIDE.YES : MARKET_SIDE.NO
        const amountBigInt = parseUsdc(amount)

        const hash = await writeContract({
          address: marketAddress,
          abi: MARKET_ABI,
          functionName: 'stake',
          args: [sideValue, amountBigInt],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error staking:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction, marketAddress, approveUSDC]
  )

  const claim = useCallback(async () => {
    setIsLoading(true)
    try {
      const hash = await writeContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'claim',
        args: [],
      })

      const receipt = await waitForTransaction(hash)
      setIsLoading(false)
      return receipt
    } catch (error) {
      setIsLoading(false)
      console.error('Error claiming:', error)
      throw error
    }
  }, [writeContract, waitForTransaction, marketAddress])

  return {
    // Read functions
    getMarketInfo,
    getUserStake,
    canClaim,
    getPotentialPayout,
    // Write functions
    stake,
    claim,
    approveUSDC,
    // State
    isLoading,
  }
}