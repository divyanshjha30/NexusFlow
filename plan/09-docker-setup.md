# NexusFlow — Docker Setup

Full local dev stack. Everything runs in Docker (or alongside it via floci CLI).

---

## Topology — who runs what

```
dj-pc (Windows, reachable as `dj-pc` over Tailscale)
  ├── floci emulators      :4566 :4577 :4588 :4599   (started via floci CLI)
  ├── floci UI             :4500
  └── docker-compose.dev.yml
        ├── Kafka          :9092   + Kafka UI :8090
        ├── CockroachDB    :26257  + CRDB UI  :8080
        ├── Redis          :6379   + Insight  :5540
        └── Ollama         :11434

Mac (dev machine — where you write code)
  ├── Spring Boot API      :8080
  └── Vite dev server      :5173
```

**Everything the Mac talks to is addressed as `dj-pc`, never `localhost`.** The only
`localhost` services from the Mac's point of view are Spring Boot and Vite, which run
locally. Because CockroachDB's UI sits on `:8080` on dj-pc and Spring Boot sits on
`:8080` on the Mac, they are on different hosts and do not collide.

---

## docker-compose.dev.yml

```yaml
# docker/docker-compose.dev.yml
# Starts all infrastructure needed for local development.
# floci emulators are started separately via floci CLI (see below).

version: "3.9"

services:
  # ──────────────────────────────
  # Kafka (MSK emulator)
  # ──────────────────────────────
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: nexusflow-zookeeper
    restart: always
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data
      - zookeeper-logs:/var/lib/zookeeper/log

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: nexusflow-kafka
    restart: always
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9094:9094"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      # Must advertise dj-pc, not localhost — the Mac client connects across the network
      # and Kafka redirects it to whatever hostname is advertised here.
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://dj-pc:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - kafka-data:/var/lib/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: nexusflow-kafka-ui
    restart: always
    depends_on:
      - kafka
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: nexusflow-local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092

  # ──────────────────────────────
  # CockroachDB
  # ──────────────────────────────
  cockroachdb:
    image: cockroachdb/cockroach:v24.1.0
    container_name: nexusflow-cockroachdb
    restart: always
    command: start-single-node --insecure --advertise-addr=cockroachdb
    ports:
      - "26257:26257" # SQL (JDBC)
      - "8080:8080" # CockroachDB UI
    volumes:
      - cockroachdb-data:/cockroach/cockroach-data

  # ──────────────────────────────
  # Redis
  # ──────────────────────────────
  redis:
    image: redis:7.2-alpine
    container_name: nexusflow-redis
    restart: always
    command: redis-server --appendonly yes --requirepass nexusflow-dev
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  redis-ui:
    image: redislabs/redisinsight:latest
    container_name: nexusflow-redis-ui
    restart: always
    ports:
      - "5540:5540"

  # ──────────────────────────────
  # Ollama (local LLM)
  # ──────────────────────────────
  ollama:
    image: ollama/ollama:latest
    container_name: nexusflow-ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    # For GPU: add deploy.resources.reservations.devices

  ollama-init:
    image: ollama/ollama:latest
    container_name: nexusflow-ollama-init
    depends_on:
      - ollama
    entrypoint: >
      /bin/sh -c "
        sleep 5 &&
        ollama pull llama3.2 &&
        ollama pull nomic-embed-text &&
        echo 'Models ready'
      "
    environment:
      OLLAMA_HOST: http://ollama:11434
    restart: "no"

  # ──────────────────────────────
  # Kafka topic initializer
  # ──────────────────────────────
  kafka-init:
    image: confluentinc/cp-kafka:7.6.0
    container_name: nexusflow-kafka-init
    depends_on:
      - kafka
    entrypoint: >
      /bin/sh -c "
        sleep 10 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.file.uploaded --partitions 12 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.file.stored --partitions 12 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.file.stored.failed --partitions 4 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.ai.started --partitions 8 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.ai.step.complete --partitions 8 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.ai.complete --partitions 12 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.ai.failed --partitions 4 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.document.archived --partitions 4 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.document.deleted --partitions 4 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.audit.log --partitions 12 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.user.activity --partitions 12 --replication-factor 1 &&
        kafka-topics --create --if-not-exists --bootstrap-server kafka:29092 --topic nexusflow.dlq --partitions 4 --replication-factor 1 &&
        echo 'All topics created'
      "
    restart: "no"

  # ──────────────────────────────
  # CockroachDB schema init
  # ──────────────────────────────
  cockroachdb-init:
    image: cockroachdb/cockroach:v24.1.0
    container_name: nexusflow-db-init
    depends_on:
      - cockroachdb
    entrypoint: >
      /bin/sh -c "
        sleep 5 &&
        cockroach sql --insecure --host=cockroachdb:26257 -e 'CREATE DATABASE IF NOT EXISTS nexusflow;' &&
        cockroach sql --insecure --host=cockroachdb:26257 -d nexusflow -e 'CREATE EXTENSION IF NOT EXISTS vector;' &&
        echo 'DB initialized'
      "
    restart: "no"

volumes:
  zookeeper-data:
  zookeeper-logs:
  kafka-data:
  cockroachdb-data:
  redis-data:
  ollama-models:
```

---

## docker-compose.infra.yml

Lighter version — just infra, no Ollama (for when you want Spring Boot to run outside Docker).

```yaml
# docker/docker-compose.infra.yml
version: "3.9"

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: nexusflow-zookeeper
    restart: always
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports: ["2181:2181"]

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: nexusflow-kafka
    restart: always
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://dj-pc:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  cockroachdb:
    image: cockroachdb/cockroach:v24.1.0
    container_name: nexusflow-cockroachdb
    restart: always
    command: start-single-node --insecure
    ports: ["26257:26257", "8080:8080"]
    volumes: [cockroachdb-data:/cockroach/cockroach-data]

  redis:
    image: redis:7.2-alpine
    container_name: nexusflow-redis
    restart: always
    command: redis-server --appendonly yes
    ports: ["6379:6379"]
    volumes: [redis-data:/data]

volumes:
  cockroachdb-data:
  redis-data:
```

---

## Environment variables

Spring Boot runs on the Mac, so every backing service is addressed as `dj-pc`.
If you ever run Spring Boot _on_ dj-pc instead, swap `dj-pc` → `localhost` throughout.

```env
# .env.dev (at repo root, not committed — add to .gitignore)

# Spring Boot (runs locally on the Mac)
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080

# CockroachDB (on dj-pc)
DB_URL=jdbc:postgresql://dj-pc:26257/nexusflow?sslmode=disable
DB_USERNAME=root
DB_PASSWORD=

# Redis (on dj-pc)
REDIS_HOST=dj-pc
REDIS_PORT=6379
REDIS_PASSWORD=nexusflow-dev

# Kafka (on dj-pc — broker must advertise dj-pc:9092, see compose file)
KAFKA_BOOTSTRAP_SERVERS=dj-pc:9092

# Ollama (on dj-pc)
OLLAMA_BASE_URL=http://dj-pc:11434

# floci (AWS)
AWS_ENDPOINT=http://dj-pc:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=nexusflow-documents
DYNAMODB_TABLE=nexusflow-documents
COGNITO_USER_POOL_ID=us-east-1_test
COGNITO_APP_CLIENT_ID=test-client-id

# floci (Azure)
AZURE_STORAGE_ENDPOINT=http://dj-pc:4577
AZURE_STORAGE_ACCOUNT=devstoreaccount1
AZURE_STORAGE_KEY=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
AZURE_BLOB_CONTAINER=nexusflow-documents
COSMOS_ENDPOINT=http://dj-pc:4577
COSMOS_KEY=test-key
COSMOS_DATABASE=nexusflow

# floci (GCP)
GCP_ENDPOINT=http://dj-pc:4588
GCP_PROJECT_ID=floci-local
GCS_BUCKET_NAME=nexusflow-documents
PUBSUB_TOPIC=nexusflow-events
FIRESTORE_DATABASE=(default)

# floci (OCI)
OCI_ENDPOINT=http://dj-pc:4599
OCI_NAMESPACE=floci-local
OCI_BUCKET_NAME=nexusflow-archive
OCI_STREAMING_ENDPOINT=http://dj-pc:4599

# Frontend (browser runs on the Mac; API + Vite are local, Cognito is on dj-pc)
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_COGNITO_DOMAIN=http://dj-pc:4566
VITE_COGNITO_CLIENT_ID=test-client-id
VITE_REDIRECT_URI=http://localhost:5173/login
```

---

## Port map

### On the Mac

| Port | Service                 |
| ---- | ----------------------- |
| 8080 | Spring Boot API         |
| 5173 | React dev server (Vite) |

### On dj-pc (reach as `dj-pc:<port>`)

| Port  | Service                   |
| ----- | ------------------------- |
| 4500  | floci UI dashboard        |
| 4566  | floci (AWS emulator)      |
| 4577  | floci-az (Azure emulator) |
| 4588  | floci-gcp (GCP emulator)  |
| 4599  | floci-oci (OCI emulator)  |
| 8080  | CockroachDB UI            |
| 8090  | Kafka UI                  |
| 9092  | Kafka broker              |
| 11434 | Ollama                    |
| 26257 | CockroachDB SQL (JDBC)    |
| 6379  | Redis                     |
| 5540  | Redis Insight UI          |
| 2181  | ZooKeeper                 |
| 2283  | Immich (photos, separate) |

---

## Startup order

```
--- on dj-pc (via `ssh pc`, or sitting at the PC) ---

1. Confirm Docker Desktop is up (it only starts after a Windows login):
   docker ps

2. Start floci emulators:
   floci start
   floci gcp start
   floci az start
   floci oci start

3. Start infra stack:
   cd NexusFlow/docker
   docker compose -f docker-compose.dev.yml up -d
   # Wait ~30s for the init containers to create topics + the database

--- on the Mac ---

4. Verify dj-pc is reachable:
   curl http://dj-pc:4566/_localstack/health
   nc -z dj-pc 9092 26257 6379 11434

5. Start Spring Boot:
   mvn spring-boot:run -pl nexusflow-api

6. Start frontend:
   cd frontend && npm run dev

7. Open browser:
   http://localhost:5173
```

---

## Useful commands

Infra lives on dj-pc, so Docker commands run over SSH from the Mac.

```bash
# See all running services
ssh pc "cd NexusFlow/docker && docker compose -f docker-compose.dev.yml ps"

# View logs for a specific service
ssh pc "cd NexusFlow/docker && docker compose -f docker-compose.dev.yml logs -f kafka"

# Restart a single service
ssh pc "cd NexusFlow/docker && docker compose -f docker-compose.dev.yml restart cockroachdb"

# Wipe all volumes (fresh start)
ssh pc "cd NexusFlow/docker && docker compose -f docker-compose.dev.yml down -v"

# Connect to CockroachDB SQL
ssh pc "docker exec -it nexusflow-cockroachdb cockroach sql --insecure --host=localhost"

# Connect to Redis CLI
ssh pc "docker exec -it nexusflow-redis redis-cli -a nexusflow-dev"

# Check Kafka topics
ssh pc "docker exec -it nexusflow-kafka kafka-topics --list --bootstrap-server localhost:9092"

# All 9 containers at a glance (alias defined in ~/.zshrc)
pc-health
```

From the Mac you can also hit the web UIs directly — no SSH needed:
`http://dj-pc:4500` (floci) · `http://dj-pc:8090` (Kafka) · `http://dj-pc:8080` (CockroachDB) · `http://dj-pc:5540` (Redis Insight)

```bash
# Postgres client from the Mac (CockroachDB speaks the Postgres wire protocol)
psql "postgresql://root@dj-pc:26257/nexusflow?sslmode=disable"

# Redis from the Mac
redis-cli -h dj-pc -p 6379 -a nexusflow-dev
```
