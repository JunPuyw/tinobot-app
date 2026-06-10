FROM node:22-alpine AS app

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace api

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start", "--workspace", "api"]
