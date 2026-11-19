> **© 2026 Jayakiruthika G. All Rights Reserved.** This project is proprietary software created for evaluation purposes only. Commercial distribution, reproduction, or use without explicit written consent is strictly prohibited. See [`LICENSE`](LICENSE) for full terms.

# Chat_Safe × Urimai — Vercel Evaluation Build (Serverless Gemini Proxy + Zero-Config Fallback)

> **Vercel Serverless Gemini Flash Proxy** (`api/gemini.js`) · **Static PWA Output** (`public/`) · **23 Indian Languages** (English + all 22 Eighth Schedule languages) · **Zero Heavy Dependencies** (`package.json` `"type": "module"`).

- **Vercel Evaluation URL**: `https://chat-safe-vercel.vercel.app` (Live Workspace: `https://chat-safe-vercel.vercel.app/app.html`)
- **Primary Repository**: `https://github.com/G-Jayakiruthika/chat_safe_vercel`
- **Untouched Static Backup**: `https://github.com/G-Jayakiruthika/chat_safe_1`

**Chat_Safe × Urimai** is an edge-resilient cyber-defense and civic-justice platform engineered for Bharat. With a typed message, voice transcript, quick-prompt chip, or feature-phone **Speed-Dial `9`** handoff, it protects citizens from cyber fraud (**Kavach**) and transforms spoken village breakdowns into bilingual legal petitions, geo-tagged A4 PDFs, and remote CM Helpline filings (**Urimai**).

---

## 1. Zero-Friction Judge Evaluation (< 30 Seconds)

No API key prompt or blocking modal interrupts startup—open `/app.html` and evaluate immediately:

1. **Open `app.html`** (local or `https://chat-safe-vercel.vercel.app/app.html`):
   - Boots directly into the live workspace with zero blocking modals.
   - Every prompt—chat input, Web Speech mic, quick-prompt chips, keypad **Speed-Dial `9`** (click or press `9`), AI Scanner, and Guided Auto-Demo—dispatches `POST /api/gemini` with an `AbortController` timeout (`9.5 s`).
   - If `/api/gemini` returns `503` (missing `GEMINI_API_KEY`), times out, or runs offline, `analyzeIntent()` transparently routes to the deterministic **Local Fallback Simulator** with zero uncaught console errors.
2. **Click `▶ Start Auto-Demo`**:
   - **Phase 1 (Kavach Cyber Fraud Defense)**: Simulates Speed-Dial `9` with `"My CBI officer is calling me for digital arrest"`, lights up the **Agent Bus** (`Vani IVR` → `Gemini Router` → `Kavach` → `Netra PII` → `Setu O2O`), displays the structured Gemini JSON payload, and renders the **Red Scam Card** with a copyable **1930 Cybercrime Complaint** and checklist.
   - **Phase 2 (Urimai Civic Petition & PDF)**: Switches to `"Panchayat water pipe broke"`, lights up `Vani IVR` → `Gemini Router` → `Urimai` → `Setu O2O`, resolves GPS/ward coordinates, and renders the **Blue Civic Card** with an exportable **Bilingual A4 PDF Preview** (`📄 Export Bilingual PDF`) and Family Hub / CM Helpline routing.

---

## 2. Vercel Serverless Architecture

```text
+------------------------------------------------------------------------------+
|  CITIZEN ENTRY SURFACES (23 Indian Languages · RTL/LTR · WCAG 2.1 AA)        |
|  [Chat Input]  [Voice Mic]  [Quick Chips]  [Speed-Dial '9']  [Auto-Demo]     |
+--------------------------------------+---------------------------------------+
                                       |
                                       v
+------------------------------------------------------------------------------+
|  STATIC PWA SHELL (public/app.html · public/app.js · public/sw.js)           |
|  * Non-blocking startup (zero BYOK gate on load)                             |
|  * AbortController-guarded POST /api/gemini orchestration (analyzeIntent)    |
|  * 6-Node Agent Bus: Vani IVR · Gemini Router · Kavach · Urimai · Netra · Setu|
+--------------------------------------+---------------------------------------+
                                       |
               +-----------------------+-----------------------+
               | Online & /api/gemini 200 OK                   | 503 / Timeout / Offline
               v                                               v
+---------------------------------------+     +--------------------------------+
| VERCEL SERVERLESS PROXY (api/gemini.js)|    | DETERMINISTIC LOCAL SIMULATOR  |
| * Server-side process.env.GEMINI_API_KEY|   | (classifyLocalFallback +       |
| * Calls Gemini Flash REST API          |     |  public/core.js)               |
| * Strict JSON schema + XML sandboxing |     | * All 8 Kavach scam types      |
| * Clean 405 / 400 / 503 (no secrets)  |     | * All 5 Urimai civic categories|
+-------------------+-------------------+     +---------------+----------------+
                    |                                         |
                    +--------------------+--------------------+
                                         |
                                         v
             +-------------------------------------------------------+
             | UNIFIED STRUCTURED VERDICT & ACTION CARDS             |
             | * KAVACH (Red/Amber/Green): Score, 1930 Draft, Checks |
             | * URIMAI (Blue): Bilingual Petition, PDF, CM Bypass   |
             +-------------------------------------------------------+
```

---

## 3. `/api/gemini` Serverless Contract (`api/gemini.js`)

- **Endpoint**: `POST /api/gemini`
- **Upstream Model**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent` (with automatic retry on `gemini-3.8-flash:generateContent`)
- **Request JSON**:
  ```json
  {
    "prompt": "My CBI officer is calling me for digital arrest",
    "language": "ta",
    "mode": "chat"
  }
  ```
- **200 OK Structured Response**:
  ```json
  {
    "intent": "SCAM",
    "confidence_score": 96,
    "active_agents": ["vani", "gemini", "kavach", "netra"],
    "summary": "Digital arrest impersonation fraud detected.",
    "action_draft": "NATIONAL CYBER CRIME REPORTING PORTAL (1930)...",
    "checklist": [
      "Hang up immediately — real police never arrest on video calls.",
      "Report on Helpline 1930 or https://cybercrime.gov.in."
    ]
  }
  ```
- **Error Handling**:
  - `405`: Non-`POST` methods (`Allow: POST`).
  - `400`: Invalid JSON, non-object payload, or missing/empty `prompt`.
  - `503`: Missing server API key, upstream error, or timeout — returns `{ "error": "...", "fallback": true }` cleanly without exposing secret names or stack traces.

---

## 4. Local Fallback Coverage (Zero-Config Deterministic Classifier)

When `/api/gemini` is unavailable or offline, `public/app.js` (`window.ChatSafeFallback.classify`) deterministically classifies:

- **Kavach Cyber Scams (`intent: "SCAM"`) — All 8 Fraud Vectors + Blackmail**:
  1. `digital_arrest` (CBI / NCB / ED / police video arrest)
  2. `kyc_otp` (KYC expiry, bank/SIM block, OTP/PIN/APK screen-share)
  3. `fake_investment` (SEBI VIP stock tips, guaranteed daily returns)
  4. `courier_parcel` (FedEx/DHL/India Post customs drugs or tracking-fee trap)
  5. `electricity_bill` (midnight power-cut threat / unpaid DISCOM scam)
  6. `task_job` (YouTube likes / prepaid WFH tasks)
  7. `reward_bill` (KBC / lottery / lucky draw processing fee)
  8. `family_voice` (AI voice cloning / new-number emergency transfer)
  - Plus `sextortion_loan` blackmail and safe-message guardrails (`0–25` risk tier).
- **Urimai Civic Breakdowns (`intent: "CIVIC"`)**:
  1. `water_pipe` (broken water pipes, leaks, drinking water failure)
  2. `damaged_road` (potholes, damaged streets, culverts)
  3. `street_light` (non-working streetlights, lamp posts, fallen wires)
  4. `sanitation` (sewage/drainage overflow, garbage collection)
  5. `municipal_petition` (Gram Panchayat, municipality, ward grievances)

---

## 5. Deployment & Local Verification

### Vercel Setup
1. Import `G-Jayakiruthika/chat_safe_vercel` into Vercel (`vercel.json` sets `"outputDirectory": "public"` and security headers).
2. Add `GEMINI_API_KEY` in **Vercel Project Settings → Environment Variables** (Production, Preview, and Development).
3. Deploy — `/api/gemini` runs server-side automatically, while offline/unconfigured environments use the built-in local fallback.

### Local Verification Commands
```bash
node --check api/gemini.js
node --check public/app.js
npm test
```

All tests run with Node.js built-in `node --test` (`>= 20`) and zero third-party runtime dependencies.
