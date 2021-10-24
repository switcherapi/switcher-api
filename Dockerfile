# ---------- Base ----------
FROM node:fermium-alpine3.14 AS base

WORKDIR /app

# ---------- Builder ----------
# Creates:
# - node_modules: production dependencies (no dev dependencies)
# - dist: A production build compiled with Babel
FROM base AS builder

COPY package*.json babel.config.js ./

# Install all dependencies, both production and development
RUN npm install

# Copy the source files
COPY ./src ./src

# Build
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ---------- Release ----------
FROM base AS release

# Copy the production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy the compiled app
COPY --from=builder /app/build ./dist

USER node

CMD ["node", "./dist/index.js"]