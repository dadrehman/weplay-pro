FROM node:20-slim

WORKDIR /app

# Install OpenSSL and CA certificates for Prisma and secure database SSL
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 5000
ENV PORT=5000

CMD ["sh", "-c", "npx prisma db push --skip-generate || true; npm start"]
