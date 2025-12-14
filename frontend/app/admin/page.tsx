"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Plus, Loader2, Shield, TrendingUp, Users, Activity } from "lucide-react"
import { useFactory } from "@/hooks/use-factory"
import { usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { FACTORY_ABI, FACTORY_ADDRESS, ROLES } from '@/lib/contracts'
import { toast } from 'sonner'
import type { Address } from 'viem'

export default function AdminPage() {
  const { user, logout } = usePrivy()
  const router = useRouter()
  const publicClient = usePublicClient({ chainId: baseSepolia.id })
  const { createSimpleMarket, getStatistics, getTotalMarkets, isLoading } = useFactory()

  const [question, setQuestion] = useState("")
  const [category, setCategory] = useState("Crypto")
  const [endsAt, setEndsAt] = useState("")
  
  // Permission states
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
  
  // Stats states
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const address = user?.wallet?.address as Address | undefined

  // Check if user has admin or creator role
  useEffect(() => {
    const checkRoles = async () => {
      if (!address || !publicClient) return

      setCheckingPermissions(true)
      try {
        const [hasAdminRole, hasCreatorRole] = await Promise.all([
          publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'hasRole',
            args: [ROLES.ADMIN_ROLE, address],
          }),
          publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'hasRole',
            args: [ROLES.CREATOR_ROLE, address],
          }),
        ]) as [boolean, boolean]

        setIsAdmin(hasAdminRole)
        setIsCreator(hasCreatorRole || hasAdminRole)

        if (!hasAdminRole && !hasCreatorRole) {
          toast.error('Access denied: You need admin or creator role')
          setTimeout(() => router.push('/'), 2000)
        }
      } catch (error) {
        console.error('Error checking roles:', error)
        toast.error('Failed to verify permissions')
      } finally {
        setCheckingPermissions(false)
      }
    }

    if (address) {
      checkRoles()
    } else if (!user) {
      router.push('/')
    }
  }, [address, publicClient, router, user])

  // Fetch platform statistics
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin && !isCreator) return
      
      setLoadingStats(true)
      try {
        const [statistics, totalMarkets] = await Promise.all([
          getStatistics(),
          getTotalMarkets(),
        ])

        setStats({
          totalMarkets,
          totalVolume: statistics?.totalVolume || 0,
          avgFee: statistics?.avgFee || 0,
          treasury: statistics?.treasury,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, isCreator, getStatistics, getTotalMarkets])

  // Get minimum date (1 hour from now)
  const getMinDate = () => {
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1)
    return nextHour.toISOString().slice(0, 16)
  }

  // Validate form
  const validateForm = () => {
    if (!question.trim()) {
      toast.error('Please enter a market question')
      return false
    }

    if (!endsAt) {
      toast.error('Please select an end date')
      return false
    }

    const endDate = new Date(endsAt).getTime() / 1000
    const now = Math.floor(Date.now() / 1000)
    const duration = endDate - now

    // Check minimum duration (1 hour = 3600 seconds)
    if (duration < 3600) {
      toast.error('Market must run for at least 1 hour')
      return false
    }

    // Check maximum duration (365 days = 31536000 seconds)
    if (duration > 31536000) {
      toast.error('Market cannot run for more than 365 days')
      return false
    }

    return true
  }

  // Handle market creation
  const handleCreateMarket = async () => {
    if (!validateForm()) return

    // Check if user has CREATOR_ROLE first
    if (!isCreator && !isAdmin) {
      toast.error('You need CREATOR_ROLE to create markets')
      return
    }

    try {
      const endTimestamp = Math.floor(new Date(endsAt).getTime() / 1000)
      const currentTime = Math.floor(Date.now() / 1000)
      const duration = endTimestamp - currentTime
      
      console.log('Creating market with params:', {
        question,
        category,
        endTimestamp,
        currentTime,
        duration: `${duration} seconds (${(duration / 3600).toFixed(1)} hours)`,
        hasCreatorRole: isCreator,
        hasAdminRole: isAdmin,
      })
      
      const receipt = await createSimpleMarket(question, category, endTimestamp)
      
      toast.success('Market created successfully!')
      console.log('Market created:', receipt)
      
      // Reset form
      setQuestion("")
      setEndsAt("")
      setCategory("Crypto")
      
      // Refresh stats
      const [statistics, totalMarkets] = await Promise.all([
        getStatistics(),
        getTotalMarkets(),
      ])
      setStats({
        totalMarkets,
        totalVolume: statistics?.totalVolume || 0,
        avgFee: statistics?.avgFee || 0,
        treasury: statistics?.treasury,
      })
      
      // Redirect to markets after 2 seconds
      setTimeout(() => {
        router.push('/markets')
      }, 2000)
      
    } catch (error: any) {
      console.error('Error creating market:', error)
      toast.error(error?.message || 'Failed to create market')
    }
  }

  // Loading state
  if (!user || checkingPermissions) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  // Access denied state
  if (!isAdmin && !isCreator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            You need CREATOR_ROLE or ADMIN_ROLE to create markets
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Admin Panel</h1>
            <div className="flex gap-2 mt-2">
              {isAdmin && (
                <Badge variant="default" className="bg-primary">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {isCreator && !isAdmin && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Creator
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            Logout
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Market */}
          <Card className="p-8 border border-border bg-card">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Plus className="h-6 w-6 text-accent" />
              Create New Market
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Market Question *
                </label>
                <Input
                  placeholder="Will Bitcoin reach $100k by end of 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Clear YES/NO question with verifiable outcome
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category *
                </label>
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
                  <option>Science</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Date/Time *
                </label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={getMinDate()}
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Market must run for at least 1 hour
                </p>
              </div>

              <Button
                onClick={handleCreateMarket}
                disabled={!question || !endsAt || isLoading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Market...
                  </>
                ) : (
                  'Create Market'
                )}
              </Button>

              {/* Info box */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground">
                <strong>Note:</strong> This creates a simple market with default settings. 
                Transaction requires approval in your wallet.
              </div>
            </div>
          </Card>

          {/* Platform Stats */}
          <Card className="p-8 border border-border bg-card">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Platform Stats
            </h2>
            
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Markets</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.totalMarkets || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Volume</p>
                    <p className="text-3xl font-bold text-foreground">
                      ${stats?.totalVolume ? (stats.totalVolume / 1000).toFixed(1) : 0}k
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Platform Fees</p>
                    <p className="text-3xl font-bold text-foreground">
                      ${stats?.avgFee ? stats.avgFee.toFixed(0) : 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-secondary" />
                </div>
                
                {stats?.treasury && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Treasury Address</p>
                    <p className="text-sm font-mono text-foreground">
                      {stats.treasury.slice(0, 6)}...{stats.treasury.slice(-4)}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/markets')}
                  >
                    View All Markets
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard')}
                  >
                    My Dashboard
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="mt-8 p-6 border border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-3">Your Permissions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-foreground mb-1">Create Markets</p>
              <Badge variant={isCreator ? "default" : "secondary"}>
                {isCreator ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-foreground mb-1">Admin Functions</p>
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-foreground mb-1">Your Address</p>
              <p className="text-xs font-mono text-muted-foreground">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}