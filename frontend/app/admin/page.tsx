"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Plus } from "lucide-react"

export default function AdminPage() {
  const [question, setQuestion] = useState("")
  const [category, setCategory] = useState("Crypto")
  const [endsAt, setEndsAt] = useState("")

  const handleCreateMarket = async () => {
    if (!question || !endsAt) return
    console.log("Creating market:", { question, category, endsAt })
    // Reset form
    setQuestion("")
    setEndsAt("")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Admin Panel</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Market */}
          <Card className="p-8 border border-border bg-card">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Plus className="h-6 w-6 text-accent" />
              Create New Market
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Market Question</label>
                <Input
                  placeholder="Will Bitcoin reach $100k by end of 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground"
                >
                  <option>Crypto</option>
                  <option>Economy</option>
                  <option>AI</option>
                  <option>Sports</option>
                  <option>Politics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date/Time</label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <Button
                onClick={handleCreateMarket}
                disabled={!question || !endsAt}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                Create Market
              </Button>
            </div>
          </Card>

          {/* Market Stats */}
          <Card className="p-8 border border-border bg-card">
            <h2 className="text-2xl font-bold text-foreground mb-6">Platform Stats</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Markets</p>
                <p className="text-3xl font-bold text-foreground">42</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Volume</p>
                <p className="text-3xl font-bold text-foreground">2.4M USDC</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                <p className="text-3xl font-bold text-foreground">1,243</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">AI Resolution Success</p>
                <p className="text-3xl font-bold text-accent">98.5%</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
