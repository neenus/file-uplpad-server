FROM --platform=linux/amd64 node:slim

# Set node environment to production
ENV NODE_ENV=production

ADD --chown=node:node . /server
WORKDIR /server

COPY package*.json ./
RUN npm ci omit=development && npm cache clean --force
RUN npm install pm2 -g

EXPOSE 7000
COPY --chown=node:node ./ ./

USER node
CMD ["npm", "start"]