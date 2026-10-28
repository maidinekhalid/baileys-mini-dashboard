FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
ENV NODE_ENV=production PORT=3080
EXPOSE 3080
USER node
CMD ["node", "server.js"]
