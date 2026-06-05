# VisaFlow — Online-Based Visa Granted and Renewal Information System (Futuristic Edition)

## Overview

A full-stack AI-driven visa processing system with blockchain integration, real-time status tracking, and an AI chatbot assistant — built as a final-year Computer Science project.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Shadcn UI + Tailwind CSS (futuristic dark/light theme)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: Google Gemini 1.5 Flash — document verification, risk scoring, chatbot
- **Auth**: Custom token-based auth (localStorage)

## System Features

### Futuristic Modules:
1. **AI Document Verification** — Simulated OCR and authenticity checking via Gemini
2. **AI Fraud Detection & Risk Scoring** — Predictive risk model (Low/Medium/High) with score 0-100
3. **Blockchain Visa Ledger** — SHA-256 hash chain with block index, nonce, merkle root, and TX IDs
4. **AI Chatbot (VisaBot)** — Gemini-powered assistant for renewal guidance and questions
5. **Real-Time Status Pipeline** — 6-stage visual tracker: Document Submission → AI Verification → Security Check → Risk Assessment → Blockchain Entry → Decision

### User Roles:
- **Applicant** — Submit applications, upload documents, track status, chat with AI
- **Officer** — Review all applications, run AI analysis, advance stages, grant/deny visas
- **Admin** — Same as officer

## Demo Accounts

| Role | Email | Password | Country |
|------|-------|----------|---------|
| Applicant | demo@example.com | demo123 | — |
| USA Officer | usa_officer@visa.com | usa123 | USA |
| China Officer | china_officer@visa.com | china123 | China |
| UK Officer | uk_officer@visa.com | uk123 | UK |
| Canada Officer | canada_officer@visa.com | canada123 | Canada |
| Australia Officer | australia_officer@visa.com | australia123 | Australia |
| India Officer | india_officer@visa.com | india123 | India |
| Admin | admin@visa.com | admin123 | — |

## Key Pages

| Route | Description |
|-------|-------------|
| `/auth` | Login/Register |
| `/dashboard` | Applicant dashboard or officer overview |
| `/applications/new` | New visa application form |
| `/applications/:id` | Application detail with timeline, AI tools, blockchain |
| `/officer` | Officer control center |
| `/blockchain` | Blockchain ledger explorer with verify tool |
| `/chat` | VisaBot AI assistant |

## Database Schema

- `users` — Applicants and officers
- `visa_applications` — All applications with AI data and blockchain hashes
- `documents` — Uploaded docs with AI verification results
- `status_timeline` — Per-application 6-stage pipeline
- `chat_messages` — VisaBot conversation history
- `blockchain_ledger` — Immutable blockchain records

## API Endpoints

- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET /api/applications` — Get user applications
- `POST /api/applications` — Create application
- `POST /api/applications/:id/upload` — Upload document file to Supabase Storage (multipart)
- `POST /api/applications/:id/risk-score` — Run AI risk scoring
- `POST /api/documents/:docId/verify` — Run AI document verification
- `POST /api/applications/:id/blockchain/issue` — Issue blockchain visa
- `GET /api/blockchain/ledger` — View blockchain ledger
- `GET /api/blockchain/verify/:hash` — Verify visa on chain
- `POST /api/officer/applications/:id/grant` — Officer grant decision
- `POST /api/officer/applications/:id/deny` — Officer deny decision
- `POST /api/chat/send` — Send message to VisaBot

## Environment Variables

- `NEON_DATABASE_URL` — Neon PostgreSQL connection string
- `GEMINI_API_KEY` — Google Gemini API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public API key

## Supabase Storage

Documents are uploaded to a Supabase Storage bucket named `documents` (must be public).
- Applicants upload real files (images, PDFs) when submitting applications
- Files are stored at path: `app-{appId}/{documentType}-{timestamp}.{ext}`
- Public URLs are saved in the `documents.file_url` column
- Officers can preview images inline and open PDFs/files via direct links in the Document Review panel

## Architecture

```
React Frontend
  ↓ REST API (token auth)
Express Backend
  ├── Anthropic Claude (risk scoring, doc verify, chatbot)
  ├── Blockchain Engine (SHA-256, hash chain)
  └── PostgreSQL (Drizzle ORM)
```
