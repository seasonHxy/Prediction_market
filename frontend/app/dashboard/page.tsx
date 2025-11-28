"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { Wallet, TrendingUp, Award, Clock, RefreshCw, Copy } from "lucide-react"
import Link from "next/link"

import { useState, useEffect } from "react"

import { useBalance } from "wagmi"
import { AddFundsModal } from "@/components/AddFundsModal"

export default function DashboardPage() {
  const { user, logout } = usePrivy()
  const router = useRouter()

  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false)

  const address = user?.wallet?.address as `0x${string}` | undefined

  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useBalance({
    address: address,
  })

  // Convert balance bigint → number (USDC = 6 decimals)
  const usdcBalance = balance?.value ? Number(balance.value) / 1e6 : 0

  useEffect(() => {
    if (!user) {
      router.push("/")
    }
  }, [user, router])

  if (!user) return null

  const activePositions = [
    {
      id: "1",
      market: "Will Bitcoin reach $100k by end of 2025?",
      side: "YES",
      amount: 500,
      currentProb: 72,
      endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      market: "Will the Dow Jones close above 43,000?",
      side: "YES",
      amount: 750,
      currentProb: 65,
      endsAt: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
    },
  ]

  const resolvedMarkets = [
    {
      id: "r1",
      market: "Will inflation drop below 3% by Q2 2025?",
      side: "YES",
      amount: 300,
      payout: 675,
      result: "WON",
    },
    {
      id: "r2",
      market: "Will Tesla stock exceed $300 by June?",
      side: "NO",
      amount: 400,
      payout: 0,
      result: "LOST",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {alertMessage && (
          <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg z-50">
            {alertMessage}
          </div>
        )}

        {/* Dashboard Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email?.address || "Forecaster"}
            </p>
          </div>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {usdcBalance.toFixed(0)} USDC
                </p>
              </div>
              <Wallet className="h-8 w-8 text-accent" />
            </div>
          </Card>
          <Card className="p-6 border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Predictions</p>
                <p className="text-2xl font-bold text-foreground">2</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-6 border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">66.7%</p>
              </div>
              <Award className="h-8 w-8 text-accent" />
            </div>
          </Card>
          <Card className="p-6 border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">+675 USDC</p>
              </div>
              <Clock className="h-8 w-8 text-secondary" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Predictions */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Active Predictions</h2>
              <div className="space-y-4">
                {activePositions.map((position) => {
                  const daysLeft = Math.ceil(
                    (position.endsAt.getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000)
                  )
                  return (
                    <Card
                      key={position.id}
                      className="p-6 border border-border bg-card hover:border-primary transition"
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-foreground mb-2">
                          {position.market}
                        </h3>
                        <Badge
                          variant={position.side === "YES" ? "secondary" : "outline"}
                        >
                          Predicted {position.side}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Your Stake</p>
                          <p className="font-semibold text-foreground">
                            {position.amount} USDC
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Current Prob</p>
                          <p className="font-semibold text-foreground">
                            {position.currentProb}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Ends In</p>
                          <p className="font-semibold text-foreground">{daysLeft} days</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground mb-1">Potential Return</p>
                          <p className="font-semibold text-green-500">
                            +{(position.amount * 1.2).toFixed(0)} USDC
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-border text-foreground hover:bg-muted bg-transparent"
                        asChild
                      >
                        <Link href={`/markets/${position.id}`}>View Market</Link>
                      </Button>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Resolved Markets */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Resolved Markets</h2>
              <div className="space-y-4">
                {resolvedMarkets.map((market) => (
                  <Card key={market.id} className="p-6 border border-border bg-card">
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-foreground">{market.market}</h3>
                        <Badge
                          variant={
                            market.result === "WON" ? "secondary" : "destructive"
                          }
                        >
                          {market.result}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Your Stake</p>
                        <p className="font-semibold text-foreground">
                          {market.amount} USDC
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Predicted</p>
                        <p className="font-semibold text-foreground">{market.side}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Payout</p>
                        <p
                          className={`font-semibold ${
                            market.payout > 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {market.payout > 0 ? `+${market.payout}` : "Refunded"} USDC
                        </p>
                      </div>
                      <div className="text-right">
                        <Button
                          size="sm"
                          disabled={market.payout === 0}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          {market.payout > 0 ? "Claim" : "Claimed"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Section */}
            <Card className="p-6 border border-border bg-card">
              <h3 className="font-bold text-foreground mb-4">Wallet</h3>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Connected Wallet
                </p>
                {address && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p className="font-mono text-sm text-foreground break-all">
                      {address}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(address || "")
                        setAlertMessage("Wallet address copied to clipboard!")
                        setTimeout(() => setAlertMessage(null), 3000)
                      }}
                      className="ml-2 px-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Available Balance
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {usdcBalance.toFixed(0)} USDC
                </p>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-2"
                onClick={() => setIsAddFundsModalOpen(true)}
              >
                Add Funds
              </Button>
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-muted bg-transparent"
                onClick={() => {
                  setAlertMessage("Withdraw functionality is not yet implemented.")
                  setTimeout(() => setAlertMessage(null), 3000)
                }}
              >
                Withdraw
              </Button>
            </Card>

            {/* AI Insights */}
            <Card className="p-6 border border-border bg-card bg-linear-to-br from-primary/5 to-accent/5">
              <h3 className="font-bold text-foreground mb-4">AI Insights</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-foreground mb-1">Trending Markets</p>
                  <p className="text-muted-foreground">
                    3 high-confidence markets added today
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-foreground mb-1">
                    Your Forecast Accuracy
                  </p>
                  <p className="text-muted-foreground">
                    Better than 72% of forecasters
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {address && (
        <AddFundsModal
          address={address}
          isOpen={isAddFundsModalOpen}
          onClose={() => setIsAddFundsModalOpen(false)}
        />
      )}
    </div>
  )
}
