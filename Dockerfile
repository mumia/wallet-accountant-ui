FROM node:lts-buster
WORKDIR /app
COPY old/package.json .
RUN npm install --quiet
COPY . .
