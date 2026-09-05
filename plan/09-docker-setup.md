# NexusFlow — Docker Setup

Local dev stack. **Everything runs on dj-pc**: the four fake clouds via the floci CLI,
plus all NexusFlow infrastructure in Docker. Only Spring Boot and the React app run
on the Mac.

The live compose file is [`docker/docker-compose.dev.yml`](../docker/docker-compose.dev.yml),
deployed to `D:\nexusflow\docker\` on dj-pc. The YAML below mirrors it.

---

## Topology — who runs what

```text
Mac (dev machine — code and app only)
  ├── Spring Boot API      :8080
  └── Vite dev server      :5173

dj-pc (Windows home server, reachable as `dj-pc` over Tailscale)
  ├── floci AWS            :4566
  ├── floci Azure          :4577
  ├── floci GCP            :4588
  ├── floci OCI            :4599
  ├── floci UI             :4500
  └── D:\nexusflow\docker\docker-compose.dev.yml
        ├── Kafka          :9092   + Kafka UI :8090
        ├── CockroachDB    :26257  + CRDB UI  :8080
        ├── Redis          :6379   + Insight  :5540
        └── Ollama         :11434  (profile "ai")
```

**Everything the Mac talks to is addressed as `dj-pc`, never `localhost`.** The only
`localhost` services are Spring Boot and Vite. CockroachDB's UI can stay on `:8080`
because it is on a different host from Spring Boot.

> **Tailscale is a hard dependency.** With Tailscale down, the backend has no database,
> no Kafka, no cache and no clouds — Spring Boot will not start. You can still compile
> and run `mvn install` offline, but not run the app.

Two cross-host consequences to remember:

- Kafka must advertise `dj-pc:9092`. If it advertises `localhost`, the Mac client is
  told to reconnect to itself and hangs with no useful error.
- Docker Desktop on dj-pc only starts after a Windows login, so containers can be down
  even while SSH and Tailscale are reachable.

---

## docker-compose.dev.yml

```yaml
# docker/docker-compose.dev.yml
# Runs on the Mac. Starts Kafka, CockroachDB, and Redis.
# Ollama runs natively (brew), NOT here — see topology note above.
# floci emulators run on dj-pc via the floci CLI.

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
      # Advertised as dj-pc so the Mac's client is redirected somewhere reachable.
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
      - "8080:8080" # CockroachDB admin UI
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
```

---

## Ollama setup

Ollama runs in Docker on dj-pc under the `ai` compose profile, so it is not started
by default. It is first needed at Milestone 6.

```bash
ssh -o RemoteCommand=none -o RequestTTY=no pc \
  "cd /d D:\nexusflow\docker && docker compose -f docker-compose.dev.yml --profile ai up -d ollama"

ssh -o RemoteCommand=none -o RequestTTY=no pc "docker exec nexusflow-ollama ollama pull llama3.2"
ssh -o RemoteCommand=none -o RequestTTY=no pc "docker exec nexusflow-ollama ollama pull nomic-embed-text"

curl http://dj-pc:11434/api/tags   # verify from the Mac
```

Note: Docker on dj-pc exposes only the `runc` runtime, so Ollama runs CPU-only. Enabling
the GTX 1660 Ti would need the NVIDIA Container Toolkit plus a `deploy.resources` GPU
reservation.

---

## docker-compose.infra.yml

Lighter version — Kafka, CockroachDB, and Redis with no UI containers, for when you want
a minimal footprint on the Mac.

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
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  cockroachdb:
    image: cockroachdb/cockroach:v24.1.0
    container_name: nexusflow-cockroachdb
    restart: always
    command: start-single-node --insecure
    ports: ["26257:26257", "8081:8080"]
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

See [`.env.dev`](../.env.dev) at the repo root for the live copy, including the real
resource IDs created in floci.

```env
# Spring Boot (Mac)
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080

# CockroachDB (dj-pc)
DB_URL=jdbc:postgresql://dj-pc:26257/nexusflow?sslmode=disable
DB_USERNAME=root
DB_PASSWORD=

# Redis (dj-pc)
REDIS_HOST=dj-pc
REDIS_PORT=6379
REDIS_PASSWORD=nexusflow-dev

# Kafka (dj-pc — broker advertises dj-pc:9092)
KAFKA_BOOTSTRAP_SERVERS=dj-pc:9092

# Ollama (dj-pc)
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

### On the Mac (`localhost`)

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
| 9092  | Kafka broker              |
| 8090  | Kafka UI                  |
| 26257 | CockroachDB SQL (JDBC)    |
| 8080  | CockroachDB admin UI      |
| 6379  | Redis                     |
| 5540  | Redis Insight UI          |
| 11434 | Ollama                    |
| 2181  | ZooKeeper                 |
| 2283  | Immich (photos, separate) |

---

## Startup order

Everything on dj-pc is `restart: always`, so after a Windows login the whole stack comes
back on its own. The steps below are for a cold start or a rebuild.

```text
--- on dj-pc (via ssh, or sitting at the PC) ---

1. Start the four emulators (once per boot):
   floci start
   floci gcp start
   floci az start
   floci oci start

2. Start infra (only if not already running):
   cd /d D:\nexusflow\docker
   docker compose -f docker-compose.dev.yml up -d

--- on the Mac ---

3. Confirm dj-pc is reachable (Tailscale must be up):
   curl -s http://dj-pc:4566/_localstack/health | head -c 200
   for p in 9092 26257 6379; do nc -z -G 2 dj-pc $p && echo "$p OK"; done

4. Start Spring Boot:
   mvn -f backend/pom.xml spring-boot:run -pl nexusflow-api

5. Start frontend:
   cd frontend && npm run dev

6. Open browser:
   http://localhost:5173
```

---

## Useful commands

Infra lives on dj-pc, so Docker commands go over SSH. Note the `-o` flags — see
[11-dev-environment.md](11-dev-environment.md) for why they are required.

```bash
# Convenience wrapper (add to ~/.zshrc)
sshpc() { ssh -o RemoteCommand=none -o RequestTTY=no pc "$@"; }

# See all running services
sshpc "cd /d D:\nexusflow\docker && docker compose -f docker-compose.dev.yml ps"

# Logs for one service
sshpc "docker logs -f nexusflow-kafka"

# Restart a single service
sshpc "docker restart nexusflow-cockroachdb"

# Wipe all volumes (fresh start)
sshpc "cd /d D:\nexusflow\docker && docker compose -f docker-compose.dev.yml down -v"

# CockroachDB SQL
sshpc "docker exec nexusflow-cockroachdb cockroach sql --insecure -d nexusflow -e \"SELECT 1;\""

# Kafka topics
sshpc "docker exec nexusflow-kafka kafka-topics --list --bootstrap-server localhost:29092"

# Redeploy the compose file after editing it locally
scp -o RemoteCommand=none docker/docker-compose.dev.yml pc:D:/nexusflow/docker/docker-compose.dev.yml
```

From the Mac, hit the web UIs directly — no SSH needed:
`http://dj-pc:4500` (floci) · `http://dj-pc:8090` (Kafka) · `http://dj-pc:8080` (CockroachDB) · `http://dj-pc:5540` (Redis Insight)

```bash
# Postgres client from the Mac (CockroachDB speaks the Postgres wire protocol)
psql "postgresql://root@dj-pc:26257/nexusflow?sslmode=disable"

# Redis from the Mac
redis-cli -h dj-pc -p 6379 -a nexusflow-dev
```
