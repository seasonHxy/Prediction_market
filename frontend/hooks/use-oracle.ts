"use client"

import { useState, useCallback } from 'react'
import { useContract } from './use-contract'
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { ORACLE_ABI, ORACLE_ADDRESS, MARKET_SIDE } from '@/lib/contracts'
import type { Address } from 'viem'

export function useOracle() {
  const { writeContract, waitForTransaction } = useContract()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const [isLoading, setIsLoading] = useState(false)

  // Read Functions
  const getResolution = useCallback(
    async (marketId: string) => {
      if (!publicClient) return null

      try {
        const resolution = await publicClient.readContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'getResolution',
          args: [marketId as `0x${string}`],
        })
        return Number(resolution)
      } catch (error) {
        console.error('Error fetching resolution:', error)
        return null
      }
    },
    [publicClient]
  )

  const isResolutionFinalized = useCallback(
    async (marketId: string) => {
      if (!publicClient) return false

      try {
        const finalized = await publicClient.readContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'isResolutionFinalized',
          args: [marketId as `0x${string}`],
        })
        return finalized as boolean
      } catch (error) {
        console.error('Error checking finalization:', error)
        return false
      }
    },
    [publicClient]
  )

  const getProposedResolution = useCallback(
    async (marketId: string) => {
      if (!publicClient) return null

      try {
        const proposal = await publicClient.readContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'proposedResolutions',
          args: [marketId as `0x${string}`],
        })

        const [result, timestamp, proposer, challengeDeadline, challenged] = proposal as [
          number,
          bigint,
          Address,
          bigint,
          boolean
        ]

        return {
          result,
          timestamp: Number(timestamp),
          proposer,
          challengeDeadline: Number(challengeDeadline),
          challenged,
        }
      } catch (error) {
        console.error('Error fetching proposed resolution:', error)
        return null
      }
    },
    [publicClient]
  )

  const getVoteCount = useCallback(
    async (marketId: string, side: number) => {
      if (!publicClient) return 0

      try {
        const count = await publicClient.readContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'voteCount',
          args: [marketId as `0x${string}`, side],
        })
        return Number(count)
      } catch (error) {
        console.error('Error fetching vote count:', error)
        return 0
      }
    },
    [publicClient]
  )

  const hasVoted = useCallback(
    async (marketId: string, voter: Address) => {
      if (!publicClient) return false

      try {
        const vote = await publicClient.readContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'resolutionVotes',
          args: [marketId as `0x${string}`, voter],
        })
        return Number(vote) !== 255 // 255 is used for "not voted"
      } catch (error) {
        console.error('Error checking vote status:', error)
        return false
      }
    },
    [publicClient]
  )

  // Write Functions
  const submitResolution = useCallback(
    async (
      marketId: string,
      result: number,
      timestamp: number,
      nonce: number,
      signature: string
    ) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'submitResolution',
          args: [marketId as `0x${string}`, result, BigInt(timestamp), BigInt(nonce), signature as `0x${string}`],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error submitting resolution:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  const challengeResolution = useCallback(
    async (marketId: string, reason: string) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'challengeResolution',
          args: [marketId as `0x${string}`, reason],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error challenging resolution:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  const finalizeResolution = useCallback(
    async (marketId: string) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'finalizeResolution',
          args: [marketId as `0x${string}`],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error finalizing resolution:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  const adminResolve = useCallback(
    async (marketId: string, result: number) => {
      setIsLoading(true)
      try {
        const hash = await writeContract({
          address: ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: 'adminResolve',
          args: [marketId as `0x${string}`, result],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error admin resolving:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction]
  )

  return {
    // Read functions
    getResolution,
    isResolutionFinalized,
    getProposedResolution,
    getVoteCount,
    hasVoted,
    // Write functions
    submitResolution,
    challengeResolution,
    finalizeResolution,
    adminResolve,
    // State
    isLoading,
  }
}