# ---------- Base ----------
FROM node:hydrogen-alpine AS base

WORKDIR /app

# ---------- Builder ----------
FROM base AS builder

COPY package*.json babel.config.js ./

RUN npm install

COPY ./src ./src

RUN npm run build && \
    npm prune --production

# ---------- Release ----------
FROM base AS release

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./dist

USER node

CMD ["node", "./dist/index.js"]