FROM node:20-alpine

WORKDIR /app
RUN mkdir -p /tmp/uploads

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]