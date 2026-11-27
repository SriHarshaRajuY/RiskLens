# Contributing to RiskLens

Thank you for contributing to RiskLens! This project follows a pull-request and code-review workflow to keep the codebase reliable, well-tested, and clean.

## Branch & Pull Request Workflow

1. Create or pick a GitHub Issue describing the bug or enhancement.
2. Branch off `main` using a descriptive prefix (`feat/`, `fix/`, `chore/`, `docs/`):
   ```bash
   git checkout -b feat/your-change
   ```
3. Make focused, atomic commits using Conventional Commits (`feat:`, `fix:`, `style:`, `docs:`, `test:`, `chore:`).
4. Run all local verification checks before opening a PR:
   ```bash
   npm run lint
   npm run build
   npm --workspace server run test -- src/tests/unit
   ```
5. Open a Pull Request targeting `main`, reference the issue (`Closes #<number>`), and complete the PR checklist.

## Code Quality Standards

- **Backend (`server/`):** Keep controller/service/model boundaries clean, validate inputs with Zod, enforce user ownership on all portfolio/trade/alert queries, and invalidate Redis caches on mutations.
- **Frontend (`client/`):** Use shared UI primitives (`client/components/ui/`), invalidate relevant TanStack Query keys after mutations, and write clear, non-technical user-facing copy.
- **Zero-PII & Non-Advisory Compliance:** Any AI-assisted feature must strip PII before external calls and never generate personalized financial or trading advice.
