FROM node:24-alpine

WORKDIR /app/frontend

COPY package*.json .
COPY vite.config.ts .
COPY tsconfig*.json .

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]