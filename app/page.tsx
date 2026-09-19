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
  User,
  Lightbulb,
  PlayCircle,
  Video,
  Clock,
  ExternalLink,
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
          // continue fallback check
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

      // Combine about you context and selected tags
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
      let lastErr: Error | null = null

      for (const base of endpoints) {
        try {
          response = await fetch(`${base}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (response.ok) break
        } catch (e: any) {
          lastErr = e
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
          <span className="hidden sm:inline">Personalized Career Intelligence</span>
          <CircleHelp size={16} />
        </div>
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
            Tell the AI about your unique journey, upload your resume, or choose your skills. We craft a personalized roadmap matching your background, learning style, and available hours.
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
              <p className="font-mono text-2xl font-semibold text-primary">100%</p>
              <p className="mt-1 text-xs text-muted-foreground">Tailored to your learning style</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">1-Click</p>
              <p className="mt-1 text-xs text-muted-foreground">Resume & skill extraction</p>
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
            {/* 👤 NEW FEATURE: "About You" & Personal Context Section */}
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
                  Your current situation / constraints (Select all that apply)
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
                {/* Custom Skill Input Bar */}
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

                {/* Added Skills Tag List */}
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
  learningStyle,
  onReset,
}: {
  analysis: Analysis
  resumeName?: string
  learningStyle?: string
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
          ← Start new assessment
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
                <FileCheck size={12} /> Resume: {resumeName}
              </span>
            )}
            {learningStyle && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <GraduationCap size={12} /> {learningStyle}
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

        {/* Personalized Tip Banner (if present) */}
        {analysis.personalized_tip && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5 flex items-start gap-3 shadow-lg shadow-primary/5">
            <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
              <Lightbulb size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Tailored Advisor Tip For You</h3>
              <p className="mt-1 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {analysis.personalized_tip}
              </p>
            </div>
          </div>
        )}

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
              <h2 className="font-semibold text-base">Recommended Resources ({learningStyle || 'Personalized'})</h2>
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

        {/* 📺 Embedded YouTube Masterclasses Section */}
        {analysis.youtube_masterclasses && analysis.youtube_masterclasses.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
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
                <PlayCircle size={13} /> {analysis.youtube_masterclasses.length} Masterclasses Picked
              </span>
            </div>

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
          </div>
        )}
      </section>
    </main>
  )
}
