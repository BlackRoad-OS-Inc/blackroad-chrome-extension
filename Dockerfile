# Run the test suite inside a container to verify the extension logic
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test
