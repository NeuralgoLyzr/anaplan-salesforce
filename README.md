# Total Rewards Advisory AgenticOS

An AI-powered dashboard for benefits consultants to manage client engagements, run advisory workflows, and generate recommendations — built with Next.js 15 and Lyzr AI.

---

## What This App Does

This platform helps HR/benefits consultants:

- Chat with an AI agent about client engagements
- Run structured advisory workflows (surveys, policy analysis, benchmarking, recommendations)
- Track active clients and market insights from a central dashboard
- Manage team access and integrations with tools like Gmail, Slack, Salesforce, and ADP

---

## Pages

| Page | What it does |
|------|-------------|
| `/` | Dashboard with search, market insights, and active engagements |
| `/console` | Chat with the AI advisory agent |
| `/tools/skills/survey-designer` | Generate employee benefit surveys |
| `/tools/skills/policy-analyzer` | Analyze benefit policy documents |
| `/tools/skills/competitive-benchmarker` | Compare benefits against competitors |
| `/tools/skills/synthesis-recommender` | Generate a final recommendation report |
| `/tools/skills` | Browse all available skills |
| `/tools` | Integrations and configuration hub |
| `/tools/architecture` | View the agent architecture |
| `/tools/files` | Browse knowledge base and client files |
| `/settings` | Manage users and their roles |

---

## Tech Stack

| What | Technology |
|------|-----------|
| Framework | Next.js 15 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React + Tabler Icons |
| Forms | React Hook Form + Zod |
| State | Redux Toolkit |
| Database | Supabase |
| AI | Lyzr AI API |
| Fonts | Inter, Playfair Display, JetBrains Mono |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root folder:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
LYZR_API_KEY=your-lyzr-api-key
LYZR_AGENT_ID=your-agent-id
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── app/                  # All pages and API routes
│   ├── page.tsx          # Dashboard (home)
│   ├── console/          # Agent chat console
│   ├── settings/         # User management
│   └── tools/            # Skills, architecture, file browser
├── components/
│   ├── ui/               # Reusable UI components (buttons, cards, sidebar, etc.)
│   ├── dashboard/        # Dashboard-specific components
│   └── journey-layout    # Shared layout for all skill pages
├── hooks/                # Custom React hooks for chat and journey streaming
└── lib/                  # Utilities, types, API clients, and Redux store
```

---

## Design

- **Colors** — Warm brown and cream palette (`#7B4A24` primary, `#F6F1EA` background)
- **Fonts** — Inter for body text, Playfair Display for headings
- **Cards** — Glass morphism style with soft shadows and blur
- **Sidebar** — Light cream background with brown section labels

---

## User Roles

| Role | Permissions |
|------|------------|
| Admin | Full access — can manage users, change roles, remove members |
| Editor | Can run journeys and edit content |
| Viewer | Read-only access |
