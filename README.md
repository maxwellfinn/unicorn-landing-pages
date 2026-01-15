# Unicorn Landing Pages

Deploy Claude artifact landing pages to live URLs in seconds. Built for Unicorn Marketers.

## Quick Start

### 1. Install Dependencies

```bash
cd unicorn-landing-pages
npm install
```

### 2. Configure GitHub

Create a GitHub Personal Access Token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`
4. Copy the token

Set up your `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3457
SESSION_SECRET=any-random-string-here

# GitHub Config
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=unicorn-landing-pages-live

# URLs
API_BASE_URL=http://localhost:3457
PAGES_BASE_URL=https://your-github-username.github.io/unicorn-landing-pages-live
```

### 3. Start the Server

```bash
npm start
```

Open http://localhost:3457 in your browser.

### 4. Deploy Your First Page

1. Click **"+ New Landing Page"**
2. Give it a name (e.g., "Summer Sale")
3. Paste your HTML from a Claude artifact
4. Click **"🚀 Deploy Live"**

Your page will be live at: `https://your-username.github.io/unicorn-landing-pages-live/summer-sale/`

---

## Features

### ✨ One-Click Deploy
Paste HTML → Click Deploy → Get live URL. That simple.

### 📊 Built-in Analytics
Every page automatically tracks:
- Page views
- Traffic sources (UTM parameters)
- Device types
- Conversion rates

### 📝 Lead Capture
Forms on your landing pages automatically submit to your database. Export leads as CSV anytime.

### 🔬 A/B Testing
Create variants of your pages and track which converts better.

### 🌐 Custom Domains
Point client domains to their landing pages.

---

## API Reference

### Deploy a Page (Quick Deploy)

```bash
POST /api/deploy
Content-Type: application/json

{
  "name": "Summer Sale Landing Page",
  "html_content": "<!DOCTYPE html>...",
  "client_name": "Acme Corp",         # optional
  "slug": "summer-sale",              # optional, auto-generated
  "meta_title": "Summer Sale - 50% Off", # optional
  "meta_description": "..."           # optional
}
```

Response:
```json
{
  "deployed": true,
  "liveUrl": "https://username.github.io/repo/summer-sale/",
  "page": { ... }
}
```

### List All Pages

```bash
GET /api/pages
```

### Get Page Analytics

```bash
GET /api/pages/:id/analytics
```

### Get Page Leads

```bash
GET /api/pages/:id/leads
```

### Export Leads as CSV

```bash
GET /api/pages/:id/leads/export
```

### Add A/B Test Variant

```bash
POST /api/pages/:id/variants
Content-Type: application/json

{
  "variant_name": "Headline Test B",
  "html_content": "<!DOCTYPE html>...",
  "weight": 50
}
```

### Get A/B Test Results

```bash
GET /api/pages/:id/ab-results
```

---

## Form Handling

Forms in your landing pages are automatically intercepted. The tracking script:

1. Captures all form fields
2. Adds UTM parameters
3. Sends to your database
4. Shows a success message (or redirects)

### Custom Redirect After Submit

Add `data-redirect` to your form:

```html
<form data-redirect="https://example.com/thank-you">
  <input type="email" name="email" required>
  <button type="submit">Subscribe</button>
</form>
```

### Custom Conversion Tracking

Call from JavaScript:
```javascript
// Track a conversion
window.trackConversion('purchase', 99.99);

// Track without value
window.trackConversion('signup');
```

---

## Custom Domains

### For Subdomains (e.g., client.unicornmarketers.com)

1. In your DNS provider, add a CNAME record:
   ```
   client.unicornmarketers.com → your-username.github.io
   ```

2. Update the CNAME file in your GitHub repo or use the API:
   ```bash
   POST /api/pages/:id/domain
   { "domain": "client.unicornmarketers.com" }
   ```

### For Client Domains

Same process - they add a CNAME pointing to your GitHub Pages URL.

---

## Production Deployment

For production use, you'll want to:

1. **Host the API server** on a VPS or cloud platform (Railway, Render, DigitalOcean)
2. **Update API_BASE_URL** in `.env` to your production URL
3. **Set up a reverse proxy** (nginx) with SSL

The landing pages themselves are hosted on GitHub Pages (free), while your API handles lead capture and analytics.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Dashboard UI   │────▶│  Express API     │────▶│  GitHub Pages   │
│  (localhost)    │     │  (your server)   │     │  (free hosting) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  SQLite Database │
                        │  - Pages         │
                        │  - Leads         │
                        │  - Analytics     │
                        └──────────────────┘
```

---

## Troubleshooting

### "GitHub not configured" error
Make sure `GITHUB_TOKEN` is set in your `.env` file.

### Pages not showing up on GitHub Pages
1. Check that GitHub Pages is enabled in repo settings
2. Wait 1-2 minutes for initial deployment
3. Ensure the repo is public (or you have GitHub Pro for private pages)

### Form submissions not working
Check that `API_BASE_URL` in your `.env` matches where your server is running. For production, this needs to be your public API URL.

---

Built with 🦄 for Unicorn Marketers
