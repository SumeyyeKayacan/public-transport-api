FROM node:12.17.0 AS base

ARG GITHUB_NPM_TOKEN
ENV GITHUB_NPM_TOKEN $GITHUB_NPM_TOKEN

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY .npmrc ./
RUN yarn
COPY . .
RUN yarn build

FROM node:12.17.0-alpine
WORKDIR /app
COPY --from=base /app .

RUN rm .npmrc

EXPOSE 5000

CMD [ "yarn", "start:prod" ] 
