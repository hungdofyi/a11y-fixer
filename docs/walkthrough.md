# a11y-fixer Walkthrough

A step-by-step guide from zero to running accessibility audits with your team.

---

## Part 1: Getting Started

### What You Need

- **Node.js 22** (or 18+)
- **pnpm** — install with `corepack enable && corepack prepare pnpm@9.15.4 --activate`
- **Docker** — only if you want to deploy to a server (not needed for local use)

### Install

```bash
git clone <repo-url> && cd a11y-fixer
pnpm install
pnpm build
npx playwright install chromium --with-deps   # browser engine for scanning
```

That's it. You can now use the CLI locally with zero configuration.

---

## Part 2: Configuration

Copy the example and edit it:
```bash
cp .env.example .env
```

The `.env` file has 3 sections. Here's what each variable actually means:

### Section 1: Basic (works out of the box)

These have sensible defaults. You probably don't need to touch them.

| Variable | What it is | Default |
|----------|-----------|---------|
| `PORT` | Which port the API server listens on | `3001` |
| `A11Y_DB_PATH` | Where the SQLite database file lives | `./data/a11y-fixer.db` |
| `A11Y_WORKSPACE_ROOT` | Which folder the static scanner is allowed to read | `.` (project root) |

### Section 2: Google OAuth SSO (for the web dashboard)

**Only needed if you're hosting the dashboard for your team.** Skip this entirely if you're just using the CLI locally.

| Variable | What it is |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | You get this from Google Cloud Console when you create OAuth credentials (see [setup steps below](#setting-up-google-oauth)) |
| `GOOGLE_CLIENT_SECRET` | Same — Google gives you this alongside the client ID |
| `ALLOWED_DOMAIN` | Your company's Google Workspace domain, e.g. `mycompany.com`. Only emails ending in `@mycompany.com` can log in. If you leave this empty, *any* Google account can access the dashboard. |
| `BASE_URL` | The public URL where your dashboard is hosted, e.g. `https://a11y.mycompany.com`. Google needs this to know where to redirect after login. If running locally, it's `http://localhost:3001`. |
| `SESSION_SECRET` | A random encryption key for login sessions. Generate one by running: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — just copy the output into your .env |

### Section 3: AI Features (optional)

The tool has two ways to talk to Claude AI for generating fix suggestions and VPAT narratives. You only need one (or neither — the tool works fine without AI, it just won't generate AI-powered suggestions).

| Variable | What it is |
|----------|-----------|
| `ANTHROPIC_API_KEY` | If you have an Anthropic API key, paste it here. Simplest option. |
| `CLAUDE_CODE_OAUTH_TOKEN` | Alternative: the tool has a built-in OAuth PKCE flow that authenticates with Claude without an API key. If you've gone through that flow, the token is stored here automatically. You don't need to fill this in manually. |

**Pick one:** Either set `ANTHROPIC_API_KEY` with your key, or use the OAuth flow. Or skip both if you don't need AI features.

### What about `A11Y_API_KEY`?

This is a password you make up yourself (any string). It protects your API server from unauthorized access.

**How it works:** When you (or a script) call the API directly via `curl` or similar, you pass this key in the header: `x-api-key: your-key-here`. If the key doesn't match, the request is rejected.

**When you need it:** If you're hosting the dashboard on a server. For local-only use, you can leave it empty (the API will be open, which is fine on localhost).

**When you DON'T need it:** If you're only using the CLI locally. The CLI talks to the scanning engine directly — it doesn't go through the API.

---

## Part 3: Using the CLI

### Your First Scan

```bash
# Scan a public website
node apps/cli/bin/run.js scan https://example.com
```

This runs all scan types (browser + keyboard) and shows a table of violations.

### Scan Types

**Browser scan** — opens the page in Chromium, runs axe-core to find violations:
```bash
a11y scan https://example.com --type browser --pages 20
```

**Static scan** — analyzes your Vue `.vue` files for accessibility anti-patterns (no browser needed):
```bash
a11y scan ./src/components --type static
```

**Keyboard scan** — tests tab order, focus traps, skip links:
```bash
a11y scan https://example.com --type keyboard
```

**All at once** (default):
```bash
a11y scan https://example.com --type all
```

### Scanning Pages Behind Login

If your app requires login (most SaaS apps do):

**Step 1:** Open a browser and log in manually:
```bash
a11y auth login https://your-app.com
```
A Chromium window opens. Log in as you normally would. When you're done, close the browser. Your session is saved to `~/.a11y-fixer/storage-state.json`.

**Step 2:** Scan using that session:
```bash
a11y scan https://your-app.com/dashboard --storage-state ~/.a11y-fixer/storage-state.json
```

The scanner reuses your cookies — it doesn't store your username/password.

### Managing Projects

Projects let you group scans and track history:
```bash
a11y project create --name "Our SaaS App" --url "https://app.example.com"
a11y project list
a11y project show 1
```

### Generating Reports

After running scans:
```bash
# HTML report (interactive, viewable in browser)
a11y report --report-format html -o report.html

# CSV (for spreadsheets)
a11y report --report-format csv -o violations.csv

# PDF (for sharing/printing)
a11y report --report-format pdf -o report.pdf
```

### Generating a VPAT

VPAT 2.5 compliance document covering WCAG 2.1/2.2, Section 508, EN 301 549:
```bash
a11y vpat -o compliance.docx

# With AI-generated narratives (needs ANTHROPIC_API_KEY or OAuth token)
a11y vpat --ai -o compliance.docx
```

### Getting Fix Suggestions

```bash
# Rule-based suggestions (no AI needed)
a11y fix-suggest https://example.com

# AI-powered suggestions (needs API key or OAuth)
a11y fix-suggest https://example.com --ai
```

### Useful Flags (all commands)

| Flag | What it does |
|------|-------------|
| `--format json` | Output as JSON instead of a table |
| `-o report.html` | Save output to a file |
| `--wcag-level aaa` | Use stricter AAA level (default: AA) |
| `--pages 50` | Crawl up to 50 pages (default: 10) |

---

## Part 4: Using the Web Dashboard

The dashboard is a browser UI for your team to run scans, view results, and download reports without using the terminal.

### Running Locally (Development)

Open two terminals:

```bash
# Terminal 1: API server
pnpm --filter @a11y-fixer/api dev

# Terminal 2: Web UI
pnpm --filter @a11y-fixer/web dev
```

Open `http://localhost:5173` in your browser. The web UI automatically proxies API calls to the backend on port 3001.

### What You Can Do in the Dashboard

1. **Home page (`/`)** — see all your projects. Click "Create Project" to add one.
2. **Project detail (`/projects/1`)** — see scan history for a project. Click "New Scan" to trigger a browser or static scan. A live progress indicator shows scan status.
3. **Scan results (`/scans/1`)** — see violations grouped by severity (Critical, Serious, Moderate, Minor). Filter by severity or WCAG criterion. Download HTML or CSV reports.
4. **Issue detail (`/issues/1`)** — see the full rule description, affected HTML element, CSS selector, WCAG criteria, and fix suggestion.
5. **VPAT wizard (`/vpat`)** — pick a project, choose format (Word or HTML), generate and download the compliance document.

---

## Part 5: Hosting the Dashboard for Your Team

If you want your team to access the dashboard from a URL (not just localhost), you deploy it to a server with Docker.

### Step 1: Set Up Google OAuth

This lets your team log in with their company Google accounts.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Under **Authorized redirect URIs**, add: `https://a11y.yourcompany.com/auth/google/callback` (replace with your actual domain)
5. Google gives you a **Client ID** and **Client Secret** — copy these

### Step 2: Configure .env on Your Server

```bash
# --- Required for hosted dashboard ---
GOOGLE_CLIENT_ID=paste-client-id-from-google-here
GOOGLE_CLIENT_SECRET=paste-client-secret-from-google-here
ALLOWED_DOMAIN=yourcompany.com
BASE_URL=https://a11y.yourcompany.com
SESSION_SECRET=paste-output-of-the-crypto-command-here

# --- Optional but recommended ---
A11Y_API_KEY=make-up-a-strong-random-string
```

### Step 3: Deploy with Docker

```bash
docker compose up -d
```

That's it. The container includes everything: Node.js, the API, the web UI, Chromium for scanning, and SQLite for data.

Your team visits `https://a11y.yourcompany.com`, logs in with Google, and starts scanning.

### How Authentication Works

- **Browser users** → redirected to Google login → only `@yourcompany.com` accounts allowed → session cookie lasts 8 hours
- **CLI/scripts** → use `x-api-key` header (the `A11Y_API_KEY` you set) — no Google login needed
- **No OAuth configured?** → the dashboard works but is open to anyone who can reach the URL

### Backing Up Your Data

All scan history lives in a SQLite database inside a Docker volume:
```bash
docker compose cp app:/app/data/a11y-fixer.db ./backup.db
```

---

## Part 6: Common Workflows

### Quick Audit of a Public Site
```bash
a11y scan https://example.com --pages 50
a11y report --report-format html -o audit.html
a11y vpat -o compliance.docx
```

### Full Compliance Audit of Your App
```bash
# Log in to your app
a11y auth login https://app.yourcompany.com

# Scan with authentication
a11y scan https://app.yourcompany.com --storage-state ~/.a11y-fixer/storage-state.json --pages 100

# Get fix suggestions
a11y fix-suggest https://app.yourcompany.com --ai -o fixes.json

# Generate reports
a11y report --report-format html -o report.html
a11y vpat --ai -o vpat.docx
```

### CI/CD Pipeline Integration
```bash
a11y scan https://staging.example.com --type browser --format json -o results.json

# Fail pipeline if critical issues found
node -e "
  const r = require('./results.json');
  const critical = r.flatMap(s=>s.violations).filter(v=>v.severity==='critical');
  if(critical.length) { console.error(critical.length+' critical'); process.exit(1); }
"
```

---

## Part 7: API Reference

Base URL: `http://localhost:3001` (or your hosted domain)
Swagger docs: `http://localhost:3001/docs`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create project `{ name, url? }` |
| `GET` | `/projects/:id` | Get project with scan count |
| `DELETE` | `/projects/:id` | Delete project |
| `POST` | `/scans` | Start scan `{ projectId, scanType, url?, dir? }` |
| `GET` | `/scans/:id` | Get scan with issue count |
| `GET` | `/sse/:id/progress` | Real-time scan progress (SSE stream) |
| `GET` | `/issues` | List issues `?scanId=&severity=&wcag=&page=&limit=` |
| `GET` | `/reports/:scanId` | Download report `?format=html|csv` |
| `POST` | `/vpat/generate` | Generate VPAT `{ projectId, format: 'docx'|'html' }` |
| `GET` | `/auth/me` | Current logged-in user |
| `POST` | `/auth/logout` | Log out |

**Auth:** Pass `x-api-key: <key>` header for API access. Browser users authenticate via Google OAuth.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Chromium not found` | `npx playwright install chromium --with-deps` |
| `ECONNREFUSED :3001` | Start API: `pnpm --filter @a11y-fixer/api dev` |
| `401 Unauthorized` (API) | Pass `x-api-key` header matching `A11Y_API_KEY` in .env |
| `401 Unauthorized` (browser) | Log in at `/auth/google` |
| `403 Domain rejected` | Your Google account domain doesn't match `ALLOWED_DOMAIN` |
| `OAuth callback error` | Make sure `BASE_URL` matches the redirect URI in Google Console exactly |
| `Storage state expired` | Re-run `a11y auth login <url>` to refresh your session |
| `Docker build fails` | Needs Docker 24+, and `pnpm-lock.yaml` must exist (run `pnpm install` first) |

---

## Standards Covered

| Standard | Region | Coverage |
|----------|--------|----------|
| WCAG 2.1/2.2 Level AA | International | 55 criteria, full mapping |
| ADA Section 508 | United States | Via WCAG mapping |
| EN 301 549 | European Union | Via WCAG mapping |
| AODA | Ontario, Canada | Via WCAG mapping |

VPAT 2.5 reports include per-criterion conformance status with evidence and remediation notes.
