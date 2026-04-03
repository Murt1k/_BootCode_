FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.js ./
COPY public ./public
COPY .env.example ./

EXPOSE 3000

CMD ["node", "server.js"]
