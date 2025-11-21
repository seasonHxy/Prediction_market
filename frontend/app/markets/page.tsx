"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { TrendingUp, Clock, Users } from "lucide-react"

// Mock market data
const MOCK_MARKETS = [
  {
    id: "1",
    question: "Will Bitcoin reach $100k by end of 2025?",
    category: "Crypto",
    yesProbability: 72,
    yesPool: 125000,
    noPool: 48000,
    endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    participants: 1243,
    riskLevel: "Medium",
  },
  {
    id: "2",
    question: "Will US inflation drop below 2.5% by Q4 2025?",
    category: "Economy",
    yesProbability: 58,
    yesPool: 89000,
    noPool: 76500,
    endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    participants: 856,
    riskLevel: "Medium",
  },
  {
    id: "3",
    question: "Will the Dow Jones close above 43,000 on 2025-12-31?",
    category: "Stock Market",
    yesProbability: 65,
    yesPool: 156000,
    noPool: 94000,
    endsAt: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
    participants: 2104,
    riskLevel: "Low",
  },
  {
    id: "4",
    question: "Will the next US presidential election be called before noon ET on election day?",
    category: "Politics",
    yesProbability: 35,
    yesPool: 45000,
    noPool: 112000,
    endsAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    participants: 3456,
    riskLevel: "High",
  },
  {
    id: "5",
    question: "Will OpenAI release GPT-5 in 2025?",
    category: "AI",
    yesProbability: 42,
    yesPool: 78000,
    noPool: 98000,
    endsAt: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    participants: 1678,
    riskLevel: "Medium",
  },
  {
    id: "6",
    question: "Will gold price exceed $2,500/oz by year-end 2025?",
    category: "Commodities",
    yesProbability: 55,
    yesPool: 67500,
    noPool: 54000,
    endsAt: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    participants: 945,
    riskLevel: "Medium",
  },
]

export default function MarketsPage() {
  const { user, login } = usePrivy()
  const router = useRouter()

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
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Active Markets</h1>
          <p className="text-lg text-muted-foreground">Explore AI-curated prediction markets across categories</p>
        </div>

        {/* Filters */}
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

        {/* Markets Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_MARKETS.map((market) => {
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

                {/* Probability Display */}
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

                {/* Market Stats */}
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

                {/* Risk Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Badge
                    variant={
                      market.riskLevel === "Low"
                        ? "secondary"
                        : market.riskLevel === "Medium"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {market.riskLevel}
                  </Badge>
                </div>

                {/* CTA */}
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
      </main>
    </div>
  )
}
