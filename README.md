# URL Shortener Service

A lightweight, cloud-native URL shortening service built with Node.js, Express, and AWS DynamoDB. Generates short, random URLs that redirect to original long URLs while tracking click statistics.

---

## Features

- **URL Shortening** — Convert long URLs into compact, shareable short links
- **Random Code Generation** — Uses cryptographically secure random bytes (6 bytes → 8 base64url characters) for unique short codes
- **Click Tracking** — Atomically increments visit counts on every redirect
- **Statistics Endpoint** — Retrieve original URL, click count, creation timestamp, and short code
- **Health Check** — Monitor service availability via `/health` endpoint
- **Cloud-Native Storage** — AWS DynamoDB for scalable, serverless persistence
- **Atomic Operations** — Click counting uses DynamoDB `UpdateCommand` for race-condition-free increments

---

## Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Runtime     | Node.js (CommonJS)                  |
| Framework   | Express.js v5                       |
| Storage     | AWS DynamoDB                        |
| AWS SDK     | `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` |
| Config      | `dotenv` (environment variables)    |
| Dev Tool    | `nodemon` (auto-restart on changes) |

---

## Project Structure

```
.
├── src/
│   ├── index.js      # Express app bootstrap & server startup
│   ├── routes.js     # API route definitions & request handlers
│   └── store.js      # DynamoDB data access layer (CRUD operations)
├── .env              # Environment variables (gitignored)
├── .gitignore
├── package.json
└── package-lock.json
```

### Module Overview

- **[`src/index.js`](src/index.js)** — Entry point. Sets up Express middleware, mounts routes, and starts the HTTP server.
- **[`src/routes.js`](src/routes.js)** — Defines all API endpoints: health check, URL shortening, redirection, and statistics.
- **[`src/store.js`](src/store.js)** — Abstracts DynamoDB operations (`save`, `get`, `increment`) using the Document Client for plain JavaScript objects.

---

## Prerequisites

- Node.js 18+ 
- AWS account with DynamoDB access
- An existing DynamoDB table for storing URL records

---

## Installation

```bash
npm install
```

This installs the production dependencies: `express`, `dotenv`, and their transitive dependencies.

---

## Configuration

Create a `.env` file in the project root with the following variables:

```env
AWS_REGION=us-east-1
DYNAMODB_TABLE=urls
PORT=3000
```

| Variable           | Description                                      | Default      |
|--------------------|--------------------------------------------------|--------------|
| `AWS_REGION`       | AWS region for DynamoDB endpoint                 | `us-east-1`  |
| `DYNAMODB_TABLE`   | Name of the DynamoDB table storing URL records   | `urls`       |
| `PORT`             | HTTP server port                                 | `3000`       |

> **Note:** `.env` is listed in `.gitignore` to prevent accidental commits of sensitive configuration.

### DynamoDB Table Schema

The DynamoDB table should use `code` as the partition key (string type). Each item stores:

| Attribute    | Type    | Description                              |
|-------------|---------|------------------------------------------|
| `code`      | String  | Primary key — the short URL code         |
| `url`       | String  | The original long URL                    |
| `clicks`    | Number  | Total redirect count (auto-incremented)  |
| `createdAt` | String  | ISO 8601 timestamp of URL creation       |

---

## Running the Application

### Development Mode (with auto-restart)

```bash
npm run dev
```

Uses `nodemon` to automatically restart the server on file changes.

### Production Mode

```bash
npm start
```

Runs the server directly with Node.js.

---

## API Endpoints

### `GET /health`

Health check endpoint for monitoring and load balancer probes.

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-24T14:00:00.000Z"
}
```

---

### `POST /shorten`

Create a new short URL.

**Request Body:**
```json
{
  "url": "https://www.example.com/very/long/url/that/needs/shortening"
}
```

**Response `201`:**
```json
{
  "code": "aB3xKp2q",
  "shortUrl": "http://localhost:3000/aB3xKp2q",
  "originalUrl": "https://www.example.com/very/long/url/that/needs/shortening"
}
```

**Error Responses:**

| Status | Condition           | Response                              |
|--------|---------------------|---------------------------------------|
| `400`  | Missing `url` field | `{"error": "url is required"}`        |
| `400`  | Invalid URL format  | `{"error": "invalid url"}`            |
| `500`  | DynamoDB failure    | `{"error": "could not save url"}`     |

---

### `GET /:code`

Redirect to the original URL. Increments the click counter atomically.

**Response `302`** — Redirects to the original URL.

**Error Response `404`:**
```json
{
  "error": "not found"
}
```

---

### `GET /:code/stats`

Retrieve statistics for a short URL without redirecting.

**Response `200`:**
```json
{
  "code": "aB3xKp2q",
  "originalUrl": "https://www.example.com/very/long/url/that/needs/shortening",
  "clicks": 42,
  "createdAt": "2026-04-24T10:30:00.000Z"
}
```

**Error Response `404`:**
```json
{
  "error": "not found"
}
```

---

## Request Flow

```
Client                    Server (Express)              DynamoDB
  │                          │                            │
  │  POST /shorten           │                            │
  ├─────────────────────────►│                            │
  │                          │  PutCommand (save item)    │
  │                          ├───────────────────────────►│
  │                          │◄───────────────────────────┤
  │  201 { code, shortUrl }  │                            │
  │◄─────────────────────────│                            │
  │                          │                            │
  │  GET /:code              │                            │
  ├─────────────────────────►│                            │
  │                          │  GetItem (lookup code)     │
  │                          ├───────────────────────────►│
  │                          │◄───────────────────────────┤
  │                          │  UpdateCommand (+1 click)  │
  │                          ├───────────────────────────►│
  │                          │◄───────────────────────────┤
  │  302 Redirect            │                            │
  │◄─────────────────────────│                            │
```

---

## Short Code Algorithm

Short codes are generated using Node.js `crypto.randomBytes(6)`, producing 6 cryptographically secure random bytes encoded as 8 base64url characters (e.g., `aB3xKp2q`). This provides:

- **2^48 (≈281 trillion)** possible combinations
- URL-safe characters only (`A-Za-z0-9-_`)
- Collision-resistant generation

---

## Available Scripts

| Command           | Description                          |
|-------------------|--------------------------------------|
| `npm start`       | Start the server in production mode  |
| `npm run dev`     | Start with auto-restart (nodemon)    |
| `npm test`        | Run tests (not yet configured)       |

---

## Environment Variables

| Variable           | Required | Default      | Description                    |
|--------------------|----------|--------------|--------------------------------|
| `AWS_REGION`       | Yes      | `us-east-1`  | AWS region for DynamoDB        |
| `DYNAMODB_TABLE`   | Yes      | `urls`       | DynamoDB table name            |
| `PORT`             | No       | `3000`       | HTTP server listening port     |

---

## License

ISC
