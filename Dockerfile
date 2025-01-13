FROM node:22 AS setup
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm install -g typescript
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /usr/src/app
COPY --from=setup /usr/src/app/dist ./dist
COPY --from=setup /usr/src/app/node_modules ./node_modules
EXPOSE $PORT

ENV NODE_ENV production

CMD ["node", "dist/server.js"]
