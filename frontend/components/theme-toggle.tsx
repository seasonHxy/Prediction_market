"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    if (isDarkMode) {
      document.documentElement.classList.remove("dark")
      localStorage.theme = "light"
      setIsDark(false)
    } else {
      document.documentElement.classList.add("dark")
      localStorage.theme = "dark"
      setIsDark(true)
    }
  }

  if (!mounted) return null

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" aria-label="Toggle theme">
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
