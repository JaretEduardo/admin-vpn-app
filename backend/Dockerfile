# syntax=docker/dockerfile:1
ARG NODE_VERSION=20-alpine

# ---- build: install all deps, generate Prisma Client, compile NestJS ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: same tree, pruned to production dependencies only ----
FROM build AS prod-deps
RUN npm prune --omit=dev

# ---- runtime: minimal image, no build toolchain, no devDependencies ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
