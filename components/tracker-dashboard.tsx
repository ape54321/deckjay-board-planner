"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, LogOut, Download, Play, Square, Clock, Edit2, Archive, Trash2 } from "lucide-react"
import { JobSelector } from "@/components/job-selector"
import { ManageJobsModal } from "@/components/manage-jobs-modal"

interface WorkEntry {
  id: string
  date: string
  start_time: string
  end_time: string
  category: string
  hourly_rate: number
  notes: string | null
  total_hours: number
  earned_amount: number
  job_name: string | null
  worker: string | null
  archived: boolean
}

interface TrackerDashboardProps {
  worklogId: string
  workerName: string
  isAdmin: boolean
  onLogout: () => void
}

const CATEGORIES = [
  "Set up",
  "Demo",
  "Framing",
  "Decking",
  "Railing kit",
  "Stairs",
  "Clean up",
  "Footings",
  "Other",
]

export function TrackerDashboard({ worklogId, workerName, isAdmin, onLogout }: TrackerDashboardProps) {
  const [entries, setEntries] = useState<WorkEntry[]>([])
  const [jobs, setJobs] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active")
  const [viewMode, setViewMode] = useState<"my" | "overview" | "all" | "payroll">("my")

  // Timer state
  const [timerJobName, setTimerJobName] = useState("")
  const [timerCategory, setTimerCategory] = useState(CATEGORIES[0])
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)

  // Manual entry state
  const [manualJobName, setManualJobName] = useState("")
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0])
  const [manualRate, setManualRate] = useState(25)
  const [manualNotes, setManualNotes] = useState("")
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0])
  const [manualStartTime, setManualStartTime] = useState("09:00")
  const [manualEndTime, setManualEndTime] = useState("17:00")

  const supabase = createClient()

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
    
    if (data) {
      setJobs(data)
    }
  }, [])

  const loadEntries = useCallback(async () => {
    let query = supabase
      .from("work_entries")
      .select("*")
      .eq("worklog_id", worklogId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })

    if (!isAdmin && viewMode === "my") {
      query = query.eq("worker", workerName)
    }

    if (activeTab === "active") {
      query = query.eq("archived", false)
    } else {
      query = query.eq("archived", true)
    }

    const { data, error } = await query

    if (data) {
      setEntries(data)
    }
    setLoading(false)
  }, [worklogId, workerName, isAdmin, viewMode, activeTab])

  useEffect(() => {
    loadJobs()
    loadEntries()
  }, [loadJobs, loadEntries])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timerStart) {
      interval = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - timerStart.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timerStart])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startTimer = () => {
    if (!timerJobName) {
      alert("Please select or enter a job name")
      return
    }
    setTimerStart(new Date())
    setIsTimerRunning(true)
  }

  const stopTimer = async () => {
    if (!timerStart) return

    const endTime = new Date()
    const totalHours = (endTime.getTime() - timerStart.getTime()) / (1000 * 60 * 60)

    const { error } = await supabase.from("work_entries").insert({
      worklog_id: worklogId,
      worker: workerName,
      job_name: timerJobName,
      date: timerStart.toISOString().split("T")[0],
      start_time: timerStart.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5),
      category: timerCategory,
      hourly_rate: 0,
      total_hours: parseFloat(totalHours.toFixed(2)),
      earned_amount: 0,
    })

    if (!error) {
      setIsTimerRunning(false)
      setTimerStart(null)
      setTimerElapsed(0)
      loadEntries()
    }
  }

  const addManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualJobName) {
      alert("Please select or enter a job name")
      return
    }

    const start = new Date(`${manualDate}T${manualStartTime}`)
    const end = new Date(`${manualDate}T${manualEndTime}`)
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    const { error } = await supabase.from("work_entries").insert({
      worklog_id: worklogId,
      worker: workerName,
      job_name: manualJobName,
      date: manualDate,
      start_time: manualStartTime,
      end_time: manualEndTime,
      category: manualCategory,
      hourly_rate: manualRate,
      total_hours: parseFloat(totalHours.toFixed(2)),
      earned_amount: parseFloat((totalHours * manualRate).toFixed(2)),
      notes: manualNotes || null,
    })

    if (!error) {
      setManualNotes("")
      loadEntries()
    }
  }

  const archiveEntry = async (id: string) => {
    await supabase
      .from("work_entries")
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq("id", id)
    loadEntries()
  }

  const handleJobAdded = () => {
    loadJobs()
    setShowAddJob(false)
  }

  const exportCSV = () => {
    const headers = ["Worker", "Date", "Start", "End", "Hours", "Category", "Rate", "Earned", "Job", "Notes"]
    const rows = entries.map(e => [
      e.worker || "",
      e.date,
      e.start_time,
      e.end_time,
      e.total_hours.toFixed(2),
      e.category,
      `$${e.hourly_rate.toFixed(2)}`,
      `$${e.earned_amount.toFixed(2)}`,
      e.job_name || "",
      e.notes || "",
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `deck-tracker-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--card-border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              {isAdmin ? "Boss Mode" : workerName}
            </h1>
            {isAdmin && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-[var(--primary)] rounded">
                ADMIN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* View Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode("my")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "my"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--card)] hover:bg-[var(--card-border)]"
            }`}
          >
            My Time
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setViewMode("overview")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "overview"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] hover:bg-[var(--card-border)]"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "all"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] hover:bg-[var(--card-border)]"
                }`}
              >
                All Entries
              </button>
              <button
                onClick={() => setViewMode("payroll")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "payroll"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] hover:bg-[var(--card-border)]"
                }`}
              >
                Payroll
              </button>
            </>
          )}
        </div>

        {/* Timer Section */}
        <section className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Timer
          </h2>
          <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto]">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Job Name</label>
<JobSelector
                  jobs={jobs}
                  value={timerJobName}
                  onChange={setTimerJobName}
                  onManageJobs={() => setShowAddJob(true)}
                  disabled={isTimerRunning}
                />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Category</label>
              <select
                value={timerCategory}
                onChange={(e) => setTimerCategory(e.target.value)}
                disabled={isTimerRunning}
                className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              {isTimerRunning ? (
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-2 px-6 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded-lg font-semibold transition-colors"
                >
                  <Square size={16} />
                  Stop ({formatTime(timerElapsed)})
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] hover:opacity-90 rounded-lg font-semibold transition-colors"
                >
                  <Play size={16} />
                  Start Timer
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Manual Entry Section */}
        <section className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Log Entry Manually</h2>
          <form onSubmit={addManualEntry} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Job Name</label>
<JobSelector
                    jobs={jobs}
                    value={manualJobName}
                    onChange={setManualJobName}
                    onManageJobs={() => setShowAddJob(true)}
                  />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Rate ($/hr)</label>
                <input
                  type="number"
                  value={manualRate}
                  onChange={(e) => setManualRate(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Start Time</label>
                <input
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">End Time</label>
                <input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Notes</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full py-2 px-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-semibold transition-colors"
            >
              Add Entry
            </button>
          </form>
        </section>

        {/* Entries Table */}
        <section className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {viewMode === "my" ? "My Time Entries" : "All Time Entries"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === "active"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--background)] hover:bg-[var(--card-border)]"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === "archived"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--background)] hover:bg-[var(--card-border)]"
                }`}
              >
                Archived
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--background)]">
                <tr className="text-left text-sm text-[var(--muted)]">
                  {isAdmin && <th className="px-4 py-3">Worker</th>}
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-[var(--muted)]">
                      Loading...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-[var(--muted)]">
                      No entries found
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--background)]">
                      {isAdmin && <td className="px-4 py-3">{entry.worker}</td>}
                      <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3">{entry.total_hours.toFixed(2)}</td>
                      <td className="px-4 py-3">{entry.category}</td>
                      <td className="px-4 py-3">${entry.hourly_rate.toFixed(2)}</td>
                      <td className="px-4 py-3">${entry.earned_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{entry.job_name || "-"}</td>
                      <td className="px-4 py-3">
                        {!entry.archived && (
                          <button
                            onClick={() => archiveEntry(entry.id)}
                            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

{/* Manage Jobs Modal */}
        {showAddJob && (
          <ManageJobsModal
            jobs={jobs}
            onClose={() => setShowAddJob(false)}
            onJobsChanged={handleJobAdded}
          />
        )}
    </div>
  )
}
