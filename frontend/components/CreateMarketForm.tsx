"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFactory } from '@/hooks/use-factory'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function CreateMarketForm() {
  const router = useRouter()
  const { createMarket, createSimpleMarket, isLoading } = useFactory()

  // Form state
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState('')
  const [sources, setSources] = useState<string[]>([''])
  const [endsAt, setEndsAt] = useState('')
  const [customFeeBP, setCustomFeeBP] = useState('')
  const [maxStakePerUser, setMaxStakePerUser] = useState('')
  const [maxTotalPool, setMaxTotalPool] = useState('')
  const [useAdvanced, setUseAdvanced] = useState(false)

  // Calculate minimum end date (24 hours from now)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 16)
  }

  // Add source field
  const addSource = () => {
    setSources([...sources, ''])
  }

  // Remove source field
  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index))
  }

  // Update source value
  const updateSource = (index: number, value: string) => {
    const newSources = [...sources]
    newSources[index] = value
    setSources(newSources)
  }

  // Validate form
  const validateForm = () => {
    if (!question.trim()) {
      toast.error('Please enter a market question')
      return false
    }

    if (!category.trim()) {
      toast.error('Please select a category')
      return false
    }

    if (!endsAt) {
      toast.error('Please select an end date')
      return false
    }

    const endDate = new Date(endsAt).getTime()
    const now = Date.now()
    const minDate = now + (24 * 60 * 60 * 1000) // 24 hours from now

    if (endDate < minDate) {
      toast.error('Market must end at least 24 hours from now')
      return false
    }

    if (useAdvanced) {
      if (customFeeBP && (Number(customFeeBP) < 0 || Number(customFeeBP) > 1000)) {
        toast.error('Fee must be between 0 and 10% (0-1000 basis points)')
        return false
      }

      if (maxStakePerUser && Number(maxStakePerUser) <= 0) {
        toast.error('Max stake per user must be greater than 0')
        return false
      }

      if (maxTotalPool && Number(maxTotalPool) <= 0) {
        toast.error('Max total pool must be greater than 0')
        return false
      }
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const endTimestamp = Math.floor(new Date(endsAt).getTime() / 1000)

      if (useAdvanced) {
        // Advanced market creation
        const validSources = sources.filter(s => s.trim() !== '')
        
        const receipt = await createMarket(
          question,
          category,
          validSources,
          endTimestamp,
          customFeeBP ? Number(customFeeBP) : undefined,
          maxStakePerUser ? Number(maxStakePerUser) * 1e6 : undefined, // Convert to USDC decimals
          maxTotalPool ? Number(maxTotalPool) * 1e6 : undefined
        )

        toast.success('Advanced market created successfully!')
        console.log('Market created:', receipt)
      } else {
        // Simple market creation
        const receipt = await createSimpleMarket(
          question,
          category,
          endTimestamp
        )

        toast.success('Market created successfully!')
        console.log('Market created:', receipt)
      }

      // Reset form
      setQuestion('')
      setCategory('')
      setSources([''])
      setEndsAt('')
      setCustomFeeBP('')
      setMaxStakePerUser('')
      setMaxTotalPool('')

      // Redirect to markets page after 2 seconds
      setTimeout(() => {
        router.push('/markets')
      }, 2000)

    } catch (error: any) {
      console.error('Error creating market:', error)
      toast.error(error?.message || 'Failed to create market')
    }
  }

  return (
    <Card className="p-6 border border-border bg-card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Market Question */}
        <div>
          <Label htmlFor="question" className="text-foreground">
            Market Question *
          </Label>
          <Textarea
            id="question"
            placeholder="Will Bitcoin reach $100k by end of 2025?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-2 bg-muted border-border text-foreground"
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Clear, specific, and verifiable question
          </p>
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category" className="text-foreground">
            Category *
          </Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground"
            required
          >
            <option value="">Select a category</option>
            <option value="Crypto">Crypto</option>
            <option value="Economy">Economy</option>
            <option value="AI">AI & Technology</option>
            <option value="Sports">Sports</option>
            <option value="Politics">Politics</option>
            <option value="Science">Science</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* End Date */}
        <div>
          <Label htmlFor="endsAt" className="text-foreground">
            Market End Date *
          </Label>
          <Input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            min={getMinDate()}
            className="mt-2 bg-muted border-border text-foreground"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Market must run for at least 24 hours
          </p>
        </div>

        {/* Advanced Options Toggle */}
        <div className="pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setUseAdvanced(!useAdvanced)}
            className="text-primary hover:text-primary/80"
          >
            {useAdvanced ? '− Hide' : '+ Show'} Advanced Options
          </Button>
        </div>

        {/* Advanced Options */}
        {useAdvanced && (
          <div className="space-y-6 p-4 rounded-lg bg-muted/50">
            {/* Sources */}
            <div>
              <Label className="text-foreground">Verification Sources</Label>
              <div className="space-y-2 mt-2">
                {sources.map((source, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., CoinMarketCap, Bloomberg"
                      value={source}
                      onChange={(e) => updateSource(index, e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                    {sources.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSource(index)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSource}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </div>
            </div>

            {/* Custom Fee */}
            <div>
              <Label htmlFor="customFeeBP" className="text-foreground">
                Custom Fee (Basis Points)
              </Label>
              <Input
                id="customFeeBP"
                type="number"
                placeholder="Default: 200 (2%)"
                value={customFeeBP}
                onChange={(e) => setCustomFeeBP(e.target.value)}
                min="0"
                max="1000"
                className="mt-2 bg-background border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                100 basis points = 1%. Leave empty for default (2%)
              </p>
            </div>

            {/* Max Stake Per User */}
            <div>
              <Label htmlFor="maxStakePerUser" className="text-foreground">
                Max Stake Per User (USDC)
              </Label>
              <Input
                id="maxStakePerUser"
                type="number"
                placeholder="Default: 10000"
                value={maxStakePerUser}
                onChange={(e) => setMaxStakePerUser(e.target.value)}
                min="1"
                className="mt-2 bg-background border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum amount a single user can stake
              </p>
            </div>

            {/* Max Total Pool */}
            <div>
              <Label htmlFor="maxTotalPool" className="text-foreground">
                Max Total Pool (USDC)
              </Label>
              <Input
                id="maxTotalPool"
                type="number"
                placeholder="Default: 1000000"
                value={maxTotalPool}
                onChange={(e) => setMaxTotalPool(e.target.value)}
                min="1"
                className="mt-2 bg-background border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum total pool size for this market
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuestion('')
              setCategory('')
              setSources([''])
              setEndsAt('')
              setCustomFeeBP('')
              setMaxStakePerUser('')
              setMaxTotalPool('')
            }}
            className="border-border text-foreground hover:bg-muted"
          >
            Clear
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-foreground">
            <strong>Note:</strong> Creating a market requires CREATOR_ROLE or ADMIN_ROLE. 
            Make sure your wallet has the necessary permissions.
          </p>
        </div>
      </form>
    </Card>
  )
}