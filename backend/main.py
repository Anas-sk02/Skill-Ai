import io
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Optional

# Automatically load .env file from the backend folder and parent folder
def load_env_file():
    backend_dir = Path(__file__).resolve().parent
    env_paths = [backend_dir / '.env', backend_dir.parent / '.env', Path('.env')]
    for env_path in env_paths:
        if env_path.is_file():
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

load_env_file()

# Also try python-dotenv if installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai

# Optional import fallbacks for PDF & DOCX
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

app = FastAPI(title='SkillGap.ai API', version='1.1.0')

# Enable wide-open CORS for local development across all ports/hosts (localhost, 127.0.0.1, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 50+ Curated modern technology skills dictionary with smart word-boundary regex patterns
SKILL_DICTIONARY: list[dict[str, Any]] = [
    # Programming Languages
    {"name": "Python", "pattern": r"\bpython\b"},
    {"name": "JavaScript", "pattern": r"\b(javascript|js|es6)\b"},
    {"name": "TypeScript", "pattern": r"\b(typescript|ts)\b"},
    {"name": "Java", "pattern": r"\bjava\b"},
    {"name": "C++", "pattern": r"\bc\+\+\b"},
    {"name": "C#", "pattern": r"\bc#|\bcsharp\b"},
    {"name": "Go (Golang)", "pattern": r"\b(golang|go\s+programming)\b"},
    {"name": "Rust", "pattern": r"\brust\b"},
    {"name": "PHP", "pattern": r"\bphp\b"},
    {"name": "Ruby", "pattern": r"\bruby\b"},
    {"name": "Swift", "pattern": r"\bswift\b"},
    {"name": "Kotlin", "pattern": r"\bkotlin\b"},
    {"name": "SQL", "pattern": r"\bsql\b"},

    # Frontend Frameworks & Libraries
    {"name": "React", "pattern": r"\breact(\.js)?\b"},
    {"name": "Next.js", "pattern": r"\bnext(\.js)?\b"},
    {"name": "Vue.js", "pattern": r"\bvue(\.js)?\b"},
    {"name": "Angular", "pattern": r"\bangular\b"},
    {"name": "Svelte", "pattern": r"\bsvelte\b"},
    {"name": "Tailwind CSS", "pattern": r"\btailwind(\s*css)?\b"},
    {"name": "HTML5 / CSS3", "pattern": r"\b(html5?|css3?)\b"},
    {"name": "Redux", "pattern": r"\bredux\b"},

    # Backend Frameworks
    {"name": "Node.js", "pattern": r"\bnode(\.js)?\b"},
    {"name": "Express.js", "pattern": r"\bexpress(\.js)?\b"},
    {"name": "FastAPI", "pattern": r"\bfastapi\b"},
    {"name": "Django", "pattern": r"\bdjango\b"},
    {"name": "Flask", "pattern": r"\bflask\b"},
    {"name": "Spring Boot", "pattern": r"\bspring(\s*boot)?\b"},
    {"name": "GraphQL", "pattern": r"\bgraphql\b"},
    {"name": "REST APIs", "pattern": r"\b(rest|restful|api)\b"},

    # Databases
    {"name": "PostgreSQL", "pattern": r"\b(postgres|postgresql)\b"},
    {"name": "MySQL", "pattern": r"\bmysql\b"},
    {"name": "MongoDB", "pattern": r"\bmongodb\b"},
    {"name": "Redis", "pattern": r"\bredis\b"},
    {"name": "SQLite", "pattern": r"\bsqlite\b"},
    {"name": "Supabase", "pattern": r"\bsupabase\b"},
    {"name": "Firebase", "pattern": r"\bfirebase\b"},

    # Cloud & DevOps
    {"name": "Docker", "pattern": r"\bdocker\b"},
    {"name": "Kubernetes", "pattern": r"\b(kubernetes|k8s)\b"},
    {"name": "AWS", "pattern": r"\b(aws|amazon web services)\b"},
    {"name": "Google Cloud (GCP)", "pattern": r"\b(gcp|google cloud)\b"},
    {"name": "Microsoft Azure", "pattern": r"\b(azure|microsoft azure)\b"},
    {"name": "Terraform", "pattern": r"\bterraform\b"},
    {"name": "CI/CD", "pattern": r"\b(ci\/cd|github actions|gitlab ci|jenkins)\b"},
    {"name": "Linux", "pattern": r"\blinux\b"},
    {"name": "Git / GitHub", "pattern": r"\b(git|github|gitlab)\b"},

    # AI, ML & Data Science
    {"name": "Machine Learning", "pattern": r"\b(machine learning|ml)\b"},
    {"name": "Deep Learning", "pattern": r"\bdeep learning\b"},
    {"name": "PyTorch", "pattern": r"\bpytorch\b"},
    {"name": "TensorFlow", "pattern": r"\btensorflow\b"},
    {"name": "Scikit-Learn", "pattern": r"\bscikit[\s\-_]?learn\b"},
    {"name": "Pandas", "pattern": r"\bpandas\b"},
    {"name": "NumPy", "pattern": r"\bnumpy\b"},
    {"name": "Data Analysis", "pattern": r"\bdata analysis\b"},
    {"name": "Power BI", "pattern": r"\bpower\s*bi\b"},
    {"name": "Tableau", "pattern": r"\btableau\b"},
    {"name": "Apache Spark", "pattern": r"\b(spark|pyspark)\b"},
    {"name": "Generative AI / LLMs", "pattern": r"\b(genai|generative ai|llm|llms|gpt|openai|gemini)\b"},
    {"name": "Prompt Engineering", "pattern": r"\bprompt engineering\b"},
    {"name": "LangChain", "pattern": r"\blangchain\b"},
    {"name": "RAG (Retrieval-Augmented Generation)", "pattern": r"\brag\b"},

    # Architecture, Methodologies & Design
    {"name": "System Design", "pattern": r"\bsystem design\b"},
    {"name": "Microservices", "pattern": r"\bmicroservices\b"},
    {"name": "Agile / Scrum", "pattern": r"\b(agile|scrum|kanban)\b"},
    {"name": "Figma", "pattern": r"\bfigma\b"},
]


class Profile(BaseModel):
    target_role: str = Field(min_length=2, max_length=120)
    current_role: str = Field(min_length=2, max_length=160)
    known_skills: list[str] = Field(min_length=1, max_length=50)
    skill_level: str = Field(min_length=2, max_length=40)
    learning_goal: str = Field(min_length=5, max_length=500)
    weekly_hours: str = Field(min_length=2, max_length=30)
    timeline: str = Field(min_length=2, max_length=30)
    about_you: Optional[str] = Field(default=None, max_length=2000)
    learning_style: Optional[str] = Field(default=None, max_length=120)
    resume_text: Optional[str] = Field(default=None, max_length=50000)
    resume_filename: Optional[str] = Field(default=None, max_length=200)


def extract_skills_from_text(text: str) -> list[str]:
    lower_text = text.lower()
    matched_skills: list[str] = []
    for skill_info in SKILL_DICTIONARY:
        if re.search(skill_info["pattern"], lower_text, re.IGNORECASE):
            matched_skills.append(skill_info["name"])
    return matched_skills


def extract_docx_builtin(content: bytes) -> str:
    """Zero-dependency DOCX extractor using Python's standard zipfile and xml parser."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            xml_content = zf.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            # Find all text tags in word XML namespace
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in tree.findall('.//w:p', namespaces):
                texts = [node.text for node in p.findall('.//w:t', namespaces) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n'.join(paragraphs).strip()
    except Exception as err:
        return ""


def extract_pdf_fallback(content: bytes) -> str:
    """Fallback text extraction for PDF if pypdf is unavailable."""
    try:
        # Basic stream text regex extraction
        raw_str = content.decode('latin-1', errors='ignore')
        # Find stream blocks
        text_matches = re.findall(r'\((.*?)\)\s*Tj', raw_str)
        if text_matches:
            return " ".join(text_matches).strip()
    except Exception:
        pass
    return ""


def extract_text_from_file(filename: str, content: bytes) -> str:
    ext = os.path.splitext(filename)[1].lower()
    text = ""

    if ext == ".pdf":
        if PdfReader is not None:
            try:
                reader = PdfReader(io.BytesIO(content))
                extracted_pages = [page.extract_text() or "" for page in reader.pages]
                text = "\n".join(extracted_pages).strip()
            except Exception:
                text = ""
        
        # Fallback if pypdf was missing or returned empty
        if not text:
            text = extract_pdf_fallback(content)

    elif ext == ".docx":
        if docx is not None:
            try:
                doc = docx.Document(io.BytesIO(content))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                text = "\n".join(paragraphs).strip()
            except Exception:
                text = ""

        # Fallback to standard library zipfile XML parser
        if not text:
            text = extract_docx_builtin(content)

    elif ext in [".txt", ".doc"]:
        try:
            text = content.decode("utf-8", errors="replace").strip()
        except Exception:
            text = content.decode("latin-1", errors="replace").strip()
        # Clean non-printable characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: .pdf, .docx, .doc, .txt",
        )

    return text


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'skillgap-api'}


@app.post('/parse-resume')
async def parse_resume(file: UploadFile = File(...)) -> dict[str, Any]:
    max_size = 10 * 1024 * 1024  # 10 MB limit
    content = await file.read()
    
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="File size exceeds the 10MB limit.")

    filename = file.filename or "uploaded_resume.txt"
    extracted_text = extract_text_from_file(filename, content)

    if not extracted_text or len(extracted_text.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Could not extract readable text from this file. If it is an image-only scanned PDF, please upload a text-based PDF, DOCX, or TXT file.",
        )

    words = re.findall(r"\b\w+\b", extracted_text)
    word_count = len(words)
    detected_skills = extract_skills_from_text(extracted_text)

    # Generate a brief preview snippet
    clean_lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
    preview = "\n".join(clean_lines[:8])

    return {
        "filename": filename,
        "file_size": len(content),
        "word_count": word_count,
        "character_count": len(extracted_text),
        "detected_skills": detected_skills,
        "preview": preview,
        "extracted_text": extracted_text[:25000],
    }


@app.post('/analyze')
def analyze(profile: Profile) -> dict[str, Any]:
    load_env_file()
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail='GEMINI_API_KEY is not configured in backend/.env. Please ensure your key is set.',
        )
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    resume_instruction = ""
    if profile.resume_text:
        resume_instruction = f"""
Candidate's Parsed Resume Content:
---
{profile.resume_text[:15000]}
---
CRITICAL INSTRUCTIONS: The candidate has provided their actual resume above (File: {profile.resume_filename or 'resume'}). 
Deeply tailor the analysis to what they have actually worked on in their resume. 
- In "summary", mention specific strengths and experiences identified in their resume and how they translate to the target role.
- In "missing_skills", precisely pinpoint what their resume is missing for the target role in the 2026 market.
- In "resume_strengths", list 2-3 key transferable assets found in their resume.
"""

    about_you_section = ""
    if profile.about_you:
        about_you_section = f"""
Candidate's Personal Story & Background Context ("About You"):
"{profile.about_you}"
"""
    if profile.learning_style:
        about_you_section += f"""
Preferred Learning Style & Format:
"{profile.learning_style}"
"""

    schema_instruction = """
Return ONLY valid JSON with this exact schema:
{
  "readiness_score": 75,
  "summary": "Detailed strategic career intelligence summary...",
  "start_here": "Immediate high-leverage action item to begin today...",
  "resume_strengths": ["Strengths found in your background/resume"],
  "personalized_tip": "Specific advisor tip based on your learning style and constraints",
  "missing_skills": [
    {
      "skill": "Skill Name",
      "priority": "critical",
      "gap": "Why this is a gap",
      "why": "Why 2026 employers demand this"
    }
  ],
  "roadmap": [
    {
      "phase": "Phase 1: Foundations",
      "focus": "Core Architecture",
      "outcome": "Measurable deliverable and milestone"
    }
  ],
  "resources": [
    {
      "title": "Course or Documentation Name",
      "provider": "Official / Provider",
      "type": "course",
      "level": "Intermediate",
      "url": "https://...",
      "why": "Why this resource is optimal"
    }
  ],
  "youtube_masterclasses": [
    {
      "title": "Masterclass Video Title",
      "channel": "freeCodeCamp.org",
      "duration": "2h 30m",
      "search_query": "specific search query",
      "focus_topic": "Topic Name",
      "why": "Why this video walkthrough is effective"
    }
  ],
  "mind_map": {
    "pillars": [
      {
        "category": "Foundational Tools",
        "skills": [{ "name": "Skill Name", "type": "verified_strength", "description": "Short explanation" }]
      },
      {
        "category": "Domain Architecture",
        "skills": [{ "name": "Skill Name", "type": "core_competency", "description": "Short explanation" }]
      },
      {
        "category": "Critical Gaps",
        "skills": [{ "name": "Skill Name", "type": "urgent_priority", "description": "Short explanation" }]
      },
      {
        "category": "Production & System Design",
        "skills": [{ "name": "Skill Name", "type": "production_scale", "description": "Short explanation" }]
      }
    ]
  },
  "study_plan": {
    "weekly_hours_allocated": "5-7 hrs/week",
    "schedule": [
      {
        "day": "Mon / Tue",
        "session_type": "Deep Dive Concept",
        "duration": "1.5 hrs",
        "focus": "Core Theory",
        "actionable_deliverable": "Specific task completed"
      }
    ],
    "pro_tip": "Time optimization tip"
  },
  "spaced_repetition": {
    "framework": [
      {
        "stage": "Day 1 (Immediate Encode)",
        "technique": "Feynman Technique",
        "feynman_prompt": "Explain concept simply...",
        "blank_screen_challenge": "Build syntax from memory..."
      },
      {
        "stage": "Day 3 (First Recall)",
        "technique": "Blind Reconstruction",
        "feynman_prompt": "Explain 3 trade-offs...",
        "blank_screen_challenge": "Build minimal prototype..."
      },
      {
        "stage": "Day 7 (Structural Mastery)",
        "technique": "Edge Case Debugging",
        "feynman_prompt": "Where will this fail under traffic?...",
        "blank_screen_challenge": "Write 3 unit tests..."
      },
      {
        "stage": "Day 14 (Blind Implementation)",
        "technique": "Project Integration",
        "feynman_prompt": "How does it connect to other layers?...",
        "blank_screen_challenge": "Integrate into portfolio project..."
      },
      {
        "stage": "Day 30 (Interview & Production Audit)",
        "technique": "Mock System Design",
        "feynman_prompt": "Explain lifecycle and security...",
        "blank_screen_challenge": "Refactor for speed and tests..."
      }
    ]
  }
}
"""

    skills_joined = ", ".join(profile.known_skills)
    prompt = (
        "You are a world-class empathetic career intelligence advisor and technical recruiter. "
        "Analyze this learner profile against the current 2026 job market. "
        "Return ONLY valid JSON, no markdown fences. Never invent specific course URLs; use official or widely known URLs only.\n\n"
        f"Learner Profile:\n"
        f"- Target Role: {profile.target_role}\n"
        f"- Current Role / Background: {profile.current_role}\n"
        f"- Known Skills: {skills_joined}\n"
        f"- Skill Level: {profile.skill_level}\n"
        f"- Learning Goal: {profile.learning_goal}\n"
        f"- Weekly Time: {profile.weekly_hours}\n"
        f"- Timeline: {profile.timeline}\n\n"
        f"{about_you_section}\n\n"
        f"{resume_instruction}\n\n"
        "Special Instructions:\n"
        "- Tailor the advice, tone, and recommended resources to their personal context, current commitments, and learning style.\n"
        "- In the summary, acknowledge their background story and uniquely encourage their strengths.\n"
        "- Include 4-6 skill gaps (with critical/high/medium priorities), 3-4 roadmap phases, 5 standard resources, "
        "3-4 top YouTube masterclasses, a 4-pillar domain mind map, a personalized weekly study plan matching their hours, "
        "and the 5-stage spaced repetition active recall framework.\n\n"
        f"{schema_instruction}"
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config={'response_mime_type': 'application/json', 'temperature': 0.2},
        )
        data = json.loads(response.text)
        return data
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f'Gemini returned an invalid analysis: {error}') from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f'Gemini analysis failed: {error}') from error


# =========================================================================
# FEATURE 3: LIVE JOB MATCH & REAL-TIME JOB MARKET ANALYZER (DIFF ENGINE)
# =========================================================================

class JobDiffRequest(BaseModel):
    job_description: Optional[str] = Field(default=None, max_length=50000)
    job_url: Optional[str] = Field(default=None, max_length=2000)
    resume_text: Optional[str] = Field(default=None, max_length=50000)
    candidate_skills: list[str] = Field(default=[], max_length=100)
    candidate_experience: Optional[str] = Field(default=None, max_length=5000)
    target_company: Optional[str] = Field(default=None, max_length=200)


def fetch_job_text_from_url(url: str) -> str:
    """Fetch and strip basic text from a public job posting URL."""
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            # Remove scripts & styles
            clean_html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
            # Remove all html tags
            text = re.sub(r'<[^>]+>', ' ', clean_html)
            # Collapse whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:20000]
    except Exception as err:
        return ""


@app.post('/diff-job')
def diff_job(req: JobDiffRequest) -> dict[str, Any]:
    load_env_file()
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail='GEMINI_API_KEY is not configured in backend/.env. Please ensure your key is set.',
        )

    # 1. Resolve Job Description Content
    jd_content = (req.job_description or "").strip()
    if not jd_content and req.job_url:
        fetched = fetch_job_text_from_url(req.job_url.strip())
        if fetched and len(fetched) > 50:
            jd_content = fetched

    if not jd_content or len(jd_content) < 20:
        raise HTTPException(
            status_code=400,
            detail='Please provide a valid Job Description text or a reachable Job URL.',
        )

    # 2. Resolve Candidate Information
    candidate_profile = []
    if req.resume_text:
        candidate_profile.append(f"Candidate's Full Resume:\n{req.resume_text[:18000]}")
    if req.candidate_skills:
        candidate_profile.append(f"Candidate Verified Skills: {', '.join(req.candidate_skills)}")
    if req.candidate_experience:
        candidate_profile.append(f"Candidate Background & Context: {req.candidate_experience}")

    if not candidate_profile:
        raise HTTPException(
            status_code=400,
            detail='Please provide your resume, or enter your skills and background to diff against the job.',
        )

    candidate_text = "\n\n".join(candidate_profile)

    # 3. Build Semantic Diff Prompt
    schema_template = """
Return ONLY valid JSON with this exact schema:
{
  "semantic_fit_score": 84,
  "ats_compatibility_score": 79,
  "role_title": "Extracted or Target Role Title",
  "company_name": "Target Company or Extracted Company",
  "overall_verdict": "2-3 sentence executive summary of the candidate fit, core strengths, and primary blocker for this specific opening.",
  "keyword_audit": {
    "matching_keywords": [
      {
        "keyword": "Python",
        "category": "Programming / Core",
        "status": "Verified in Resume & Projects"
      }
    ],
    "missing_ats_keywords": [
      {
        "keyword": "Kubernetes",
        "priority": "Critical ATS Filter",
        "jd_context": "Exact or summarized quote from the JD requiring this skill",
        "recommendation": "Specific resume modification or project bridge advice"
      }
    ]
  },
  "hard_requirements_audit": [
    {
      "requirement": "e.g. 3+ years experience with FastAPI/Python",
      "status": "Met",
      "evidence": "Detailed rationale based on candidate resume and projects"
    },
    {
      "requirement": "e.g. Hands-on distributed systems or cloud deployment",
      "status": "Partial",
      "evidence": "Has Docker and basic AWS knowledge, but lacks large-scale Kubernetes cluster experience"
    },
    {
      "requirement": "e.g. Master's in CS or 5+ yrs ML in production",
      "status": "Missing",
      "evidence": "Not indicated in candidate profile"
    }
  ],
  "tailored_cover_letter": "Dear Hiring Manager at [Company],\\n\\n[Paragraph 1: High energy hook linking candidate's proven experience with the exact mission in the JD]...\\n\\n[Paragraph 2: Hard proof points directly referencing candidate's specific projects and metrics that solve the company's pain points]...\\n\\n[Paragraph 3: Confident, tailored call to action]...\\n\\nSincerely,\\nCandidate",
  "interview_sprint_7day": [
    {
      "day": "Day 1",
      "focus": "Top Missing ATS Keywords & Conceptual Bridge",
      "action": "Build 1 minimal working demo or write concise notes bridging the top 2 missing skills.",
      "sample_interview_q": "How would you implement or troubleshoot [missing skill] in our production stack?"
    },
    {
      "day": "Day 2",
      "focus": "Target Company Architecture & Stack Dissection",
      "action": "Diagram this company's product flow and note latency/database trade-offs.",
      "sample_interview_q": "Why would our team choose [Tech A] over [Tech B] for this specific product?"
    },
    {
      "day": "Day 3",
      "focus": "Domain Algorithm & Live Coding Patterns",
      "action": "Complete 3 medium coding questions directly relevant to this job's core algorithms.",
      "sample_interview_q": "Implement an efficient solution to handle high throughput data streams..."
    },
    {
      "day": "Day 4",
      "focus": "Hard Requirements & STAR Project Stories",
      "action": "Draft 3 structured STAR stories specifically addressing the 'Partial' qualification items.",
      "sample_interview_q": "Tell me about a complex technical hurdle you overcame when deploying..."
    },
    {
      "day": "Day 5",
      "focus": "System Design for this Company's Core Feature",
      "action": "Whiteboard an end-to-end system design for the company's main feature.",
      "sample_interview_q": "Design the core architecture for our flagship service..."
    },
    {
      "day": "Day 6",
      "focus": "Mock Technical Screen & Pressure Test",
      "action": "Run a 45-minute timed mock screen focusing on live debugging and architecture trade-offs.",
      "sample_interview_q": "How would you handle sudden 10x traffic spikes or database deadlocks?"
    },
    {
      "day": "Day 7",
      "focus": "Strategic Reverse-Interview Questions & Final Pitch",
      "action": "Prepare 4 deep, insightful questions for the engineering manager and VP.",
      "sample_interview_q": "What is the biggest technical debt or architecture roadblock your team is tackling this quarter?"
    }
  ]
}
"""

    prompt = (
        "You are an elite Silicon Valley technical recruiter, hiring manager, and ATS semantic diff engine. "
        "Your task is to perform an uncompromising, deep semantic diff of the candidate's verified profile against the provided Job Description.\n\n"
        f"TARGET JOB POSTING / DESCRIPTION:\n"
        f"----------------------------------------\n"
        f"{jd_content[:15000]}\n"
        f"----------------------------------------\n\n"
        f"CANDIDATE PROFILE & RESUME:\n"
        f"----------------------------------------\n"
        f"{candidate_text}\n"
        f"----------------------------------------\n\n"
        "EVALUATION CRITERIA:\n"
        "1. Compute realistic Semantic Fit Score (0-100) and ATS Keyword Compatibility (0-100).\n"
        "2. Extract matching keywords and critical missing ATS keywords with exact JD context snippets.\n"
        "3. Audit all Hard Requirements from the JD, categorizing each as 'Met', 'Partial', or 'Missing' with objective evidence.\n"
        "4. Write a compelling, highly customized 3-paragraph Cover Letter that directly references the company's specific stack and the candidate's real projects.\n"
        "5. Formulate a rigorous 7-Day Technical Interview Countdown Sprint tailored to ace interviews for THIS EXACT JOB.\n\n"
        f"{schema_template}"
    )

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    try:
        response = model.generate_content(
            prompt,
            generation_config={'response_mime_type': 'application/json', 'temperature': 0.2},
        )
        data = json.loads(response.text)
        return data
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f'Gemini returned an invalid diff analysis: {error}') from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f'Job diff analysis failed: {error}') from error

