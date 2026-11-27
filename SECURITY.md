# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RiskLens, please report it responsibly by opening a private security advisory on GitHub or contacting the repository maintainer directly. Please avoid disclosing unpatched vulnerabilities publicly.

## Security & Compliance Architecture

- **Authentication:** Short-lived HTTP-only JWT access cookies (`15m` default) paired with rotatable refresh sessions stored in MongoDB and CSRF token validation on mutating `/api/v1` endpoints.
- **Rate Limiting:** Global API rate limits (`apiRateLimiter`), strict authentication attempt throttling (`authRateLimiter`), and dedicated AI risk-summary throttling (`narrativeRateLimiter`).
- **AI Data Minimization (Zero PII):** The Portfolio Q&A Assistant sends only anonymized portfolio risk ratios, holdings, recent snapshots, recent trades, and alert threshold statuses to the Gemini API—never user emails, names, passwords, or session tokens.
- **Non-Advisory Boundary:** Pre-LLM question screening and a post-generation compliance guardrail reject buy, sell, rebalance, or predictive statements, automatically returning a policy boundary notice or falling back to deterministic recordkeeping answers.
- **Secrets Management:** Never commit `.env` files or API keys (`JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`, `ALPHA_VANTAGE_API_KEY`, `GEMINI_API_KEY`). Production secrets belong strictly in deployment environment variables.
