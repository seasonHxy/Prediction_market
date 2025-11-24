"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Users, Clock } from "lucide-react"
import Link from "next/link"
import { getUsdcBalance } from "@/lib/web3-utils"

// Mock market data mapping
const MARKET_DETAILS_MAP: Record<string, any> = {
  "1": {
    id: "1",
    question: "Will Bitcoin reach $100k by end of 2025?",
    category: "Crypto",
    yesProbability: 72,
    yesPool: 125000,
    noPool: 48000,
    endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    participants: 1243,
    description:
      "This market resolves YES if the spot price of Bitcoin reaches or exceeds $100,000 USD at any point before the deadline.",
    sources: ["CoinMarketCap", "CoinGecko", "Binance"],
    aiConfidence: "Moderate confidence based on current trend analysis and technical indicators.",
  },
  "2": {
    id: "2",
    question: "Will US inflation drop below 2.5% by Q4 2025?",
    category: "Economy",
    yesProbability: 58,
    yesPool: 89000,
    noPool: 76500,
    endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    participants: 856,
    description: "This market resolves YES if the US CPI inflation rate drops below 2.5% by Q4 2025.",
    sources: ["BLS", "Federal Reserve", "Economic Data"],
    aiConfidence: "High confidence based on macroeconomic trends.",
  },
}

export default function MarketDetailPage() {
  const { user, login } = usePrivy()
  const router = useRouter()
  const params = useParams()
  const marketId = params.id as string

  const market = MARKET_DETAILS_MAP[marketId] || MARKET_DETAILS_MAP["1"]
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null)
  const [amount, setAmount] = useState("")
  const [isStaking, setIsStaking] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<number>(0)

  useEffect(() => {
    if (user?.smartWalletPublicAddress) {
      getUsdcBalance(user.smartWalletPublicAddress).then(setUsdcBalance)
    }
  }, [user?.smartWalletPublicAddress])

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Sign in to view this market</h2>
          <Button onClick={login} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Login with Privy
          </Button>
        </main>
      </div>
    )
  }

  const handleStake = async () => {
    if (!selectedSide || !amount || !user?.smartWalletPublicAddress) return

    setIsStaking(true)
    try {
      console.log("[v0] Staking", amount, "USDC on", selectedSide, "for market", marketId)
      // Transaction will be executed here through Privy wallet

      setTimeout(() => {
        setIsStaking(false)
        setAmount("")
        setSelectedSide(null)
      }, 2000)
    } catch (error) {
      console.error("[v0] Staking error:", error)
      setIsStaking(false)
    }
  }

  const totalPool = market.yesPool + market.noPool
  const daysLeft = Math.ceil((market.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/markets" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 border border-border bg-card">
              <div className="mb-4">
                <Badge variant="secondary" className="mb-2">
                  {market.category}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">{market.question}</h1>
              <p className="text-lg text-muted-foreground mb-6">{market.description}</p>

              <div className="p-6 rounded-lg bg-muted/50 mb-6">
                <h3 className="font-semibold text-foreground mb-4">AI Probability Analysis</h3>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-foreground">Predicted Outcome</span>
                    <span className="text-sm text-muted-foreground">{100 - market.yesProbability}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${market.yesProbability}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3 text-sm font-medium">
                    <span className="text-primary">YES {market.yesProbability}%</span>
                    <span className="text-secondary">NO {100 - market.yesProbability}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">{market.aiConfidence}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Verification Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {market.sources.map((source) => (
                    <Badge key={source} variant="outline">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Total Pool
                </div>
                <div className="text-2xl font-bold text-foreground">${(totalPool / 1000).toFixed(1)}k</div>
              </Card>
              <Card className="p-4 border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Participants
                </div>
                <div className="text-2xl font-bold text-foreground">{market.participants.toLocaleString()}</div>
              </Card>
              <Card className="p-4 border border-border bg-card">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Ends In
                </div>
                <div className="text-2xl font-bold text-foreground">{daysLeft}d</div>
              </Card>
            </div>
          </div>

          {/* Staking Sidebar */}
          <div className="lg:sticky lg:top-20 h-fit">
            <Card className="p-6 border border-border bg-card">
              <h2 className="text-xl font-bold text-foreground mb-6">Place Your Prediction</h2>

              {/* Side Selection */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelectedSide("yes")}
                  className={`w-full p-4 rounded-lg border-2 transition font-semibold ${
                    selectedSide === "yes"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  Predict YES
                </button>
                <button
                  onClick={() => setSelectedSide("no")}
                  className={`w-full p-4 rounded-lg border-2 transition font-semibold ${
                    selectedSide === "no"
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border bg-muted/50 text-foreground hover:border-secondary/50"
                  }`}
                >
                  Predict NO
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">Stake Amount (USDC)</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  disabled={!selectedSide}
                />
                <p className="text-xs text-muted-foreground mt-2">Available Balance: {usdcBalance.toFixed(2)} USDC</p>
              </div>

              {/* Pool Distribution */}
              {selectedSide && (
                <div className="p-4 rounded-lg bg-muted/50 mb-6">
                  <h4 className="font-semibold text-foreground mb-3 text-sm">Pool Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">YES Pool</span>
                      <span className="font-medium text-foreground">${(market.yesPool / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NO Pool</span>
                      <span className="font-medium text-foreground">${(market.noPool / 1000).toFixed(1)}k</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stake Button */}
              <Button
                onClick={handleStake}
                disabled={!selectedSide || !amount || isStaking || Number(amount) > usdcBalance}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold mb-3"
              >
                {isStaking ? "Confirming..." : "Confirm Prediction"}
              </Button>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center">
                By staking, you agree to the platform terms and Privy's smart wallet terms.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
