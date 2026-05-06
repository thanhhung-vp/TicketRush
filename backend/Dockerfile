FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN chmod +x scripts/docker-start.sh
EXPOSE 4000
CMD ["sh", "scripts/docker-start.sh"]
