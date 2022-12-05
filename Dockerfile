FROM node:18-alpine AS base

ENV CI=true
ENV HUSKY_SKIP_INSTALL=1

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY .yarn/ .yarn/
COPY package.json yarn.lock .yarnrc.yml ./



FROM base AS builder

ENV NODE_ENV="development"

RUN yarn --immutable

COPY tsconfig.base.json ./
COPY src/ src/

RUN yarn build

FROM base AS runner

ENV NODE_ENV="production"

COPY --from=builder /app/dist/ ./

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD [ "yarn", "start" ]
