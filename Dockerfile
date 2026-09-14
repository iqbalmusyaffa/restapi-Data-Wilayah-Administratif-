FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code and assets
COPY . .

# Copy .env.example if .env does not exist
RUN cp .env.example .env

# Run database seeder during build
RUN npm run seed

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
