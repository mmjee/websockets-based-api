### websockets-api

A very simple template for IPv6-based websocket-oriented microservice that can be directly exposed to the internet without giant piles of proxies and IPv4 copium.

Main code is at [app.js](wba/app.js)

Sample client included at [sample_client.js](sample_client.js)

##### So how do I use it?

```shell
cp docker-compose.example.yml docker-compose.yml
$EDITOR docker-compose.yml
# Add relevant AAAA records
yarn install
npx greenlock add --subject my-service.location.yourdomain.com --altnames my-service.location.yourdomain.com
docker-compose up -d
```
