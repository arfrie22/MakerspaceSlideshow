FROM node:current-alpine

WORKDIR /app

COPY src/ ./src
COPY static/ ./static
COPY package.json ./
COPY package-lock.json ./
COPY svelte.config.js ./
COPY tsconfig.json ./
COPY vite.config.ts ./

RUN npm install
RUN npm run build

EXPOSE 3000

CMD ["node", "build"]