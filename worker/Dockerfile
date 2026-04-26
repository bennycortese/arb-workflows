FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY *.ts tsconfig.json ./
RUN npm run build

RUN npm prune --omit=dev

CMD ["node", "dist/index.js"]
