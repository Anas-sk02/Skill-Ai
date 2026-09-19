import json
import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai

app = FastAPI(title='SkillGap.ai API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(','), allow_methods=['GET', 'POST'], allow_headers=['*'])

class Profile(BaseModel):
    target_role: str = Field(min_length=2, max_length=120)
    current_role: str = Field(min_length=2, max_length=160)
    known_skills: list[str] = Field(min_length=1, max_length=20)
    skill_level: str = Field(min_length=2, max_length=40)
    learning_goal: str = Field(min_length=5, max_length=500)
    weekly_hours: str = Field(min_length=2, max_length=30)
    timeline: str = Field(min_length=2, max_length=30)

@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'skillgap-api'}

@app.post('/analyze')
def analyze(profile: Profile) -> dict[str, Any]:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail='GEMINI_API_KEY is not configured on the server.')
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f'''You are a senior career intelligence analyst. Analyze this learner profile against the current 2026 job market. Return ONLY valid JSON, no markdown fences. Never invent specific course URLs; use official or widely known URLs only and set url to https://www.google.com/search?q=... when uncertain.

Profile:
{profile.model_dump_json(indent=2)}

Return this exact shape: {{"readiness_score": number 0-100, "summary": string, "start_here": string, "missing_skills": [{{"skill": string, "priority": "critical|high|medium", "gap": string, "why": string}}], "roadmap": [{{"phase": string, "focus": string, "outcome": string}}], "resources": [{{"title": string, "provider": string, "type": "course|docs|project|community", "level": string, "url": string, "why": string}}]}}. Include 4-6 skill gaps, 3-4 roadmap phases, and 5 resources. Prioritize skills employers actually ask for now, explain tradeoffs, and make the sequence fit the learner's hours and timeline.'''
    try:
        response = model.generate_content(prompt, generation_config={'response_mime_type': 'application/json', 'temperature': 0.2})
        data = json.loads(response.text)
        return data
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f'Gemini returned an invalid analysis: {error}') from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f'Gemini analysis failed: {error}') from error
