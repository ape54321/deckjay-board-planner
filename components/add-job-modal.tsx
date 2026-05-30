"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"

interface AddJobModalProps {
  onClose: () => void
  onJobAdded: () => void
}

export function AddJobModal({ onClose, onJobAdded }: AddJobModalProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Please enter a client/job name")
      return
    }

    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from("jobs")
      .insert({ name: trimmedName })

    setLoading(false)

    if (insertError) {
      if (insertError.code === "23505") {
        setError("A client/job with this name already exists")
      } else {
        setError(insertError.message || "Failed to add client/job")
      }
      return
    }

    onJobAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold">Add New Client/Job</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">
              Client/Job Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              placeholder="Enter client or job name..."
              className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-[var(--background)] border border-[var(--card-border)] rounded-lg font-medium hover:bg-[var(--card-border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? "Adding..." : "Add Client/Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
