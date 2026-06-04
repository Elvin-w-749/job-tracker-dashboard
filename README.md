# Job Tracker Dashboard

A local-first, full-stack job-application tracking dashboard. Import your
applications from CSV or Excel, paste a JD (text or screenshot) and let an LLM
parse it, score the match against your resume, and visualize the whole pipeline
on a Kanban-style analytics dashboard.

> Stack: **FastAPI + SQLAlchemy + SQLite** (backend) · **Next.js 14 + TypeScript +
> Tailwind + shadcn/ui + Recharts + TanStack Query** (frontend) · **LLM-powered**
> JD parsing and resume matching.

---

## Features

- **CSV / Excel import** — bulk-import existing application records.
- **JD smart parsing** — paste a JD as text or upload a screenshot/PDF/DOCX;
  the LLM extracts company, position, city, salary, skills, etc. as structured
  JSON.
- **Resume background extraction** — upload your resume (image / DOCX / TXT / MD)
  and the LLM produces a structured profile used for matching.
- **Match scoring** — every parsed JD is scored 0-100 against your resume
  profile, batch-processable.
- **Analytics dashboard** — Recharts visualisations of status distribution,
  city distribution, company-tier distribution, channel distribution, and
  match-score distribution.
- **Companies page** — card grid grouped by company tier.
- **Multi-user data isolation** — the header `X-User-ID` scopes every API call
  to a user; users are managed client-side via `localStorage`.

---

## Quick start

### 1. Clone

```bash
git clone <your-repo-url> job-tracker-dashboard
cd job-tracker-dashboard
```

### 2. Backend (FastAPI :8000)

The backend is a single Python project. **Python 3.10+** is required (the code
uses modern type hints like `str | None`). A virtualenv is recommended.

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The SQLite database (`backend/job_tracker.db`) is created automatically on
first run and is **gitignored** — never commit it.

### 3. Frontend (Next.js :3001)

```bash
cd frontend
npm install        # or pnpm install / yarn

# (optional) override the API base URL
cp .env.local.example .env.local
# edit .env.local if your backend is not on http://localhost:8000

npm run dev
```

Open <http://localhost:3001>.

### 4. Configure the LLM API key

The first time you open the app, click the **Settings** gear icon in the
dashboard and paste your **MiniMax API key** into the dialog. The key is
stored per-user in the local SQLite database; it is **never** sent anywhere
except to the MiniMax API endpoint.

> The project is configured to work with the MiniMax (a multimodal LLM that
> accepts both image and text inputs and returns JSON). To use a different
> provider, edit `backend/services/minimax_service.py`.

---

## Project structure

```
job-tracker-dashboard/
├── backend/                 # FastAPI app
│   ├── main.py              # All REST routes, CORS, startup migrations
│   ├── database.py          # SQLAlchemy engine + migration helper
│   ├── models.py            # Application / UserConfig / BatchTask / BatchResult
│   ├── schemas.py           # Pydantic request/response models
│   ├── patch_model.py       # One-off model patches
│   ├── prompts/             # LLM prompt templates (JD + resume)
│   └── services/
│       ├── minimax_service.py     # MiniMax LLM client (image + text)
│       └── file_parser_service.py # CSV / Excel / DOCX / TXT parsing
├── frontend/                # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx         # Entry redirect
│   │   ├── dashboard/       # Analytics dashboard
│   │   └── companies/       # Companies grid
│   ├── components/          # shadcn/ui components + custom widgets
│   ├── hooks/               # React hooks
│   ├── lib/                 # Utilities (user-context, api client, etc.)
│   └── package.json
├── .env.example             # Backend env template
├── .gitignore
├── LICENSE                  # MIT
└── README.md
```

---

## API overview

All endpoints are defined in `backend/main.py` and grouped by resource. The
following are the most important entry points:

| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/applications` | List applications (paginated, filterable) |
| `POST` | `/api/applications` | Create one application |
| `POST` | `/api/applications/import` | Bulk import CSV / Excel |
| `POST` | `/api/jd/parse-text` | Parse a JD from text |
| `POST` | `/api/jd/parse-image` | Parse a JD from an uploaded image |
| `POST` | `/api/resume/parse` | Parse a resume and store the profile |
| `POST` | `/api/batch/score` | Kick off a batch match-score job |
| `GET`  | `/api/stats/overview` | Aggregated stats for the dashboard |
| `GET`  | `/api/settings/api-key` | Check if the API key is configured |
| `POST` | `/api/settings/api-key` | Save the API key |
| `POST` | `/api/settings/api-key/test` | Verify the API key is valid |

Interactive docs are available at <http://localhost:8000/docs> once the backend
is running.

---

## Tech stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — REST framework
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM
- SQLite — embedded database
- [httpx](https://www.python-httpx.org/) — async HTTP client (LLM calls)
- [pandas](https://pandas.pydata.org/), [openpyxl](https://openpyxl.readthedocs.io/), [python-docx](https://python-docx.readthedocs.io/) — file parsing
- [uvicorn](https://www.uvicorn.org/) — ASGI server

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) — charts
- [TanStack Query](https://tanstack.com/query) — data fetching

**LLM**
- MiniMax (multimodal: image + text in, structured JSON out)

---

## Configuration reference

| Var | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `frontend/.env.local` | `http://localhost:8000` | Base URL the frontend uses to call the backend |

The MiniMax API key is **not** read from an env file — it is provided at
runtime through the Settings UI and stored per-user in SQLite.

---

## Development notes

- The backend ships with a startup migration (`migrate_add_user_id`) that
  adds the `user_id` column to legacy databases.
- `page_size` for the applications endpoint is capped at 5000 to prevent
  runaway queries.
- LLM responses may be wrapped in markdown code fences; the parser in
  `services/minimax_service.py` strips them before JSON-decoding.
- Resume DOCX content is read from **both** `doc.paragraphs` and
  `doc.tables` — many real-world resumes put experience / education inside
  tables.

---

## License

[MIT](./LICENSE) — see `LICENSE` for the full text.
