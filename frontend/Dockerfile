# syntax=docker/dockerfile:1.4
FROM node:22-alpine as builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN --mount=type=secret,id=VEMPAIN_ACTION_TOKEN \
    export VEMPAIN_ACTION_TOKEN="$(cat /run/secrets/VEMPAIN_ACTION_TOKEN)" && \
    yarn install --immutable

COPY . .

RUN --mount=type=secret,id=VEMPAIN_ACTION_TOKEN \
    export VEMPAIN_ACTION_TOKEN="$(cat /run/secrets/VEMPAIN_ACTION_TOKEN)" && \
    yarn build:production

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
