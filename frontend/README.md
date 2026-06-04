# Frontend (Next.js)

This is the Next.js 14 frontend for the **Job Tracker Dashboard**. The
project-level documentation lives at [`/README.md`](../README.md).

## Local development

```bash
npm install
cp .env.local.example .env.local   # adjust NEXT_PUBLIC_API_BASE if needed
npm run dev                        # http://localhost:3001
```

## Build

```bash
npm run build
npm run start
```

The dev server runs on port `3001` (see `package.json`).
