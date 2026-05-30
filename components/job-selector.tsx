"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, ChevronDown } from "lucide-react"

interface Job {
  id: string
  name: string
}

interface JobSelectorProps {
  jobs: Job[]
  value: string
  onChange: (value: string) => void
  onAddNew: () => void
  disabled?: boolean
}

export function JobSelector({ jobs, value, onChange, onAddNew, disabled }: JobSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredJobs = jobs.filter((job) =>
    job.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    setIsOpen(true)
  }

  const handleSelectJob = (jobName: string) => {
    setInputValue(jobName)
    onChange(jobName)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            placeholder="Select or enter job name..."
            className="w-full py-2 px-3 pr-8 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          disabled={disabled}
          className="flex items-center justify-center w-10 h-10 bg-[var(--accent)] hover:opacity-90 rounded-lg transition-colors disabled:opacity-50"
          title="Add new client/job"
        >
          <Plus size={20} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-10 mt-1 max-h-48 overflow-y-auto bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl">
          {filteredJobs.length === 0 ? (
            <div className="px-3 py-2 text-[var(--muted)] text-sm">
              {inputValue ? "No matching jobs found" : "No jobs available"}
            </div>
          ) : (
            filteredJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => handleSelectJob(job.name)}
                className={`w-full text-left px-3 py-2 hover:bg-[var(--background)] transition-colors ${
                  job.name === value ? "bg-[var(--background)] text-[var(--accent)]" : ""
                }`}
              >
                {job.name}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onAddNew()
            }}
            className="w-full text-left px-3 py-2 border-t border-[var(--card-border)] text-[var(--accent)] hover:bg-[var(--background)] transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add new client/job
          </button>
        </div>
      )}
    </div>
  )
}
