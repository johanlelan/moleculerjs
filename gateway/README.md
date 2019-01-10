[![Moleculer](https://img.shields.io/badge/Powered%20by-Moleculer-green.svg?colorB=0e83cd)](https://moleculer.services)

# gateway

## Build Setup

``` bash
# Install dependencies
npm install

# Start developing with REPL
npm run dev

# Start production
npm start

# Run unit tests
npm test

# Run continuous test mode
npm run ci

# Run ESLint
npm run lint
```

## Run in Docker

```bash
$ docker-compose up -d --build
```

## OpenAPI Swagger UI
To offer OpenAPI Swagger UI integration, you need to modify package.json.
Change the following line until moleculer-web master was realeased :

```json
"moleculer-web": "git+ssh://git@github.com/moleculerjs/moleculer-web.git",
```

```bash
npm i
```

Warn : This modification is not compatible with docker build!
