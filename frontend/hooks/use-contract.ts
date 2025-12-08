import { useWalletClient, usePublicClient } from 'wagmi'
import { useCallback } from 'react'
import { encodeFunctionData, type Address, type Hash } from 'viem'
import { baseSepolia } from 'viem/chains'

interface ContractWrite {
  address: Address
  abi: any
  functionName: string
  args?: any[]
  value?: bigint
}

export function useContract() {
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })
  const publicClient = usePublicClient({ chainId: baseSepolia.id })

  const writeContract = useCallback(
    async ({ address, abi, functionName, args = [], value }: ContractWrite): Promise<Hash> => {
      if (!walletClient) throw new Error('Wallet not connected')

      const data = encodeFunctionData({
        abi,
        functionName,
        args,
      })

      const hash = await walletClient.sendTransaction({
        to: address,
        data,
        value,
        chain: baseSepolia,
      })

      return hash
    },
    [walletClient]
  )

  const waitForTransaction = useCallback(
    async (hash: Hash) => {
      if (!publicClient) throw new Error('Public client not available')
      return await publicClient.waitForTransactionReceipt({ hash })
    },
    [publicClient]
  )

  return {
    writeContract,
    waitForTransaction,
    walletClient,
    publicClient,
  }
}