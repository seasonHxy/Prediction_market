"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { TrendingUp, Clock, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFactory } from "@/hooks/use-factory"
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { MARKET_ABI } from '@/lib/contracts'
import { formatUsdc } from '@/lib/web3-utils'
import type { Address } from 'viem'

interface MarketData {
  address: Address
  endsAt: number
  state: number
  yesPool: number
  noPool: number
  totalPool: number
  yesProbability: number
}

export default function MarketsPage() {
  const { user, login } = usePrivy()
  const router = useRouter()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const { getAllMarkets, getTotalMarkets } = useFactory()

  const [markets, setMarkets] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true)
      try {
        const [marketAddresses, total] = await Promise.all([
          getAllMarkets(0, 50),
          getTotalMarkets(),
        ])
        
        setTotalCount(total)

        if (!publicClient || marketAddresses.length === 0) {
          setLoading(false)
          return
        }

        // Fetch details for each market
        const marketDetailsPromises = marketAddresses.map(async (address) => {
          try {
            const [endsAt, state, yesPool, noPool] = await Promise.all([
              publicClient.readContract({
                address,
                abi: MARKET_ABI,
                functionName: 'endsAt',
              }),
              publicClient.readContract({
                address,
                abi: MARKET_ABI,
                functionName: 'state',
              }),
              publicClient.readContract({
                address,
                abi: MARKET_ABI,
                functionName: 'yesPool',
              }),
              publicClient.readContract({
                address,
                abi: MARKET_ABI,
                functionName: 'noPool',
              }),
            ])

            const yesPoolFormatted = formatUsdc(yesPool as bigint)
            const noPoolFormatted = formatUsdc(noPool as bigint)
            const totalPool = yesPoolFormatted + noPoolFormatted
            const yesProbability = totalPool > 0 ? (yesPoolFormatted / totalPool) * 100 : 50

            return {
              address,
              endsAt: Number(endsAt),
              state: Number(state),
              yesPool: yesPoolFormatted,
              noPool: noPoolFormatted,
              totalPool,
              yesProbability,
            }
          } catch (error) {
            console.error(`Error fetching market ${address}:`, error)
            return null
          }
        })

        const marketDetails = await Promise.all(marketDetailsPromises)
        const validMarkets = marketDetails.filter((m): m is MarketData => m !== null)
        setMarkets(validMarkets)
      } catch (error) {
        console.error('Error loading markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [getAllMarkets, getTotalMarkets, publicClient])

  const handleViewMarket = (address: Address) => {
    if (!user) {
      login()
      return
    }
    router.push(`/markets/${address}`)
  }

  const getMarketStateLabel = (state: number) => {
    const states = ['Pending', 'Active', 'Closed', 'Resolved', 'Cancelled']
    return states[state] || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Active Markets</h1>
          <p className="text-lg text-muted-foreground">
            Explore prediction markets ({totalCount} total)
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p className="text-muted-foreground">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No markets found</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => {
              const daysLeft = Math.ceil((market.endsAt * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
              const stateLabel = getMarketStateLabel(market.state)

              return (
                <Card
                  key={market.address}
                  className="p-6 hover:border-primary transition cursor-pointer border border-border bg-card hover:shadow-lg"
                  onClick={() => handleViewMarket(market.address)}
                >
                  <div className="mb-4">
                    <div className="flex gap-2 mb-2">
                      <Badge variant={market.state === 1 ? 'default' : 'secondary'}>
                        {stateLabel}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                      Market: {market.address.slice(0, 6)}...{market.address.slice(-4)}
                    </h3>
                  </div>

                  <div className="mb-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Current Probability</span>
                      <span className="text-sm text-muted-foreground">{(100 - market.yesProbability).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${market.yesProbability}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>YES {market.yesProbability.toFixed(1)}%</span>
                      <span>NO {(100 - market.yesProbability).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> Total Pool
                      </span>
                      <span className="font-semibold text-foreground">
                        ${market.totalPool > 1000 ? (market.totalPool / 1000).toFixed(1) + 'k' : market.totalPool.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Ends In
                      </span>
                      <span className="font-semibold text-foreground">
                        {daysLeft > 0 ? `${daysLeft} days` : 'Ended'}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewMarket(market.address)
                    }}
                  >
                    View & Predict
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
