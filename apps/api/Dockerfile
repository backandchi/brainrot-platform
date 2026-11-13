FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile || pnpm install
RUN cd packages/database && npx prisma generate
RUN cd apps/api && pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app ./

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
