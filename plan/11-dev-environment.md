# NexusFlow — Dev Environment Setup (dj-pc)

This is a full reference for how the development environment is set up on Divyansh's Windows 11 home PC (`dj-pc`), accessible from a Mac over Tailscale.

---

## What is floci?

**floci** is a local cloud emulator — it emulates AWS, Azure, GCP, and OCI services on your own machine, with zero cloud accounts, zero cost, and no internet required.

It works by running local HTTP servers that implement the same APIs as the real cloud providers. Your Spring Boot code talks to `http://dj-pc:4566` instead of `https://s3.amazonaws.com`, and everything works exactly the same.

(floci binds to `localhost` _on dj-pc_. Because Spring Boot runs on the Mac, every endpoint in app config is written as `dj-pc` — see [09-docker-setup.md](09-docker-setup.md) for the full topology.)

### Why use floci instead of the real clouds?

- No account setup required for dev
- No costs (free tier limits don't apply)
- Completely offline
- Instant — no network latency
- Reset any time (`floci stop && floci start`)
- Runs all 4 major clouds simultaneously: AWS, Azure, GCP, OCI

### floci services available

```text
AWS  (port 4566):  S3, SQS, SNS, DynamoDB, Lambda, Cognito, KMS, Secrets Manager,
                    Step Functions, EventBridge, Bedrock, Comprehend, Rekognition,
                    Transcribe, CloudWatch, MSK (Kafka), IAM, SSM, Athena, S3 Vectors

Azure (port 4577):  Blob Storage, Queue Storage, Service Bus, Event Hubs, Event Grid,
                    Functions, Cosmos DB, Key Vault, App Configuration

GCP  (port 4588):  Cloud Storage, Pub/Sub, Firestore, Cloud Run, Functions, Vertex AI,
                    Natural Language API, BigQuery, Cloud Scheduler, Secret Manager

OCI  (port 4599):  Object Storage, Streaming, Queue, Autonomous Database, Vault,
                    Events, Monitoring, Logging
```

### floci UI dashboard

floci includes a web UI at **<http://dj-pc:4500>** that shows:

- Which emulators are running and healthy
- Buckets, queues, topics, and other resources you've created
- Real-time activity as your app calls the emulators

---

## Machine: dj-pc

**Hardware:** Windows 11 PC (C: drive = OS, D: drive = data)
**Tailscale hostname:** `dj-pc` (always use this — the IP may change)
**Windows user:** `divya` (Administrator account)

---

## SSH access (from Mac)

### Mac `~/.ssh/config` entry

```text
Host pc
    HostName dj-pc
    User divya
    IdentityFile ~/.ssh/home_pc_ed25519
    IdentitiesOnly yes
    RequestTTY yes
    RemoteCommand powershell.exe -NoProfile -NoLogo
```

Connect with: `ssh pc`

### Running a one-off command over SSH

The `RemoteCommand`/`RequestTTY` lines above make `ssh pc` drop into an interactive
PowerShell, but they break `ssh pc "<command>"`:

```text
Cannot execute command-line and remote command.
```

Override both flags for non-interactive use:

```bash
ssh -o RemoteCommand=none -o RequestTTY=no pc "docker ps"
```

Second trap: the remote default shell is `cmd.exe`, which does **not** treat `'` as a
quote character. `docker ps --format '{{.Names}}'` fails with
`'{{.Status}}'' is not recognized...`. Drop the inner single quotes:

```bash
ssh -o RemoteCommand=none -o RequestTTY=no pc "docker ps --format {{.Names}}"
```

### How Windows SSH auth works for admins

Windows OpenSSH has a special rule: **if the user is an Administrator, it ignores `~/.ssh/authorized_keys`** and only reads `C:\ProgramData\ssh\administrators_authorized_keys`.

The public key must live there with locked-down permissions:

```powershell
icacls C:\ProgramData\ssh\administrators_authorized_keys /inheritance:r
icacls C:\ProgramData\ssh\administrators_authorized_keys /grant "Administrators:F"
icacls C:\ProgramData\ssh\administrators_authorized_keys /grant "SYSTEM:F"
```

### Post-quantum key exchange

The Windows built-in OpenSSH (9.5) is too old to support post-quantum key exchange. To fix the "connection is not using a post-quantum key exchange algorithm" warning:

```powershell
winget install --id Microsoft.OpenSSH.Preview
Restart-Service sshd -Force
```

After this, the Mac and PC negotiate `mlkem768x25519-sha256` automatically.

### sshd service

sshd is a Windows service (not a Docker container), set to start automatically at boot before any user logs in. This means SSH access works even before anyone has logged into Windows.

```powershell
Get-Service sshd             # check status
Restart-Service sshd         # restart
Set-Service sshd -StartupType Automatic
```

---

## Tailscale

Tailscale is also a Windows service — it starts automatically at boot before login. This means the PC is reachable on the Tailscale network as soon as it powers on, without anyone needing to be logged in.

```powershell
Get-Service Tailscale        # check status
```

Both sshd and Tailscale together mean: **the PC is remotely accessible immediately after power-on**, even before Windows login.

---

## Docker

Docker Desktop is installed on dj-pc and runs the Immich photos server, floci-ui dashboard, and (eventually) NexusFlow infrastructure.

### Important: Docker Desktop needs a Windows login session

Docker Desktop is a GUI application. It starts automatically **when a user logs into Windows**, not at boot. This means:

- After power-on, Docker Desktop is NOT running until someone logs in to Windows
- Once logged in, Docker Desktop starts and all `restart: always` containers come back up automatically
- SSH alone cannot start Docker Desktop reliably

Tailscale and sshd → start at boot (before login)
Docker Desktop → starts at login

### Docker credential fix for SSH sessions

When running `docker` commands over SSH, you'll see this error without the fix:

```text
error getting credentials - err: exec: "docker-credential-desktop": exit status 1
A specified logon session does not exist.
```

This happens because `docker-credential-desktop` needs an interactive Windows logon session to access the credential store, which SSH doesn't have.

**Fix applied (permanent, machine-wide):**

- Machine environment variable: `DOCKER_CONFIG=C:\Users\divya\docker-ssh-config`
- `C:\Users\divya\docker-ssh-config\config.json` contains:

```json
{ "auths": { "https://index.docker.io/v1/": {} } }
```

The empty `auths` entry tells Docker CLI to skip the broken credential helper entirely. Every SSH session inherits the machine env var, so `docker pull`, `docker compose up`, etc. all work.

**Critical detail:** This config directory MUST be at `C:\Users\divya\...` (user-writable), NOT `C:\ProgramData\...`. Docker Desktop runs as the user and needs to write a context file there. Putting it in `C:\ProgramData` caused Docker Desktop to crash on boot with "Access is denied".

### Running containers (all `restart: always`)

| Container(s)          | Location              | Ports                          | Start command                                    |
| --------------------- | --------------------- | ------------------------------ | ------------------------------------------------ |
| Immich (4 containers) | `D:\immich-app`       | 2283                           | `docker compose up -d`                           |
| floci-ui              | `D:\floci-ui`         | 4500                           | `docker compose up -d`                           |
| floci emulators (4)   | floci CLI             | 4566, 4577, 4588, 4599         | `floci start` etc.                               |
| NexusFlow infra       | `D:\nexusflow\docker` | 9092, 26257, 8080, 6379, 11434 | `docker compose -f docker-compose.dev.yml up -d` |

NexusFlow infra = ZooKeeper, Kafka (+UI), CockroachDB, Redis (+Insight) and Ollama.
Only Spring Boot and the React app run on the Mac.

### floci-ui docker-compose.yml

Location: `D:\floci-ui\docker-compose.yml`

```yaml
services:
  floci-ui:
    image: floci/floci-ui:latest
    container_name: floci-ui
    restart: always
    ports:
      - "4500:4500"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      PORT: "4500"
      FLOCI_ENDPOINT: http://host.docker.internal:4566
      FLOCI_AZURE_ENDPOINT: http://host.docker.internal:4577
      FLOCI_AZURE_ACCOUNT_NAME: devstoreaccount1
      FLOCI_GCP_ENDPOINT: http://host.docker.internal:4588
      FLOCI_GCP_PROJECT: floci-local
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
```

---

## floci CLI

floci is installed at: `C:\Users\divya\AppData\Local\floci\bin\floci.exe`

### Start all 4 emulators

Run these **on dj-pc** (`ssh pc`, then the commands below). The `localhost` URLs are
from the PC's own point of view — from the Mac the same services are at `dj-pc:<port>`.

```powershell
floci start           # AWS  → http://localhost:4566
floci gcp start       # GCP  → http://localhost:4588
floci az start        # Azure → http://localhost:4577
floci oci start       # OCI  → http://localhost:4599
```

### Check status

```powershell
floci status          # AWS
floci gcp status      # GCP
```

### Stop all

```powershell
floci stop
floci gcp stop
floci az stop
floci oci stop
```

### Reinstall floci (after a Windows reset)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://floci.io/install.ps1 | iex"
```

Note: Fresh Windows installs block scripts by default. Always use `-ExecutionPolicy Bypass` for the floci installer.

---

## Mac-side configuration

### `~/.zshrc` aliases and exports

```zsh
# floci endpoints
export FLOCI_AWS=http://dj-pc:4566
export FLOCI_AZURE=http://dj-pc:4577
export FLOCI_GCP=http://dj-pc:4588
export FLOCI_OCI=http://dj-pc:4599

# NexusFlow infra (also on dj-pc)
export KAFKA_BOOTSTRAP_SERVERS=dj-pc:9092
export DB_URL="jdbc:postgresql://dj-pc:26257/nexusflow?sslmode=disable"
export REDIS_HOST=dj-pc
export OLLAMA_BASE_URL=http://dj-pc:11434

# Web UIs
alias floci-on="open http://dj-pc:4500"
alias kafka-ui="open http://dj-pc:8090"
alias crdb-ui="open http://dj-pc:8080"

# Non-interactive ssh to the PC (see RemoteCommand note above)
sshpc() { ssh -o RemoteCommand=none -o RequestTTY=no pc "$@"; }

# Check PC health
pc-health() {
  sshpc "docker ps --format {{.Names}}"
}

# Is everything the backend needs reachable?
nf-check() {
  for p in 4566 4577 4588 4599 9092 26257 6379 11434; do
    nc -z -G 2 dj-pc $p >/dev/null 2>&1 && echo "dj-pc:$p OK" || echo "dj-pc:$p DOWN"
  done
}
```

### `~/.aws/config` profile for floci

```ini
[profile floci]
region = us-east-1
output = json
endpoint_url = http://dj-pc:4566
```

Use with: `aws --profile floci s3 ls`

---

## Full software list on dj-pc

Installed via winget (unless noted):

| Software       | winget ID                    | Notes                                                                          |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Git            | `Git.Git`                    |                                                                                |
| Java 21        | `Microsoft.OpenJDK.21`       |                                                                                |
| Maven          | manual                       | Download zip from Apache CDN, extract to `C:\Program Files\Maven`, add to PATH |
| VS Code        | `Microsoft.VisualStudioCode` |                                                                                |
| Node.js LTS    | `OpenJS.NodeJS.LTS`          | includes npm                                                                   |
| Python 3.12    | `Python.Python.3.12`         |                                                                                |
| Docker Desktop | `Docker.DockerDesktop`       | needs Windows login to start                                                   |
| Tailscale      | `Tailscale.Tailscale`        | Windows service, starts at boot                                                |
| Google Chrome  | `Google.Chrome`              |                                                                                |
| Discord        | `Discord.Discord`            |                                                                                |
| Steam          | `Valve.Steam`                |                                                                                |
| Spotify        | `Spotify.Spotify`            |                                                                                |
| WhatsApp       | `9WZDNCRDK3WP` (Store)       |                                                                                |
| OpenSSH Server | Windows Capability           | `Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0`                |
| OpenSSH (PQ)   | `Microsoft.OpenSSH.Preview`  | upgrade from built-in 9.5 to 10.0 for post-quantum support                     |
| floci CLI      | script                       | `iwr https://floci.io/install.ps1 \| iex` (with ExecutionPolicy Bypass)        |

### PATH variables to set after fresh install

```powershell
# Java (set by OpenJDK installer)
# JAVA_HOME = C:\Program Files\Microsoft\jdk-21.0.x.x-hotspot

# Maven (manual)
[System.Environment]::SetEnvironmentVariable(
  "MAVEN_HOME", "C:\Program Files\Maven\apache-maven-3.9.16",
  [System.EnvironmentVariableTarget]::Machine
)
$path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
[System.Environment]::SetEnvironmentVariable(
  "Path", "$path;C:\Program Files\Maven\apache-maven-3.9.16\bin",
  [System.EnvironmentVariableTarget]::Machine
)

# Python — installer adds Python and pip to PATH automatically if you check "Add to PATH"
# Docker, Node, Git — their installers add to PATH automatically
```

---

## Auto-login (pending setup)

To survive power cuts without manual intervention, Windows needs to auto-login to start Docker Desktop and the containers.

**Safest approach:** Convert the `divya` Microsoft account to a local account first (Settings → Accounts → Your info → "Sign in with a local account instead"), then use `netplwiz` to enable auto-login for that local account.

**NEVER do this over SSH.** Edit the registry (`AutoAdminLogon`) or delete/swap accounts remotely and you risk breaking login — this caused the full Windows reset in September 2026. Always set up auto-login while sitting at the PC with a keyboard and monitor.

Power recovery chain after auto-login is configured:

```text
Power restored
    → BIOS (set to "always on after power loss")
    → Windows boots
    → Auto-login (local account)
    → Docker Desktop starts (startup item)
    → All 9 containers come back up (restart: always)
    → Tailscale already running (Windows service, was up before login)
    → sshd already running (Windows service, was up before login)
    → dj-pc fully reachable via SSH + Tailscale with all services up
```

---

## D: drive layout

```text
D:\
├── immich-app\          — Immich photos server
│   ├── docker-compose.yml
│   └── library\         — 494GB+ photos library
└── floci-ui\
    └── docker-compose.yml
```

Data on D: survives a C: drive wipe. Never reinstall to D:.
