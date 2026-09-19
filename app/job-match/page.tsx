'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Compass,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react'

type KeywordMatch = {
  keyword: string
  category: string
  status: string
}

type MissingKeyword = {
  keyword: string
  priority: string
  jd_context: string
  recommendation: string
}

type HardRequirement = {
  requirement: string
  status: 'Met' | 'Partial' | 'Missing'
  evidence: string
}

type InterviewSprintDay = {
  day: string
  focus: string
  action: string
  sample_interview_q: string
}

type JobDiffResult = {
  semantic_fit_score: number
  ats_compatibility_score: number
  role_title: string
  company_name: string
  overall_verdict: string
  keyword_audit: {
    matching_keywords: KeywordMatch[]
    missing_ats_keywords: MissingKeyword[]
  }
  hard_requirements_audit: HardRequirement[]
  tailored_cover_letter: string
  interview_sprint_7day: InterviewSprintDay[]
}

type ParsedResume = {
  filename: string
  file_size: number
  word_count: number
  detected_skills: string[]
  preview: string
  extracted_text: string
}

const SAMPLE_JOB_DESCRIPTION = `Role: Senior Full-Stack AI Engineer
Company: CloudScale AI Technologies
Location: Remote (US / Global)

About the Role:
We are looking for a Senior Full-Stack AI Engineer to build scalable web applications powered by generative AI models. You will architect robust backend microservices, design low-latency API layers, and build intuitive React dashboards.

Key Responsibilities:
- Design and deploy high-throughput REST APIs and microservices using Python (FastAPI/Django) or Node.js/TypeScript.
- Build production-grade LLM applications using LangChain, LlamaIndex, vector databases (Pinecone, pgvector), and RAG pipelines.
- Deploy and manage containerized services on AWS using Docker, Kubernetes (EKS), and Terraform.
- Develop responsive frontends using React, Next.js, and Tailwind CSS.
- Set up automated CI/CD pipelines with GitHub Actions and monitor production workloads with Prometheus/Datadog.

Requirements:
- 3+ years of professional full-stack development experience.
- Strong proficiency in Python, TypeScript, and SQL (PostgreSQL).
- Hands-on experience deploying LLM/RAG pipelines into production.
- Experience with Docker and container orchestration with Kubernetes.
- Excellent problem-solving skills and distributed systems understanding.`

export default function JobMatchPage() {
  // Input states
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text')
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [targetCompany, setTargetCompany] = useState('')
  const [candidateSkills, setCandidateSkills] = useState<string[]>(['Python', 'FastAPI', 'React', 'Docker'])
  const [customSkill, setCustomSkill] = useState('')
  const [candidateExperience, setCandidateExperience] = useState('')

  // Resume state
  const [resumeData, setResumeData] = useState<ParsedResume | null>(null)
  const [parsingResume, setParsingResume] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Execution states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [diffResult, setDiffResult] = useState<JobDiffResult | null>(null)

  // Output tab
  const [activeTab, setActiveTab] = useState<'keywords' | 'requirements' | 'letter' | 'interview'>('keywords')
  const [copiedLetter, setCopiedLetter] = useState(false)

  const toggleSkill = (skill: string) => {
    setCandidateSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (trimmed && !candidateSkills.includes(trimmed)) {
      setCandidateSkills((prev) => [...prev, trimmed])
      setCustomSkill('')
    }
  }

  const handleAddAllDetectedSkills = () => {
    if (!resumeData?.detected_skills) return
    setCandidateSkills((current) => {
      const combined = new Set([...current, ...resumeData.detected_skills])
      return Array.from(combined)
    })
  }

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
          throw new Error(errData.detail || 'Failed to parse resume.')
        }
        throw new Error('Could not reach the FastAPI backend on port 8000.')
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

  async function runJobDiff() {
    setError('')
    if (inputMode === 'text' && !jobDescription.trim()) {
      setError('Please paste a Job Description to diff.')
      return
    }
    if (inputMode === 'url' && !jobUrl.trim()) {
      setError('Please enter a valid Job Posting URL.')
      return
    }
    if (!resumeData && candidateSkills.length === 0 && !candidateExperience.trim()) {
      setError('Please upload a resume or provide your skills/experience to diff against the job.')
      return
    }

    setLoading(true)
    try {
      const endpoints = [
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        'http://127.0.0.1:8000',
      ]

      const payload = {
        job_description: inputMode === 'text' ? jobDescription : null,
        job_url: inputMode === 'url' ? jobUrl : null,
        resume_text: resumeData?.extracted_text || null,
        candidate_skills: candidateSkills,
        candidate_experience: candidateExperience.trim() || null,
        target_company: targetCompany.trim() || null,
      }

      let response: Response | null = null

      for (const base of endpoints) {
        try {
          response = await fetch(`${base}/diff-job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (response.ok) break
        } catch {
          // fallback
        }
      }

      if (!response || !response.ok) {
        if (response) {
          const errJson = await response.json().catch(() => ({}))
          throw new Error(errJson.detail || 'The Diff Engine encountered an issue.')
        }
        throw new Error('Could not reach the backend server on port 8000.')
      }

      const data: JobDiffResult = await response.json()
      setDiffResult(data)
    } catch (caught: any) {
      setError(caught.message || 'Something went wrong running the job diff.')
    } finally {
      setLoading(false)
    }
  }

  const copyCoverLetter = () => {
    if (!diffResult?.tailored_cover_letter) return
    navigator.clipboard.writeText(diffResult.tailored_cover_letter)
    setCopiedLetter(true)
    setTimeout(() => setCopiedLetter(false), 2500)
  }

  const downloadCoverLetter = () => {
    if (!diffResult?.tailored_cover_letter) return
    const element = document.createElement('a')
    const file = new Blob([diffResult.tailored_cover_letter], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = `${(diffResult.company_name || 'Cover_Letter').replace(/\s+/g, '_')}_Cover_Letter.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
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
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Layers size={13} /> Career Pivot Roadmap
          </Link>
          <Link
            href="/job-match"
            className="flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"
          >
            <Zap size={13} /> Live Job Match & Diff Engine
            <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[9px] font-bold">
              NEW
            </span>
          </Link>
        </nav>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-primary/[0.04] to-transparent border-b border-border/30 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={14} /> Semantic Job Description Diff & Real-Time ATS Audit Engine
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl max-w-3xl">
            Live Job Match & <span className="text-primary">ATS Diff Engine</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
            Paste any Job Description or URL from LinkedIn, Greenhouse, Lever, or Indeed. Directly diff your resume to expose ATS keyword blockers, audit hard requirements, and get a tailored cover letter and 7-day interview sprint plan.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        {!diffResult ? (
          /* =========================================================================
             INPUT INTERFACE (SPLIT COLUMNS)
          ========================================================================= */
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left Column: Job Posting Ingestion */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Target className="text-primary" size={18} />
                  <h2 className="text-base font-semibold">1. Target Job Description</h2>
                </div>
                <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      inputMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('url')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      inputMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Direct URL
                  </button>
                </div>
              </div>

              {inputMode === 'text' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-foreground">
                      Paste full job posting text:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setJobDescription(SAMPLE_JOB_DESCRIPTION)
                        setTargetCompany('CloudScale AI Technologies')
                      }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      + Fill Sample AI Engineer JD
                    </button>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description, qualifications, and requirements from LinkedIn, Indeed, Greenhouse, or Lever..."
                    rows={12}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-foreground">
                    Job Posting URL (Greenhouse, Lever, LinkedIn, Indeed):
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..."
                      className="pl-9 text-xs"
                    />
                    <LinkIcon className="pointer-events-none absolute left-3 top-3 text-muted-foreground" size={14} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Note: If a job portal is behind a login or bot wall, switch to &ldquo;Paste Text&rdquo; to paste directly.
                  </p>
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-xs font-medium text-foreground">
                  Target Company Name (Optional):
                </label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. OpenAI, Stripe, Google, Anthropic"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Right Column: Candidate Profile / Resume */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <FileCheck className="text-primary" size={18} />
                  <h2 className="text-base font-semibold">2. Your Resume & Experience</h2>
                </div>
                <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                  Diff Source
                </span>
              </div>

              {/* Resume Upload Dropzone */}
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
                      <Loader2 className="animate-spin text-primary" size={26} />
                      <p className="mt-2 text-xs font-medium text-foreground">
                        Extracting resume text for diff...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <UploadCloud size={18} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-foreground">
                        <span className="text-primary underline-offset-4 hover:underline">
                          Upload your resume
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        PDF, DOCX, DOC, TXT (up to 10MB)
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 rounded-lg border border-border bg-secondary/20 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{resumeData.filename}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {resumeData.word_count} words • {(resumeData.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeData(null)}
                      title="Remove resume"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {resumeData.detected_skills.length > 0 && (
                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          Detected Skills ({resumeData.detected_skills.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddAllDetectedSkills}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          + Add all to skills
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {resumeData.detected_skills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] text-primary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {resumeError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
                  {resumeError}
                </p>
              )}

              {/* Skills Tag Input */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-foreground">
                  Your Core Skills ({candidateSkills.length}):
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                      placeholder="Add specific skill (e.g. PyTorch, Kubernetes)..."
                      className="text-xs"
                    />
                    <button
                      type="button"
                      onClick={addCustomSkill}
                      disabled={!customSkill.trim()}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-border bg-secondary/20">
                    {candidateSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/30 px-2 py-0.5 text-xs text-primary font-medium"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => toggleSkill(s)}
                          className="hover:text-destructive"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brief Background / Experience Context */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-foreground">
                  Key Experience Summary / Extra Context:
                </label>
                <textarea
                  value={candidateExperience}
                  onChange={(e) => setCandidateExperience(e.target.value)}
                  placeholder="e.g. 3 years working with FastAPI and Postgres, built production RAG pipeline with LangChain, currently learning Kubernetes..."
                  rows={3}
                  className="text-xs"
                />
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              {/* Launch Diff Button */}
              <button
                type="button"
                onClick={runJobDiff}
                disabled={loading || parsingResume}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={17} /> Running Semantic Diff & ATS Audit...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Run Semantic Diff & ATS Audit <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             OUTPUT INTERFACE: LIVE DIFF RESULTS & ATS REPORT
          ========================================================================= */
          <div className="space-y-8">
            {/* Header Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                    Diff Analysis Complete
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-medium text-foreground">
                    {diffResult.role_title} @ {diffResult.company_name}
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  Job Match & ATS Diagnostic Report
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDiffResult(null)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                <RefreshCw size={13} /> Diff Another Job Posting
              </button>
            </div>

            {/* Top Scorecard Row */}
            <div className="grid gap-5 md:grid-cols-3">
              {/* Semantic Fit Score */}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-lg shadow-primary/5 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Semantic Fit Index
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-5xl font-bold text-primary">
                        {diffResult.semantic_fit_score}
                      </span>
                      <span className="text-xl font-bold text-primary">%</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-primary/20 p-2.5 text-primary">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Overall contextual alignment of your experience against the JD requirements.
                </p>
              </div>

              {/* ATS Keyword Compatibility */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      ATS Keyword Match
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span
                        className={`font-mono text-5xl font-bold ${
                          diffResult.ats_compatibility_score >= 80
                            ? 'text-primary'
                            : diffResult.ats_compatibility_score >= 60
                            ? 'text-amber-400'
                            : 'text-destructive'
                        }`}
                      >
                        {diffResult.ats_compatibility_score}
                      </span>
                      <span className="text-xl font-bold text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-secondary p-2.5 text-foreground">
                    <Search size={20} />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Keyword density matching the automated resume screening filter.
                </p>
              </div>

              {/* Overall Verdict Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="text-primary" size={16} />
                    <p className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
                      Hiring Manager Verdict
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {diffResult.overall_verdict}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-primary">
                  <span>Target: {diffResult.role_title}</span>
                </div>
              </div>
            </div>

            {/* Results Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab('keywords')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'keywords'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Search size={14} /> Keyword Audit ({diffResult.keyword_audit.matching_keywords.length} matched / {diffResult.keyword_audit.missing_ats_keywords.length} gaps)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requirements')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'requirements'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <CheckCircle2 size={14} /> Hard Requirements Audit ({diffResult.hard_requirements_audit.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('letter')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'letter'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <FileText size={14} /> Tailored Cover Letter
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('interview')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'interview'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Clock size={14} /> 7-Day Interview Sprint
              </button>
            </div>

            {/* =========================================================================
                TAB 1: KEYWORD AUDIT (MATCHING VS MISSING ATS FILTERS)
            ========================================================================= */}
            {activeTab === 'keywords' && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Matching Keywords */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleCheck className="text-primary" size={18} />
                    <h3 className="text-sm font-semibold">
                      Matching Verified Keywords ({diffResult.keyword_audit.matching_keywords.length})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {diffResult.keyword_audit.matching_keywords.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/20 px-3 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="text-primary" size={14} />
                          <span className="font-semibold text-foreground">{item.keyword}</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Critical Missing ATS Keywords */}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleAlert className="text-destructive" size={18} />
                    <h3 className="text-sm font-semibold text-destructive">
                      Missing ATS Filter Keywords ({diffResult.keyword_audit.missing_ats_keywords.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {diffResult.keyword_audit.missing_ats_keywords.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-destructive/30 bg-secondary/30 p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{item.keyword}</span>
                          <span className="rounded bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-destructive uppercase">
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          <span className="font-medium text-foreground">JD Context:</span> &ldquo;{item.jd_context}&rdquo;
                        </p>
                        <div className="rounded bg-background/60 p-2 border border-border/60">
                          <p className="text-[11px] text-primary leading-relaxed">
                            <span className="font-semibold">Bridge Advice:</span> {item.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 2: HARD REQUIREMENTS AUDIT
            ========================================================================= */}
            {activeTab === 'requirements' && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle2 className="text-primary" size={20} />
                  <h3 className="text-base font-semibold">Core Job Qualification Audit</h3>
                </div>

                <div className="space-y-3.5">
                  {diffResult.hard_requirements_audit.map((item, idx) => {
                    const isMet = item.status === 'Met'
                    const isPartial = item.status === 'Partial'
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 transition-colors ${
                          isMet
                            ? 'border-primary/30 bg-primary/[0.03]'
                            : isPartial
                            ? 'border-amber-500/30 bg-amber-500/[0.03]'
                            : 'border-destructive/30 bg-destructive/[0.03]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-foreground">{item.requirement}</h4>
                          <span
                            className={`rounded px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                              isMet
                                ? 'bg-primary/20 text-primary border border-primary/40'
                                : isPartial
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-destructive/20 text-destructive border border-destructive/40'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Evidence & Evaluation:</span> {item.evidence}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 3: TAILORED COVER LETTER
            ========================================================================= */}
            {activeTab === 'letter' && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <FileText className="text-primary" size={18} />
                    <h3 className="text-base font-semibold">Tailored High-Impact Cover Letter</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyCoverLetter}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 transition-colors"
                    >
                      {copiedLetter ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                      {copiedLetter ? 'Copied!' : 'Copy to Clipboard'}
                    </button>

                    <button
                      type="button"
                      onClick={downloadCoverLetter}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Download size={14} /> Download .txt
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-6 font-sans text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line shadow-inner">
                  {diffResult.tailored_cover_letter}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 4: 7-DAY TECHNICAL INTERVIEW SPRINT PLAN
            ========================================================================= */}
            {activeTab === 'interview' && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="text-primary" size={20} />
                    <h3 className="text-base font-semibold">7-Day Technical Interview Preparation Countdown</h3>
                  </div>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Tailored to {diffResult.role_title}
                  </span>
                </div>

                <div className="space-y-4">
                  {diffResult.interview_sprint_7day.map((day, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border/80 bg-secondary/20 p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="sm:w-28 shrink-0 flex sm:flex-col items-center justify-between sm:justify-center p-2 rounded-lg bg-primary/10 border border-primary/25">
                        <span className="font-mono text-sm font-bold text-primary">{day.day}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">Countdown</span>
                      </div>

                      <div className="space-y-2 flex-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          {day.focus}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-primary">Daily Sprint Action:</span> {day.action}
                        </p>
                        <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 text-xs">
                          <p className="text-[11px] text-foreground/90">
                            <span className="font-semibold text-primary">Target Interview Question:</span> &ldquo;{day.sample_interview_q}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
