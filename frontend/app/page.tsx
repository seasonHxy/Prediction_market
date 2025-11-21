"use client"

import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"

export default function HomePage() {
  const { user, login } = usePrivy()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Predict Anything.
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                AI Verifies Everything.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Join the next generation of prediction markets powered by AI-driven resolution and secured by smart
              contracts on Base.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => (user ? (window.location.href = "/markets") : login())}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                Start Predicting <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-border hover:bg-muted bg-transparent" asChild>
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Truthbase?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition">
              <TrendingUp className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">AI-Powered Markets</h3>
              <p className="text-muted-foreground">
                Advanced AI analyzes market outcomes across multiple data sources for fair, accurate resolution.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition">
              <Shield className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Secure & Transparent</h3>
              <p className="text-muted-foreground">
                Built on Base with non-custodial smart wallets via Privy. Every transaction is verifiable.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition">
              <Zap className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Earn USDC Rewards</h3>
              <p className="text-muted-foreground">
                Win stakes and earn USDC when your predictions match AI-verified outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Login", desc: "Connect via Privy with email, phone, or wallet" },
              { num: "2", title: "Choose", desc: "Pick a market and predict YES or NO" },
              { num: "3", title: "Stake", desc: "Lock in your USDC prediction amount" },
              { num: "4", title: "Win", desc: "Claim rewards when AI resolves the market" },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-primary/10 to-accent/10 border-y border-border">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to forecast the future?</h2>
          <Button
            onClick={() => (user ? (window.location.href = "/markets") : login())}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            Join Truthbase Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Truthbase. Prediction markets powered by AI on Base.</p>
        </div>
      </footer>
    </div>
  )
}
