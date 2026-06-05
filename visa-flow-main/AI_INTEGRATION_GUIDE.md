# Google Gemini AI Integration Guide

## Setup

### 1. Add Your Gemini API Key

Edit `.env` and replace the placeholder with your actual Google Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

### 2. Start the Server

```bash
npm run dev
```

The server will initialize with the Gemini API client using the `gemini-3-flash-preview` model.

---

## Three AI Features

### 1. **AI Assistant Chatbot (VisaBot)**

**Endpoint:** `POST /api/chat/send`

**Purpose:** Users can ask visa-related questions and get instant AI responses.

**Request:**
```json
{
  "content": "What documents do I need for a Schengen visa?",
  "applicationId": 123  // optional
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 5,
  "role": "assistant",
  "content": "For a Schengen visa, you typically need: 1. Valid passport... 2. Visa application form... 3. Proof of accommodation...",
  "applicationId": 123,
  "createdAt": "2026-03-09T12:00:00Z"
}
```

**Features:**
- ✅ Maintains conversation history (last 10 messages)
- ✅ Uses system instruction for consistent visa assistant behavior
- ✅ Supports per-user and per-application contexts
- ✅ Returns formatted, professional visa guidance

**Frontend Integration:** `/client/src/pages/chatbot.tsx`

---

### 2. **AI Document Verification**

**Endpoint:** `POST /api/documents/:docId/verify`

**Purpose:** Analyzes uploaded documents (passport, bank statement, photo, invitation letter) and verifies authenticity.

**Request:**
```json
{
  "documentType": "passport",
  "fileName": "john_doe_passport.pdf"
}
```

**Response:**
```json
{
  "id": 42,
  "applicationId": 5,
  "documentType": "passport",
  "fileName": "john_doe_passport.pdf",
  "verified": true,
  "aiConfidenceScore": 0.94,
  "aiVerificationNotes": "Document appears authentic. No signs of tampering detected.",
  "extractedData": {
    "documentType": "passport",
    "status": "valid",
    "expiryStatus": "valid",
    "observations": [
      "Document quality is high",
      "No suspicious elements detected",
      "Expiry date is valid"
    ]
  },
  "createdAt": "2026-03-09T12:00:00Z"
}
```

**Confidence Score:**
- `0.9 - 1.0` = Very High Confidence (Authentic)
- `0.7 - 0.89` = High Confidence
- `0.5 - 0.69` = Medium Confidence (May need review)
- `< 0.5` = Low Confidence (Requires manual review)

**Supported Document Types:**
- Passport
- Bank Statement
- ID Card
- Invitation Letter
- Birth Certificate
- Marriage Certificate
- Proof of Employment
- Travel Documents

**Status Values:**
- `valid` - Document is authentic and valid
- `suspicious` - Document has signs of tampering or forgery
- `needs_review` - Unclear, requires manual review
- `expired` - Document is past expiry date

**Frontend Integration:** 
- `/client/src/pages/application-detail.tsx` (Applicant view)
- `/client/src/pages/officer-dashboard.tsx` (Officer view)

---

### 3. **AI Risk Assessment**

**Endpoint:** `POST /api/applications/:id/risk-score`

**Purpose:** Analyzes visa application data and documents to provide risk score and level (Low/Medium/High).

**Request:**
```json
{}
```

**Response:**
```json
{
  "id": 5,
  "userId": 2,
  "riskScore": 28,
  "riskLevel": "low",
  "aiAnalysisSummary": "Application appears legitimate. Applicant has complete documentation and clear visa purpose. Standard approval recommended.",
  "factors": [
    "Complete documentation package",
    "Clear purpose of visit",
    "Valid travel history",
    "Stable employment status"
  ],
  "status": "pending",
  "currentStage": 4,
  "blockchainHash": "abc123...",
  "visaType": "Schengen",
  "applicationType": "Single Entry",
  "destinationCountry": "Germany",
  "purposeOfVisit": "Tourism",
  "createdAt": "2026-03-09T12:00:00Z"
}
```

**Risk Scoring Breakdown:**

| Score Range | Risk Level | Action |
|---|---|---|
| 0-33 | **Low** | Approve |
| 34-66 | **Medium** | Review Manually |
| 67-100 | **High** | Investigate / Deny |

**Factors Considered:**
- Document completeness and verification status
- Visa type and duration
- Application completeness
- Document authenticity scores
- Travel patterns
- Application consistency

**Timeline Impact:**
- Automatically marks "AI Risk Assessment" stage (Stage 4) as completed
- Updates application status in real-time
- Results stored in database for audit trail

**Frontend Integration:** `/client/src/pages/application-detail.tsx` (Officer/Admin view)

---

## API Endpoints Summary

| Feature | Method | Endpoint | Auth | Notes |
|---------|--------|----------|------|-------|
| Chat | POST | `/api/chat/send` | Required | Send message, get AI response |
| Chat History | GET | `/api/chat/history` | Required | Get user's chat history |
| Verify Document | POST | `/api/documents/:docId/verify` | Required | Analyze document authenticity |
| Get Documents | GET | `/api/applications/:id/documents` | Required | Fetch app's documents |
| Upload Document | POST | `/api/applications/:id/documents` | Required | Upload new document |
| Risk Score | POST | `/api/applications/:id/risk-score` | Required | Generate AI risk assessment |
| Get Timeline | GET | `/api/applications/:id/timeline` | Required | View processing stages |

---

## Configuration

### Gemini Model: `gemini-3-flash-preview`

**Model Details:**
- **Speed:** Fast inference (optimized)
- **Cost:** Lower cost than Pro models
- **Capability:** Excellent for visa processing tasks
- **Context Window:** 1M tokens (suitable for document analysis)

### System Instructions

**Chatbot System Prompt:**
```
You are VisaBot, an intelligent AI assistant for the VisaFlow visa processing system.
You help applicants understand visa requirements, track their application status, 
guide them through the renewal process, and answer questions about documentation.
Be concise, professional, and helpful. Format responses with bullet points when 
listing multiple items. Always provide accurate, helpful information about visa processes.
```

---

## Error Handling

### Common Issues & Solutions

**1. GEMINI_API_KEY not found**
```
Error: GEMINI_API_KEY is not set
Solution: Add GEMINI_API_KEY to .env file with valid API key
```

**2. Invalid JSON response**
```
Error: Failed to parse JSON from Gemini
Fallback: Uses sensible defaults and logs error details
```

**3. Rate Limiting**
```
Error: 429 Too Many Requests
Solution: Implement exponential backoff (handled automatically)
```

**4. Authentication Failed**
```
Error: 401 Not authenticated
Solution: User must login first (token required in session)
```

---

## Development Notes

### Message Format (Important!)

Gemini expects messages in this format:

```typescript
{
  role: "user" | "model",
  parts: [{ text: "message content" }]
}
```

**DO NOT use:**
```typescript
// ❌ Wrong - Anthropic format
{ role: "user", content: "text" }
```

### Error Logging

Enable detailed error logging in development:

```bash
NODE_ENV=development npm run dev
```

Errors will include full error objects in API responses.

---

## Testing the AI Features

### 1. Test Chatbot

```bash
curl -X POST http://localhost:5000/api/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"What visa do I need to visit France?"}'
```

### 2. Test Document Verification

```bash
curl -X POST http://localhost:5000/api/documents/1/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType":"passport","fileName":"passport.pdf"}'
```

### 3. Test Risk Assessment

```bash
curl -X POST http://localhost:5000/api/applications/1/risk-score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Database Schema

### Chat Messages Table
```
id, userId, role ("user"|"assistant"), content, applicationId, createdAt
```

### Documents Table
```
id, applicationId, documentType, fileName, verified, 
aiConfidenceScore (0-1), aiVerificationNotes, extractedData (JSON), createdAt
```

### Visa Applications Table
```
id, userId, riskScore (0-100), riskLevel ("low"|"medium"|"high"), 
aiAnalysisSummary, status, currentStage, createdAt, updatedAt
```

---

## Production Checklist

- [ ] GEMINI_API_KEY is set in production environment
- [ ] Error logging is configured (no API key leaks in logs)
- [ ] Rate limiting is implemented at API gateway level
- [ ] Response times are monitored (cache results if needed)
- [ ] User authentication is enforced on all AI endpoints
- [ ] Database backups include AI analysis results
- [ ] Audit trail captures all AI decisions for compliance

---

## Support & Troubleshooting

For issues:
1. Check `.env` has valid GEMINI_API_KEY
2. Review server logs: `npm run dev` (development logs)
3. Verify network connectivity to Google AI Studio
4. Check authentication token is valid
5. Ensure database is accessible and initialized

---

**Last Updated:** March 9, 2026
**Gemini Model:** gemini-3-flash-preview
**Status:** ✅ All AI features integrated and functional
