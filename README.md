# BlockchainAuth

A monorepo project using [Nx](https://nx.dev) that includes:

- `blockchain-service`
- `identity-service`

This project consists of two microservices:

- Identity Service – A lightweight authentication service that handles user registration, login, and identity management.

- Blockchain Service – A specialized service that indexes Ethereum smart contracts and retrieves transaction data for a given contract across a specified block range.

---

## 🛠️ Prerequisites

### 1. Install Dependencies

Install project dependencies:

```sh
npm install
```

### 2. Install Docker

Ensure [Docker](https://docs.docker.com/get-docker/) and Docker Compose are installed.

---

## 🧩 MongoDB Setup

Run MongoDB locally in a Docker container:

```sh
docker run -it \
  --name my-interactive-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=1234 \
  -e MONGO_INITDB_DATABASE=blockchain_auth \
  -p 27017:27017 \
  -v mongodata:/data/db \
  mongo:7.0
```

To restart it later:

```sh
docker start -ai my-interactive-mongo
```

---

## 🔗 Blockchain Service Configuration

1. Create an account at [Metamask Developer](https://metamask.io/).
2. Create an API key and click its name under "API Keys".
3. In the **All Endpoints** section:
   - Disable all endpoints except `Ethereum - Sepolia`.
4. In **Active Endpoints**, copy the `HTTPS` and `WebSocket` URLs.

You’ll need these for environment variables later.

---

## ⚙️ Environment Setup

Create `.env` files for both services using `.env.example` as a template. Place them in the same folder as the example files.

---

## 🚀 Running the Project

### Dev Servers

```sh
npx nx serve blockchain-service
npx nx serve identity-service
```

### Production Build

```sh
npx nx build blockchain-service
npx nx build identity-service
```

### View Available Targets

```sh
npx nx show project blockchain-service
npx nx show project identity-service
```

### Run Tests

```sh
npx nx test blockchain-service
npx nx test identity-service
```

> To view coverage reports, use the `test:coverage` target.

### Lint Project

```sh
npm run lint
```

---

## 🐳 Docker Usage

### Build Docker Images Locally

```sh
npx nx docker-build identity-service
npx nx docker-build blockchain-service
```

### Remote Images from GitHub

These images are available in the GitHub Container Registry:

- `ghcr.io/blitzz13/blockchain-auth-blockchain-service:0.0.1`
- `ghcr.io/blitzz13/blockchain-auth-identity-service:0.0.1`

You can either:

- Pull manually:

```sh
docker pull ghcr.io/blitzz13/blockchain-auth-blockchain-service:0.0.1
docker pull ghcr.io/blitzz13/blockchain-auth-identity-service:0.0.1
```

- Or reference them directly in `docker-compose.yaml`.

### Docker Compose

Before running, update `SEPOLIA_HTTPS_URL` and `SEPOLIA_WSS_URL` in `docker-compose.yaml` with your API keys.

If you’re using remote images, replace:

```yaml
image: blockchain-auth-identity-service:latest
```

with:

```yaml
image: ghcr.io/blitzz13/blockchain-auth-identity-service:0.0.1
```

Do the same for `blockchain-service`.

Then run:

**Mac/Linux:**

```sh
docker compose up
```

**Windows:**

```sh
docker-compose up
```

---

## 🧱 Add New Projects

Generate a new app:

```sh
npx nx g @nx/node:app demo
```

Generate a new library:

```sh
npx nx g @nx/node:lib mylib
```
