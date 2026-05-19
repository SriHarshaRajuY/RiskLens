FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY server ./server
RUN npm run build --workspace server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY server/package.json ./server/package.json
EXPOSE 5000
CMD ["npm", "run", "start", "--workspace", "server"]
