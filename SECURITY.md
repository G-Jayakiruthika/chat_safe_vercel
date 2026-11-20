# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.
Email the maintainer through the contact on the [LinkedIn profile](https://www.linkedin.com/in/jayakiruthikag/)
or open a [private security advisory](https://github.com/G-Jayakiruthika/chat_safe_vercel/security/advisories/new).
You will get a reply within 72 hours.

## How the app protects users

| Area | Protection |
|---|---|
| API key | `GEMINI_API_KEY` lives only in Vercel environment variables. It is sent to Google in the `x-goog-api-key` header, never in a URL, and is redacted from every log line and error body. |
| Input | `/api/gemini` accepts `POST` only, validates the JSON body, and caps prompts at 1,500 characters. |
| Abuse | Per-IP rate limit (20 requests / minute) returns `429` with `Retry-After`. |
| Availability | Each Gemini call has its own timeout; a backup model is tried, then the offline rule engine answers. |
| Browser | Strict Content-Security-Policy (`script-src 'self'`, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. |
| Output | Every model or user string is passed through `escapeHtml()` before it is written to the page. |
| Privacy | PII (phone numbers, account numbers, UPI IDs, Aadhaar) is masked before analysis when redaction is on. Nothing is stored on the server. |
