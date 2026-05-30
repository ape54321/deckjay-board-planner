"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { LoginScreen } from "@/components/login-screen"
import { TrackerDashboard } from "@/components/tracker-dashboard"

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [worklogId, setWorklogId] = useState<string | null>(null)
  const [workerName, setWorkerName] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem("deck-tracker-session")
    if (savedSession) {
      const session = JSON.parse(savedSession)
      setWorklogId(session.worklogId)
      setWorkerName(session.workerName)
      setIsAdmin(session.isAdmin || false)
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = (worklogId: string, workerName: string, isAdmin: boolean) => {
    localStorage.setItem("deck-tracker-session", JSON.stringify({ worklogId, workerName, isAdmin }))
    setWorklogId(worklogId)
    setWorkerName(workerName)
    setIsAdmin(isAdmin)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("deck-tracker-session")
    setWorklogId(null)
    setWorkerName("")
    setIsAdmin(false)
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted)]">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !worklogId) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <TrackerDashboard
      worklogId={worklogId}
      workerName={workerName}
      isAdmin={isAdmin}
      onLogout={handleLogout}
    />
  )
}
