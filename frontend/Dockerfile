# Build stage
# FROM node:alpine AS builder
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev
RUN npm install -D tailwindcss@3

COPY . .

# Build TailwindCSS
RUN ./node_modules/.bin/tailwindcss -i ./src/index.css -o ./src/index.css

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
