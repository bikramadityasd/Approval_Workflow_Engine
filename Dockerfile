FROM node:20-alpine

WORKDIR /app

# Install dependencies (includes devDeps for tsx, prisma)
COPY package*.json ./
RUN npm ci

# Copy source + prisma schemas
COPY . .

# Generate Prisma clients
RUN npx prisma generate --schema prisma/schema.prisma

EXPOSE 3001

# Run with tsx (POC — no separate build step needed)
CMD ["npx", "tsx", "src/server.ts"]






# docker run -d --name approval-db \
#   -p 35432:5432 \
#   -e POSTGRES_USER=user \
#   -e POSTGRES_PASSWORD=password \
#   -e POSTGRES_DB=db \
#   postgres:16.13