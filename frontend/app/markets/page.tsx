"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { TrendingUp, Clock, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { getAllMarkets } from "@/lib/web3-utils"

interface Market {
  address: string
  id: string
  question: string
  category: string
  yesProbability: number
  yesPool: number
  noPool: number
  endsAt: Date
  participants: number
}

export default function MarketsPage() {
  const { user, login } = usePrivy()
  const router = useRouter()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const marketAddresses = await getAllMarkets(0, 50)
        console.log("[v0] Fetched markets:", marketAddresses)

        // Mock data until contract is fully integrated
        const mockMarkets: Market[] = [
          {
            address: marketAddresses[0] || "0x0",
            id: "1",
            question: "Will Bitcoin reach $100k by end of 2025?",
            category: "Crypto",
            yesProbability: 72,
            yesPool: 125000,
            noPool: 48000,
            endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            participants: 1243,
          },
          {
            address: marketAddresses[1] || "0x1",
            id: "2",
            question: "Will US inflation drop below 2.5% by Q4 2025?",
            category: "Economy",
            yesProbability: 58,
            yesPool: 89000,
            noPool: 76500,
            endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            participants: 856,
          },
        ]
        setMarkets(mockMarkets)
      } catch (error) {
        console.error("[v0] Error loading markets:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

  const handleViewMarket = (id: string) => {
    if (!user) {
      login()
      return
    }
    router.push(`/markets/${id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Active Markets</h1>
          <p className="text-lg text-muted-foreground">Explore AI-curated prediction markets across categories</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {["All", "Crypto", "Economy", "AI", "Sports", "Politics"].map((category) => (
            <Button
              key={category}
              variant={category === "All" ? "default" : "outline"}
              className={category === "All" ? "bg-primary hover:bg-primary/90" : ""}
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading markets...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => {
              const totalPool = market.yesPool + market.noPool
              const daysLeft = Math.ceil((market.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

              return (
                <Card
                  key={market.id}
                  className="p-6 hover:border-primary transition cursor-pointer border border-border bg-card hover:shadow-lg"
                  onClick={() => handleViewMarket(market.id)}
                >
                  <div className="mb-4">
                    <Badge variant="secondary" className="mb-2">
                      {market.category}
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2">{market.question}</h3>
                  </div>

                  <div className="mb-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">AI Probability</span>
                      <span className="text-sm text-muted-foreground">{100 - market.yesProbability}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${market.yesProbability}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>YES {market.yesProbability}%</span>
                      <span>NO {100 - market.yesProbability}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> Total Pool
                      </span>
                      <span className="font-semibold text-foreground">${(totalPool / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" /> Participants
                      </span>
                      <span className="font-semibold text-foreground">{market.participants.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Ends In
                      </span>
                      <span className="font-semibold text-foreground">{daysLeft} days</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewMarket(market.id)
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
