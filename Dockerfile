FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY db ./db
COPY client ./client

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
