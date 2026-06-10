FROM node:22-alpine AS app

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG INTERNAL_API_URL=http://api:3001
ENV INTERNAL_API_URL=$INTERNAL_API_URL

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npx prisma generate --schema apps/web/prisma/schema.prisma
RUN npm run build --workspace web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "web"]
