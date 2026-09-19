'use client'

import { useMemo, useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
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
  User,
  Lightbulb,
  GraduationCap,
  PlayCircle,
  Video,
  Clock,
  ExternalLink,
  Calendar,
  Repeat,
  Network,
  LayoutDashboard,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  Code2,
  Zap,
} from 'lucide-react'

function YouTubeIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

type Analysis = {
  readiness_score: number
  summary: string
  start_here: string
  resume_strengths?: string[]
  personalized_tip?: string
  missing_skills: { skill: string; priority: string; gap: string; why: string }[]
  roadmap: { phase: string; focus: string; outcome: string }[]
  resources: { title: string; provider: string; type: string; level: string; url: string; why: string }[]
  youtube_masterclasses?: {
    title: string
    channel: string
    duration: string
    search_query: string
    focus_topic: string
    why: string
  }[]
  mind_map?: {
    pillars: {
      category: string
      skills: { name: string; type: string; description: string }[]
    }[]
  }
  study_plan?: {
    weekly_hours_allocated?: string
    schedule: {
      day: string
      session_type: string
      duration: string
      focus: string
      actionable_deliverable: string
    }[]
    pro_tip?: string
  }
  spaced_repetition?: {
    framework: {
      stage: string
      technique: string
      feynman_prompt: string
      blank_screen_challenge: string
    }[]
  }
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
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'FastAPI',
  'SQL', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Git / GitHub', 'Machine Learning',
  'PyTorch', 'Data Analysis', 'Generative AI / LLMs', 'System Design', 'Tailwind CSS', 'REST APIs',
]

const LEARNING_STYLES = [
  '🛠️ Hands-on Projects',
  '📹 Video Tutorials',
  '📚 Official Docs & Books',
  '🧩 Interactive Coding',
  '👥 Mentorship & Cohorts',
]

const CONTEXT_TAGS = [
  '💼 Working Full-Time',
  '🎓 College / University Student',
  '🔄 Career Switcher',
  '🆓 Free Resources Only',
  '⚡ Fast-Track Interview Prep',
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
  
  // "About You" & Learning Preferences State
  const [aboutYou, setAboutYou] = useState('')
  const [learningStyle, setLearningStyle] = useState('🛠️ Hands-on Projects')
  const [selectedContextTags, setSelectedContextTags] = useState<string[]>(['💼 Working Full-Time'])

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
    if (currentRole) score += 15
    if (skills.length > 0) score += 20
    if (goal) score += 15
    if (aboutYou) score += 15
    if (resumeData) score += 15
    return Math.min(100, score || 10)
  }, [targetRole, currentRole, skills, goal, aboutYou, resumeData])

  const toggleSkill = (skill: string) => {
    setSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    )
  }

  const toggleContextTag = (tag: string) => {
    setSelectedContextTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
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
      const endpoints = [
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        'http://127.0.0.1:8000',
      ]

      let response: Response | null = null

      for (const base of endpoints) {
        try {
          response = await fetch(`${base}/parse-resume`, {
            method: 'POST',
            body: formData,
          })
          if (response.ok) break
        } catch {
          // continue
        }
      }

      if (!response || !response.ok) {
        if (response) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Failed to parse the uploaded resume.')
        }

        // Text fallback
        if (fileExt === '.txt') {
          const rawText = await file.text()
          const words = rawText.match(/\b\w+\b/g) || []
          const lower = rawText.toLowerCase()
          const detected = POPULAR_SKILLS.filter((s) => lower.includes(s.toLowerCase()))
          setResumeData({
            filename: file.name,
            file_size: file.size,
            word_count: words.length,
            character_count: rawText.length,
            detected_skills: detected,
            preview: rawText.slice(0, 300),
            extracted_text: rawText.slice(0, 25000),
          })
          return
        }

        throw new Error(
          'Could not reach backend API at http://localhost:8000. Please make sure the FastAPI backend window is running.'
        )
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
      const endpoints = [
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        'http://127.0.0.1:8000',
      ]

      const combinedAboutYou = [
        aboutYou.trim(),
        selectedContextTags.length > 0 ? `Situation / Constraints: ${selectedContextTags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      const payload = {
        target_role: targetRole,
        current_role: currentRole,
        known_skills: skills,
        skill_level: skillLevel,
        learning_goal: goal,
        weekly_hours: hours,
        timeline: timeline,
        about_you: combinedAboutYou || null,
        learning_style: learningStyle,
        resume_text: resumeData?.extracted_text || null,
        resume_filename: resumeData?.filename || null,
      }

      let response: Response | null = null

      for (const base of endpoints) {
        try {
          response = await fetch(`${base}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (response.ok) break
        } catch {
          // continue fallback
        }
      }

      if (!response || !response.ok) {
        if (response) {
          const errJson = await response.json().catch(() => ({}))
          throw new Error(errJson.detail || 'The analysis service encountered an issue.')
        }
        throw new Error(
          'Could not reach the backend server at http://localhost:8000. Please ensure the backend is running.'
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
        learningStyle={learningStyle}
        targetRole={targetRole}
        onReset={() => setAnalysis(null)}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Universal Top Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Compass size={19} />
          </div>
          <span className="font-mono text-base font-semibold tracking-tight">
            skillgap<span className="text-primary">.ai</span>
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"
          >
            <Layers size={13} /> Career Pivot Roadmap
          </Link>
          <Link
            href="/job-match"
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Zap size={13} /> Live Job Match & Diff Engine
            <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[9px] font-bold">
              NEW
            </span>
          </Link>
        </nav>
      </header>

      {/* Main Container */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-4 lg:grid-cols-[.85fr_1.15fr] lg:items-start lg:pt-8">
        {/* Left Column: Hero & Insights */}
        <div className="lg:sticky lg:top-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={14} /> AI Tailored to Who You Are & Where You Want to Go
          </div>
          <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
            Know what to learn <span className="text-primary">next.</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Tell the AI about your unique journey, upload your resume, and get an interactive modular roadmap, domain mind map, YouTube masterclasses, and active recall plan.
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
              <span className="font-medium text-foreground">3,200+ learners</span> found clarity
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">Interactive</p>
              <p className="mt-1 text-xs text-muted-foreground">Mind map, masterclasses & study plan</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">1-Click</p>
              <p className="mt-1 text-xs text-muted-foreground">Resume parser & auto-fill</p>
            </div>
          </div>
        </div>

        {/* Right Column: Assessment Form */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/20 sm:p-7">
          {/* Form Progress Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">
                Your Assessment
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                Map your next career chapter
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
            {/* 👤 "About You" & Personal Context Section */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="text-primary" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">
                    About You & Personal Context
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-primary/80 uppercase tracking-wider">
                  Personalizes AI
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
                The more context you share about your story, strengths, and daily routine, the more actionable and empathetic your AI roadmap will be.
              </p>

              <Field label="Tell the AI about your background & situation">
                <textarea
                  value={aboutYou}
                  onChange={(e) => setAboutYou(e.target.value)}
                  placeholder="e.g. I have 2 years experience in QA and want to switch to AI engineering. I learn best by coding hands-on projects rather than long theory. I work full-time so my study time is concentrated on weekends."
                  rows={3}
                />
              </Field>

              {/* Learning Style Chips */}
              <div className="mt-4">
                <label className="block mb-2 text-xs font-medium text-foreground">
                  How do you learn best?
                </label>
                <div className="flex flex-wrap gap-2">
                  {LEARNING_STYLES.map((style) => (
                    <button
                      type="button"
                      key={style}
                      onClick={() => setLearningStyle(style)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        learningStyle === style
                          ? 'border-primary bg-primary/20 text-primary shadow-sm'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context / Situation Tags */}
              <div className="mt-4">
                <label className="block mb-2 text-xs font-medium text-foreground">
                  Your current situation / constraints
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTEXT_TAGS.map((tag) => {
                    const isSelected = selectedContextTags.includes(tag)
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleContextTag(tag)}
                        className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
                          isSelected
                            ? 'bg-primary/20 text-primary border border-primary/40 font-medium'
                            : 'bg-secondary/40 text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 🧩 Smart Resume Parser & Skill Extractor */}
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={18} />
                  <h3 className="text-sm font-semibold text-foreground">
                    Smart Resume Parser & Skill Extractor
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  Optional
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
                Upload your resume (.pdf, .docx, .doc, .txt up to 10MB) for instant skill extraction and deep resume-aligned gap analysis.
              </p>

              {/* Upload Dropzone */}
              {!resumeData ? (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
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
                      <Loader2 className="animate-spin text-primary" size={28} />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Extracting resume text & skills...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <UploadCloud size={20} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-foreground">
                        <span className="text-primary underline-offset-4 hover:underline">
                          Click to upload resume
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Supports PDF, DOCX, DOC, TXT (up to 10MB)
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Parsed Resume Info Box */
                <div className="space-y-3 rounded-lg border border-border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <FileCheck size={18} />
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
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Detected Skills */}
                  <div className="border-t border-border/80 pt-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Detected Technologies ({resumeData.detected_skills.length})
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
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
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
                        No standard technologies automatically matched. You can select them below.
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
                  placeholder="e.g. Senior AI Engineer / Product Data Analyst"
                />
              </Field>

              <Field label="Where are you starting from?" hint="Current background">
                <input
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. Backend Dev, Student, QA Engineer"
                />
              </Field>
            </div>

            {/* Custom Skills Section */}
            <Field
              label={`Your Known Skills (${skills.length})`}
              hint="Add custom skills or auto-populate from resume"
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                    placeholder="Type a skill (e.g. React, Python, Docker, PyTorch) and press Enter..."
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={!customSkill.trim()}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={14} /> Add Skill
                  </button>
                </div>

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border/80 bg-secondary/20 p-3">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          title={`Remove ${skill}`}
                          className="rounded-full p-0.5 text-primary/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    No skills added yet. Type a skill above or click &ldquo;+ Add all to your skills&rdquo; after uploading a resume.
                  </p>
                )}
              </div>
            </Field>

            {/* Proficiency & Weekly Time */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="How would you rate yourself?">
                <CustomDropdown
                  value={skillLevel}
                  onChange={setSkillLevel}
                  options={[
                    { label: 'Beginner', value: 'Beginner', hint: 'Learning syntax & foundational principles' },
                    { label: 'Working knowledge', value: 'Working knowledge', hint: 'Can build functional features & components' },
                    { label: 'Confident', value: 'Confident', hint: 'Independent debugging & problem solving' },
                    { label: 'Advanced', value: 'Advanced', hint: 'System design, scale & architecture mastery' },
                  ]}
                />
              </Field>

              <Field label="Time available each week">
                <CustomDropdown
                  value={hours}
                  onChange={setHours}
                  options={[
                    { label: '1–3 hours', value: '1–3 hours', hint: 'Casual exploratory pace' },
                    { label: '5–7 hours', value: '5–7 hours', hint: 'Balanced & steady progress (Recommended)' },
                    { label: '8–12 hours', value: '8–12 hours', hint: 'Accelerated career transition sprint' },
                    { label: '12+ hours', value: '12+ hours', hint: 'Full-time immersion commitment' },
                  ]}
                />
              </Field>
            </div>

            {/* Goal & Target Timeline */}
            <Field label="What does success look like?" hint="Your motivation shapes the sequence">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Land my first full-stack AI role at a tech startup within 4 months"
                rows={3}
              />
            </Field>

            <Field label="Your target timeline">
              <CustomDropdown
                value={timeline}
                onChange={setTimeline}
                options={[
                  { label: '1–3 months', value: '1–3 months', hint: 'Fast-track interview readiness' },
                  { label: '3–6 months', value: '3–6 months', hint: 'Optimal deep-mastery & portfolio window' },
                  { label: '6–12 months', value: '6–12 months', hint: 'Comprehensive structured transition' },
                  { label: 'Exploring', value: 'Exploring', hint: 'Auditing gaps & tech landscape' },
                ]}
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
                  <Loader2 className="animate-spin" size={17} /> Tailoring your AI career roadmap...
                </>
              ) : (
                <>
                  Generate my personalized analysis <ArrowRight size={17} />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Your information is processed securely in memory and used exclusively to generate your analysis.
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

type DropdownOption = {
  label: string
  value: string
  hint?: string
}

function CustomDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: (string | DropdownOption)[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  )

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || normalizedOptions[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-sm transition-all duration-150 ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/5 bg-secondary/50 text-foreground'
            : 'border-border/80 bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/45'
        }`}
      >
        <span className="font-medium truncate">{selectedOption?.label || value}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ml-2 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/90 bg-card/98 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {normalizedOptions.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-primary/15 font-semibold text-primary'
                      : 'text-foreground hover:bg-secondary/70 hover:text-foreground'
                  }`}
                >
                  <div className="pr-2">
                    <p className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </p>
                    {option.hint && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                        {option.hint}
                      </p>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   RESULTS VIEW: TABBED SECTION SWITCHER NAVIGATION
========================================================================= */

type TabType = 'overview' | 'roadmap' | 'mindmap' | 'youtube' | 'schedule' | 'spaced' | 'resources'

function Results({
  analysis,
  resumeName,
  learningStyle,
  targetRole,
  onReset,
}: {
  analysis: Analysis
  resumeName?: string
  learningStyle?: string
  targetRole?: string
  onReset: () => void
}) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview & Gaps', icon: <LayoutDashboard size={15} /> },
    { id: 'roadmap', label: 'Adaptive Roadmap', icon: <Layers size={15} />, badge: `${analysis.roadmap.length} Phases` },
    { id: 'mindmap', label: 'Domain Mind Map', icon: <Network size={15} /> },
    { id: 'youtube', label: 'YouTube Masterclasses', icon: <YouTubeIcon size={15} />, badge: `${analysis.youtube_masterclasses?.length || 0}` },
    { id: 'schedule', label: 'Study Schedule', icon: <Calendar size={15} /> },
    { id: 'spaced', label: 'Active Recall (5-Stage)', icon: <Repeat size={15} /> },
    { id: 'resources', label: 'Docs & Resources', icon: <BookOpen size={15} /> },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Compass size={19} />
          </div>
          <span className="font-mono text-base font-semibold">
            skillgap<span className="text-primary">.ai</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary"
            >
              <Layers size={12} /> Roadmap
            </Link>
            <Link
              href="/job-match"
              className="flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Zap size={12} /> Live Job Match
            </Link>
          </nav>
          <button
            onClick={onReset}
            className="rounded-lg border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            ← Start new assessment
          </button>
        </div>
      </header>

      {/* Hero Intelligence Header */}
      <div className="bg-gradient-to-b from-primary/[0.04] to-transparent border-b border-border/30">
        <section className="mx-auto max-w-6xl px-6 pt-8 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs uppercase tracking-[.18em] text-primary">
              Your Intelligence Brief
            </span>
            {targetRole && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <Target size={12} /> Target: {targetRole}
              </span>
            )}
            {resumeName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <FileCheck size={12} /> Resume: {resumeName}
              </span>
            )}
            {learningStyle && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <GraduationCap size={12} /> {learningStyle}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] sm:text-3xl lg:text-4xl">
            Your personalized career pivot roadmap
          </h1>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-3xl">
            {analysis.summary}
          </p>

          {/* Personalized Tip */}
          {analysis.personalized_tip && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 sm:p-4 flex items-start gap-3 shadow-lg shadow-primary/5">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                <Lightbulb size={16} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-primary">Tailored Advisor Note For You</h3>
                <p className="mt-0.5 text-xs text-foreground/90 leading-relaxed">
                  {analysis.personalized_tip}
                </p>
              </div>
            </div>
          )}

          {/* 🔘 TOP SECTION SWITCHER (TABS BAR) */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                      : 'border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* Main Tab Viewport */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* =========================================================================
            TAB 1: OVERVIEW & READINESS & PRIORITY GAPS
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="text-primary" size={20} />
                    <h2 className="font-semibold text-base">Priority Skill Gaps to Close</h2>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {analysis.missing_skills.length} Target Gaps
                  </span>
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
          </div>
        )}

        {/* =========================================================================
            TAB 2: ADAPTIVE ROADMAP
        ========================================================================= */}
        {activeTab === 'roadmap' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Layers className="text-primary" size={20} />
                <h2 className="font-semibold text-lg">Multi-Phase Structured Curriculum</h2>
              </div>
              <span className="font-mono text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                Sequence for your hours & timeline
              </span>
            </div>

            <div className="space-y-5">
              {analysis.roadmap.map((phase, index) => (
                <div key={phase.phase} className="flex gap-4 sm:gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                      {index + 1}
                    </div>
                    {index < analysis.roadmap.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border/80 my-2" />
                    )}
                  </div>
                  <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                        {phase.phase}
                      </p>
                      <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        Phase {index + 1} of {analysis.roadmap.length}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-foreground">{phase.focus}</h3>
                    <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">Target Milestone Outcome:</span>{' '}
                        {phase.outcome}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: INTERACTIVE DOMAIN MIND MAP
        ========================================================================= */}
        {activeTab === 'mindmap' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
                    <Network size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">Domain Competency Mind Map</h2>
                    <p className="text-xs text-muted-foreground">
                      Hierarchical view of skills, architecture, and production readiness
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-primary">
                    ● Foundation
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-amber-400">
                    ● Gaps
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-blue-400">
                    ● Production
                  </span>
                </div>
              </div>

              {/* Pillars Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(analysis.mind_map?.pillars || [
                  {
                    category: 'Foundational Tools',
                    skills: [
                      { name: 'Core Syntax & Basics', type: 'verified_strength', description: 'Fundamental programming constructs, data structures, and standard libraries.' },
                      { name: 'Version Control & CLI', type: 'verified_strength', description: 'Git branch workflows, terminal fluency, and environment configs.' },
                    ],
                  },
                  {
                    category: 'Domain Architecture',
                    skills: [
                      { name: 'System Design Patterns', type: 'core_competency', description: 'Component separation, modular architecture, and service boundaries.' },
                      { name: 'Data Pipeline & Schemas', type: 'core_competency', description: 'Relational & NoSQL data models and schema optimization.' },
                    ],
                  },
                  {
                    category: 'Critical Gaps',
                    skills: analysis.missing_skills.slice(0, 3).map((g) => ({
                      name: g.skill,
                      type: 'urgent_priority',
                      description: g.gap,
                    })),
                  },
                  {
                    category: 'Production & System Design',
                    skills: [
                      { name: 'Scalability & Caching', type: 'production_scale', description: 'Latency reduction, Redis caching, and rate limiting.' },
                      { name: 'CI/CD & Deployment', type: 'production_scale', description: 'Automated testing suites and containerized cloud deployment.' },
                    ],
                  },
                ]).map((pillar, idx) => (
                  <div
                    key={pillar.category}
                    className="flex flex-col rounded-xl border border-border/80 bg-secondary/20 p-4 transition-all hover:border-primary/50"
                  >
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                      <span className="font-mono text-xs font-bold text-primary">0{idx + 1}</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {pillar.category}
                      </h3>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {pillar.skills.map((skill, sIdx) => (
                        <div
                          key={sIdx}
                          className="rounded-lg border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/40"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-semibold text-foreground">{skill.name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {skill.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: YOUTUBE MASTERCLASSES
        ========================================================================= */}
        {activeTab === 'youtube' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
                  <YouTubeIcon size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Curated YouTube Masterclasses</h2>
                  <p className="text-xs text-muted-foreground">
                    Deep-dive video walkthroughs from world-class tech educators
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                <PlayCircle size={13} /> {analysis.youtube_masterclasses?.length || 0} Masterclasses Picked
              </span>
            </div>

            {analysis.youtube_masterclasses && analysis.youtube_masterclasses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.youtube_masterclasses.map((video, idx) => {
                  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                    video.search_query || `${video.title} ${video.channel}`
                  )}`

                  return (
                    <div
                      key={idx}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/20 p-4 transition-all hover:border-red-500/50 hover:bg-secondary/35"
                    >
                      <div>
                        {/* Top Channel & Duration */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-400 border border-red-500/25">
                            {video.channel}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                            <Clock size={11} /> {video.duration}
                          </span>
                        </div>

                        {/* Video Title */}
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-red-400 transition-colors line-clamp-2">
                          {video.title}
                        </h3>

                        {/* Focus Tag */}
                        <div className="mt-2 mb-2">
                          <span className="inline-block rounded border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
                            🎯 {video.focus_topic}
                          </span>
                        </div>

                        {/* Why it was chosen */}
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {video.why}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-border/60">
                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500/15 py-2 text-xs font-semibold text-red-400 border border-red-500/30 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <PlayCircle size={14} /> Watch on YouTube <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8">
                No YouTube videos were requested for this run.
              </p>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: SMART TIME-OPTIMIZED STUDY PLAN
        ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Smart Time-Optimized Study Schedule</h2>
                  <p className="text-xs text-muted-foreground">
                    Actionable sessions mapped to your weekly commitment
                  </p>
                </div>
              </div>
              {analysis.study_plan?.weekly_hours_allocated && (
                <span className="font-mono text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  ⏱️ {analysis.study_plan.weekly_hours_allocated}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(analysis.study_plan?.schedule || [
                {
                  day: 'Mon / Tue',
                  session_type: 'Deep Dive Concept',
                  duration: '1.5 hrs',
                  focus: 'Core Theory & Architecture Study',
                  actionable_deliverable: 'Read docs, diagram data flows, write 1 summary page.',
                },
                {
                  day: 'Wed / Thu',
                  session_type: 'Hands-On Lab / Coding',
                  duration: '2.0 hrs',
                  focus: 'Blank-Screen Implementation',
                  actionable_deliverable: 'Build isolated endpoint or component from scratch.',
                },
                {
                  day: 'Saturday',
                  session_type: 'Capstone Architecture',
                  duration: '2.5 hrs',
                  focus: 'Portfolio Feature Integration',
                  actionable_deliverable: 'Commit working feature branch to GitHub repository.',
                },
                {
                  day: 'Sunday',
                  session_type: 'Active Audit & Review',
                  duration: '1.0 hr',
                  focus: 'Spaced Recall & Feynman Check',
                  actionable_deliverable: 'Explain concept aloud without notes; patch weak spots.',
                },
              ]).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/20 p-4 transition-all hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-primary">{item.day}</span>
                      <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {item.duration}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                      {item.session_type}
                    </h3>

                    <p className="text-xs font-medium text-foreground/90 mt-2">{item.focus}</p>

                    <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-2.5">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-primary">Deliverable:</span>{' '}
                        {item.actionable_deliverable}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {analysis.study_plan?.pro_tip && (
              <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-center gap-3">
                <Lightbulb size={18} className="text-primary shrink-0" />
                <p className="text-xs text-foreground/90 leading-relaxed">
                  <span className="font-semibold text-primary">Efficiency Tip:</span>{' '}
                  {analysis.study_plan.pro_tip}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 6: SPACED REPETITION & ACTIVE RECALL (5-STAGE)
        ========================================================================= */}
        {activeTab === 'spaced' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
                  <Repeat size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-base">5-Stage Spaced Repetition & Active Recall</h2>
                  <p className="text-xs text-muted-foreground">
                    Feynman technique & blank-screen coding framework (Day 1, 3, 7, 14, 30)
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                For Long-Term Neural Retention
              </span>
            </div>

            <div className="space-y-4">
              {(analysis.spaced_repetition?.framework || [
                {
                  stage: 'Day 1 (Immediate Encode)',
                  technique: 'Feynman Technique & Plain Language Explanation',
                  feynman_prompt: 'Explain how this core skill works to a 10-year-old without using technical jargon.',
                  blank_screen_challenge: 'Create a blank file and write the skeleton syntax without checking documentation.',
                },
                {
                  stage: 'Day 3 (First Recall)',
                  technique: 'Blind Reconstruction & Flow Mapping',
                  feynman_prompt: 'What are the 3 most common trade-offs when choosing this architecture over alternatives?',
                  blank_screen_challenge: 'Build a minimal end-to-end working prototype from memory in under 20 minutes.',
                },
                {
                  stage: 'Day 7 (Structural Mastery)',
                  technique: 'Error Injection & Edge-Case Debugging',
                  feynman_prompt: 'Where will this system fail under 10x traffic? Describe the failure cascade.',
                  blank_screen_challenge: 'Write unit tests covering 3 failure modes and make them pass.',
                },
                {
                  stage: 'Day 14 (Blind Implementation)',
                  technique: 'Cross-Domain Project Integration',
                  feynman_prompt: 'How does this technology integrate with databases, authentication, and caching layers?',
                  blank_screen_challenge: 'Integrate this skill into your primary portfolio project without copy-pasting.',
                },
                {
                  stage: 'Day 30 (Interview & Production Audit)',
                  technique: 'Mock System Design & Production Readiness',
                  feynman_prompt: 'Explain the internal lifecycle, performance bottlenecks, and security considerations to a Lead Architect.',
                  blank_screen_challenge: 'Refactor production code for benchmark speed, clean documentation, and CI/CD tests.',
                },
              ]).map((stage, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-secondary/20 p-4 sm:p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                      {stage.stage}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {stage.technique}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                        <BrainCircuit size={14} /> Feynman Recall Prompt
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {stage.feynman_prompt}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-background/50 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                        <Code2 size={14} /> Blank-Screen Challenge
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {stage.blank_screen_challenge}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: CURATED DOCS & RESOURCES
        ========================================================================= */}
        {activeTab === 'resources' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="text-primary" size={20} />
                <h2 className="font-semibold text-base">
                  Recommended Documentation & Courses ({learningStyle || 'Personalized'})
                </h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {analysis.resources.length} Curated Links
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {analysis.resources.map((resource) => (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  key={resource.title}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-secondary/20 p-4 transition-all hover:border-primary/60 hover:bg-secondary/40"
                >
                  <div>
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
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
