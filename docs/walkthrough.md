# a11y-fixer Walkthrough

A step-by-step guide to running accessibility audits. Written for everyone — designers, developers, and QA.

---

## Which tool should I use?

| If you prefer... | Use |
|---|---|
| A visual interface in your browser | **Web Dashboard** (Part 1) |
| The command line / terminal | **CLI** (Part 2) |

Both do the same thing — scan pages, find issues, generate reports. Pick whichever you're comfortable with.

---

## Part 1: Web Dashboard

### Opening the Dashboard

**To run the dashboard locally:**

You'll need two things installed first: [Node.js](https://nodejs.org/) (v18 or newer) and pnpm. To install pnpm, open your terminal and run:
```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
```

Then set up the project:
```bash
git clone https://github.com/hungdofyi/a11y-fixer.git && cd a11y-fixer
pnpm install
pnpm build
cd packages/scanner && npx playwright install chromium --with-deps && cd ../..
```

Start the app (you need two terminal windows):
```bash
# Window 1 — the backend
pnpm --filter @a11y-fixer/api dev

# Window 2 — the web interface
pnpm --filter @a11y-fixer/web dev
```

Open **http://localhost:5173** in your browser.

### Running Your First Scan

1. **Create a project** — Click "Create Project" on the home page. Give it a name (e.g. "Our Marketing Site") and the URL you want to scan.

2. **Start a scan** — Go into your project and click "New Scan". The URL pre-fills from your project. Choose a scan type:
   - **Browser** — opens the page and checks for visual/structural issues (most common)
   - **Keyboard** — tests if the page is usable with keyboard only (tab order, focus traps, skip links)
   - **All** — runs both

3. **Watch progress** — A live progress bar shows what's happening. Scans usually take 10-60 seconds depending on how many pages are being checked.

4. **Review results** — When done, you'll see violations grouped by severity:
   - **Critical** — Must fix. Prevents some users from using the page at all.
   - **Serious** — Should fix. Makes the page very difficult for some users.
   - **Moderate** — Should fix when possible. Causes frustration.
   - **Minor** — Nice to fix. Small improvements.

5. **Click any violation** to see:
   - What the rule checks for
   - Which HTML element failed
   - Which WCAG criterion it relates to
   - A suggested fix

### Downloading Reports

From the scan results page, you can download:
- **HTML report** — interactive, opens in any browser, good for sharing
- **CSV report** — opens in Excel/Google Sheets, good for tracking fixes

### Generating a VPAT (Compliance Document)

Go to the **VPAT** section in the navigation. Pick your project, choose a format (Word or HTML), and click Generate. This creates a formal VPAT 2.5 compliance document covering WCAG 2.1/2.2, Section 508, and EN 301 549.

---

## Part 2: CLI (Command Line)

For developers who prefer the terminal.

### Setup

```bash
# 1. Install dependencies and build (skip if already done for the dashboard)
pnpm install
pnpm build
cd packages/scanner && npx playwright install chromium --with-deps && cd ../..

# 2. Verify it works
pnpm a11y --help
```

### Scanning

```bash
# Scan a public page
pnpm a11y scan https://example.com

# Scan with more pages (default is 10)
pnpm a11y scan https://example.com --pages 50

# Only browser scan
pnpm a11y scan https://example.com --type browser

# Only keyboard scan
pnpm a11y scan https://example.com --type keyboard

# Static analysis of Vue components (no browser needed)
pnpm a11y scan ./src/components --type static
```

### Scanning Pages Behind Login

If the page requires authentication:

```bash
# Step 1: Log in manually — a browser window opens, log in as usual, then close it
pnpm a11y auth login https://your-app.com

# Step 2: Scan using your saved session
pnpm a11y scan https://your-app.com/dashboard --storage-state ~/.a11y-fixer/storage-state.json
```

Your cookies are reused — the tool never stores your username or password.

### Reports

```bash
# HTML report
pnpm a11y report --report-format html -o report.html

# CSV (for spreadsheets)
pnpm a11y report --report-format csv -o violations.csv

# PDF
pnpm a11y report --report-format pdf -o report.pdf

# VPAT compliance document
pnpm a11y vpat -o compliance.docx

# VPAT with AI-generated descriptions (uses OAuth — see AI Features below)
pnpm a11y vpat --ai -o compliance.docx
```

### Fix Suggestions

```bash
# Rule-based (no AI needed)
pnpm a11y fix-suggest https://example.com

# AI-powered (uses OAuth — see AI Features below)
pnpm a11y fix-suggest https://example.com --ai
```

### Managing Projects

```bash
pnpm a11y project create --name "My App" --url "https://app.example.com"
pnpm a11y project list
pnpm a11y project show 1
```

### Useful Flags

| Flag | What it does |
|------|-------------|
| `--format json` | Output as JSON instead of a table |
| `-o filename` | Save output to a file |
| `--wcag-level aaa` | Use stricter AAA level (default: AA) |
| `--pages 50` | Crawl up to 50 pages (default: 10) |

---

## Part 3: Configuration

Only needed if you're running the tool locally or hosting it for your team.

Copy the example config:
```bash
cp .env.example .env
```

### Basic settings (work out of the box)

| Variable | What it is | Default |
|----------|-----------|---------|
| `PORT` | Server port | `3001` |
| `A11Y_DB_PATH` | Where scan data is stored | `./data/a11y-fixer.db` |

### Team hosting (Google login)

Only needed if you're deploying the dashboard for your team.

| Variable | What it is |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see setup below) |
| `GOOGLE_CLIENT_SECRET` | Same — Google gives you both |
| `ALLOWED_DOMAIN` | Your company domain, e.g. `mycompany.com`. Only matching Google accounts can log in. |
| `BASE_URL` | Your app URL, e.g. `http://localhost:3001` |
| `SESSION_SECRET` | Random key. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `A11Y_API_KEY` | A password you choose. Protects the API from unauthorized access. |

### AI features (optional)

AI-powered features (fix suggestions, VPAT narratives) use OAuth PKCE — no API key needed. When you use an `--ai` flag for the first time, the app opens a browser for you to authorize with your Claude account. Your token is stored locally and refreshed automatically.

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Add redirect URI: `https://your-domain.com/api/auth/google/callback`
5. Copy the Client ID and Client Secret into your `.env`

---

## Part 4: Common Workflows

### "I want to audit our marketing site"

1. Open the dashboard
2. Create a project with the site URL
3. Run a browser scan
4. Download the HTML report and share it with the team
5. Generate a VPAT if needed for compliance

### "I want to check if my design is accessible"

1. Deploy your design to a staging URL (or run it locally)
2. Scan it with the dashboard or CLI
3. Focus on Critical and Serious issues first
4. Use fix suggestions to understand what needs to change

### "I need a compliance document for a client"

1. Scan all relevant pages of the app
2. Go to VPAT section in the dashboard
3. Generate a Word document
4. Review and customize the generated narratives before sending

---

## Part 5: Understanding the Results

### Severity levels

| Level | What it means | Priority |
|-------|--------------|----------|
| **Critical** | Some users cannot use this page at all | Fix immediately |
| **Serious** | Major barriers for users with disabilities | Fix soon |
| **Moderate** | Causes difficulty but workarounds exist | Plan to fix |
| **Minor** | Small improvement opportunities | Fix when convenient |

### Common issues and what they mean

| Issue | Plain English | Typical fix |
|-------|--------------|-------------|
| Missing alt text | Screen readers can't describe the image | Add descriptive `alt="..."` to `<img>` tags |
| Low color contrast | Text is hard to read for low-vision users | Darken text or lighten background |
| Missing form labels | Screen readers don't know what an input is for | Add `<label>` elements to form fields |
| No skip link | Keyboard users must tab through the entire nav on every page | Add a "Skip to content" link at the top |
| Focus not visible | Keyboard users can't see where they are on the page | Add visible `:focus` CSS styles |
| Empty button | Screen readers announce "button" with no description | Add text or `aria-label` to buttons |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard won't load | Make sure both the API (`port 3001`) and web (`port 5173`) are running |
| "Command scan not found" | Run `pnpm build` first — the CLI needs to be compiled before use |
| Scan stuck / not starting | Check that Playwright is installed: `cd packages/scanner && npx playwright install chromium --with-deps` |
| "Chromium not found" error | Same as above — Playwright browser needs to be installed |
| Can't log in (deployed) | Ask your admin to check `ALLOWED_DOMAIN` matches your email domain |
| Report download fails | Try a different format (HTML usually works best) |
| Page looks different after code changes | Run `pnpm build` and hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) |

---

## Standards Covered

| Standard | Region | What it's for |
|----------|--------|---------------|
| WCAG 2.1/2.2 Level AA | International | The main accessibility standard. 55 criteria checked. |
| Section 508 | United States | Required for US government and many enterprise contracts |
| EN 301 549 | European Union | Required for EU public sector and procurement |

VPAT reports include per-criterion status with evidence and remediation notes.
