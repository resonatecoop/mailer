ARG RELEASE_TAG=development
ARG NODE_ENV=development

FROM node:14-alpine AS builder

WORKDIR /build

ARG RELEASE_TAG

RUN apk --no-cache add git

RUN git clone --branch ${RELEASE_TAG} --single-branch --depth 1 https://github.com/resonatecoop/mailer

ENV NODE_ENV development

WORKDIR /build/mailer

RUN npm install

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

RUN npm run build

FROM node:14-alpine

WORKDIR /build

COPY .env ./
COPY .env.example ./
COPY ./package* ./
COPY ./index.js ./
COPY ./server.js ./

COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/lib ./lib

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

EXPOSE 3000

CMD ["npm", "start"]
