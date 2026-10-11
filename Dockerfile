FROM oven/bun:1-alpine

WORKDIR /app

# Instala curl para healthchecks e dependências de sistema se necessárias
RUN apk add --no-cache curl bash

# Copia manifestos de dependência
COPY package.json bun.lock* ./

# Instala dependências
RUN bun install

# Copia restante da aplicação
COPY . .

# Expõe portas do Frontend (3000) e Backend API (3001)
EXPOSE 3000 3001

# Comando padrão
CMD ["sh", "-c", "bun run server & bun run dev"]
