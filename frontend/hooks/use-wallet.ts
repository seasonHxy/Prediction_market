"use client"

import { useCallback } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { publicClient } from "@/lib/web3-utils"

export function useWallet() {
  const { user, login } = usePrivy()
  const address = user?.wallet?.address

  const isConnected = !!address

  const switchToBaseSepolia = useCallback(async () => {
    if (!window.ethereum) return false

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14a34" }], // 84532 in hex
      })
      return true
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x14a34",
                chainName: "Base Sepolia",
                rpcUrls: ["https://sepolia.base.org"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          })
          return true
        } catch (addError) {
          console.error("[v0] Failed to add Base Sepolia:", addError)
          return false
        }
      }
      console.error("[v0] Failed to switch chain:", error)
      return false
    }
  }, [])

  return {
    address,
    isConnected,
    login,
    switchToBaseSepolia,
    publicClient,
  }
}
