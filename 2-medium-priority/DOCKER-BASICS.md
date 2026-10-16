# Docker — Beginner's Guide

**Priority: MEDIUM**

> A plain-language introduction to Docker: what problem it solves, images vs containers,
> writing your first Dockerfile for a Node app, the commands you actually use, ports,
> environment variables, volumes, docker compose, and the mistakes that trip up beginners.
>
> Assumes you can run a Node app from the terminal. No Docker or DevOps experience needed.

---

## Table of Contents

- [Docker — Beginner's Guide](#docker--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. The Problem It Solves](#1-the-problem-it-solves)
  - [2. Image vs Container](#2-image-vs-container)
  - [3. Setup](#3-setup)
  - [4. Your First Dockerfile](#4-your-first-dockerfile)
  - [5. Build \& Run](#5-build--run)
  - [6. Ports — Reaching the App](#6-ports--reaching-the-app)
  - [7. Environment Variables](#7-environment-variables)
  - [8. Volumes — Keeping Data](#8-volumes--keeping-data)
  - [9. Docker Compose — App + Database Together](#9-docker-compose--app--database-together)
  - [10. `.dockerignore`](#10-dockerignore)
  - [11. Common Beginner Mistakes](#11-common-beginner-mistakes)
  - [12. Cheat Sheet](#12-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. The Problem It Solves

```text
"It works on my machine."

Your app runs fine on your laptop. On a teammate's laptop or the server it breaks:
  - they have Node 18, you have Node 24
  - they're on Windows, you're on a Mac
  - Postgres isn't installed, or it's a different version
  - an environment variable is missing

‼️ DOCKER IN ONE SENTENCE
   Docker packages your app TOGETHER WITH everything it needs to run — the OS
   files, the Node version, the dependencies — into one box that runs the same
   way on every machine.‼️

‼️ It is NOT a virtual machine. A VM runs a whole separate operating system.
A container shares your computer's OS kernel and only packages the app's own
files, so it starts in about a second and uses far less memory.
```

---

## 2. Image vs Container

```text
‼️ THE TWO WORDS YOU MUST GET STRAIGHT.

  IMAGE       A read-only TEMPLATE. Your app + Node + dependencies, frozen.
              You BUILD it once from a Dockerfile.

  CONTAINER   A RUNNING copy of an image. You can start many containers
              from one image, like many objects from one class.

  The analogy:
    Dockerfile  = the recipe
    Image       = the cake mix in a box (ready, never changes)
    Container   = a cake you actually baked from it (and can throw away)

  Dockerfile ──docker build──▶ Image ──docker run──▶ Container

‼️ Containers are DISPOSABLE. Delete one and anything written inside it is gone.
   That's why §8 (volumes) exists.‼️
```

---

## 3. Setup

```bash
# Install Docker Desktop (Mac/Windows) from docker.com — it includes everything.
# Then check it works:
docker --version
docker run hello-world     # downloads a tiny test image and runs it
```

```text
Images come from a REGISTRY — Docker Hub (hub.docker.com) is the default.
`node`, `postgres`, `redis`, `nginx` are all official images you can pull for free.
```

---

## 4. Your First Dockerfile

```dockerfile
# Dockerfile — lives in the root of your project, no file extension‼️

# 1. Start FROM an existing image that already has Node installed.
#    ‼️ Always pin a version. "node:latest" can change under you and break the build.‼️
FROM node:24-alpine

# 2. All following commands run inside /app in the container (created if missing).
WORKDIR /app

# 3. Copy ONLY the package files first, then install.
#    ‼️ This order is on purpose — see the note below.
COPY package*.json ./
#    package*.json — the * picks up BOTH package.json and package-lock.json.

# npm ci = "clean install". Installs dependencies, but stricter than npm install:
#   - Uses the EXACT versions in package-lock.json. npm install may bump versions
#     within the allowed range; npm ci never does — every build gets the same packages.
#   - Never changes package-lock.json. If it doesn't match package.json, it stops
#     with an error instead of quietly fixing it.
#   - Deletes node_modules first and installs everything fresh.‼️
# That's why builds (Docker, CI) use it: the build should be identical every time,
# on every machine — the whole point of Docker.
# Rule: npm install on your laptop when adding/updating packages; npm ci for builds.
# ‼️ package-lock.json must exist and be committed, or npm ci fails.
RUN npm ci

# 4. Now copy the rest of your code and build it.‼️
COPY . .
RUN npm run build

# 5. Documents which port the app listens on (doesn't open it — see §6).
EXPOSE 3000

# 6. The command that runs when a container starts.
CMD ["node", "dist/main.js"]
```

```text
WHAT EACH WORD MEANS
  FROM      the base image to start from
  WORKDIR   "cd" into this folder for everything after‼️
  COPY      copy files from your computer INTO the image
  RUN       run a command WHILE BUILDING the image (install, compile)
  EXPOSE    a note saying which port the app uses
  CMD       the command to run WHEN A CONTAINER STARTS

‼️ RUN vs CMD — the most common confusion:
   RUN happens once, at build time.   CMD happens every time a container starts.‼️

‼️ WHY COPY package.json BEFORE THE CODE?
   Docker caches each step ("layer"). If a step's inputs haven't changed, it
   reuses the cached result instead of running it again.

   Package files first → change your code → npm ci is CACHED → build takes seconds.
   Everything at once  → change one line   → npm ci runs AGAIN → build takes minutes.‼️
```

---

## 5. Build & Run

```bash
# Build an image from the Dockerfile in this folder (.) and name it (-t) "my-app"
docker build -t my-app .

# Run a container from it
docker run -p 3000:3000 my-app

# Useful flags
docker run -d -p 3000:3000 --name api my-app
#          │                 └─ give the container a name (else it's random)
#          └─ "detached" — run in the background, give the terminal back
```

```bash
# Day-to-day commands
docker ps                 # running containers
docker ps -a              # ALL containers, including stopped ones
docker logs -f api        # see the app's console output (-f = keep following)
docker exec -it api sh    # open a shell INSIDE the running container‼️
docker stop api           # stop it
docker rm api             # delete the stopped container
docker images             # list images on your machine
```

---

## 6. Ports — Reaching the App

```text
‼️ A container has its OWN network.‼️ Your app listening on port 3000 inside the
   container is NOT reachable from your browser until you publish the port.

   docker run -p 8080:3000 my-app
                 │    │
                 │    └─ port INSIDE the container (what the app listens on)
                 └────── port on YOUR computer (what you type in the browser)

   → open http://localhost:8080

   Easy way to remember: -p OUTSIDE:INSIDE.‼️
```

```text
‼️ Your app must listen on 0.0.0.0, not localhost, inside the container.
   ‼️ "localhost" inside a container means "only this container" — so Docker's
   port forwarding can't reach it and the browser gets "connection refused".

   Express / Nest `app.listen(3000)` already listens on all addresses — fine.
   Vite and some other dev servers default to localhost — pass `--host 0.0.0.0`.‼️
```

---

## 7. Environment Variables

```bash
# One at a time
docker run -e DATABASE_URL=postgres://... -e NODE_ENV=production my-app

# Or from a file
docker run --env-file .env my-app
```

```text
‼️ NEVER put secrets in the Dockerfile (ENV API_KEY=...) or COPY your .env into
   the image. Anyone who gets the image can read them. ‼️ Pass them in at RUN time.‼️
```

---

## 8. Volumes — Keeping Data

```text
Remember: containers are disposable. Run a Postgres container, add data,
delete the container → the data is GONE.

‼️ A VOLUME is storage that lives OUTSIDE the container. The container reads and
writes to it, but deleting the container leaves the volume alone.‼️
```

```bash
# Named volume — Docker manages where it lives. Use for databases.
docker run -d -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=secret postgres:17
#                │      └─ folder INSIDE the container where Postgres keeps data
#                └─ volume name (created automatically)

# Bind mount — a folder from YOUR computer. Use for live code during development.
docker run -v $(pwd)/src:/app/src my-app
#   edit a file in ./src on your laptop → the container sees the change instantly
```

```text
‼️ -v follows the same OUTSIDE:INSIDE order as -p.

‼️ "Folder INSIDE the container" — but isn't the container disposable?
   ‼️The PATH is inside, the DATA is not. Postgres always writes to
   /var/lib/postgresql/data. -v plugs the volume into that folder, so
   whatever Postgres writes there actually lands in the volume, outside.

   Like a USB drive: the laptop sees it as a folder, the files live on the
   drive. Throw away the laptop, the drive keeps everything.

   Without -v → data lives in the container → delete container, data gone.
   With -v    → data lives in the volume    → delete container, data safe.
```

---

## 9. Docker Compose — App + Database Together

```text
Real apps need several containers: API + database + maybe Redis. Typing long
`docker run` commands for each gets painful. ‼️ Compose describes them all in ONE
file and starts them with ONE command.
```

```yaml
# compose.yaml (older projects call it docker-compose.yml — same thing)‼️
services:
  api:
    build: . # build from the Dockerfile in this folder‼️
    ports:
      - '3000:3000'
    environment:
      # ‼️ The host is "db" — the SERVICE NAME — not localhost.
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy # wait until Postgres is actually ready‼️

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      retries: 5

volumes:
  pgdata: # declare the named volume
```

```bash
docker compose up -d         # build (if needed) and start everything
docker compose logs -f api   # follow one service's logs
docker compose ps            # what's running
docker compose down          # stop and remove containers (volumes are kept)
docker compose down -v       # ‼️ ALSO deletes volumes — your database data is gone
docker compose up -d --build # rebuild after changing the Dockerfile or dependencies
```

```text
‼️ HOW CONTAINERS FIND EACH OTHER
   ‼️Compose puts all services on one private network, and each service's NAME
   works as its hostname. The API reaches Postgres at `db:5432`.

   localhost inside the api container = the api container itself, NOT the
   database. This is the #1 compose bug.‼️

‼️ depends_on ALONE only waits for the db container to START, ‼️ not for Postgres
   to be READY to accept connections — which takes a few more seconds. Add a
   healthcheck + condition: service_healthy, as above.
```

---

## 10. `.dockerignore`

```text
# .dockerignore — like .gitignore, but for `COPY . .`‼️
node_modules
dist
.env
.git
*.log
```

```text
‼️ Without this, COPY . . copies your local node_modules into the image:
   - the build is much slower (sending hundreds of MB to Docker)
   - Mac-compiled packages can break inside a Linux container
   - your .env with secrets ends up baked into the image‼️
```

---

## 11. Common Beginner Mistakes

```text
‼️ 1. Using localhost to reach another container.
   In compose, use the service name: db:5432, redis:6379.‼️

‼️ 2. Forgetting -p, or getting it backwards.
   No -p → the browser can't reach the app. Order is -p OUTSIDE:INSIDE.‼️

‼️ 3. App listening on localhost inside the container.
   Listen on 0.0.0.0, or port forwarding can't reach it.‼️

‼️ 4. No volume for the database.
   Delete or recreate the container → all data gone.

‼️ 5. `docker compose down -v` without meaning to.
   -v deletes volumes. Your local database is wiped.

‼️ 6. No .dockerignore.
   Slow builds, broken native modules, and secrets inside the image.

‼️ 7. COPY . . before npm install.
   Every code change reinstalls all dependencies. Copy package*.json first.

‼️ 8. Changing code and expecting the container to update.
   The image is frozen at build time. Rebuild (docker compose up --build), or
   use a bind mount during development.

‼️ 9. Secrets in the Dockerfile.
   ENV API_KEY=... is visible to anyone with the image. Pass at run time.

‼️ 10. Using :latest tags.
   The image changes without warning. Pin versions: node:24-alpine, postgres:17.

‼️ 11. Disk filling up.
   Old images and stopped containers pile up. Run `docker system prune`
   now and then (it asks before deleting).‼️
```

---

## 12. Cheat Sheet

```bash
# ── IMAGES ────────────────────────────────────────────────────────────────
docker build -t my-app .            # build from Dockerfile
docker images                       # list
docker rmi my-app                   # delete
docker pull postgres:17             # download from Docker Hub

# ── CONTAINERS ────────────────────────────────────────────────────────────
docker run -d -p 3000:3000 --name api --env-file .env my-app
docker ps / docker ps -a            # running / all
docker logs -f api                  # follow output
docker exec -it api sh              # shell inside
docker stop api && docker rm api    # stop + delete

# ── COMPOSE ───────────────────────────────────────────────────────────────
docker compose up -d                # start all
docker compose up -d --build        # rebuild + start
docker compose logs -f api          # logs for one service
docker compose down                 # stop all (keeps volumes)
docker compose down -v              # stop all + DELETE volumes‼️

# ── CLEANUP ───────────────────────────────────────────────────────────────
docker system prune                 # remove unused containers, networks, images
```

```text
FLAGS
  -d                 run in background
  -p OUT:IN          publish a port
  -e KEY=value       set an env variable
  --env-file .env    env variables from a file
  -v name:/path      named volume (data)
  -v ./dir:/path     bind mount (live code)
  --name x           name the container
  -it                interactive terminal (with exec)

DOCKERFILE
  FROM → WORKDIR → COPY package*.json → RUN npm ci → COPY . . → RUN build → CMD
  RUN = build time.  CMD = start time.
```

---

## Related Files

- [DOCKER-CICD-MED-DEEP.md](DOCKER-CICD-MED-DEEP.md) — next step: Dockerfile best practices, multi-stage builds, compose, GitHub Actions
- [DOCKER-KUBERNETES-DEEP.md](DOCKER-KUBERNETES-DEEP.md) — Docker internals and running containers at scale with Kubernetes
- [DEVOPS-INFRASTRUCTURE-DEEP.md](../1-high-priority/DEVOPS-INFRASTRUCTURE-DEEP.md) — the full enterprise picture: EKS, Terraform, CI/CD
- [NESTJS-BASICS.md](NESTJS-BASICS.md) — the kind of Node app the Dockerfile in §4 builds
