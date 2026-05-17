# Docker & CI/CD — Senior Developer Deep Reference
**Priority: MEDIUM**

> Covers: Docker fundamentals, Dockerfile best practices, multi-stage builds, docker-compose, GitHub Actions, deployment strategies, and interview questions.

---

## Table of Contents

1. [Docker Fundamentals](#1-docker-fundamentals)
2. [Dockerfile — Best Practices](#2-dockerfile--best-practices)
3. [Multi-Stage Builds](#3-multi-stage-builds)
4. [docker-compose](#4-docker-compose)
5. [GitHub Actions — CI/CD](#5-github-actions--cicd)
6. [Deployment Strategies](#6-deployment-strategies)
7. [Container Orchestration Basics](#7-container-orchestration-basics)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Docker Fundamentals

### Core concepts

```text
Image:      Read-only template for creating containers.
            Built from a Dockerfile. Layers are cached.
            Like a class (blueprint).

Container:  Running instance of an image.
            Isolated process with its own filesystem, network, PID namespace.
            Like an object (instance of the class).

Registry:   Storage for images.
            Docker Hub (public), AWS ECR, GitHub Container Registry (private).

Layer:      Each Dockerfile instruction creates a read-only layer.
            Layers are cached — unchanged layers are reused on rebuild.
            This is why instruction order matters for build speed.

Volume:     Persisted data that survives container restarts.
            Mounted into the container's filesystem.
            Without a volume, container filesystem is ephemeral.
```

### Essential commands

```bash
# Images
docker build -t myapp:v1 .           # build image from Dockerfile in current dir
docker build -t myapp:v1 --no-cache  # rebuild without cache
docker images                         # list local images
docker image rm myapp:v1             # remove image
docker pull node:20-alpine           # pull from registry

# Containers
docker run myapp:v1                  # create and start container
docker run -d myapp:v1               # detached (background)
docker run -p 3000:3000 myapp:v1     # map host:container port
docker run -e NODE_ENV=production myapp:v1  # set env var
docker run -v $(pwd)/data:/app/data myapp:v1  # mount volume

docker ps                            # running containers
docker ps -a                         # all containers (including stopped)
docker stop <id>                     # graceful stop (SIGTERM)
docker kill <id>                     # force stop (SIGKILL)
docker rm <id>                       # remove stopped container
docker logs <id>                     # view stdout/stderr
docker logs -f <id>                  # follow logs
docker exec -it <id> sh              # open shell inside running container

# Cleanup
docker system prune                  # remove stopped containers, unused images
docker system prune -a               # remove everything not in use
```

---

## 2. Dockerfile — Best Practices

### Anatomy of a Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files FIRST (layer caching — this layer only rebuilds if deps change)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code LAST (this layer changes most often)
COPY . .

# Expose documentation (doesn't actually publish)
EXPOSE 3000

# Startup command
CMD ["node", "src/index.js"]
```

### Layer caching — the most important optimization

```dockerfile
# ✗ Invalidates cache on every code change
COPY . .
RUN npm ci    # re-runs even if package.json didn't change

# ✓ Cache layers by putting stable things first
COPY package.json package-lock.json ./
RUN npm ci           # cached unless package.json changed
COPY . .             # only this layer changes on source code edits
RUN npm run build    # only re-runs when source changes
```

### Security best practices

```dockerfile
# ✓ Run as non-root user (containers run as root by default)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "src/index.js"]

# ✓ Pin exact base image version (not just :latest)
FROM node:20.11.0-alpine3.19   # exact version — reproducible builds
# NOT: FROM node:latest — changes without warning

# ✓ Use alpine variants for smaller images
# node:20        ~1GB
# node:20-alpine ~180MB (Alpine Linux — minimal OS)
# node:20-slim   ~230MB (Debian minimal)
```

### .dockerignore

```
# .dockerignore — prevents these from being sent to Docker daemon (COPY context)
node_modules/         # largest, already installed in container
.git/
.env
.env.local
*.log
dist/
coverage/
.DS_Store
README.md
```

---

## 3. Multi-Stage Builds

### Why multi-stage?

```text
Problem: build tools (TypeScript compiler, webpack, test runners) are only needed
at build time — not at runtime. Including them in the final image:
  - Increases image size
  - Increases attack surface (more software = more vulnerabilities)

Multi-stage: use separate stages for build and runtime.
Final image only contains what's needed to RUN the app.
```

```dockerfile
# Stage 1: build (has all dev dependencies)
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci                  # all deps including devDependencies

COPY . .
RUN npm run build           # compiles TypeScript → dist/
RUN npm prune --production  # remove dev dependencies

# Stage 2: production (lean runtime image)
FROM node:20-alpine AS production

WORKDIR /app

# Copy ONLY what we need from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result:
# builder image: ~400MB (includes TypeScript, ts-node, tests, etc.)
# production image: ~180MB (only runtime JS + production node_modules)
```

### React app multi-stage build

```dockerfile
# Stage 1: build React app
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build           # produces /app/dist/ (Vite) or /app/build/ (CRA)

# Stage 2: serve with nginx
FROM nginx:alpine AS production

# Copy built assets to nginx serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config (for SPA routing — all paths serve index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — handle React Router (client-side routing)
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # All unmatched paths → index.html (React Router handles routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively (they have content hashes in filenames)
    location ~* \.(js|css|png|jpg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 4. docker-compose

### Local development setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: taskboard
    ports:
      - "5432:5432"    # host:container
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist data across restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # API server
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
      target: builder   # use builder stage for hot reload in dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/taskboard
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    volumes:
      - ./server/src:/app/src   # mount source for hot reload
    depends_on:
      db:
        condition: service_healthy  # wait for db healthcheck to pass
      redis:
        condition: service_started
    command: npm run dev    # override CMD with dev command

  # React client
  client:
    build:
      context: ./client
    ports:
      - "5173:5173"
    volumes:
      - ./client/src:/app/src
    environment:
      VITE_API_URL: http://localhost:3000
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Useful compose commands

```bash
docker compose up              # start all services
docker compose up -d           # detached (background)
docker compose up --build      # rebuild images before starting
docker compose down            # stop and remove containers
docker compose down -v         # also remove volumes (delete data)
docker compose logs api        # logs for a specific service
docker compose logs -f api     # follow logs
docker compose exec api sh     # shell into running container
docker compose restart api     # restart one service
docker compose ps              # status of services

# Scale a service
docker compose up -d --scale api=3  # run 3 instances of api
```

---

## 5. GitHub Actions — CI/CD

### Basic CI pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'          # cache node_modules

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Build
        run: npm run build
```

### CD pipeline — deploy to AWS

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # requires manual approval (configured in GitHub settings)

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}   # use git commit SHA as image tag
        run: |
          docker build -t $ECR_REGISTRY/myapp:$IMAGE_TAG --target production .
          docker push $ECR_REGISTRY/myapp:$IMAGE_TAG
          # Also tag as latest
          docker tag $ECR_REGISTRY/myapp:$IMAGE_TAG $ECR_REGISTRY/myapp:latest
          docker push $ECR_REGISTRY/myapp:latest

      - name: Deploy to ECS
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          aws ecs update-service \
            --cluster production \
            --service api-service \
            --force-new-deployment

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"Deploy failed: ${{ github.repository }} on ${{ github.ref }}"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Secrets in GitHub Actions

```yaml
# Store in: Repository → Settings → Secrets and variables → Actions
# Access with: ${{ secrets.SECRET_NAME }}

# Never print secrets to logs:
run: echo ${{ secrets.API_KEY }}     # ✗ masked in logs but bad practice

# Pass as env vars:
- name: Run migration
  run: npm run migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Useful action patterns

```yaml
# Cache dependencies (speeds up CI significantly)
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-npm-

# Run steps in parallel (matrix strategy)
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, macos-latest]
runs-on: ${{ matrix.os }}
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}

# Conditional steps
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: npm run deploy:staging

- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: npm run deploy:production
```

---

## 6. Deployment Strategies

### Rolling deployment

```text
Default strategy: replace old instances with new ones gradually.

Process:
  1. Deploy new version to instance #1, take it out of load balancer
  2. Health check passes → add back to load balancer
  3. Repeat for each instance

Pros: no downtime, simple
Cons: during rollout, both versions are live simultaneously
  → database schema changes must be backwards-compatible with old version
  → old code must handle new DB columns gracefully (make nullable first)

Good for: most web APIs with stateless containers
```

### Blue/Green deployment

```text
Maintain two identical environments: Blue (current live) and Green (new version).

Process:
  1. Deploy new version to Green (inactive)
  2. Run smoke tests against Green
  3. Switch load balancer from Blue to Green (instant cutover)
  4. Blue becomes the new standby (easy rollback)

Pros:
  - Instant rollback (switch back to Blue)
  - Test the full deployment before going live
  - No mixed-version traffic

Cons:
  - Requires 2x infrastructure (expensive)
  - Database migrations must be pre-applied before switch

Good for: critical services, large changes, regulated environments (HIPAA)
```

### Canary deployment

```text
Route a small percentage of traffic to the new version first.

Process:
  1. Deploy new version alongside old
  2. Route 5% of traffic to new version
  3. Monitor error rates, latency, business metrics
  4. Gradually increase: 5% → 20% → 50% → 100%
  5. If metrics degrade: route 0% back to old version

Pros:
  - Real traffic on small percentage — catch real-world issues
  - Gradual risk exposure
  - Easy rollback

Cons:
  - More complex infrastructure (weighted routing)
  - Both versions live simultaneously (same DB schema concern as rolling)

Good for: high-traffic systems, risky changes, A/B testing
```

### Database migration safety

```text
The most dangerous part of deployment: schema changes.

Safe migration pattern (three-phase):
  1. Backwards-compatible migration:
     - Add new nullable column / index / table
     - Deploy new code that can write to both old and new structure
     - Both old and new code work during rollout

  2. Data migration (if needed):
     - Backfill data in new column
     - Run as background job or maintenance task

  3. Cleanup migration (later):
     - Drop old column / constraint
     - Only safe once 100% of traffic uses new code

  ✗ Never drop or rename columns in the same deployment as code that relies on them.
    Old instances still running will crash immediately.
```

---

## 7. Container Orchestration Basics

### Kubernetes concepts (know the vocabulary)

```text
Pod:          Smallest deployable unit. One or more containers sharing network + storage.
              Usually one container per pod.

Deployment:   Manages a set of identical pods. Handles rolling updates, rollbacks.
              "Run 3 replicas of my API container."

Service:      Stable network endpoint in front of pods.
              Pods come and go; Service IP stays constant.
              Types: ClusterIP (internal), NodePort, LoadBalancer (external).

Ingress:      HTTP router — routes external traffic to Services based on host/path.
              Like an nginx reverse proxy for Kubernetes.

ConfigMap:    Store non-sensitive config (env vars, config files).
Secret:       Store sensitive data (passwords, tokens) — base64 encoded, not encrypted by default.

Namespace:    Virtual cluster within a cluster. Isolates resources.
              Use for: separating staging/production in one cluster, team isolation.

HPA:          Horizontal Pod Autoscaler — scales pods based on CPU/memory metrics.
```

```yaml
# Minimal Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myregistry/api:v1.2.3
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

---

## 8. Common Interview Questions

### "What is the difference between a Docker image and a container?"

> An image is a read-only template — a blueprint with the application code, runtime, libraries, and configuration. A container is a running instance of an image — an isolated process. You can run many containers from the same image. Like a class (image) and an object (container). Images are built once and shared; containers are ephemeral.

### "What are multi-stage builds and why do you use them?"

> Multi-stage builds let you use multiple FROM instructions in one Dockerfile. The typical pattern: first stage installs everything and compiles (build stage), second stage copies only the compiled output and production dependencies. The final image doesn't include the compiler, TypeScript, test frameworks, or devDependencies — just what's needed to run. Reduces image size and attack surface significantly.

### "What is the difference between CMD and ENTRYPOINT?"

> Both define what runs when the container starts. `ENTRYPOINT` defines the main command that always runs — it cannot be overridden by `docker run` arguments. `CMD` provides default arguments that CAN be overridden. Common pattern: `ENTRYPOINT ["node"]` + `CMD ["dist/index.js"]` — running `docker run myimage other.js` overrides CMD but keeps ENTRYPOINT. If you only use CMD, `docker run myimage bash` replaces the whole command.

### "What is CI/CD?"

> CI (Continuous Integration): automatically build and test code on every push — catch integration problems early. CD (Continuous Delivery): automatically deploy to a staging/pre-production environment after tests pass. Continuous Deployment (a stricter CD): automatically deploy to production after tests pass, with no manual step. Key principle: small, frequent deployments are safer than large, infrequent ones. If something breaks, it's easy to identify and roll back the single small change.

### "Explain blue/green vs canary deployments."

> Blue/green: maintain two full environments (Blue = current, Green = new). Switch all traffic at once (instant cutover), easy instant rollback by switching back. Cost: 2x infrastructure. Canary: route a small percentage (5-10%) of traffic to the new version first. Monitor error rates and metrics. Gradually increase the percentage. Real traffic finds real problems before full rollout. More complex infrastructure but lower risk than all-at-once.

### "How do you handle database migrations in a CI/CD pipeline?"

> Migrations need to be backwards-compatible with the previous code version — both can be live simultaneously during rolling deployment. Pattern: first migration adds nullable columns (old code ignores them, new code writes to them). Deploy new code. Later migration makes column NOT NULL or drops old columns only after all instances run the new code. Never drop a column in the same deployment as the code that removes references to it.

---

## Most Asked Docker & CI/CD Interview Questions

### "What is Docker and why use it?"

> Docker packages an application and all its dependencies into a container — a lightweight, isolated, reproducible environment. "Works on my machine" becomes irrelevant because the container runs the same everywhere. Key benefits: consistency across dev/staging/prod, fast startup (seconds vs minutes for VMs), easy scaling, dependency isolation. Containers share the host OS kernel (unlike VMs which each have their own) — lighter weight.

### "What is the difference between a Dockerfile, image, and container?"

> **Dockerfile** — a recipe (text file of instructions) for building an image. **Image** — a read-only snapshot built from the Dockerfile; can be stored in a registry (Docker Hub, ECR). **Container** — a running instance of an image; ephemeral by default, writable layer on top of the image. Multiple containers can run from the same image simultaneously.

```dockerfile
# Dockerfile — multi-stage build (smaller final image)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### "What is Docker Compose and when do you use it?"

> Docker Compose defines and runs multi-container applications — your app, database, cache, and any other services declared in a single `docker-compose.yml`. `docker compose up` starts everything; `down` stops and removes containers. Used for local development and simple deployments. Not for production at scale (use Kubernetes or managed services then).

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/mydb
    depends_on: [db, redis]

  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### "What is CI/CD and what's the difference between CI, CD (delivery), and CD (deployment)?"

> **Continuous Integration (CI)** — developers merge code frequently; every push automatically runs build + tests. Catches integration bugs early. **Continuous Delivery** — after CI passes, the artifact is automatically prepared and ready to deploy to production with a manual trigger. **Continuous Deployment** — goes further: every passing CI run is automatically deployed to production with no human intervention. Most companies do CI + Delivery; full Continuous Deployment requires high test confidence.

### "What makes a good CI/CD pipeline?"

> Fast feedback (under 10 minutes for core checks), reliable (no flaky tests), stages: lint → type-check → test → build → deploy. Use caching aggressively (node_modules, Docker layers). Fail fast — run quick checks first. Secrets injected via environment variables, never in code. Preview deployments for PRs. Rollback strategy defined.

```yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint && npm run type-check && npm test
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run build
      - run: deploy-to-production.sh
```

### "What is the difference between `COPY` and `ADD` in Dockerfile?"

> `COPY` copies files from build context to the image — straightforward, preferred. `ADD` does everything `COPY` does, plus: auto-extracts tar files and can fetch URLs. Use `COPY` by default; use `ADD` only when you specifically need the tar extraction feature. Fetching URLs with `ADD` is an anti-pattern (better to use `curl` + `RUN` so layers are explicit and cacheable).

### "What are Docker volumes and why use them?"

> Containers are ephemeral — data written inside is lost when the container stops. Volumes persist data outside the container lifecycle. Three types: **Named volumes** (managed by Docker, best for databases), **bind mounts** (maps a host directory into the container — great for dev, source code hot-reload), **tmpfs** (in-memory, not persisted). In production, use named volumes or external storage (RDS, S3) instead of relying on container storage.

### "What are environment-specific configs and how do you handle secrets in CI/CD?"

> Never commit secrets. Inject via: **Environment variables** (set in CI platform — GitHub Secrets, GitLab Variables). **Secret managers** (AWS Secrets Manager, HashiCorp Vault) for production. **`.env` files** for local dev only (gitignored). In Docker: use `--env-file` or `environment:` in Compose. In Kubernetes: use Secrets. Rotate secrets regularly and audit access.

### "What is the difference between blue-green deployment and canary deployment?"

> **Blue-green**: run two identical production environments (blue = current, green = new). Flip traffic all at once to green. Instant rollback (flip back to blue). Requires double infrastructure. **Canary**: gradually shift traffic to the new version — 5% → 25% → 100%. Monitor error rates and metrics at each step. Roll back only to the affected percentage. More complex but reduces blast radius. Both achieve zero-downtime deployments.
