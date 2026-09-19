import io
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Optional

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
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail='GEMINI_API_KEY is not configured in backend/.env.')
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

    prompt = f'''You are a world-class empathetic career intelligence advisor and technical mentor. Analyze this learner profile against the current 2026 job market. Return ONLY valid JSON, no markdown fences. Never invent specific course URLs; use official or widely known URLs only and set url to https://www.google.com/search?q=... when uncertain.

Learner Profile:
- Target Role: {profile.target_role}
- Current Role / Background: {profile.current_role}
- Known Skills: {", ".join(profile.known_skills)}
- Skill Level: {profile.skill_level}
- Learning Goal: {profile.learning_goal}
- Weekly Time: {profile.weekly_hours}
- Timeline: {profile.timeline}

{about_you_section}

{resume_instruction}

Special Instructions:
- Carefully tailor the advice, tone, and recommended resources to their "About You" personal context, current commitments, and their preferred learning style (e.g., if hands-on project based vs. video courses vs. documentation).
- In the "summary", acknowledge their background story and uniquely encourage their strengths.

Return this exact shape:
{{
  "readiness_score": number (0-100),
  "summary": string,
  "start_here": string,
  "resume_strengths": [string],
  "personalized_tip": string,
  "missing_skills": [
    {{
      "skill": string,
      "priority": "critical" | "high" | "medium",
      "gap": string,
      "why": string
    }}
  ],
  "roadmap": [
    {{
      "phase": string,
      "focus": string,
      "outcome": string
    }}
  ],
  "resources": [
    {{
      "title": string,
      "provider": string,
      "type": "course" | "docs" | "project" | "community",
      "level": string,
      "url": string,
      "why": string
    }}
  ]
}}
Include 4-6 skill gaps, 3-4 roadmap phases, and 5 resources matching their preferred style. Prioritize skills employers actually ask for now, explain tradeoffs, and make the sequence fit the learner's hours and timeline.'''

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
