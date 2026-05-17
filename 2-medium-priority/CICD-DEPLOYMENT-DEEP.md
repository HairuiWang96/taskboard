# CI/CD & Deployment — Senior Developer Deep Reference

> Covers pipelines, Docker, Kubernetes, deployment strategies, infrastructure as code, and production operations.

---

## Table of Contents

1. [CI/CD Concepts](#1-cicd-concepts)
2. [GitHub Actions](#2-github-actions)
3. [Docker — Deep Dive](#3-docker--deep-dive)
4. [Kubernetes](#4-kubernetes)
5. [Deployment Strategies](#5-deployment-strategies)
6. [Infrastructure as Code](#6-infrastructure-as-code)
7. [Secrets Management](#7-secrets-management)
8. [Database Migrations in CI/CD](#8-database-migrations-in-cicd)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Common Interview Questions](#10-common-interview-questions)

---

## 1. CI/CD Concepts

### What CI/CD solves

```text
Without CI/CD:
  - "Works on my machine" — different environments, different results
  - Manual deployments — error-prone, inconsistent, scary
  - Long feedback loops — bugs found days/weeks after introduced
  - Infrequent releases — big-bang deploys with many changes = high risk

With CI/CD:
  - Every push is tested automatically — catch bugs in minutes
  - Deployments are automated, repeatable, auditable
  - Small, frequent releases — less risk per deploy
  - Rollback is fast — just deploy the previous version

CI  = Continuous Integration: merge often, test automatically
CD  = Continuous Delivery: every merge produces a deployable artifact
CD  = Continuous Deployment: every merge automatically deploys to production
```

### The pipeline stages

```text
Code push
  ↓
Trigger (on: push, pull_request)
  ↓
Install dependencies     (npm ci — reproducible from lockfile)
  ↓
Lint + Type check        (eslint, tsc --noEmit)
  ↓
Unit tests               (vitest, jest)
  ↓
Integration tests        (real DB, real Redis)
  ↓
Build                    (tsc, vite build)
  ↓
Docker build + push      (tag with git SHA)
  ↓
Deploy to staging        (automatic on main)
  ↓
Smoke tests / E2E        (playwright against staging)
  ↓
Deploy to production     (automatic or manual gate)
  ↓
Health checks            (verify deployment succeeded)
  ↓
Notify (Slack, email)
```

### Key principles

```text
Fast feedback:
  Tests that run in 10 minutes are ignored
  Aim: < 5 minutes to first failure signal
  Strategy: run lint/type-check first (fast), parallelize test suites

Fail fast:
  Stop the pipeline at first failure — don't waste time on later stages
  If lint fails, don't run tests

Reproducible builds:
  npm ci (not npm install) — uses exact lockfile versions
  Docker multi-stage builds — same image everywhere
  Pin tool versions (node version, Docker base image tag)

Every build is potentially deployable:
  Main branch should always be in a deployable state
  Feature flags for incomplete work — not long-lived branches
```

---

## 2. GitHub Actions

### Anatomy of a workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Cancel in-progress runs when new push to same branch
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint-and-type-check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'           # cache node_modules based on package-lock.json

      - run: npm ci               # reproducible install from lockfile
      - run: npm run lint
      - run: npm run type-check   # tsc --noEmit

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint-and-type-check   # only run if lint passes

    services:                    # spin up Docker containers for tests
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: test-secret-at-least-32-characters-long

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run db:migrate    # run migrations on test DB
      - run: npm run test:coverage  # vitest with coverage

      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true

  build-and-push:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'  # only on main branch

    permissions:
      contents: read
      packages: write  # to push to GHCR

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3  # enables cache, multi-platform

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # auto-provided

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,suffix=,format=short   # ghcr.io/org/app:abc1234
            type=ref,event=branch                    # ghcr.io/org/app:main
            type=semver,pattern={{version}}          # ghcr.io/org/app:1.2.3

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha    # GitHub Actions cache
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: staging    # requires environment protection rules

    steps:
      - name: Deploy
        run: |
          # Example: trigger Kubernetes rollout
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          kubectl rollout status deployment/app --timeout=120s

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production  # requires manual approval in GitHub UI
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace=production
```

### Reusable workflows

```yaml
# .github/workflows/deploy.yml — reusable
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      KUBECONFIG:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Deploy to ${{ inputs.environment }}
        env:
          KUBECONFIG: ${{ secrets.KUBECONFIG }}
        run: |
          kubectl set image deployment/app app=ghcr.io/org/app:${{ inputs.image-tag }}
```

```yaml
# .github/workflows/ci.yml — caller
jobs:
  deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      image-tag: ${{ github.sha }}
    secrets:
      KUBECONFIG: ${{ secrets.STAGING_KUBECONFIG }}
```

### Matrix builds

```yaml
# Test across multiple Node versions or OSes
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false  # don't cancel all if one fails
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

---

## 3. Docker — Deep Dive

### Multi-stage build (production pattern)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first — layer cached unless dependencies change
COPY package*.json ./
RUN npm ci                       # install ALL deps including devDeps

COPY tsconfig*.json ./
COPY src/ ./src/

RUN npm run build                # compile TypeScript → dist/


# Dependencies stage — only production deps
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev            # production deps only


# Final stage — minimal image
FROM node:20-alpine AS runner

# Security: don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what's needed from previous stages
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Metadata
LABEL org.opencontainers.image.source="https://github.com/org/repo"

USER appuser           # switch to non-root user

EXPOSE 3000

# Use exec form (not shell form) — proper signal handling
CMD ["node", "dist/index.js"]
```

### Layer caching strategy

```dockerfile
# Order matters: put things that change LEAST first

# 1. OS packages (rarely change)
RUN apk add --no-cache curl

# 2. Package files (change when deps added)
COPY package*.json ./
RUN npm ci

# 3. Config files (change occasionally)
COPY tsconfig.json .eslintrc.js ./

# 4. Source code (changes most often)
COPY src/ ./src/

# If you put source code before npm ci:
# Every code change invalidates the npm ci layer → full reinstall every time
```

### .dockerignore

```text
# .dockerignore — keep image small and builds fast
node_modules/
dist/
.git/
*.md
.env*
.github/
coverage/
*.test.ts
docker-compose*.yml
Dockerfile*
```

### Docker Compose for local development

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      target: builder     # use builder stage (has devDeps for hot reload)
    command: npm run dev
    ports:
      - '3000:3000'
    volumes:
      - ./src:/app/src    # mount source — changes reflect immediately
      - /app/node_modules # don't mount node_modules from host
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    develop:
      watch:              # Docker compose watch (v2.22+)
        - action: sync
          path: ./src
          target: /app/src

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes   # persist data

volumes:
  postgres_data:
```

### Useful Docker commands

```bash
# Build
docker build -t myapp:latest .
docker build --target builder -t myapp:dev .   # specific stage

# Run
docker run -p 3000:3000 --env-file .env myapp:latest
docker run -it myapp:latest sh                  # interactive shell

# Debug running container
docker exec -it <container_id> sh
docker logs <container_id> -f --tail 100
docker stats                                    # CPU/memory usage

# Inspect layers
docker image history myapp:latest               # layer sizes
docker image inspect myapp:latest               # full metadata

# Cleanup
docker system prune -af                         # remove all unused images/containers
docker volume prune                             # remove unused volumes
```

---

## 4. Kubernetes

### Core concepts

```text
Cluster:    set of machines (nodes) running Kubernetes
Node:       a machine (VM or physical) in the cluster
Pod:        smallest deployable unit — one or more containers sharing network/storage
Deployment: manages a set of identical pods — rolling updates, scaling
Service:    stable network endpoint for a set of pods (load balances between them)
Ingress:    HTTP/HTTPS routing to services from outside the cluster
ConfigMap:  non-secret configuration (env vars, config files)
Secret:     sensitive data (passwords, tokens) — base64 encoded, stored in etcd
Namespace:  virtual cluster for isolation — staging vs production in same cluster
HPA:        Horizontal Pod Autoscaler — scale pods based on CPU/memory/custom metrics
PVC:        PersistentVolumeClaim — request for storage
```

### Deployment manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # create 1 extra pod during update
      maxUnavailable: 0  # never have fewer than desired pods (zero-downtime)

  template:
    metadata:
      labels:
        app: api
    spec:
      # Graceful termination
      terminationGracePeriodSeconds: 60

      containers:
        - name: api
          image: ghcr.io/org/api:abc1234   # pinned to git SHA
          ports:
            - containerPort: 3000

          # Resource limits — prevent one pod starving others
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'       # 0.1 CPU cores
            limits:
              memory: '512Mi'
              cpu: '500m'

          # Environment from ConfigMap and Secrets
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets

          # Individual env vars
          env:
            - name: NODE_ENV
              value: production
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name  # inject pod name for logging

          # Health checks
          livenessProbe:       # if this fails, restart the pod
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3

          readinessProbe:      # if this fails, remove from service load balancer
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3

          # Graceful shutdown — stop accepting new connections
          lifecycle:
            preStop:
              exec:
                command: ['/bin/sh', '-c', 'sleep 5']  # wait for LB to deregister
```

### Service and Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
spec:
  selector:
    app: api           # routes to pods with this label
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP      # internal only (Ingress handles external)

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: '100'
spec:
  tls:
    - hosts:
        - api.solace.health
      secretName: api-tls       # cert-manager auto-provisions TLS cert
  rules:
    - host: api.solace.health
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
```

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # scale up when CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Useful kubectl commands

```bash
# Context and namespace
kubectl config get-contexts
kubectl config use-context my-cluster
kubectl config set-context --current --namespace=production

# Deployments
kubectl get pods -n production
kubectl get pods -n production -w              # watch
kubectl describe pod <name> -n production      # events, status
kubectl logs <pod> -n production -f --tail 100
kubectl logs <pod> -n production -c <container> # specific container

# Rolling update
kubectl set image deployment/api api=ghcr.io/org/api:newsha -n production
kubectl rollout status deployment/api -n production
kubectl rollout history deployment/api -n production
kubectl rollout undo deployment/api -n production    # rollback

# Scale
kubectl scale deployment/api --replicas=5 -n production

# Debug
kubectl exec -it <pod> -n production -- sh
kubectl port-forward pod/<pod> 3000:3000 -n production   # local access
kubectl top pods -n production                            # CPU/memory
kubectl get events -n production --sort-by='.lastTimestamp'
```

---

## 5. Deployment Strategies

### Rolling update (default, Kubernetes)

```text
How it works:
  Replace pods one at a time (or N at a time)
  Always maintain minimum available pods

Timeline:
  3 pods running v1
  Start 1 pod v2 → 4 pods total (1 v2, 3 v1)
  v2 passes health check → terminate 1 v1
  3 pods total (1 v2, 2 v1)
  Repeat until 3 v2

Pros:
  ✓ Zero downtime
  ✓ No extra infrastructure cost
  ✓ Automatic with Kubernetes

Cons:
  ✗ Two versions running simultaneously (v1 + v2)
  ✗ Rollback is slow (roll forward again)
  ✗ Database must be compatible with both versions during update

When to use: most deployments — simple, free, zero-downtime
```

### Blue/Green

```text
How it works:
  Blue = current production (v1)
  Green = new version (v2) deployed alongside
  Once green is healthy, switch load balancer → green gets all traffic
  Blue stays idle (instant rollback: switch back)

Timeline:
  Blue (v1): 3 pods, receiving 100% traffic
  Deploy Green (v2): 3 more pods, no traffic yet
  Run smoke tests against Green
  Switch LB → Green gets 100% traffic (< 1 second)
  Blue idles for 30 min (rollback window)
  Terminate Blue

Pros:
  ✓ Instant rollback (flip the switch)
  ✓ Full testing of new version before it receives traffic
  ✓ No mixed-version state

Cons:
  ✗ Double infrastructure cost during deployment
  ✗ Database migrations must be backward-compatible (both versions share DB)

When to use: critical services, when rollback speed matters most
```

### Canary deployment

```text
How it works:
  Route a small % of traffic to new version
  Watch metrics for errors/latency regression
  Gradually increase % if healthy
  Full rollout or rollback based on metrics

Timeline:
  v1: 100% traffic
  Deploy v2 canary: v2 gets 5% traffic
  Monitor for 15 min: error rate, p99 latency, business metrics
  No issues → 25% → 50% → 100%
  Issue detected → instantly route 0% to v2, investigate

Tools: Argo Rollouts, Flagger, Nginx/Istio weighted routing

Pros:
  ✓ Real production traffic testing
  ✓ Limited blast radius if v2 has bugs
  ✓ Automatic rollback based on metrics (Flagger)

Cons:
  ✗ Complex to implement correctly
  ✗ Two versions in production (session/state management)
  ✗ Slower full rollout

When to use: high-traffic services, data migrations, ML model updates
```

### Feature flags vs deployment

```text
Feature flag = separate deploy from release

Deploy v2 with flag "new-matching-algorithm" = false
→ All users still see old algorithm
→ Enable for 1% of users → 10% → 100%
→ Instant disable if issues (no redeploy needed)

vs Canary: canary is infrastructure-level routing
           feature flag is application-level logic

Combined approach:
  Deploy via canary → reduce risk of deploy itself
  Feature flag → control feature visibility independently
  Both together → maximum control
```

---

## 6. Infrastructure as Code

### Terraform basics

```hcl
# main.tf — provision AWS infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {              # store state in S3 (not local — team collaboration)
    bucket = "my-tf-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "app_name" {
  type = string
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier        = "${var.app_name}-db"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.medium"
  allocated_storage = 20
  storage_encrypted = true    # HIPAA requirement

  db_name  = var.app_name
  username = "postgres"
  password = var.db_password  # from secrets, not hardcoded

  backup_retention_period = 7  # 7-day backups
  deletion_protection     = true

  tags = {
    Environment = "production"
    App         = var.app_name
  }
}

# Output values
output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}
```

```bash
# Workflow
terraform init       # download providers, set up backend
terraform plan       # show what will change (ALWAYS review before apply)
terraform apply      # apply changes (prompts for confirmation)
terraform destroy    # tear down (careful!)

# Target specific resource
terraform plan -target=aws_db_instance.main
terraform apply -target=aws_db_instance.main
```

### Environment-specific config

```text
environments/
  dev/
    terraform.tfvars    # dev-specific values
    main.tf             # or symlink to shared modules
  staging/
    terraform.tfvars
  production/
    terraform.tfvars

modules/                # reusable infrastructure modules
  rds/
    main.tf
    variables.tf
    outputs.tf
  eks/
    main.tf
```

---

## 7. Secrets Management

### Never do this

```bash
# ✗ Secrets in code
const secret = 'super-secret-key-12345';

# ✗ Secrets committed to git
echo "JWT_SECRET=abc123" >> .env
git add .env  # .env in .gitignore! But even once committed = compromised forever

# ✗ Secrets in CI logs
echo "Password: $DB_PASSWORD"  # printed in build logs
```

### GitHub Actions secrets

```yaml
# Store in GitHub → Settings → Secrets → Actions
# Access in workflow:
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Never print secrets:
- run: echo "Secret is ${{ secrets.JWT_SECRET }}"   # ✗ masked but bad practice
- run: curl -H "Auth: ${{ secrets.API_KEY }}" ...   # ✓ not echoed
```

### AWS Secrets Manager

```ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<Record<string, string>> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (!response.SecretString) throw new Error('Secret not found');
  return JSON.parse(response.SecretString);
}

// On startup, fetch secrets (not per-request)
const secrets = await getSecret('production/app/secrets');
const config = {
  jwtSecret: secrets.JWT_SECRET,
  dbPassword: secrets.DB_PASSWORD,
};

// IAM role-based access — no credentials needed in code
// EC2/ECS/Lambda assumes a role that has permission to read the secret
```

### Rotation

```text
Secret rotation: regularly change secrets without downtime

AWS Secrets Manager supports automatic rotation:
  - Lambda function rotates the secret on schedule
  - New secret version created
  - Application picks up new version (on next startup or with short cache TTL)

Database password rotation:
  1. Generate new password
  2. Update DB user password
  3. Update secret in Secrets Manager
  4. Rolling restart of app pods (pick up new password)
  5. Verify old pods drained before old password invalid

JWT secret rotation:
  - Support both current and previous secret during rotation window
  - Tokens signed with old secret still valid until expiry
  - After rotation window, drop old secret
```

---

## 8. Database Migrations in CI/CD

### Migration strategy

```bash
# In CI pipeline, BEFORE deploying new app version:
npm run db:migrate

# This ensures:
# 1. Migration runs while OLD code is still serving traffic
# 2. New code deploys after migration succeeds
# 3. If migration fails, pipeline stops — old code still running
```

### Zero-downtime migration pattern

```text
Deploy N: current code + no new column
Deploy N+1: run migration (add column nullable) THEN deploy code
Deploy N+2: code writes to both columns
Deploy N+3: backfill + add constraint
Deploy N+4: drop old column

This is the "expand-contract" pattern:
  Phase 1 (expand): add new, keep old — both versions compatible
  Phase 2 (migrate): move data
  Phase 3 (contract): remove old
```

```ts
// Migration file: 0005_add_advocate_id.ts
import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function up() {
  // Step 1: Add nullable (no lock on large tables)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN advocate_id UUID REFERENCES advocates(id)
  `);
  // This is fast — NULL allows adding without rewriting all rows

  // Step 2: Create index concurrently (no table lock)
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY idx_patients_advocate_id
    ON patients(advocate_id)
  `);
}

export async function down() {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_patients_advocate_id;
    ALTER TABLE patients DROP COLUMN IF EXISTS advocate_id;
  `);
}
```

---

## 9. Monitoring & Alerting

### What to monitor

```text
The Four Golden Signals (Google SRE):
  Latency:     p50, p95, p99 response times
  Traffic:     requests per second
  Errors:      error rate (4xx, 5xx)
  Saturation:  CPU %, memory %, DB connections, queue depth

Infrastructure:
  CPU utilization per pod/node
  Memory usage (alert before OOM kill)
  Disk I/O and capacity
  Network throughput and error rates

Application:
  Active users / sessions
  Business metrics (tasks created, messages sent, matches made)
  External dependency latency (DB, Redis, third-party APIs)

Database:
  Active connections vs pool size
  Query latency (slow query log)
  Replication lag (if using read replicas)
  Deadlock count
```

### Alert thresholds

```text
Rule: alert on SYMPTOMS (user-visible), not causes

Good alerts:
  ✓ Error rate > 1% for 5 minutes
  ✓ p99 latency > 500ms for 10 minutes
  ✓ Pod restarting more than 3 times in 10 minutes (CrashLoopBackOff)
  ✓ Memory usage > 90% for 5 minutes
  ✓ Queue depth > 10,000 messages
  ✓ DB replication lag > 30 seconds

Bad alerts (too noisy, cause alert fatigue):
  ✗ Any 5xx response (occasional errors are normal)
  ✗ CPU spike (transient, often harmless)
  ✗ Any pod restart (single restart usually benign)
```

### Prometheus + Grafana (common stack)

```ts
// Expose metrics endpoint
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register }); // Node.js default metrics

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// Fastify hook to record metrics
fastify.addHook('onRequest', async (req) => {
  req.startTime = Date.now();
  activeRequests.inc();
});

fastify.addHook('onResponse', async (req, reply) => {
  const duration = (Date.now() - req.startTime) / 1000;
  httpRequestDuration.observe(
    { method: req.method, route: req.routerPath, status: reply.statusCode },
    duration
  );
  activeRequests.dec();
});

// Metrics endpoint (scraped by Prometheus)
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

---

## 10. Common Interview Questions

### "Explain the difference between CI and CD."

> CI (Continuous Integration) is the practice of merging code frequently and automatically running tests on every merge. The goal is fast feedback — catch bugs within minutes, not days. CD (Continuous Delivery) extends CI: every successful build produces a deployable artifact and can be deployed to production with one click. Continuous Deployment goes one step further — automatically deploys to production without human intervention. Most teams practice Continuous Delivery with a manual approval gate for production.

### "What is a rolling deployment and why is it preferred over stopping all pods?"

> A rolling deployment replaces pods one at a time, ensuring a minimum number are always running. You never have zero instances serving traffic — zero downtime. The alternative (stopping all, then starting new) creates downtime. Rolling is Kubernetes default. The trade-off: during the rollout, both old and new versions run simultaneously, so your API and database schema must be backward-compatible during that window.

### "How do you handle secrets in a CI/CD pipeline?"

> Never commit secrets to git — not even for a moment; git history is forever. Store secrets in your CI provider (GitHub Secrets, GitLab Variables). In production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault) and have your app fetch secrets at startup via IAM role (no credentials in code). Rotate secrets regularly. Audit who can access them. The rule: secrets should never appear in logs, environment file in git, or Docker image layers.

### "How would you implement zero-downtime database migrations?"

> The expand-contract pattern: First deploy a migration that adds the new column as nullable — this is instant, no table lock. Old code keeps running normally (it ignores the new column). Then deploy new code that writes to both old and new columns. Then backfill existing rows. Then add the NOT NULL constraint. Finally, deploy code that reads from the new column only, and drop the old one. Each step is independently safe. Never rename columns directly — always add-migrate-drop across multiple deployments.

### "What's in a good health check?"

```text
/health (liveness): "Is the process alive?"
  - Always returns 200 if the process is running
  - Never checks external dependencies (DB down ≠ process dead)
  - Kubernetes restarts pods that fail liveness

/ready (readiness): "Can this pod serve traffic?"
  - Checks database connectivity (SELECT 1)
  - Checks Redis connectivity (PING)
  - Checks any critical dependencies
  - Returns 503 if not ready → Kubernetes removes from load balancer
  - Use during startup: pod starts but isn't ready until DB connected

Never conflate the two: a DB outage should remove pods from load balancing
(readiness fails) but NOT restart them (liveness should still pass).
```

---

## Most Asked CI/CD & Deployment Interview Questions

### "What is Infrastructure as Code (IaC) and why use it?"

> IaC means managing infrastructure (servers, networks, databases) through machine-readable config files instead of manual console clicks. Benefits: version controlled (review infra changes like code), reproducible (exact same environment every time), auditable (git history shows who changed what), automatable (deploy infra in CI/CD). Tools: **Terraform** (multi-cloud, declarative HCL), **AWS CDK** (TypeScript/Python, imperative), **Pulumi** (general-purpose languages), **CloudFormation** (AWS-specific YAML/JSON).

### "What is a rolling deployment vs blue-green vs canary?"

> **Rolling**: update instances one at a time — some run old version, some new during deployment. Zero downtime but mixed versions temporarily. **Blue-Green**: two identical environments; instant cutover, instant rollback, requires double infrastructure. **Canary**: shift small % of traffic (e.g. 5%) to new version, monitor, gradually increase. Smallest blast radius — catches bugs before full rollout. **Feature flags**: deploy code to all users but enable features for a percentage — separate deployment from release.

### "What is a health check and why is it important in deployments?"

> A health check is an endpoint (`/health` or `/healthz`) that returns 200 when the service is ready to handle traffic. Load balancers and orchestrators use it to: stop sending traffic to unhealthy instances, wait for new deployments to be ready before removing old ones (readiness probe), detect and restart crashed services (liveness probe). Without health checks, a deployment might route traffic to instances that aren't ready yet.

```js
// Express health endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1'); // verify DB is reachable
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: err.message });
    }
});
```

### "What is semantic versioning (semver)?"

> Semver is a versioning scheme: `MAJOR.MINOR.PATCH`. **PATCH** (1.0.1) — backward-compatible bug fix. **MINOR** (1.1.0) — new backward-compatible feature. **MAJOR** (2.0.0) — breaking change. Pre-release: `1.0.0-beta.1`. Automated tools (semantic-release, changesets) read conventional commits and bump versions automatically. Libraries must follow semver strictly; apps use it more loosely.

### "What are feature flags and how do you implement them?"

> Feature flags (feature toggles) decouple deployment from release. Deploy code to production with the feature disabled; enable it for specific users/% of traffic via config without redeployment. Enables: gradual rollouts, A/B testing, instant kill switch if something breaks, testing in production with internal users. Simple implementation: DB/Redis-backed flags. Managed services: LaunchDarkly, Flagsmith, Unleash, PostHog.

```ts
async function isEnabled(flag: string, userId: string): Promise<boolean> {
    const config = await redis.get(`flag:${flag}`);
    if (!config) return false;
    const { enabled, rolloutPercent, userIds } = JSON.parse(config);
    if (!enabled) return false;
    if (userIds?.includes(userId)) return true;
    // Consistent hash so same user always gets same result
    return hashUser(userId) % 100 < rolloutPercent;
}
```

### "What is observability and what are the three pillars?"

> Observability is the ability to understand what's happening inside a system from its external outputs. The three pillars: **Metrics** — numeric measurements over time (request rate, error rate, latency, CPU — use for dashboards and alerting). **Logs** — structured records of events (use structured JSON logging, correlate with trace IDs). **Traces** — record of a request's journey across services (distributed tracing — identifies which service in a chain is slow). Tools: Prometheus + Grafana (metrics), ELK Stack (logs), Jaeger/Zipkin/OpenTelemetry (traces).

### "How do you do a zero-downtime database migration?"

> Schema changes must be backward-compatible with the currently running code. Safe multi-step approach: 1) **Expand**: add new column (nullable or with default) — old code ignores it. 2) **Migrate**: backfill data, update app to write both old and new column. 3) **Contract**: drop old column once all instances run new code. Never drop a column or rename it in one step — old running instances will crash immediately.

```
Step 1: ALTER TABLE users ADD COLUMN name_new VARCHAR(255);
Step 2: UPDATE users SET name_new = name_old; (deploy code writing both)
Step 3: ALTER TABLE users DROP COLUMN name_old; (after all instances updated)
```

### "What is a rollback strategy and how do you implement one?"

> A rollback strategy lets you revert to the previous working version quickly. For apps: keep the previous Docker image/deployment config ready; rollback = redeploy previous version (`kubectl rollout undo`, ECS update service with old task definition). For databases: only safe if you used an expand/contract migration (new columns, not dropped old ones). Test rollback in staging. Feature flags give instant rollback without redeployment. Define RTO (recovery time objective) before an incident, not during.
