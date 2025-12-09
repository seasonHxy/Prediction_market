"use client"

import { useState, useCallback, useEffect } from 'react'
import { useContract } from './use-contract'
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { USDC_ABI, USDC_ADDRESS } from '@/lib/contracts'
import { parseUsdc, formatUsdc } from '@/lib/web3-utils'
import type { Address } from 'viem'

export function useUSDC(userAddress?: Address) {
  const { writeContract, waitForTransaction } = useContract()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<number>(0)

  // Fetch balance
  const getBalance = useCallback(
    async (address?: Address) => {
      const targetAddress = address || userAddress
      if (!publicClient || !targetAddress) return 0

      try {
        const result = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [targetAddress],
        })
        const formatted = formatUsdc(result as bigint)
        if (address === userAddress) {
          setBalance(formatted)
        }
        return formatted
      } catch (error) {
        console.error('Error fetching USDC balance:', error)
        return 0
      }
    },
    [publicClient, userAddress]
  )

  // Auto-fetch balance when address changes
  useEffect(() => {
    if (userAddress) {
      getBalance()
    }
  }, [userAddress, getBalance])

  // Check allowance
  const getAllowance = useCallback(
    async (spender: Address, owner?: Address) => {
      const targetOwner = owner || userAddress
      if (!publicClient || !targetOwner) return 0

      try {
        const result = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [targetOwner, spender],
        })
        return formatUsdc(result as bigint)
      } catch (error) {
        console.error('Error fetching USDC allowance:', error)
        return 0
      }
    },
    [publicClient, userAddress]
  )

  // Approve spending
  const approve = useCallback(
    async (spender: Address, amount: number) => {
      setIsLoading(true)
      try {
        const amountBigInt = parseUsdc(amount)
        const hash = await writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [spender, amountBigInt],
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
    [writeContract, waitForTransaction]
  )

  // Transfer USDC
  const transfer = useCallback(
    async (to: Address, amount: number) => {
      setIsLoading(true)
      try {
        const amountBigInt = parseUsdc(amount)
        const hash = await writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [to, amountBigInt],
        })

        const receipt = await waitForTransaction(hash)
        setIsLoading(false)
        
        // Refresh balance after transfer
        if (userAddress) {
          await getBalance()
        }
        
        return receipt
      } catch (error) {
        setIsLoading(false)
        console.error('Error transferring USDC:', error)
        throw error
      }
    },
    [writeContract, waitForTransaction, userAddress, getBalance]
  )

  // Check if needs approval
  const needsApproval = useCallback(
    async (spender: Address, amount: number) => {
      const allowance = await getAllowance(spender)
      return allowance < amount
    },
    [getAllowance]
  )

  // Approve if needed (convenience function)
  const ensureApproval = useCallback(
    async (spender: Address, amount: number) => {
      const needs = await needsApproval(spender, amount)
      if (needs) {
        return await approve(spender, amount)
      }
      return null
    },
    [needsApproval, approve]
  )

  return {
    // State
    balance,
    isLoading,
    
    // Read functions
    getBalance,
    getAllowance,
    needsApproval,
    
    // Write functions
    approve,
    transfer,
    ensureApproval,
  }
}