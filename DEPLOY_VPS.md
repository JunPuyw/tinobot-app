# Deploy Tinobot App on VPS

## 1. Server prerequisites

Use Ubuntu 22.04+ or 24.04+.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and log in again so the Docker group is applied.

## 2. Upload source and configure env

```bash
git clone <your-repo-url> tinobot-app
cd tinobot-app
cp .env.example .env
nano .env
```

At minimum, change these values:

```env
POSTGRES_PASSWORD=use-a-strong-password
DATABASE_URL=postgresql://tinobot:use-a-strong-password@postgres:5432/tinobot?schema=public
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
INTERNAL_API_URL=http://api:3001
SESSION_SECRET=use-a-long-random-secret
JWT_SECRET=use-a-long-random-secret
ADMIN_EMAILS=admin@example.com
PLATFORM_UPSTREAMS_JSON=[...]
```

For SePay top-up, also configure:

```env
SEPAY_BANK_ID=ICB
SEPAY_ACCOUNT_NO=your-bank-account-number
SEPAY_ACCOUNT_NAME=YOUR ACCOUNT NAME
SEPAY_QR_TEMPLATE=qronly
SEPAY_WEBHOOK_KEY=use-a-long-random-webhook-key
SEPAY_API_TOKEN=your-sepay-api-token
VND_TO_USD_RATE=25000
```

For VietinBank, the generated transfer description starts with `SEVQR` and includes the order code, for example `SEVQR TINO123ABC`. This prefix is required for SePay to receive VietinBank balance-change notifications. When `SEPAY_API_TOKEN` is set, the order polling endpoint also checks SePay transactions and completes matching pending orders if the webhook is delayed or not delivered.

Only set `SEPAY_VA_BANK_ACCOUNT_ID` and `SEPAY_VA_PROVIDER_PATH=bidv` when SePay has enabled the BIDV VA/order API for your account. Do not set `SEPAY_VA_BANK_ACCOUNT_ID` to a normal bank account number.

In the SePay dashboard, create a webhook:

```txt
Webhook URL: https://your-domain.com/api/billing/sepay/webhook
Authorization header: Apikey use-a-long-random-webhook-key
```

`SEPAY_BANK_ID` should be the bank code accepted by SePay QR, for example `VCB` for Vietcombank.

For Polar checkout, configure the webhook endpoint in Polar:

```txt
Webhook URL: https://your-domain.com/api/billing/webhook
Events: checkout.updated, order.updated
```

If you configured Polar under the payments namespace, this alias is also supported:

```txt
Webhook URL: https://your-domain.com/api/payments/polar/webhook
Events: checkout.updated, order.updated
```

The app credits the user when Polar sends `checkout.updated` with `status: confirmed` or `order.updated` with `status: paid`.

## 3. Start the stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f migrate
```

To validate Compose with the example file instead of your local secret file:

```bash
APP_ENV_FILE=.env.example docker compose config
```

The `migrate` service runs:

```bash
npx prisma migrate deploy --config apps/web/prisma.config.ts
```

If it finishes successfully, `web` and `api` start after it.

## 4. Nginx reverse proxy

Create `/etc/nginx/sites-available/tinobot`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/router/ {
        proxy_pass http://127.0.0.1:3001/api/router/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:3001/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/tinobot /etc/nginx/sites-enabled/tinobot
sudo nginx -t
sudo systemctl reload nginx
```

## 5. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 6. Update deploy

```bash
git pull
docker compose up -d --build
docker compose logs -f migrate
```

## 7. Useful operations

Check logs:

```bash
docker compose logs -f web
docker compose logs -f api
docker compose logs -f postgres
```

Backup Postgres:

```bash
docker compose exec postgres pg_dump -U tinobot tinobot > tinobot-backup.sql
```

Restore Postgres:

```bash
cat tinobot-backup.sql | docker compose exec -T postgres psql -U tinobot tinobot
```
