FROM node:18.12.1-alpine

WORKDIR /app/

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "/app/src/index.js" ]
