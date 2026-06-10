FROM node:20-alpine

# Türkçe karakter destekli font yükle
RUN apk add --no-cache ttf-dejavu

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]