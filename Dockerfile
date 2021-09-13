FROM node:16-alpine

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add dumb-init

COPY package.json yarn.lock ./
COPY src/ src/

RUN yarn --production=true --frozen-lockfile --link-duplicates

USER node

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD [ "node", "--es-module-specifier-resolution=node", "--no-warnings", "." ]
