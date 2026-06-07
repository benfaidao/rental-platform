FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
