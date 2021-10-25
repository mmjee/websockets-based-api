FROM node:lts

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY index.js ./
COPY wba ./wba

COPY .greenlockrc ./
COPY greenlock.d ./greenlock.d

RUN yarn install

# You may opt to init greenlock here.

EXPOSE 80
EXPOSE 443
ENV NODE_PATH=.
ENV NODE_OPTIONS="--unhandled-rejections=warn"
CMD ["node", "index.js"]
