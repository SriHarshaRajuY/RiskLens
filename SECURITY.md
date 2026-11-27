# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RiskLens, please report it responsibly by opening a private security advisory on GitHub or contacting the repository maintainer directly. Please avoid disclosing unpatched vulnerabilities publicly.

## Security & Compliance Architecture

- **Authentication:** Short-lived HTTP-only JWT access cookies (`15m` default) paired with rotatable refresh sessions stored in MongoDB and CSRF token validation on mutating `/api/v1` endpoints.
- **Rate Limiting:** Global API rate limits (`apiRateLimiter`), strict authentication attempt throttling (`authRateLimiter`), and dedicated AI risk-summary throttling (`narrativeRateLimiter`).
- **AI Data Minimization (Zero PII):** The Descriptive Risk & Alert Narrator sends only anonymized portfolio risk ratios, top holding symbols/weights, and alert threshold statuses to the Gemini API—never user emails, names, passwords, or session tokens.
- **Non-Advisory Boundary:** System instructions and a post-generation regex compliance guardrail reject buy, sell, rebalance, or predictive statements, automatically falling back to deterministic recordkeeping summaries if triggered.
- **Secrets Management:** Never commit `.env` files or API keys (`JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`, `ALPHA_VANTAGE_API_KEY`, `GEMINI_API_KEY`). Production secrets belong strictly in deployment environment variables.
