> **© 2026 Jayakiruthika G. All Rights Reserved.** This project is proprietary software created for evaluation purposes only. Commercial distribution, reproduction, or use without explicit written consent is strictly prohibited. See [`LICENSE`](LICENSE) for full terms.

# Chat_Safe × Urimai — Vercel Evaluation Build (Serverless Gemini Proxy + Zero-Config Fallback)

> **Vercel Serverless Gemini Flash Proxy** (`api/gemini.js`) · **Static PWA Output** (`public/`) · **23 Indian Languages** (English + all 22 Eighth Schedule languages) · **Zero External Runtime Dependencies** (`package.json` `"type": "module"`).

- **Vercel Evaluation URL**: `https://chat-safe-vercel.vercel.app` (Live Workspace: `https://chat-safe-vercel.vercel.app/app.html`)
- **Primary Repository**: `https://github.com/G-Jayakiruthika/chat_safe_vercel`
- **Untouched Static Backup**: `https://github.com/G-Jayakiruthika/chat_safe_1`

**Chat_Safe × Urimai** is an edge-resilient cyber-defense and civic-justice platform built for Bharat. From typed chat, voice transcripts, quick-prompt chips, or a feature-phone **Speed-Dial `9`** IVR handoff, it protects citizens against cyber fraud (**Kavach**) and transforms spoken village breakdowns into bilingual legal petitions, geo-tagged A4 PDFs, and remote CM Helpline filings (**Urimai**).

---

## 1. Architecture Summary

```text
+------------------------------------------------------------------------------+
|  CITIZEN ENTRY SURFACES (23 Indian Languages · RTL/LTR · WCAG 2.1 AA)        |
|  [Chat Input]  [Voice Mic]  [Quick Chips]  [Speed-Dial '9']  [Auto-Demo]     |
+--------------------------------------+---------------------------------------+
                                       |
                                       v
+------------------------------------------------------------------------------+
|  STATIC PWA SHELL (public/app.html · public/app.js · public/sw.js)           |
|  * Non-blocking startup (deferred theme.js & avatars, instant hero/hint paint)|
|  * AbortController-guarded POST /api/gemini orchestration (10.5s client cap) |
|  * 6-Node Agent Bus: Vani IVR · Gemini Router · Kavach · Urimai · Netra · Setu|
+--------------------------------------+---------------------------------------+
                                       |
               +-----------------------+-----------------------+
               | Online & /api/gemini 200 OK                   | 503 / 504 / Offline
               v                                               v
+---------------------------------------+     +--------------------------------+
| VERCEL SERVERLESS PROXY (api/gemini.js)|    | DETERMINISTIC LOCAL SIMULATOR  |
| * Server-side process.env.GEMINI_API_KEY|   | (classifyLocalFallback +       |
| * Direct gemini-3.8-flash POST (9s cap)|    |  public/core.js)               |
| * thinkingBudget: 0 + auto-retry on 400|    | * All 8 Kavach scam vectors    |
| * Key redaction + partial JSON recovery|    | * All 5 Urimai civic categories|
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

### Key Modules
- [`api/gemini.js`](api/gemini.js) — Stateless Vercel Serverless Function (`maxDuration: 30` in `vercel.json`) validating `process.env.GEMINI_API_KEY`, calling `gemini-3.8-flash:generateContent` with `thinkingBudget: 0` (and automatic retry without `thinkingConfig` if rejected with HTTP `400`), recovering truncated JSON, redacting keys from errors, and enforcing a `9000ms` `AbortController` timeout.
- [`public/app.js`](public/app.js) — Client orchestrator routing prompts through `/api/gemini` with automatic fallback to `window.ChatSafeFallback`, updating the 3D Kavach avatar, Google Maps / Safe Browsing widgets, Family Hub, and Scanner UI.
- [`public/core.js`](public/core.js) — Deterministic offline engine powering scam analysis, SEBI `@valid` UPI checks, Netra PII redaction, Urimai kit generation, Autopilot batch scanning, and Kamala Paati decoy replies.
- [`public/i18n.js`](public/i18n.js) — Localization catalog for 23 Indian languages (`English` + 22 Eighth Schedule languages) with RTL/LTR direction metadata and Web Speech BCP-47 tags.
- [`public/pdf.js`](public/pdf.js) — Unicode-safe bilingual A4 petition PDF generator with photo embedding and a 5-resident signature block.
- [`public/avatar.js`](public/avatar.js) & [`public/agentAvatars.js`](public/agentAvatars.js) — Canvas 2D 3D-projected guardian and 8-agent squad visuals with `ResizeObserver`/`IntersectionObserver` caching to avoid forced synchronous reflows.

---

## 2. Core Workflows: Kavach & Urimai

### Kavach (Cyber Scam Defense)
1. **Intent Classification & 3-Tier Scoring**: Evaluates text/voice transcripts across all **8 fraud vectors** (`digital_arrest`, `kyc_otp`, `fake_investment`, `courier_parcel`, `electricity_bill`, `task_job`, `reward_bill`, `family_voice`) plus `sextortion_loan` blackmail, assigning `SAFE` (`0–25`), `MODERATE` (`26–65`), or `CRITICAL` (`66–100`) tiers.
2. **Safe Browsing & Pay-Check**: Scans extracted URLs against Google Safe Browsing v4 (or local phishing domain heuristics) and verifies broker UPI handles against SEBI `@valid` rules.
3. **Golden-Hour Escalation**: Generates a ready-to-file **1930 Cybercrime Portal** draft, triggers a Family SOS alert on critical scams, and offers **Kamala Paati** decoy responses for scam-baiting practice.

### Urimai (Civic Grievance & Legal Petitions)
1. **Button-Phone Speed-Dial `9`**: Elders press `9` on the keypad simulator (or dial via IVR) and describe village issues across **5 municipal categories** (`water_pipe`, `damaged_road`, `street_light`, `sanitation`, `municipal_petition`).
2. **GPS Ward Resolution & Bilingual Drafting**: Acquires browser GPS / Google Maps ward coordinates and produces a formal English legal petition paired with a regional-script draft.
3. **O2O + Digital-First Execution**:
   - **Local O2O PDF**: Attaches a street photo and downloads a print-ready bilingual A4 petition with a 5-resident signature table.
   - **Digital-First CM Helpline Bypass**: One-click character-bounded copy/paste into State CM Helpline portals (`Mudhalvarin Mugavari`, `CPGRAMS`, etc.).
   - **Local Proxy WhatsApp Handoff**: Sends a [`proxy.html`](public/proxy.html) upload link to a trusted neighbor or e-Seva operator when family members live away.

---

## 3. Multilingual Support & Local Fallback Resilience

- **23 Indian Languages**: Full support for English and all 22 Eighth Schedule languages (`as`, `bn`, `brx`, `doi`, `gu`, `hi`, `kn`, `ks`, `kok`, `mai`, `ml`, `mni`, `mr`, `ne`, `or`, `pa`, `sa`, `sat`, `sd`, `ta`, `te`, `ur`), automatic RTL (`ks`, `sd`, `ur`) and LTR layout synchronization, and localized `SpeechRecognition` / `speechSynthesis` inside error boundaries.
- **Zero-Throw Local Fallback**: Whenever `GEMINI_API_KEY` is absent (`503`), upstream times out (`504`), or the user is offline (`navigator.onLine === false`), `analyzeIntent()` transparently delegates to `runMockFallbackEngine()` (`classifyLocalFallback` + `public/core.js`) so users and evaluators never encounter a blocked or broken UI.

---

## 4. Serverless Contract (`POST /api/gemini`)

- **Request**: `{ "prompt": "...", "language": "ta", "mode": "chat" }` (`prompt` required, trimmed and capped at 1500 chars; non-`POST` returns `405`, invalid JSON/missing prompt returns `400`).
- **Success (`200 OK`)**:
  ```json
  {
    "intent": "SCAM",
    "confidence_score": 96,
    "active_agents": ["vani", "gemini", "kavach", "netra", "setu"],
    "summary": "Digital arrest impersonation fraud detected.",
    "action_draft": "NATIONAL CYBER CRIME REPORTING PORTAL (1930)...",
    "checklist": ["Hang up immediately.", "Report at 1930 or cybercrime.gov.in."],
    "text": "...",
    "model": "gemini-3.8-flash"
  }
  ```
- **Fallback Diagnostics (`503`)**: Returns `{ "error": "...", "fallback": true, ... }` with `stage: "missing_key"` or `upstreamStatus`/`upstreamBody`, redacting all credentials.

---

## 5. Deployment & Verification

### Vercel Setup
1. Import `G-Jayakiruthika/chat_safe_vercel` into Vercel (`vercel.json` configures `outputDirectory: "public"`, `api/gemini.js` `maxDuration: 30`, and strict security headers).
2. Add `GEMINI_API_KEY` under **Vercel Project Settings → Environment Variables**.

### Local Verification
```bash
node --check api/gemini.js
node --check public/app.js
npm test
```

`npm test` runs Node's built-in test runner (`node --test test/*.test.js tests/*.test.js`) with zero external dependencies, covering scam/civic classification, prompt/input validation, `api/gemini.js` error/timeout/retry handling, UI responsive rules, and local fallback resilience.
