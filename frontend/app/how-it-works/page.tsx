"use client"

import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-4 text-center">How Truthbase Works</h1>
        <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          A transparent, AI-powered prediction market platform on Base blockchain with Privy wallet integration.
        </p>

        {/* Timeline */}
        <div className="space-y-8 max-w-3xl mx-auto">
          {[
            {
              step: 1,
              title: "Login with Privy",
              description:
                "Connect using email, phone number, or your existing crypto wallet. Privy creates a secure smart wallet on Base.",
              details: ["Non-custodial smart wallets", "Multi-factor authentication", "Wallet recovery options"],
            },
            {
              step: 2,
              title: "Browse AI Markets",
              description:
                "Explore prediction markets curated and analyzed by AI. View probability scores and supporting evidence.",
              details: ["AI probability analysis", "Category filters", "Real-time odds updates"],
            },
            {
              step: 3,
              title: "Make Your Prediction",
              description: "Choose YES or NO and stake your USDC. Your position is recorded on the Base blockchain.",
              details: ["Transparent pool tracking", "Real-time price updates", "Fee structure disclosure"],
            },
            {
              step: 4,
              title: "AI Resolution",
              description:
                "When the market ends, AI analyzes data from verified sources to determine the outcome. 24-hour challenge period for disputes.",
              details: ["Multi-source verification", "Challenge mechanism", "Admin fallback"],
            },
            {
              step: 5,
              title: "Claim Your Winnings",
              description:
                "If your prediction was correct, claim your proportional share of the losing pool plus your original stake.",
              details: ["Instant USDC settlement", "Gas-optimized claiming", "Batch claim support"],
            },
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="flex gap-6">
                {/* Timeline marker */}
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                    {item.step}
                  </div>
                  {idx < 4 && <div className="w-1 h-16 bg-gradient-to-b from-primary to-transparent" />}
                </div>

                {/* Content */}
                <Card className="flex-1 p-6 border border-border bg-card mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {item.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                title: "AI-Powered",
                desc: "Advanced algorithms analyze outcomes across multiple verified data sources",
              },
              { title: "Smart Contracts", desc: "All transactions recorded on Base blockchain for full transparency" },
              { title: "Privy Integration", desc: "Secure, non-custodial smart wallets with easy onboarding" },
              { title: "USDC Settlement", desc: "Instant payouts in USDC with minimal gas fees" },
              { title: "Dispute Resolution", desc: "24-hour challenge period with admin fallback mechanism" },
              { title: "Mobile Friendly", desc: "Responsive design optimized for all devices" },
            ].map((feature, idx) => (
              <Card key={idx} className="p-6 border border-border bg-card hover:border-primary transition">
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
