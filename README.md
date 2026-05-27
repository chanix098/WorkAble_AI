# WorkAble AI 🦽
### Inclusive Jobs for Everyone

A modern job-matching platform for persons with disabilities (PWD),
powered by AI and built with vanilla HTML/CSS/JS + Supabase.

---

## 🚀 Quick Setup (VS Code)

### 1. Open the project
```bash
# Open this folder in VS Code
code workable-ai/
```

### 2. Set up Supabase

1. Go to **[supabase.com](https://supabase.com)** → Create a new project
2. In your project: go to **SQL Editor** → paste the contents of `supabase-setup.sql` → click **Run**
3. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key

### 3. Add your Supabase credentials

Open `js/supabase.js` and replace:
```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

### 4. Enable Storage (for document uploads)

In Supabase:
1. Go to **Storage** → Create a bucket named `disability-documents`
2. Set it to **Public** (or configure RLS as needed)

### 5. Launch

Install the **Live Server** extension in VS Code, then:
- Right-click `index.html` → **Open with Live Server**

Or use any static server:
```bash
npx serve .
```

---

## 📱 App Flow (6 Screens)

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Login / Register | Email + password auth via Supabase |
| 2 | Disability Info | Select disability, add details, upload document |
| 3 | Submitted | Success confirmation screen |
| 4 | AI Analyzing | Animated loading while AI scores jobs |
| 5 | Job Recommendations | Personalized job list with match % |
| 6 | Job Detail + Apply | Full job info, apply with one tap |

---

## 🗂 Project Structure

```
workable-ai/
├── index.html              # All 6 screens (SPA)
├── css/
│   └── styles.css          # Complete design system
├── js/
│   ├── supabase.js         # DB helpers + auth
│   └── app.js              # App logic + routing
├── supabase-setup.sql      # Full DB schema + seed data
└── README.md
```

---

## 🎨 Tech Stack

- **Frontend**: Vanilla HTML + CSS + JavaScript (no framework needed)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (disability documents)
- **Fonts**: Syne + DM Sans (Google Fonts)
- **Theme**: Dark mode with purple/violet accent system

---

## 🔧 Customization

### Change the color scheme
Edit CSS variables in `css/styles.css`:
```css
:root {
  --accent:  #5b6cf9;   /* Primary purple */
  --accent2: #8f5cf9;   /* Secondary violet */
  --success: #22d3a5;   /* Green for match scores */
}
```

### Add more jobs
Insert into the `jobs` table in Supabase, or add more rows to `supabase-setup.sql`.

### Plug in a real AI model
In `js/app.js`, find the `runAnalysis()` function and replace the scoring logic with a call to your AI API (OpenAI, Anthropic, etc.).

---

## 📋 Supabase Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User info (auto-created on signup) |
| `disabilities` | User disability submissions |
| `jobs` | Job listings |
| `job_recommendations` | AI-generated match scores per user |
| `applications` | Job applications |

---

## 🛡 Security

- Row Level Security (RLS) enabled on all user tables
- Users can only read/write their own data
- Jobs table is public-read for authenticated users

---

Made with ♿ for inclusivity · WorkAble AI 2025
