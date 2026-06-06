# 🤖 AI Lead Qualification Agent & Analytics Hub

Automated pipeline that receives incoming leads, enriches them with search data via **Serper.dev**, qualifies them using **GPT-4o-mini**, and stores structured results in a **Supabase (PostgreSQL)** database. Hot leads trigger instant **Slack** alerts and CRM contact creation in **HubSpot** — all managed via serverless architecture or **n8n** orchestration.

---

## 🎯 Outcomes & Enhancements

1. **Dashboard Supabase (SQL Views)**: A real-time reporting view aggregating lead data (counts and average scores) grouped by category (`hot`, `warm`, `cold`).
2. **Production-ready n8n Workflow**: Full support for running n8n on **Railway.app** with persistent database connections.
3. **Data Enrichment**: An HTTP request step querying **Serper.dev** for company LinkedIn and Google context before running the scoring LLM.
4. **Conditional Alerting & CRM**: High-value leads (`score > 70`) are instantly pushed to **Slack** and created as contacts in **HubSpot CRM**.
5. **Supabase Edge Function**: A serverless Deno TypeScript endpoint (`supabase/functions/qualify-lead`) that mirrors the scoring and persistence logic.
6. **Vercel-ready Interactive UI**: A premium React dashboard & form simulator showing the qualification gauge and Supabase statistics in real time.

---

## 🏗️ Architecture

```
[Inbound Lead Form / API]
       │
       ├──► [React Demo UI (Vercel)] ────┐
       │                                 ▼
       ├──► [Supabase Edge Function] ◄──► [OpenAI GPT-4o-mini]
       │                                         │
       └──► [Webhook - n8n (Railway)]            ▼
                    │                     [Supabase DB / SQL Views]
                    ▼                            │
        [Extract & Normalize Data]               ├─► [Slack Notifications]
                    │                            │
                    ▼                            └─► [HubSpot CRM Contacts]
        [Serper.dev Web Search]
                    │
                    ▼
        [OpenAI GPT-4o-mini Scoring]
                    │
                    ▼
         [Supabase - Save Lead]
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
[Respond to Webhook]   [Filter: If Hot Lead]
                              │
                              ▼
                       [Slack Alert]
                              │
                              ▼
                       [HubSpot Contact]
```

---

## 📦 Repository Structure

```
ai-lead-qualification-agent/
├── workflow.json          # Enriched n8n workflow (import directly)
├── supabase/
│   ├── schema.sql         # Table schemas + lead_stats SQL view + RLS
│   └── functions/
│       └── qualify-lead/
│           └── index.ts   # Serverless Deno/TypeScript Scoring Endpoint
├── demo-ui/               # React + Vite UI dashboard & simulator
│   ├── src/               # Application logic, CSS, and views
│   ├── package.json
│   └── vercel.json        # Vercel routing configuration
├── test/
│   └── test-webhook.sh    # Webhook local testing script
├── .env.example           # Environment variables template
└── README.md
```

---

## 🚀 Setup & Deployment Guide

### 1. Database & SQL Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the schema in `supabase/schema.sql` to initialize:
   - The `leads` table.
   - The `hot_leads` view (records filter).
   - The `lead_stats` aggregation view (grouped count and average score).

---

### 2. Deploying n8n on Railway (Public URL)

Avoid local tunnels by deploying n8n to **Railway.app** in under 3 minutes:

1. Log in to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from Docker Image** and enter: `n8nio/n8n`.
3. Add the following **Environment Variables** in the Railway settings:
   - `N8N_BASIC_AUTH_ACTIVE=true`
   - `N8N_BASIC_AUTH_USER=admin` (your username)
   - `N8N_BASIC_AUTH_PASSWORD=your_secure_password` (your password)
   - `N8N_ENCRYPTION_KEY=random_secret_string`
4. Railway will build the container and provide a **Public URL** (e.g. `https://n8n-production.up.railway.app`).
5. Open that URL, log in, go to **Workflows → Import from file**, and upload `workflow.json`.

*Configure Node Credentials in n8n:*
- **OpenAI Node**: Insert your OpenAI API key.
- **Supabase Node**: Insert your Supabase project URL and `service_role` secret key.
- **HTTP/Serper.dev**: Obtain a free key from [Serper.dev](https://serper.dev) and set it as `SERPER_API_KEY` (or replace the placeholder in the node header).
- **Slack & HubSpot**: Add your API tokens/Webhooks or use the environment variables `SLACK_CHANNEL_ID` and `HUBSPOT_ACCESS_TOKEN`.

---

### 3. Deploying the Supabase Edge Function (Alternative Serverless API)

If you prefer serverless APIs over visual workflows:

1. Install the Supabase CLI locally and login:
   ```bash
   npm i -g supabase
   supabase login
   ```
2. Initialize and deploy the function to your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase functions deploy qualify-lead
   ```
3. Set the required secrets in Supabase:
   ```bash
   supabase secrets set OPENAI_API_KEY="sk-..."
   supabase secrets set SERPER_API_KEY="your-serper-key"
   supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
   supabase secrets set HUBSPOT_ACCESS_TOKEN="pat-..."
   ```
4. Your serverless API is now live at: `https://<your-project-ref>.supabase.co/functions/v1/qualify-lead`.

---

### 4. Deploying the interactive React UI (Vercel)

Simulate form submissions and view live database stats in a dashboard:

```bash
# Run locally
cd demo-ui
npm install
npm run dev
```

**Deploying to Vercel:**
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Create a **New Project** and select the `demo-ui` folder as the Root Directory.
3. Keep default build settings (Vite build pipeline).
4. Deploy! Vercel will build the React application and output a production public URL.

*Customizing integration endpoints:*
Open your deployed UI in the browser and click the **Settings Gear** in the top-right corner to point the form directly to your live n8n webhook or Supabase database URL.

---

## 🔌 API Contract & Schema

### Request Body (POST /webhook/qualify-lead)
```json
{
  "name": "Sophie Martin",
  "email": "sophie@techstartup.io",
  "company": "TechStartup SAS",
  "message": "We need to automate onboarding for 500 new users per month.",
  "budget": "5,000 - 10,000 EUR"
}
```

### Response Body
```json
{
  "success": true,
  "lead_id": "84a75412-21d3-455b-b9d9-609cfbca97c1",
  "score": 82,
  "category": "hot",
  "summary": "Qualified lead with valid budget and high volume onboarding request.",
  "recommended_action": "Schedule high-priority discovery call.",
  "reasoning": "Company details matched via Serper.dev. Budget meets qualification threshold of 5K."
}
```

---

## 📊 Database view (`lead_stats`) Schema

```sql
SELECT category, COUNT(*) as total, AVG(score)::INT as avg_score 
FROM leads 
GROUP BY category;
```

Expected output view format:
| category | total | avg_score |
|---|---|---|
| hot | 14 | 84 |
| warm | 28 | 54 |
| cold | 42 | 22 |

---

## 👩‍💻 Author

Built by a full-stack engineer specializing in LLM integrations, Deno, PostgreSQL, and event-driven automation.
