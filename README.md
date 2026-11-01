# Code Review Bot Dashboard (CodeRefine AI)

An AI-powered developer tool that automates code review. Paste a snippet, upload files, or connect a Git repository and get structured reviews from a Large Language Model: issues grouped by severity, suggested fixes, and best-practice checks, all in a developer-friendly UI with syntax highlighting and inline suggestions.

---

## Features

### User Management & Access
1. **Registration / Login**: email, GitHub, or GitLab authentication
2. **User Profile**: preferences, default programming languages, API keys
3. **Team Workspaces**: organizations/teams that share code reviews
4. **Role-Based Access Control**: Admin, Reviewer, and Developer roles

### Code Input Methods
5. **Direct Snippet Paste**: syntax-highlighted text area for instant review
6. **File Upload**: `.js`, `.py`, `.java`, `.cpp`, and more
7. **Repository Integration**: GitHub OAuth to pull recent commits or pull requests
8. **Multi-File Review**: submit related files together for better AI context
9. **Language Auto-Detection**: detects the language of submitted code

### AI Code Analysis
10. **Bug Detection**: syntax errors, logic flaws, potential runtime errors
11. **Security Vulnerability Scanning**: SQL injection, hardcoded secrets, etc.
12. **Performance Optimization**: time/space complexity improvements
13. **Style & Formatting Checks**: PEP8, ESLint-style rules
14. **Severity Tagging**: Critical, High, Medium, Low

### Review Output & Interaction
15. **Inline Suggestions**: suggestions shown beside the relevant lines
16. **One-Click Fixes**: "Apply Fix" replaces the flagged code with the suggestion
17. **Side-by-Side Diff Viewer**: added/removed lines between original and optimized code
18. **Chat Context**: ask follow-up questions about a review
19. **Export Review Report**: download as PDF or Markdown

### History & Analytics
20. **Review History**: searchable archive of past reviews
21. **Code Quality Metrics**: code health, common mistakes, trends over time
22. **Snippet Saving**: bookmark reviews or snippets

### Configuration & Settings
23. **Custom Review Rules**: team-defined instructions (e.g. "Always suggest React functional components")
24. **Notification System**: email or in-app alerts when large repository scans finish
25. **Dark Mode IDE Theme**: dark theme optimized for reading code
26. **API Access**: REST endpoints to trigger reviews from CI/CD pipelines

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS 4, Lucide icons, Motion |
| Backend | Node.js, Express (`server.ts`), TypeScript |
| AI | Google Gemini via `@google/genai` |
| Auth | Firebase Authentication (client SDK + `firebase-admin` on the server) |
| Database | PostgreSQL (`pg`) with Drizzle ORM / Drizzle Kit |
| Tooling | `tsx`, `esbuild`, Bun lockfile |

---

## Getting Started

### Prerequisites
- Node.js 20+ (or [Bun](https://bun.sh))
- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A Firebase project with Authentication enabled
- A PostgreSQL database (if using the Drizzle-backed features)

### Installation

```bash
git clone https://github.com/sadhana-0705/code-review-bot-dashboard.git
cd code-review-bot-dashboard

# install dependencies
npm install        # or: bun install

# configure environment
cp .env.example .env
# edit .env and fill in your keys (see below)

# start the dev server
npm run dev
```

The app starts via `tsx server.ts` (Express serves the API and the Vite-powered frontend).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build the frontend with Vite |
| `npm start` | Run the server |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run clean` | Remove build output |

---

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Gemini API key used for code analysis |
| `APP_URL` | URL where the app is hosted (used for OAuth callbacks and links) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_OAUTH_CLIENT_ID` | OAuth client ID for provider sign-in |
| `FIREBASE_PROJECT_ID` | Project ID used by `firebase-admin` on the server |
| `STRIPE_SECRET_KEY` | Only needed if you enable payments (inherited from the template) |

> Never commit your `.env` file or real keys. `.env` is already covered by `.gitignore`.

---

## REST API

Trigger reviews from your CI/CD pipeline using an API key generated from your profile.

```
Authorization: Bearer <YOUR_API_KEY>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/reviews` | Submit code (snippet, files, or repo reference) |
| `GET` | `/api/v1/reviews/:id` | Get review status and findings |
| `GET` | `/api/v1/reviews` | List/search past reviews |
| `POST` | `/api/v1/reviews/:id/chat` | Ask a follow-up question |
| `GET` | `/api/v1/reviews/:id/export?format=pdf\|md` | Export the report |

> These routes are the planned API surface. Adjust them to match your implementation in `server.ts`.

Example:

```bash
curl -X POST "$APP_URL/api/v1/reviews" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "language": "auto", "files": [{ "path": "app.py", "content": "..." }] }'
```

---

## Project Structure

```
.
├── src/                    # React frontend
├── server.ts               # Express server (API + app hosting)
├── index.html              # Vite entry
├── vite.config.ts
├── tsconfig.json
├── firebase-applet-config.json
├── metadata.json
├── .env.example
└── package.json
```

---

## Roles

| Capability | Admin | Reviewer | Developer |
|------------|:-----:|:--------:|:---------:|
| Manage workspace & members | ✅ | ❌ | ❌ |
| Define custom review rules | ✅ | ✅ | ❌ |
| Submit code for review | ✅ | ✅ | ✅ |
| View team reviews | ✅ | ✅ | Own + shared |
| Apply fixes / export reports | ✅ | ✅ | ✅ |

---

## Roadmap

- [ ] Authentication (email, GitHub, GitLab)
- [ ] Snippet paste, file upload, language detection
- [ ] Gemini analysis pipeline with severity tagging
- [ ] Inline suggestions, diff viewer, one-click fixes
- [ ] Chat context and report export
- [ ] Workspaces and RBAC
- [ ] GitHub repository / PR integration and multi-file review
- [ ] History, metrics dashboard, bookmarks
- [ ] Custom rules and notifications
- [ ] CI/CD REST API

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

---

## License

Add a `LICENSE` file and state it here (e.g. MIT).
