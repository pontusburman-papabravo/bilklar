# Build from repository root:
#   docker build -f deploy/Dockerfile -t korpasset-app .
FROM node:22-bookworm-slim AS build

WORKDIR /repo
COPY app/package.json app/package-lock.json /repo/app/
WORKDIR /repo/app
RUN npm ci

COPY app/ /repo/app/
COPY docs/domain/skill-taxonomy-v1.json /repo/docs/domain/skill-taxonomy-v1.json
COPY db/migrations /repo/db/migrations
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/app

ENV NODE_ENV=production
EXPOSE 3000
USER node

# Fail the image if the Argon2 native binding is missing (admin password hashes).
RUN node -e "import('@node-rs/argon2').then(() => console.log('argon2 ok'))"

CMD ["node", "dist/index.js"]
