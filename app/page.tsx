'use client'

import { useMemo, useState, useRef, DragEvent, ChangeEvent } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  FileCheck,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
  Layers,
  Award,
  BookOpen,
} from 'lucide-react'

type Analysis = {
  readiness_score: number
  summary: string
  start_here: string
  resume_strengths?: string[]
  missing_skills: { skill: string; priority: string; gap: string; why: string }[]
  roadmap: { phase: string; focus: string; outcome: string }[]
  resources: { title: string; provider: string; type: string; level: string; url: string; why: string }[]
}

type ParsedResume = {
  filename: string
  file_size: number
  word_count: number
  character_count: number
  detected_skills: string[]
  preview: string
  extracted_text: string
}

const POPULAR_SKILLS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'FastAPI',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'AWS',
  'Git / GitHub',
  'Machine Learning',
  'PyTorch',
  'Data Analysis',
  'Generative AI / LLMs',
  'System Design',
  'Tailwind CSS',
  'REST APIs',
]

export default function Page() {
  const [targetRole, setTargetRole] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const [skills, setSkills] = useState<string[]>(['Python', 'SQL'])
  const [customSkill, setCustomSkill] = useState('')
  const [skillLevel, setSkillLevel] = useState('Working knowledge')
  const [goal, setGoal] = useState('')
  const [hours, setHours] = useState('5–7 hours')
  const [timeline, setTimeline] = useState('3–6 months')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  // Resume Upload State
  const [resumeData, setResumeData] = useState<ParsedResume | null>(null)
  const [parsingResume, setParsingResume] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const progress = useMemo(() => {
    let score = 0
    if (targetRole) score += 20
    if (currentRole) score += 20
    if (skills.length > 0) score += 20
    if (goal) score += 20
    if (resumeData) score += 20
    return Math.min(100, score || 10)
  }, [targetRole, currentRole, skills, goal, resumeData])

  const toggleSkill = (skill: string) => {
    setSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    )
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
      setCustomSkill('')
    }
  }

  const handleAddAllDetectedSkills = () => {
    if (!resumeData?.detected_skills) return
    setSkills((current) => {
      const combined = new Set([...current, ...resumeData.detected_skills])
      return Array.from(combined)
    })
  }

  const removeResume = () => {
    setResumeData(null)
    setResumeError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle File Upload & Parsing
  const processResumeFile = async (file: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(fileExt)) {
      setResumeError('Please upload a .pdf, .docx, .doc, or .txt file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setResumeError('File size exceeds the 10MB limit.')
      return
    }

    setParsingResume(true)
    setResumeError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${base}/parse-resume`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to parse the uploaded resume.')
      }

      const data: ParsedResume = await response.json()
      setResumeData(data)
    } catch (err: any) {
      setResumeError(err.message || 'Error processing resume file.')
    } finally {
      setParsingResume(false)
    }
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0])
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0])
    }
  }

  async function analyze() {
    setError('')
    if (!targetRole || !currentRole || !goal || !skills.length) {
      setError('Complete the highlighted fields to generate your analysis.')
      return
    }
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const payload = {
        target_role: targetRole,
        current_role: currentRole,
        known_skills: skills,
        skill_level: skillLevel,
        learning_goal: goal,
        weekly_hours: hours,
        timeline: timeline,
        resume_text: resumeData?.extracted_text || null,
        resume_filename: resumeData?.filename || null,
      }

      const response = await fetch(`${base}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(
          errJson.detail ||
            'The analysis service could not respond. Check that the Python backend is running on port 8000.'
        )
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (caught: any) {
      setError(caught.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (analysis) {
    return (
      <Results
        analysis={analysis}
        resumeName={resumeData?.filename}
        onReset={() => setAnalysis(null)}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Compass size={19} />
          </div>
          <span className="font-mono text-base font-semibold tracking-tight">
            skillgap<span className="text-primary">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Live AI Career Intelligence</span>
          <CircleHelp size={16} />
        </div>
      </header>

      {/* Main Container */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[.85fr_1.15fr] lg:items-start lg:pt-10">
        {/* Left Column: Value Proposition */}
        <div className="lg:sticky lg:top-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={14} /> Powered by Gemini 2.5 & Resume Intelligence
          </div>
          <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
            Know what to learn <span className="text-primary">next.</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload your resume or enter your background. We compare your actual experience against real-world 2026 job market demands and generate an actionable, gap-closing roadmap.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['AM', 'SK', 'JR', 'DV'].map((initials) => (
                <div
                  key={initials}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-secondary font-mono text-[10px] text-muted-foreground"
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">3,200+ professionals</span> mapped their career pivot
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">1-Click</p>
              <p className="mt-1 text-xs text-muted-foreground">Smart resume skill extraction</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">10×</p>
              <p className="mt-1 text-xs text-muted-foreground">More targeted career roadmap</p>
            </div>
          </div>
        </div>

        {/* Right Column: Assessment Form */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/20 sm:p-7">
          {/* Form Progress Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">
                Your Profile
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                Map your personalized gap analysis
              </h2>
            </div>
            <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {progress}% complete
            </span>
          </div>

          <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-6">
            {/* 🧩 FEATURE 1: Smart Resume Parser & Skill Extractor */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">
                    Smart Resume Parser & Skill Extractor
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-primary/80 uppercase tracking-wider">
                  Optional & Recommended
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                Upload your resume to let AI automatically extract your skills, analyze your project history, and tailor advice specifically to your background.
              </p>

              {/* Upload Dropzone */}
              {!resumeData ? (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/10 shadow-inner'
                      : 'border-border/80 bg-secondary/20 hover:border-primary/60 hover:bg-secondary/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={onFileChange}
                    className="hidden"
                  />

                  {parsingResume ? (
                    <div className="flex flex-col items-center py-2">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="mt-3 text-sm font-medium text-foreground">
                        Parsing resume & identifying skills...
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Running deep keyword & layout extraction
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <UploadCloud size={22} />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        <span className="text-primary underline-offset-4 hover:underline">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Supports <span className="text-foreground">.pdf, .docx, .doc, .txt</span> up to 10MB
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Parsed Resume Info Box */
                <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <FileCheck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{resumeData.filename}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{(resumeData.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="font-mono text-primary font-semibold">
                            {resumeData.word_count} words analyzed
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeResume}
                      title="Remove resume"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Detected Skills Section */}
                  <div className="mt-3 border-t border-border/80 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Detected Skills ({resumeData.detected_skills.length})
                      </p>
                      {resumeData.detected_skills.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAddAllDetectedSkills}
                          className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                        >
                          <Plus size={13} /> Add all to your skills
                        </button>
                      )}
                    </div>

                    {resumeData.detected_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {resumeData.detected_skills.map((skill) => {
                          const isAlreadySelected = skills.includes(skill)
                          return (
                            <button
                              type="button"
                              key={skill}
                              onClick={() => toggleSkill(skill)}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                                isAlreadySelected
                                  ? 'bg-primary/20 text-primary border border-primary/40'
                                  : 'bg-secondary text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground'
                              }`}
                            >
                              {isAlreadySelected ? <Check size={11} /> : <Plus size={11} />}
                              {skill}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No standard technologies automatically matched from text. You can select or type them below.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {resumeError && (
                <p className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
                  {resumeError}
                </p>
              )}
            </div>

            {/* Target Role & Current Role */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="What role are you targeting?" hint="Specific title">
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer / AI Engineer"
                />
              </Field>

              <Field label="Where are you starting from?" hint="Current level">
                <input
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. Junior Dev, CS Student, Career Switcher"
                />
              </Field>
            </div>

            {/* Known Skills Selector */}
            <Field
              label={`What skills do you know? (${skills.length} selected)`}
              hint="Click to toggle or add your own"
            >
              <div className="space-y-3">
                {/* Popular Skill Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {POPULAR_SKILLS.map((skill) => {
                    const isSelected = skills.includes(skill)
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary font-medium'
                            : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {isSelected && <Check className="mr-1 inline" size={12} />}
                        {skill}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                    placeholder="Type custom skill and press Enter..."
                    className="text-xs"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={!customSkill.trim()}
                    className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Custom/Extra Skills tags if any not in popular */}
                {skills.filter((s) => !POPULAR_SKILLS.includes(s)).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">Custom:</span>
                    {skills
                      .filter((s) => !POPULAR_SKILLS.includes(s))
                      .map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => toggleSkill(s)}
                            className="hover:text-destructive"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </Field>

            {/* Proficiency & Available Time */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="How would you rate yourself?">
                <Select
                  value={skillLevel}
                  onChange={setSkillLevel}
                  options={['Beginner', 'Working knowledge', 'Confident', 'Advanced']}
                />
              </Field>

              <Field label="Time available each week">
                <Select
                  value={hours}
                  onChange={setHours}
                  options={['1–3 hours', '5–7 hours', '8–12 hours', '12+ hours']}
                />
              </Field>
            </div>

            {/* Learning Goal & Target Timeline */}
            <Field label="What does success look like?" hint="Your motivation shapes the roadmap">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Land my first AI/Full-Stack role at a tech startup within 4 months"
                rows={3}
              />
            </Field>

            <Field label="Your target timeline">
              <Select
                value={timeline}
                onChange={setTimeline}
                options={['1–3 months', '3–6 months', '6–12 months', 'Exploring']}
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={analyze}
              disabled={loading || parsingResume}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={17} /> Building your personalized roadmap...
                </>
              ) : (
                <>
                  Analyze my skill gap {resumeData && 'with resume'} <ArrowRight size={17} />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Your resume data is processed securely in memory and used exclusively to generate your analysis.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-muted-foreground" size={16} />
    </div>
  )
}

function Results({
  analysis,
  resumeName,
  onReset,
}: {
  analysis: Analysis
  resumeName?: string
  onReset: () => void
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Compass size={19} />
          </div>
          <span className="font-mono text-base font-semibold">
            skillgap<span className="text-primary">.ai</span>
          </span>
        </div>
        <button
          onClick={onReset}
          className="rounded-lg border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          ← Start new analysis
        </button>
      </header>

      {/* Results Content */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        {/* Top Intelligence Banner */}
        <div className="mb-8 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs uppercase tracking-[.18em] text-primary">
              Your Intelligence Brief
            </span>
            {resumeName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <FileCheck size={12} /> Tailored to {resumeName}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">
            Your next move is mapped.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {analysis.summary}
          </p>
        </div>

        {/* Readiness Score & Priority Gaps */}
        <div className="grid gap-6 md:grid-cols-[.85fr_1.15fr]">
          {/* Readiness Score Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary/10 p-6 shadow-xl shadow-primary/5">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Role Readiness Index
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-mono text-6xl font-bold text-primary">
                      {analysis.readiness_score}
                    </span>
                    <span className="text-2xl font-bold text-primary">%</span>
                  </div>
                </div>
                <div className="rounded-full bg-primary/20 p-2.5 text-primary">
                  <TrendingUp size={22} />
                </div>
              </div>

              {/* Resume strengths if available */}
              {analysis.resume_strengths && analysis.resume_strengths.length > 0 && (
                <div className="mt-6 rounded-lg bg-background/50 border border-primary/20 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
                    <Award size={14} /> Resume Strengths Identified
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {analysis.resume_strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-primary/20 pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                Immediate Action Item
              </p>
              <p className="mt-1.5 text-sm leading-relaxed font-medium text-foreground">
                {analysis.start_here}
              </p>
            </div>
          </div>

          {/* Priority Skill Gaps */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-primary" size={20} />
              <h2 className="font-semibold text-base">Priority Skill Gaps to Close</h2>
            </div>

            <div className="space-y-3.5">
              {analysis.missing_skills.map((gap) => (
                <div
                  key={gap.skill}
                  className="rounded-lg border border-border/80 bg-secondary/30 p-3.5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{gap.skill}</h3>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        gap.priority.toLowerCase() === 'critical'
                          ? 'bg-destructive/15 text-destructive border border-destructive/30'
                          : gap.priority.toLowerCase() === 'high'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-primary/15 text-primary border border-primary/30'
                      }`}
                    >
                      {gap.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground/90 font-medium">{gap.gap}</span> — {gap.why}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Roadmap & Curated Resources */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Roadmap Sequence */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="text-primary" size={20} />
              <h2 className="font-semibold text-base">Your Step-by-Step Learning Sequence</h2>
            </div>

            <div className="space-y-4">
              {analysis.roadmap.map((phase, index) => (
                <div key={phase.phase} className="flex gap-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-bold text-primary border border-primary/30">
                    {index + 1}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 w-full">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                      {phase.phase}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">{phase.focus}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground/80">Target Milestone:</span>{' '}
                      {phase.outcome}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Curated Resources */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="text-primary" size={20} />
              <h2 className="font-semibold text-base">Recommended Resources</h2>
            </div>

            <div className="space-y-3.5">
              {analysis.resources.map((resource) => (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  key={resource.title}
                  className="group block rounded-xl border border-border bg-secondary/20 p-4 transition-all hover:border-primary/60 hover:bg-secondary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {resource.title}
                    </h3>
                    <ArrowRight
                      size={14}
                      className="shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all mt-0.5"
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{resource.provider}</span>
                    <span>•</span>
                    <span className="capitalize">{resource.type}</span>
                    <span>•</span>
                    <span>{resource.level}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {resource.why}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
