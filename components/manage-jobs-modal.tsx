"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Plus, Trash2, AlertTriangle } from "lucide-react"

interface Job {
  id: string
  name: string
}

interface ManageJobsModalProps {
  jobs: Job[]
  onClose: () => void
  onJobsChanged: () => void
}

export function ManageJobsModal({ jobs, onClose, onJobsChanged }: ManageJobsModalProps) {
  const [newJobName, setNewJobName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null)

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = newJobName.trim()
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

    setNewJobName("")
    onJobsChanged()
  }

  const handleDeleteJob = async (job: Job) => {
    setDeletingId(job.id)
    setError("")

    const supabase = createClient()
    
    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .eq("id", job.id)

    setDeletingId(null)
    setConfirmDelete(null)

    if (deleteError) {
      setError(`Failed to delete "${job.name}": ${deleteError.message}`)
      return
    }

    onJobsChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold">Manage Clients/Jobs</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--background)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Add New Job Form */}
          <form onSubmit={handleAddJob} className="flex gap-2">
            <input
              type="text"
              value={newJobName}
              onChange={(e) => {
                setNewJobName(e.target.value)
                setError("")
              }}
              placeholder="Add new client/job name..."
              className="flex-1 py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={loading || !newJobName.trim()}
              className="flex items-center gap-2 py-2 px-4 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              <Plus size={18} />
              Add
            </button>
          </form>

          {error && (
            <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Jobs List */}
          <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--muted)]">
                  No clients/jobs yet. Add one above.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--card-border)]">
                  {jobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[var(--background)] transition-colors"
                    >
                      <span className="font-medium">{job.name}</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(job)}
                        disabled={deletingId === job.id}
                        className="p-2 text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors disabled:opacity-50"
                        title={`Delete ${job.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Deleting a client/job will hide it from the dropdown but preserve existing time entries.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 bg-[var(--background)] border border-[var(--card-border)] rounded-lg font-medium hover:bg-[var(--card-border)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-[var(--danger)]/10 rounded-lg">
                <AlertTriangle size={20} className="text-[var(--danger)]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Delete Client/Job?</h3>
                <p className="text-sm text-[var(--muted)]">
                  Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This will hide it from dropdowns but existing time entries will be preserved.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 px-4 bg-[var(--background)] border border-[var(--card-border)] rounded-lg font-medium hover:bg-[var(--card-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJob(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2 px-4 bg-[var(--danger)] hover:opacity-90 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {deletingId === confirmDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
