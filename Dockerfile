# ---------- Base ----------
FROM node:20-alpine AS base

WORKDIR /app

# ---------- Builder ----------
FROM base AS builder

COPY package*.json ./

RUN npm install

COPY ./src ./src

RUN npm prune --production

# ---------- Release ----------
FROM base AS release

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./dist

USER node

CMD ["node", "./dist/index.js"]