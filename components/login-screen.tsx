"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface LoginScreenProps {
  onLogin: (worklogId: string, workerName: string, isAdmin: boolean) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [accessCode, setAccessCode] = useState("")
  const [workerName, setWorkerName] = useState("")
  const [error, setError] = useState("")
  const [step, setStep] = useState<"code" | "name">("code")
  const [worklogId, setWorklogId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (accessCode.length !== 4) return

    setLoading(true)
    setError("")

    const supabase = createClient()
    const { data, error } = await supabase
      .from("worklogs")
      .select("id, name")
      .eq("access_code", accessCode)
      .single()

    setLoading(false)

    if (error || !data) {
      setError("Invalid access code")
      return
    }

    setWorklogId(data.id)
    setStep("name")
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workerName.trim() || !worklogId) return

    const isAdmin = accessCode === "1155" // Boss mode code
    onLogin(worklogId, workerName.trim(), isAdmin)
  }

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4)
    setAccessCode(digits)
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚖</div>
          <h1 className="text-2xl font-bold">Deck Tracker</h1>
          <p className="text-[var(--muted)] mt-2">
            {step === "code" ? "Enter your 4-digit access code" : "Enter your name"}
          </p>
        </div>

        {step === "code" ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={accessCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="----"
              className="w-full text-center text-3xl tracking-[0.5em] py-4 px-6 bg-[var(--card)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
              autoFocus
            />
            {error && <p className="text-[var(--danger)] text-center text-sm">{error}</p>}
            <button
              type="submit"
              disabled={accessCode.length !== 4 || loading}
              className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {loading ? "Checking..." : "ACCESS"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Your name"
              className="w-full py-3 px-4 bg-[var(--card)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
              autoFocus
            />
            <button
              type="submit"
              disabled={!workerName.trim()}
              className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              START TRACKING
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("code")
                setAccessCode("")
              }}
              className="w-full py-2 text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
