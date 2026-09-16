# Körpasset app image. Build from the repository root:
#   docker build -t korpasset-app .
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
COPY --from=build /repo /repo
WORKDIR /repo/app

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "dist/index.js"]
