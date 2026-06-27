# Civic Hub API
FROM node:22-alpine

WORKDIR /app

# Install production dependencies against the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
