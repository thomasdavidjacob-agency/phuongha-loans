# phuongha.loans

Production website for **phuongha.loans** — Oregon & Washington home loans hub.

## Stack

- Plain HTML / CSS / JavaScript (no build step)
- Vercel Serverless Functions (`/api/submit-lead.js`)
- [Resend](https://resend.com) for transactional email

## Local Development

```bash
# Install dependencies (only needed for the serverless function)
npm install

# Run locally with Vercel CLI
npx vercel dev
```

The site serves at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
```

| Variable         | Description                              |
|------------------|------------------------------------------|
| `RESEND_API_KEY` | Your Resend API key from resend.com/api-keys |

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in the [Vercel dashboard](https://vercel.com/new).
3. Add `RESEND_API_KEY` under **Settings → Environment Variables**.
4. Deploy.

## Resend Setup

Before leads can be delivered, you must verify your sending domain in Resend:

1. Go to [resend.com](https://resend.com) → **Domains** → Add `phuongha.loans`.
2. Add the DNS records Resend provides to your domain registrar.
3. Once verified, the `from` address `leads@phuongha.loans` will work.

> If the domain isn't verified yet, temporarily change `FROM_ADDRESS` in `api/submit-lead.js` to `onboarding@resend.dev` for testing.

## File Structure

```
phuongha-loans/
├── index.html           # Main site
├── style.css            # All styles
├── script.js            # Nav, animations, form submit
├── api/
│   └── submit-lead.js   # Serverless function — sends email via Resend
├── vercel.json          # Vercel configuration
├── package.json         # resend dependency
├── .env.example         # Environment variable template
└── .gitignore
```
