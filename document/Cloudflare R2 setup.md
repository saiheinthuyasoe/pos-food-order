# R2 Setup Steps

Go to Cloudflare Dashboard → R2 → Create bucket (name: pos-food-order)
Enable Public access on the bucket to get a pub-xxx.r2.dev URL
Go to R2 → Manage R2 API Tokens → Create Token with Object Read & Write
Fill in .env.local with the values:

```.env
R2_ACCOUNT_ID= ← Cloudflare account ID (top-right of dashboard)
R2_ACCESS_KEY_ID= ← from API token
R2_SECRET_ACCESS_KEY= ← from API token
R2_BUCKET_NAME=pos-food-order
R2_PUBLIC_URL=[https://pub-xxxx.r2.dev](https://pub-xxxx.r2.dev)
```
