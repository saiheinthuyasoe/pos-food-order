# To activate emails in production:

- Sign up at resend.com and create an API key

- Replace RESEND_API_KEY=re_your_api_key_here in .env.local with your real key
- Add NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

Optionally verify your domain in Resend and set EMAIL_FROM=noreply@yourdomain.com