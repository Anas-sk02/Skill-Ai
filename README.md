# SkillGap.ai 🚀

An AI-powered career intelligence and skill gap analysis tool. Built with Next.js, FastAPI, and Google Gemini 2.5 Flash.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, TypeScript, Lucide Icons
- **Backend**: Python FastAPI, Pydantic, Google Generative AI (Gemini Flash)
- **Package Manager**: pnpm / npm

---

## ⚡ Quick Start

### 1. Configure Backend Environment
Create or edit `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=http://localhost:3000
```

### 2. Run the App (One-Click)
Double click `start-dev.bat` or run:
```powershell
.\start-dev.bat
# or
.\start-dev.ps1
```

---

## 💻 Manual Setup

### Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)
```powershell
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
