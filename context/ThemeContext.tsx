'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface ThemeCtx {
  isDark: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggleDark: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('kr-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = stored === 'dark' || (!stored && prefersDark)
    setIsDark(initial)
    document.documentElement.setAttribute('data-theme', initial ? 'dark' : 'light')
  }, [])

  const toggleDark = useCallback(() => {
    const html = document.documentElement
    html.classList.add('theme-transition')
    setIsDark(prev => {
      const next = !prev
      html.setAttribute('data-theme', next ? 'dark' : 'light')
      localStorage.setItem('kr-theme', next ? 'dark' : 'light')
      return next
    })
    const timer = setTimeout(() => html.classList.remove('theme-transition'), 500)
    return () => clearTimeout(timer)
  }, [])

  return <ThemeContext.Provider value={{ isDark, toggleDark }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
