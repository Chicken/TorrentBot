FROM node:20-alpine AS base

ENV CI=true
ENV FORCE_COLOR=true

RUN apk add --no-cache dumb-init

WORKDIR /app

RUN chown -R node:node /app
USER node

COPY --chown=node:node .yarn/ .yarn/
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./

RUN sed -i 's/postinstall/_postinstall/' ./package.json



FROM base AS builder

ENV NODE_ENV="development"

RUN yarn --immutable

COPY --chown=node:node tsconfig.base.json tsconfig.json ./
COPY --chown=node:node src/ src/

RUN yarn build



FROM base AS runner

ENV NODE_ENV="production"

RUN yarn workspaces focus --all --production

COPY --from=builder --chown=node:node /app/dist/ dist/

ENTRYPOINT ["dumb-init", "--"]
CMD [ "yarn", "start" ]
