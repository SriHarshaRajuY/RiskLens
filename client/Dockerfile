FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY client ./client
RUN npm run build --workspace client

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/client/.next ./client/.next
COPY client/package.json ./client/package.json
COPY client/public ./client/public
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "client"]
