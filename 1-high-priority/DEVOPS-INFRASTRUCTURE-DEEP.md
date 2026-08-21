# DevOps & Infrastructure — Complete Enterprise Reference

> Complete reference covering Docker, Kubernetes (EKS), Terraform, GitLab CI/CD, artifact management, QA workflows, observability, GitOps, service mesh, and production operations — focused on AWS with self-hosted GitLab.

---

## Table of Contents

**Part 1 — Containers & Orchestration**
1. [Docker Internals — How Containers Work](#1-docker-internals--how-containers-work)
2. [Dockerfile — Deep Optimization](#2-dockerfile--deep-optimization)
3. [Docker Networking & Volumes](#3-docker-networking--volumes)
4. [Docker Compose for Local Development](#4-docker-compose-for-local-development)
5. [Docker Security](#5-docker-security)
6. [Container Registries — ECR, Harbor, GitLab Registry](#6-container-registries--ecr-harbor-gitlab-registry)
7. [Kubernetes Architecture](#7-kubernetes-architecture)
8. [Core Objects — Pod, Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob](#8-core-objects--pod-deployment-replicaset-statefulset-daemonset-job-cronjob)
9. [Services & Networking](#9-services--networking)
10. [Ingress & Ingress Controllers](#10-ingress--ingress-controllers)
11. [ConfigMaps & Secrets](#11-configmaps--secrets)
12. [Persistent Storage — PV, PVC, StorageClasses, EBS/EFS CSI](#12-persistent-storage--pv-pvc-storageclasses-ebsefs-csi)
13. [Resource Management & HPA](#13-resource-management--hpa)
14. [RBAC & Security](#14-rbac--security)
15. [Deployment Strategies in Kubernetes](#15-deployment-strategies-in-kubernetes)
16. [Probes — Liveness, Readiness, Startup](#16-probes--liveness-readiness-startup)
17. [AWS EKS Deep Dive](#17-aws-eks-deep-dive)

**Part 2 — Infrastructure as Code**
18. [Terraform Fundamentals](#18-terraform-fundamentals)
19. [Terraform State Management](#19-terraform-state-management)
20. [Terraform Modules](#20-terraform-modules)
21. [Terraform Advanced](#21-terraform-advanced)
22. [Terraform for AWS](#22-terraform-for-aws)
23. [Policy as Code — Sentinel, OPA, Checkov, tfsec](#23-policy-as-code--sentinel-opa-checkov-tfsec)
24. [Terraform vs CloudFormation vs Pulumi](#24-terraform-vs-cloudformation-vs-pulumi)
25. [Terragrunt — DRY Patterns](#25-terragrunt--dry-patterns)

**Part 3 — CI/CD & GitLab**
26. [CI/CD Concepts](#26-cicd-concepts)
27. [Self-Hosted GitLab — Architecture & Runners](#27-self-hosted-gitlab--architecture--runners)
28. [GitLab CI/CD Deep Dive](#28-gitlab-cicd-deep-dive)
29. [Pipeline Patterns](#29-pipeline-patterns)
30. [Artifact Management](#30-artifact-management)

**Part 4 — GitOps & Deployment**
31. [GitOps Principles](#31-gitops-principles)
32. [ArgoCD](#32-argocd)
33. [Helm Charts — Deep Dive](#33-helm-charts--deep-dive)
34. [Kustomize](#34-kustomize)
35. [Deployment Strategies Deep Dive](#35-deployment-strategies-deep-dive)
36. [Database Migrations in CI/CD](#36-database-migrations-in-cicd)
37. [Secrets Management — Vault, AWS Secrets Manager, External Secrets](#37-secrets-management--vault-aws-secrets-manager-external-secrets)

**Part 5 — QA & Testing in the Pipeline**
38. [QA Workflow for Large Projects](#38-qa-workflow-for-large-projects)
39. [Testing Stages](#39-testing-stages)
40. [Load & Performance Testing](#40-load--performance-testing)
41. [Quality Gates](#41-quality-gates)

**Part 6 — Observability & Production Operations**
42. [Observability Stack — The Three Pillars](#42-observability-stack--the-three-pillars)
43. [Metrics & Monitoring — Prometheus, Grafana, CloudWatch](#43-metrics--monitoring--prometheus-grafana-cloudwatch)
44. [Logging — Centralized Logging, EFK, Structured Logging](#44-logging--centralized-logging-efk-structured-logging)
45. [Distributed Tracing — Jaeger, X-Ray, OpenTelemetry](#45-distributed-tracing--jaeger-x-ray-opentelemetry)
46. [Alerting & On-Call](#46-alerting--on-call)
47. [Service Mesh — Istio, App Mesh, Linkerd](#47-service-mesh--istio-app-mesh-linkerd)

**Part 7 — Platform Engineering & Operations**
48. [Internal Developer Platform](#48-internal-developer-platform)
49. [Cost Optimization for Infrastructure](#49-cost-optimization-for-infrastructure)
50. [Incident Response](#50-incident-response)
51. [End-to-End Workflow — Code to Production](#51-end-to-end-workflow--code-to-production)

---

# Part 1 — Containers & Orchestration

---

## 1. Docker Internals — How Containers Work

### Containers are NOT virtual machines

```text
‼️ A container is a process (or group of processes) on the HOST OS kernel,
   isolated using Linux kernel features. There is NO separate OS.

Virtual Machine:
  Host OS → Hypervisor → Guest OS → Application
  Separate kernel per VM. Full OS overhead. ~GBs of memory per VM. Minutes to start.

Container:
  Host OS (shared kernel) → Container runtime (Docker/containerd) → Application
  Shared host kernel. Only app + its libs. ~MBs. Milliseconds to start.

The three Linux kernel features that make containers work:

1. Namespaces — isolate what a process can SEE:
   pid:     process sees only its own processes (PID 1 in the container)
   net:     process gets its own network stack (eth0, loopback)
   mnt:     process sees its own filesystem (mount points)
   uts:     process has its own hostname
   ipc:     process has its own inter-process communication
   user:    process can have different UID/GID mappings

2. cgroups (Control Groups) — isolate what a process can USE:
   cpu:     limit CPU cycles
   memory:  limit RAM usage, OOM kill when exceeded
   io:      limit disk read/write bandwidth
   network: limit network bandwidth

3. Union filesystem (OverlayFS) — image layering:
   Each layer is a diff on top of the previous.
   Read-only layers (image) + one read-write layer (container).
   Copy-on-write: when a container writes a file from a read-only layer,
   the file is copied to the writable layer first.
```

### The Docker architecture

```text
Docker CLI  ──→  Docker daemon (dockerd)  ──→  containerd  ──→  runc
  (client)         (manages images,                (OCI          (actually
                    containers, networks,        container       creates the
                    volumes via REST API)         runtime)       container)

‼️ Docker is now just a frontend. Kubernetes uses containerd directly (removed Docker in v1.24).
   The container images are the same — OCI standard.

Image layers (OverlayFS):
  ubuntu:22.04      ← base layer (read-only)
  + node:18         ← node layer (read-only)
  + npm install     ← dependencies layer (read-only)
  + COPY app/       ← app code layer (read-only)
  + container rw    ← thin writable layer per running container

When you push to a registry, only NEW layers are uploaded.
When you pull, only layers you don't already have are downloaded.
This is why Docker pulls say "Already exists" for most layers.
```

### Core concepts

```text
Image:      Read-only template for creating containers.
            Built from a Dockerfile. Layers are cached.
            Like a class (blueprint).

Container:  Running instance of an image.
            Isolated process with its own filesystem, network, PID namespace.
            Like an object (instance of the class).

Registry:   Storage for images.
            Docker Hub (public), AWS ECR, GitLab Container Registry (private).

Layer:      Each Dockerfile instruction creates a read-only layer.
            Layers are cached — unchanged layers are reused on rebuild.
            This is why instruction order matters for build speed.

Volume:     Persisted data that survives container restarts.
            Mounted into the container's filesystem.
            Without a volume, container filesystem is ephemeral.
```

### Essential Docker commands

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

# Inspect layers
docker image history myapp:latest    # layer sizes
docker image inspect myapp:latest    # full metadata

# Cleanup
docker system prune                  # remove stopped containers, unused images
docker system prune -a               # remove everything not in use
docker volume prune                  # remove unused volumes
```

---

## 2. Dockerfile — Deep Optimization

### Layer caching — the most important optimization

```dockerfile
# ‼️ Layers are cached. A layer is invalidated when its instruction OR
#    any layer ABOVE it changes. Put frequently-changing instructions LAST.

# ✗ BAD — copies all source first, then installs dependencies
#   Any code change = reinstall all dependencies (slow!)
FROM node:18-alpine
WORKDIR /app
COPY . .                    # changes on every commit
RUN npm ci                  # runs every time — cache busted

# ✓ GOOD — install dependencies first (only changes when package.json changes)
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./   # only changes when deps change
RUN npm ci                               # cached unless package*.json changed
COPY . .                                 # code changes don't bust dep cache
CMD ["node", "dist/server.js"]
```

### Layer caching strategy — order matters

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

### Choosing the right base image

```dockerfile
# Size comparison for Node.js:
# node:18          ~950MB  — full Debian, all dev tools
# node:18-slim     ~240MB  — Debian, minimal packages
# node:18-alpine   ~180MB  — Alpine Linux, musl libc
# node:18-distroless ~120MB — no shell, no package manager, hardened

# ✓ Production: use alpine or distroless
FROM node:18-alpine

# Alpine caveat: musl libc != glibc — some native modules may fail
# Fix: add build tools
RUN apk add --no-cache python3 make g++

# Distroless — no shell, minimal attack surface
# FROM gcr.io/distroless/nodejs18-debian11
# Cannot exec into container (no /bin/sh) — debugging harder
```

### A production-ready Node.js Dockerfile (multi-stage)

```dockerfile
# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production   # production deps only

# Stage 2: Build (TypeScript compile, bundling, etc.)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                     # includes devDependencies for build
COPY . .
RUN npm run build              # tsc, webpack, etc.

# Stage 3: Production image — smallest possible
FROM node:18-alpine AS runner
WORKDIR /app

# Security: don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy only what production needs
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY package.json ./

# Document the port (doesn't actually expose it — that's -p flag or K8s Service)
EXPOSE 3000

# Use exec form (array) — PID 1 is the process, receives OS signals correctly
# ✗ Shell form: CMD "node dist/server.js"  — PID 1 is /bin/sh, signals not forwarded
# ✓ Exec form:
CMD ["node", "dist/server.js"]
```

### Why multi-stage builds matter

```text
Before multi-stage builds:
  Build tools, test frameworks, TypeScript compiler, all dev dependencies →
  all shipped in the final production image.
  Node.js image: 950MB+

With multi-stage builds:
  Build happens in a fat image.
  Only the compiled output + production node_modules copy to a slim final image.
  Result: 120–200MB — 5-8x smaller.

Smaller images = faster pulls, smaller attack surface, less egress cost.
```

### Multi-stage for Go — final image from scratch

```dockerfile
# Multi-stage for a Go service — final image has NO Go toolchain
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download                      # cache deps layer
COPY . .
RUN CGO_ENABLED=0 go build -o app ./cmd/server

# Final stage — scratch = literally empty, zero OS
FROM scratch
COPY --from=builder /build/app /app
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/app"]
# Final image: ~10MB vs ~400MB for the builder

# Named stages — reference in docker build --target
FROM node:18-alpine AS test
RUN npm run test

FROM node:18-alpine AS production
# Only builds up to this stage:
# docker build --target production .
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

### .dockerignore

```
# ‼️ Always create .dockerignore — prevents bloating the build context

node_modules     # largest directory, should never be copied in
.git
.gitignore
*.md
*.log
.env
.env.*
dist
coverage
.nyc_output
.DS_Store
Dockerfile
docker-compose*.yml
.github/
*.test.ts
```

### Key Dockerfile instructions

```dockerfile
FROM node:18-alpine          # base image — always pin a version tag, never :latest
WORKDIR /app                 # sets working directory (creates if not exists)
COPY src/ ./src/             # copy files from host into image
ADD archive.tar.gz /app/     # like COPY but also unpacks archives — prefer COPY
RUN npm ci                   # executes command in a new layer (build time)
ENV NODE_ENV=production      # sets environment variable (persists in image)
ARG BUILD_VERSION            # build-time variable (not in final image) — for secrets use --secret
EXPOSE 3000                  # documents port (metadata only)
VOLUME ["/data"]             # marks mount point (metadata only)
ENTRYPOINT ["node"]          # fixed executable — cannot be overridden with docker run args
CMD ["dist/server.js"]       # default args to ENTRYPOINT — CAN be overridden
# ENTRYPOINT + CMD together: node dist/server.js
# Override: docker run image dist/other.js

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Build secrets — don't bake credentials into layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install
# docker build --secret id=npmrc,src=.npmrc .
```

---

## 3. Docker Networking & Volumes

### Network drivers

```text
bridge (default):
  Creates a private internal network (172.17.0.0/16 by default).
  Containers on the same bridge can talk to each other by IP.
  Use --name to give containers names; they can resolve each other by name
  on user-defined bridge networks (NOT the default bridge).

  docker network create mynet
  docker run --network mynet --name api  api-image
  docker run --network mynet --name db   postgres
  # api container can reach db at http://db:5432

host:
  Container shares the host's network namespace — no isolation.
  Container's port 3000 IS the host's port 3000.
  Use only when performance is critical (avoids NAT overhead).
  Not available on Docker Desktop (Mac/Windows).

none:
  No networking — fully isolated. For batch jobs, data processing.

overlay:
  Multi-host networking — spans multiple Docker hosts (Docker Swarm).
  Kubernetes uses its own networking (CNI plugins) instead.
```

### Port mapping

```bash
# Map host port to container port
docker run -p 8080:3000 myapp     # host:8080 → container:3000
docker run -p 127.0.0.1:8080:3000 myapp  # bind to localhost only (more secure)

# Map multiple ports
docker run -p 80:3000 -p 443:3443 myapp

# Let Docker choose a host port (random high port)
docker run -p 3000 myapp          # docker port myapp 3000 → shows mapped port
```

### Container DNS in Compose

```yaml
# docker-compose: containers can reach each other by service name
services:
  api:
    image: myapp
    environment:
      DB_HOST: db         # ← "db" resolves to the db container's IP
      REDIS_URL: redis://cache:6379

  db:
    image: postgres:15

  cache:
    image: redis:7
# Docker Compose creates a default bridge network and registers each
# service name as a DNS entry pointing to that container's IP.
```

### Three storage types

```text
1. Volumes (managed by Docker — preferred for production):
   docker volume create mydata
   docker run -v mydata:/app/data myimage
   Stored in /var/lib/docker/volumes/ on the host.
   Survive container deletion. Can be shared across containers.
   Can use volume drivers (NFS, AWS EFS, etc.).

2. Bind mounts (host path mapped into container):
   docker run -v /host/path:/container/path myimage
   Host directory is mounted directly — any host changes visible in container.
   Great for development (hot reload of code).
   Risk in production: container can modify host files.

3. tmpfs mounts (in-memory, Linux only):
   docker run --tmpfs /tmp myimage
   Data lives in host memory. Lost when container stops.
   Use for: sensitive data that must not persist, temp files needing fast I/O.
```

```yaml
# docker-compose volumes
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume — persists
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # bind mount

  api:
    image: myapp
    volumes:
      - ./src:/app/src    # bind mount for dev hot-reload

volumes:
  pgdata:    # declares the named volume (Docker manages it)
```

---

## 4. Docker Compose for Local Development

### Full local development setup

```yaml
# docker-compose.yml
version: '3.9'

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
    command: redis-server --appendonly yes   # persist data

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
      - /app/node_modules       # don't mount node_modules from host
    depends_on:
      db:
        condition: service_healthy  # wait for db healthcheck to pass
      redis:
        condition: service_started
    command: npm run dev    # override CMD with dev command
    develop:
      watch:              # Docker compose watch (v2.22+)
        - action: sync
          path: ./src
          target: /app/src

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

### Useful Compose commands

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

## 5. Docker Security

### Key security practices

```dockerfile
# 1. Never run as root
RUN addgroup -S app && adduser -S app -G app
USER app

# 2. Use minimal base images (fewer packages = fewer CVEs)
FROM node:18-alpine   # or distroless

# 3. Pin exact versions — avoid surprise updates
FROM node:18.19.1-alpine3.19   # exact version

# 4. Don't bake secrets into images
# ✗ BAD — secret ends up in image layer history
RUN export API_KEY=secret123 && npm run build

# ✓ GOOD — use build secrets (Docker BuildKit)
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) npm run build

# ✓ GOOD — pass secrets at runtime via env vars or mounted files
docker run -e API_KEY=$API_KEY myapp
docker run --env-file .env myapp

# 5. Scan images for vulnerabilities
docker scout cves myimage
# Or: trivy image myimage (open source, more detailed)
# Or: snyk container test myimage

# 6. Read-only root filesystem in production
docker run --read-only -v /tmp myapp
# Kubernetes equivalent:
# securityContext:
#   readOnlyRootFilesystem: true
```

### Image scanning with Trivy (in CI pipeline)

```yaml
# .gitlab-ci.yml — image scanning stage
scan_image:
  stage: scan
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL
        --no-progress
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  allow_failure: false
  # ‼️ --exit-code 1: fail the pipeline if HIGH or CRITICAL CVEs found
  # ‼️ Run this BEFORE deploying — block bad images from reaching production
```

### Image scanning with Snyk

```yaml
# .gitlab-ci.yml
snyk_scan:
  stage: scan
  image: snyk/snyk:docker
  variables:
    SNYK_TOKEN: $SNYK_TOKEN
  script:
    - snyk container test $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        --severity-threshold=high
        --json-file-output=snyk-results.json
  artifacts:
    paths:
      - snyk-results.json
    when: always
```

### Rootless Docker

```text
‼️ By default, Docker daemon runs as root — any container escape = root on host.

Rootless Docker:
  - Docker daemon runs as a regular user (no root privileges)
  - Even if container escapes, attacker has user-level access only
  - Supported since Docker Engine 20.10
  - Some limitations: no privileged containers, limited network options

Setup:
  dockerd-rootless-setuptool.sh install
  export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock

In production Kubernetes:
  - Use Pod Security Standards (restricted) to enforce non-root
  - securityContext.runAsNonRoot: true on all pods
  - securityContext.allowPrivilegeEscalation: false
```

---

## 6. Container Registries — ECR, Harbor, GitLab Registry

### AWS ECR (Elastic Container Registry)

```text
‼️ ECR is the standard container registry when running on AWS/EKS.

Key features:
  - Fully managed, integrates with IAM for authentication
  - Private repositories per AWS account
  - Image scanning (on-push or on-demand) using Amazon Inspector
  - Lifecycle policies — auto-delete old images
  - Cross-region replication
  - Cross-account access via resource policies
  - OCI-compliant (supports Helm charts too)

Pricing:
  - Storage: $0.10/GB/month
  - Data transfer: free within same region, standard rates across regions
```

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name myapp \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=KMS

# Tag and push
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.2.3
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.2.3
```

### ECR lifecycle policies

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    }
  ]
}
```

### ECR cross-account access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
    }
  ]
}
```

### GitLab Container Registry

```text
‼️ Self-hosted GitLab includes a built-in container registry.
   Images are stored per-project at registry.gitlab.example.com/group/project

Authenticate:
  docker login registry.gitlab.example.com
  # Use CI_JOB_TOKEN in pipelines (auto-provided)

Push from CI:
  docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
  docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

Cleanup policies:
  GitLab has built-in container registry cleanup policies per project
  Settings → Packages & Registries → Container Registry → Cleanup policies
```

### Harbor (enterprise open-source registry)

```text
Harbor is a CNCF-graduated open-source container registry.
Used when you need more features than GitLab Registry / want multi-tenant.

Key features:
  - Vulnerability scanning (Trivy integration built-in)
  - Content trust and image signing (Cosign/Notary)
  - Replication between registries (ECR ↔ Harbor ↔ GitLab)
  - RBAC with LDAP/AD integration
  - Quota management per project
  - Garbage collection for unused layers
  - Helm chart repository
  - OCI artifact support (SBOM, signatures)

Deploy via Helm:
  helm install harbor harbor/harbor \
    --namespace harbor --create-namespace \
    -f harbor-values.yaml
```

---

## 7. Kubernetes Architecture

### The control plane and worker nodes

```text
‼️ Kubernetes = a cluster of machines (nodes) managed by a control plane.

CONTROL PLANE (manages the cluster — usually 3 replicas for HA):
┌─────────────────────────────────────────────────────────┐
│  kube-apiserver    — The front door. All kubectl        │
│                      commands go here (REST API).        │
│                      Only component that talks to etcd.  │
│                                                          │
│  etcd              — Distributed key-value store.        │
│                      The ONLY source of truth for        │
│                      ALL cluster state. Back this up.    │
│                                                          │
│  kube-scheduler    — Watches for unscheduled Pods.       │
│                      Picks the best Node to run them on  │
│                      (resources, affinity, taints).      │
│                                                          │
│  kube-controller-manager — Runs controllers:            │
│    - ReplicaSet controller (ensure N pods are running)   │
│    - Node controller (detect node failures)              │
│    - Job controller (run-to-completion jobs)             │
└─────────────────────────────────────────────────────────┘

WORKER NODES (run your workloads):
┌─────────────────────────────────────────────────────────┐
│  kubelet           — Agent on every node.                │
│                      Talks to apiserver, ensures         │
│                      containers in Pods are running.     │
│                                                          │
│  kube-proxy        — Manages iptables/IPVS rules for    │
│                      Service routing on the node.        │
│                                                          │
│  container runtime — containerd (or CRI-O).             │
│                      Actually runs the containers.       │
└─────────────────────────────────────────────────────────┘

‼️ How a kubectl apply works:
  1. kubectl → apiserver (authenticated, authorized, admitted)
  2. apiserver writes desired state to etcd
  3. Relevant controller notices the change (watches etcd via apiserver)
  4. Controller reconciles: creates/updates/deletes objects
  5. scheduler assigns Pods to Nodes
  6. kubelet on the Node pulls the image and starts the container
```

### The reconciliation loop

```text
‼️ Kubernetes is declarative — you describe DESIRED STATE, K8s makes it happen.

Every controller runs a reconciliation loop:
  1. Watch: observe current state from apiserver
  2. Diff: compare current state to desired state
  3. Act: take actions to close the gap

Example — ReplicaSet controller:
  Desired: replicas: 3
  Current: 2 pods running (one crashed)
  Action:  create 1 new pod

This loop runs continuously. If you delete a Pod manually, the controller
creates a new one immediately. To stop a Pod, delete the Deployment.
```

### What happens when you run kubectl apply

```text
1. kubectl authenticates to the apiserver (kubeconfig credentials)
2. apiserver validates the request (authentication → authorization RBAC → admission controllers)
3. Admission controllers: webhooks that can mutate or reject the request
   (e.g. add resource limits, inject sidecars, enforce policies)
4. apiserver writes the desired state to etcd
5. The relevant controller (e.g. Deployment controller) watches for changes via apiserver
6. Controller reconciles: creates/updates ReplicaSet → creates Pods
7. Scheduler notices unscheduled Pods, assigns them to Nodes (based on resources, affinity, taints)
8. kubelet on the assigned Node is notified, pulls the image, starts the container
9. kubelet reports Pod status back to apiserver → written to etcd
```

---

## 8. Core Objects — Pod, Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob

### Pod

```yaml
# ‼️ A Pod is the smallest deployable unit in Kubernetes.
# One or more containers that share:
#   - the same network namespace (localhost between containers)
#   - the same storage volumes
#   - the same lifecycle (scheduled together, die together)

# Most pods have ONE container. Multi-container pods:
#   Sidecar:    helper container (log shipper, service mesh proxy)
#   Init:       runs to completion BEFORE main container starts
#   Ambassador: proxy for external services

apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  labels:
    app: myapp           # labels — key for Services and Deployments to find pods
spec:
  containers:
    - name: app
      image: myapp:1.2.3
      ports:
        - containerPort: 3000
      env:
        - name: NODE_ENV
          value: production
      resources:         # ALWAYS set resources in production
        requests:
          cpu: "100m"    # 100 millicores = 0.1 CPU
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

### ReplicaSet & Deployment

```yaml
# ‼️ Never create Pods directly in production — use a Deployment.
# Deployment → manages a ReplicaSet → manages Pods

# ReplicaSet: ensures N identical pods are always running
# Deployment: wraps ReplicaSet to add rolling updates + rollback history

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3                     # desired pod count
  selector:
    matchLabels:
      app: api                    # Deployment manages pods with this label
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                 # max extra pods during update
      maxUnavailable: 0           # never go below desired replicas during update
  template:                       # pod template — EVERY pod created looks like this
    metadata:
      labels:
        app: api                  # MUST match selector.matchLabels
    spec:
      # Graceful termination
      terminationGracePeriodSeconds: 60

      containers:
        - name: api
          image: myapp:1.2.3      # ‼️ never use :latest in production
          ports:
            - containerPort: 3000
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

          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          readinessProbe:         # don't send traffic until ready
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:          # restart if unhealthy
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20

          # Graceful shutdown — stop accepting new connections
          lifecycle:
            preStop:
              exec:
                command: ['/bin/sh', '-c', 'sleep 5']  # wait for LB to deregister
```

### StatefulSet — for databases and stateful apps

```yaml
# ‼️ For stateful apps (Postgres, Redis, Kafka):
#    Use StatefulSet, not Deployment.
#
# StatefulSet differences from Deployment:
#   - Stable pod names: mydb-0, mydb-1, mydb-2 (not random hashes)
#   - Stable DNS: mydb-0.mydb-service.namespace.svc.cluster.local
#   - Ordered startup (0 starts first, then 1, then 2)
#   - Ordered shutdown (reverse — 2 stops first)
#   - Each pod gets its OWN PVC (via volumeClaimTemplates)

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres     # Headless service for stable DNS
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:     # each pod gets its own PVC automatically
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

### DaemonSet — one pod per node

```yaml
# ‼️ DaemonSet ensures exactly ONE pod runs on EVERY node (or a subset).
# Use for: log collectors, monitoring agents, node-level daemons.

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
          # ‼️ Tolerations let DaemonSet pods run on control-plane nodes too
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 200Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: containerlog
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: containerlog
          hostPath:
            path: /var/lib/docker/containers
```

### Job & CronJob

```yaml
# Job — run-to-completion workload (one-off task)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  backoffLimit: 3              # retry up to 3 times on failure
  activeDeadlineSeconds: 600   # timeout after 10 minutes
  template:
    spec:
      restartPolicy: Never     # ‼️ Job pods must be Never or OnFailure
      containers:
        - name: migrate
          image: myapp:1.2.3
          command: ["npm", "run", "db:migrate"]
          envFrom:
            - secretRef:
                name: db-secrets

---
# CronJob — scheduled Job
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
spec:
  schedule: "0 2 * * *"       # 2:00 AM daily (cron syntax)
  concurrencyPolicy: Forbid   # don't start new if previous still running
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: myapp:1.2.3
              command: ["npm", "run", "cleanup:old-sessions"]

# ‼️ concurrencyPolicy options:
#   Allow:   multiple concurrent jobs (default)
#   Forbid:  skip new run if previous still running
#   Replace: cancel previous and start new
```

### Rollout commands

```bash
kubectl apply -f deployment.yaml          # apply (create or update)
kubectl rollout status deployment/api     # watch rollout progress
kubectl rollout history deployment/api    # see revision history
kubectl rollout undo deployment/api       # rollback to previous version
kubectl rollout undo deployment/api --to-revision=3  # rollback to specific revision
kubectl set image deployment/api api=myapp:1.2.4     # update image in place
```

---

## 9. Services & Networking

### Why Services exist

```text
‼️ Pods are ephemeral — they come and go, and their IPs change.
   A Service provides a STABLE IP + DNS name that routes to healthy pods.

Service watches pods matching its selector label.
kube-proxy on each node updates iptables rules to route Service IP → Pod IPs.
Built-in load balancing (round-robin by default).
```

### Service types

```yaml
# ClusterIP (default) — internal only, not accessible outside cluster
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: ClusterIP
  selector:
    app: api              # routes to pods with label app=api
  ports:
    - port: 80            # Service port (what callers use)
      targetPort: 3000    # container port (what the pod listens on)
# Access: http://api-service (within cluster) or http://api-service.namespace.svc.cluster.local

---
# NodePort — opens a port on EVERY node, routes to the service
# Range: 30000–32767. Use for dev/testing, not production.
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080     # accessible at ANY_NODE_IP:30080

---
# LoadBalancer — provisions a cloud load balancer (AWS ALB, GCP LB, etc.)
# Creates a NodePort + ClusterIP + external LB automatically.
# Use for: exposing services directly to internet (but Ingress is usually better)
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 3000

---
# ExternalName — maps a service to an external DNS name
spec:
  type: ExternalName
  externalName: my-database.rds.amazonaws.com
# Allows pods to reference external services by internal name
# db-service → my-database.rds.amazonaws.com

---
# Headless Service — no ClusterIP, returns pod IPs directly
# ‼️ Used with StatefulSets for stable DNS per pod
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
# DNS returns A records for each pod:
# postgres-0.postgres-svc.namespace.svc.cluster.local
# postgres-1.postgres-svc.namespace.svc.cluster.local
```

### DNS in Kubernetes

```text
Every Service gets a DNS entry:
  <service-name>.<namespace>.svc.cluster.local

From within the same namespace:
  http://api-service          → resolves to ClusterIP

From a different namespace:
  http://api-service.production.svc.cluster.local

Every Pod also gets:
  <pod-ip-dashes>.<namespace>.pod.cluster.local
  (10.244.1.5 → 10-244-1-5.production.pod.cluster.local)

CoreDNS runs as a Deployment in kube-system — it handles all cluster DNS.
```

---

## 10. Ingress & Ingress Controllers

### What Ingress is

```text
‼️ Problem: one LoadBalancer Service per app = expensive (one cloud LB each).
   Solution: ONE Ingress Controller (e.g. nginx) as the entry point,
             routes to many Services based on host/path rules.

Browser → Cloud LB → Ingress Controller Pod → Service → Pods
                      (nginx/traefik/etc.)

Ingress Controller: a Pod running nginx/Traefik/HAProxy/Envoy that
  watches Ingress objects and reconfigures itself when rules change.

You need to install an Ingress Controller (not included in Kubernetes):
  nginx:   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/...
  Traefik: helm install traefik traefik/traefik
  AWS:     AWS Load Balancer Controller (uses ALB natively)
```

### Ingress routing rules

```yaml
# Ingress — routing rules
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /        # strip path prefix
    cert-manager.io/cluster-issuer: letsencrypt-prod     # auto TLS via cert-manager
    nginx.ingress.kubernetes.io/rate-limit: '100'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret     # cert-manager writes TLS cert here
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 80
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
```

### AWS ALB Ingress Controller

```yaml
# ‼️ On EKS, use AWS Load Balancer Controller instead of nginx.
#    Creates actual AWS ALBs — native integration with WAF, Shield, ACM certs.

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing    # or internal
    alb.ingress.kubernetes.io/target-type: ip            # for VPC CNI pod IPs
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456:certificate/abc123
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"        # redirect HTTP → HTTPS
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:...  # optional WAF
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/group.name: shared-alb     # share ALB across Ingresses
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

---

## 11. ConfigMaps & Secrets

### ConfigMap — non-sensitive configuration

```yaml
# Store as key-value pairs
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  NODE_ENV: production
  LOG_LEVEL: info
  DB_HOST: postgres-service
  DB_PORT: "5432"           # ConfigMap values are always strings
  # Can also store entire config files:
  app.config.json: |
    {
      "maxConnections": 100,
      "timeout": 30
    }

---
# Consume in Pod — as environment variables
envFrom:
  - configMapRef:
      name: api-config      # all keys become env vars

# Or individual keys:
env:
  - name: DATABASE_HOST
    valueFrom:
      configMapKeyRef:
        name: api-config
        key: DB_HOST

# Or mount as files:
volumes:
  - name: config-vol
    configMap:
      name: api-config
volumeMounts:
  - mountPath: /app/config
    name: config-vol
# /app/config/app.config.json will contain the JSON above
```

### Secrets — sensitive data

```yaml
# ‼️ Secrets are base64-encoded, NOT encrypted by default.
#    Enable etcd encryption at rest for true security.
#    Better: use external secret managers (AWS Secrets Manager, Vault)
#    with the External Secrets Operator.

apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
type: Opaque           # generic; other types: kubernetes.io/tls, kubernetes.io/dockerconfigjson
data:
  # Values MUST be base64 encoded: echo -n "mysecret" | base64
  DB_PASSWORD: bXlzZWNyZXQ=
  JWT_SECRET: c3VwZXJzZWNyZXQ=
stringData:            # stringData takes plain text — K8s encodes it automatically
  API_KEY: "plaintext-value"

---
# Consume — same as ConfigMap but use secretRef / secretKeyRef
envFrom:
  - secretRef:
      name: api-secrets

# ‼️ Secrets are mounted as tmpfs in pods — never written to disk on the node
# ‼️ Set RBAC to limit who can read Secrets
```

### External Secrets Operator (production pattern)

```yaml
# Don't store secrets in Git. Use AWS Secrets Manager / Vault / GCP Secret Manager.
# External Secrets Operator syncs them into K8s Secrets automatically.

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: api-secrets          # creates/updates this K8s Secret
  data:
    - secretKey: DB_PASSWORD   # key in K8s Secret
      remoteRef:
        key: /production/api   # AWS Secrets Manager path
        property: db_password  # JSON field in the secret
```

### Sealed Secrets (Git-safe secrets)

```text
‼️ Sealed Secrets let you store encrypted secrets in Git safely.

How it works:
  1. kubeseal CLI encrypts the secret with a cluster-specific public key
  2. Encrypted SealedSecret stored in Git
  3. SealedSecrets controller in cluster decrypts → creates regular K8s Secret
  4. Only the cluster's private key can decrypt

  kubeseal < secret.yaml > sealed-secret.yaml
  kubectl apply -f sealed-secret.yaml
```

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: api-secrets
  namespace: production
spec:
  encryptedData:
    DB_PASSWORD: AgBy3i4OJSWK+PiT... # encrypted, safe to commit
    JWT_SECRET: AgCtr8ASDF7+sdfa...
```

---

## 12. Persistent Storage — PV, PVC, StorageClasses, EBS/EFS CSI

### PersistentVolume & PersistentVolumeClaim

```text
‼️ Containers are ephemeral — data written inside is lost when the container restarts.
   For stateful data (databases, file uploads): use PersistentVolumes.

PersistentVolume (PV):     a piece of storage provisioned by an admin (or dynamically).
                            Like a storage resource in the cluster.

PersistentVolumeClaim (PVC): a request for storage by a user/pod.
                              "I need 10Gi of storage" — K8s binds it to a PV.

StorageClass: defines how storage is provisioned (AWS EBS, GCP PD, NFS, etc.)
              with dynamic provisioning, PVCs auto-create PVs.
```

```yaml
# PersistentVolumeClaim — request storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce       # RWO: one node at a time (block storage — EBS, GCP PD)
    # ReadWriteMany (RWX): multiple nodes simultaneously (NFS, EFS)
    # ReadOnlyMany (ROX):  multiple nodes, read-only
  storageClassName: gp3  # AWS EBS gp3 — use cluster's default if omitted
  resources:
    requests:
      storage: 20Gi

---
# Use in a Pod
volumes:
  - name: postgres-data
    persistentVolumeClaim:
      claimName: postgres-pvc
containers:
  - name: postgres
    image: postgres:15
    volumeMounts:
      - mountPath: /var/lib/postgresql/data
        name: postgres-data
```

### EBS CSI Driver (block storage — RWO)

```yaml
# ‼️ EBS CSI Driver is required for EBS volumes on EKS.
#    Install as an EKS add-on.

# StorageClass for EBS gp3
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"            # encrypt volumes at rest
  fsType: ext4
reclaimPolicy: Delete          # Delete PV when PVC is deleted (Retain for production DBs)
volumeBindingMode: WaitForFirstConsumer   # ‼️ Important: don't provision until pod scheduled
allowVolumeExpansion: true     # allow growing PVC size without recreating

# ‼️ WaitForFirstConsumer: prevents provisioning EBS in wrong AZ
#    EBS volumes are AZ-specific — must match the pod's node AZ
```

### EFS CSI Driver (shared filesystem — RWX)

```yaml
# ‼️ EFS for shared storage across multiple pods/nodes (ReadWriteMany).
#    Use cases: shared uploads directory, ML model files, CMS media.

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap    # EFS Access Point
  fileSystemId: fs-0123456789abcdef
  directoryPerms: "700"
  gidRangeStart: "1000"
  gidRangeEnd: "2000"

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-uploads
spec:
  accessModes:
    - ReadWriteMany            # multiple pods can read/write simultaneously
  storageClassName: efs-sc
  resources:
    requests:
      storage: 100Gi          # EFS is elastic — this is a nominal value
```

---

## 13. Resource Management & HPA

### Requests vs. limits

```text
‼️ requests: what the scheduler uses to find a node with enough capacity.
             The Pod is GUARANTEED this much resource.
             CPU: pod can use UP TO limit but is throttled above request if node is busy.
             Memory: pod is killed (OOMKilled) if it exceeds the LIMIT.

   limits:   the maximum a container can use.

Best practice:
  Always set requests and limits.
  Set memory request = memory limit (avoids OOMKilled surprises).
  Set CPU limit higher than request (CPU is compressible — throttled, not killed).

CPU units:
  1 = 1 vCPU = 1 core = 1000m (millicores)
  100m = 0.1 CPU
  500m = 0.5 CPU

Memory units:
  Mi = mebibytes (1Mi = 1024KiB)
  Gi = gibibytes
  M  = megabytes (1M = 1000KB) — avoid ambiguity, use Mi
```

### Horizontal Pod Autoscaler (HPA)

```yaml
# HPA scales Deployment replicas based on metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
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
          averageUtilization: 70   # scale up when avg CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Custom metrics (requires metrics adapter like Prometheus Adapter):
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"     # scale when > 1000 req/s per pod

# ‼️ HPA requires metrics-server installed in the cluster
# kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/...
```

### Vertical Pod Autoscaler (VPA)

```yaml
# ‼️ VPA adjusts CPU and memory requests/limits based on actual usage.
#    Useful when you don't know what resources to set.
#    VPA and HPA should NOT target the same metric (CPU).

apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"    # Auto, Initial (set on pod creation only), Off (recommendation only)
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
```

### Cluster Autoscaler vs Karpenter

```text
‼️ Cluster Autoscaler (traditional):
  - Watches for pods that can't be scheduled (Pending state)
  - Scales up node groups (ASGs) to fit pending pods
  - Scales down underutilized nodes
  - Works with fixed node group configurations
  - Slower: must match pre-defined instance types in node groups

Karpenter (AWS, recommended for EKS):
  - Directly provisions EC2 instances (no ASG needed)
  - Selects optimal instance type per workload (from a wide pool)
  - Provisions in seconds (vs minutes for Cluster Autoscaler)
  - Consolidation: actively bins packs pods onto fewer nodes
  - Supports spot instances natively
  - Drift detection: replaces nodes with outdated AMIs automatically

‼️ For new EKS clusters, prefer Karpenter over Cluster Autoscaler.
```

```yaml
# Karpenter NodePool — defines what instances Karpenter can provision
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]       # ‼️ mix spot + on-demand
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m5", "m6i", "c5", "c6i", "r5", "r6i"]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["large", "xlarge", "2xlarge"]
      nodeClassRef:
        name: default
  limits:
    cpu: 100                                  # max 100 vCPUs total
    memory: 400Gi
  disruption:
    consolidationPolicy: WhenUnderutilized    # ‼️ actively save costs
    expireAfter: 720h                         # rotate nodes every 30 days
```

### Resource Quotas and LimitRanges

```yaml
# ResourceQuota — limit total resources for a namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"

---
# LimitRange — set defaults and limits for individual pods in a namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:          # applied if container doesn't specify limits
        cpu: 500m
        memory: 256Mi
      defaultRequest:   # applied if container doesn't specify requests
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "2"
        memory: 2Gi
```

---

## 14. RBAC & Security

### How RBAC works

```text
RBAC = Role-Based Access Control

4 objects:
  ServiceAccount: an identity for a Pod (like a user account for apps)
  Role:           defines WHAT actions are allowed on WHICH resources (namespace-scoped)
  ClusterRole:    like Role but cluster-wide (or grants access to cluster-level resources)
  RoleBinding:    grants a Role to a ServiceAccount/user in a namespace
  ClusterRoleBinding: grants a ClusterRole cluster-wide

Flow:
  Pod uses ServiceAccount → ServiceAccount has RoleBinding → RoleBinding points to Role
  → Role says "can GET, LIST pods in namespace X"
```

```yaml
# 1. Create a ServiceAccount for the app
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-sa
  namespace: production

---
# 2. Create a Role — minimum required permissions (principle of least privilege)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-role
  namespace: production
rules:
  - apiGroups: [""]              # "" = core API group (pods, services, configmaps)
    resources: ["configmaps"]
    verbs: ["get", "list"]       # read-only access to configmaps
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]

---
# 3. Bind the Role to the ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-rolebinding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: api-sa
    namespace: production
roleRef:
  kind: Role
  name: api-role
  apiGroup: rbac.authorization.k8s.io

---
# 4. Use the ServiceAccount in the Deployment
spec:
  template:
    spec:
      serviceAccountName: api-sa    # pod uses this identity
```

### Pod Security

```yaml
# SecurityContext — harden pod security
spec:
  securityContext:
    runAsNonRoot: true          # pod-level: refuse to run as root
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000               # files created in volumes owned by this group
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true   # container cannot write to its own FS
        capabilities:
          drop: ["ALL"]                # drop all Linux capabilities
          add: ["NET_BIND_SERVICE"]    # only add what's needed
```

### NetworkPolicy — firewall rules for pods

```yaml
# By default: all pods can talk to all other pods (no isolation).
# NetworkPolicy: define which pods can communicate.

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api              # applies to pods with label app=api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend   # only frontend can send traffic to api
      ports:
        - port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres   # api can only reach postgres
      ports:
        - port: 5432
    - to:                     # allow DNS resolution
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
# ‼️ NetworkPolicy requires a CNI plugin that supports it (Calico, Cilium, Weave)
# The default kubenet CNI does NOT enforce NetworkPolicies.
# On EKS, VPC CNI does NOT enforce NetworkPolicies — install Calico or Cilium alongside it.
```

### OPA/Gatekeeper — policy enforcement

```text
‼️ OPA (Open Policy Agent) with Gatekeeper enforces custom policies on K8s resources.
   Example policies:
   - All containers must have resource limits
   - No containers can run as root
   - Images must come from approved registries only
   - All resources must have required labels

Gatekeeper uses ConstraintTemplates (define the policy logic in Rego language)
and Constraints (apply the policy to specific resources).
```

```yaml
# ConstraintTemplate — define the policy
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }

---
# Constraint — apply the policy
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["team", "env"]
```

---

## 15. Deployment Strategies in Kubernetes

### Rolling update (default)

```text
New pods replace old pods gradually.
At no point does the app go fully down.

maxSurge: 1        → can have 1 extra pod during update (4 pods for a 3-replica deployment)
maxUnavailable: 0  → never have fewer than 3 pods available

Timeline (3 replicas, maxSurge: 1, maxUnavailable: 0):
  Start:    v1 v1 v1
  Step 1:   v1 v1 v1 v2   (surge: +1 new pod)
  Step 2:   v1 v1 v2      (old pod removed when new is healthy)
  Step 3:   v1 v1 v2 v2
  Step 4:   v1 v2 v2
  Step 5:   v1 v2 v2 v2
  Done:     v2 v2 v2

Pros:
  ✓ Zero downtime
  ✓ No extra infrastructure cost
  ✓ Automatic with Kubernetes

Cons:
  ✗ Two versions running simultaneously (v1 + v2)
  ✗ Rollback is slow (roll forward again)
  ✗ Database must be compatible with both versions during update
```

### Blue/Green deployment

```text
Run two identical deployments, switch traffic instantly via Service selector.
Blue = current, Green = new version.

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
```

```yaml
# Blue/Green in practice:
# Deploy green (new version) alongside blue
kubectl apply -f deployment-green.yaml

# Verify green is healthy, then switch traffic:
kubectl patch service api-service -p '{"spec":{"selector":{"version":"green"}}}'

# Rollback is instant:
kubectl patch service api-service -p '{"spec":{"selector":{"version":"blue"}}}'

# Labels on deployments:
# Blue deployment labels: app: api, version: blue
# Green deployment labels: app: api, version: green
# Service selector: version: blue (or green)
```

### Canary deployment

```text
Route a small percentage of traffic to the new version first.

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

```yaml
# Simplest K8s canary: run both, adjust replica counts
# stable: 9 replicas (90% of traffic)
# canary: 1 replica  (10% of traffic)
# Both have label app: api — Service routes to both equally per-pod

# More precise: use Ingress annotations (nginx)
# nginx.ingress.kubernetes.io/canary: "true"
# nginx.ingress.kubernetes.io/canary-weight: "10"   # 10% to canary

# Best: use a service mesh (Istio, Linkerd) for fine-grained traffic splitting
# with VirtualService weight-based routing
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

## 16. Probes — Liveness, Readiness, Startup

```text
‼️ Three types of probes — all critical for production:

livenessProbe:   "Is this container still alive?"
  Fail → kubelet kills and restarts the container.
  Use for: detect deadlocks, infinite loops, corrupted state.
  ✗ Don't probe dependencies (DB, other services) — if DB is down, your pod
    shouldn't restart, it should stop receiving traffic (that's readinessProbe).

readinessProbe:  "Is this container ready to serve traffic?"
  Fail → pod is removed from Service endpoints (no traffic sent).
  Pod is NOT killed — just taken out of rotation.
  Use for: startup warmup, temporary overload, dependency unavailability.
  ✓ CAN probe dependencies here — if DB is unreachable, stop taking traffic.

startupProbe:    "Has the container finished starting up?"
  Runs INSTEAD of liveness/readiness until it succeeds.
  Use for: slow-starting apps (JVM, ML models loading).
  Prevents livenessProbe from killing the container during long startup.
```

```yaml
containers:
  - name: app
    # Startup probe — runs first, disables liveness until it passes
    startupProbe:
      httpGet:
        path: /health
        port: 3000
      failureThreshold: 30    # 30 × 10s = 5 minutes to start
      periodSeconds: 10

    # Liveness — checked AFTER startup probe succeeds
    livenessProbe:
      httpGet:
        path: /health         # must return 2xx
        port: 3000
      initialDelaySeconds: 0  # startup probe handles the delay
      periodSeconds: 15
      failureThreshold: 3     # kill after 3 consecutive failures

    # Readiness — checked concurrently with liveness after startup
    readinessProbe:
      httpGet:
        path: /ready          # SEPARATE endpoint from /health
        port: 3000            # /ready: checks DB connection, cache, etc.
      periodSeconds: 5
      failureThreshold: 3

# Probe types (pick one per probe):
# httpGet:    GET request — success = 200-399
# tcpSocket:  TCP connect — success = port is open
# exec:       run command inside container — success = exit code 0
# grpc:       gRPC health protocol
```

### Practical health check implementation

```ts
// /health endpoint (liveness) — simple, no external deps
app.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /ready endpoint (readiness) — checks critical dependencies
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');     // verify DB is reachable
    await redis.ping();             // verify Redis is reachable
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});
```

---

## 17. AWS EKS Deep Dive

### EKS architecture

```text
‼️ EKS = AWS-managed Kubernetes control plane.

AWS manages:
  - kube-apiserver (HA across 3 AZs)
  - etcd (managed, encrypted, backed up)
  - kube-scheduler
  - kube-controller-manager
  - Control plane upgrades

You manage:
  - Worker nodes (EC2 instances or Fargate)
  - Node OS updates and AMI upgrades
  - Networking (VPC, subnets, security groups)
  - Application workloads
  - Add-ons (CoreDNS, kube-proxy, VPC CNI, EBS CSI)

EKS pricing:
  - $0.10/hour per cluster ($72/month)
  - Plus EC2/Fargate compute costs
  - Plus data transfer costs
```

### Managed node groups vs Fargate

```text
MANAGED NODE GROUPS:
  - EC2 instances managed by EKS (uses ASGs)
  - You choose instance types (m5.xlarge, c6i.2xlarge, etc.)
  - Full control over node configuration
  - Support DaemonSets, host networking, privileged containers
  - GPU instances available
  - Spot instances supported
  - Best for: most workloads, cost-sensitive, GPU, high-performance

FARGATE:
  - Serverless — no EC2 instances to manage
  - Each pod gets its own isolated compute environment (microVM)
  - No node patching, no node scaling
  - Pay per pod vCPU + memory (billed per second)
  - Limitations:
    ✗ No DaemonSets (no nodes to run on)
    ✗ No privileged containers
    ✗ No GPUs
    ✗ No EBS volumes (only EFS)
    ✗ Limited pod size (4 vCPU, 30GB memory max)
    ✗ Slower pod startup (~30-60s vs ~5s on EC2)
  - Best for: batch jobs, dev/test environments, variable workloads

MIXED APPROACH (recommended for large projects):
  - Managed node groups for core services (API, database operators, monitoring)
  - Karpenter for dynamic workloads (auto-selects optimal instance types)
  - Fargate for batch jobs and cron tasks
```

### IRSA — IAM Roles for Service Accounts

```text
‼️ IRSA lets Kubernetes pods assume AWS IAM roles without access keys.

Before IRSA:
  - Attach IAM role to EC2 instance → ALL pods on that node get the same permissions
  - Or bake AWS credentials into pods (terrible practice)

With IRSA:
  - Each K8s ServiceAccount maps to a specific IAM role
  - Fine-grained: pod A can access S3, pod B can access DynamoDB
  - Uses OIDC federation — no credentials stored anywhere

How it works:
  1. EKS cluster has an OIDC provider
  2. IAM role trust policy trusts the OIDC provider + specific ServiceAccount
  3. Pod uses the ServiceAccount
  4. AWS SDK in the pod automatically assumes the IAM role
```

```yaml
# 1. ServiceAccount with IAM role annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/eks-s3-reader-role
```

```hcl
# 2. Terraform: create IAM role for IRSA
module "irsa_s3_reader" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "eks-s3-reader-role"

  oidc_providers = {
    main = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = ["production:s3-reader"]
    }
  }

  role_policy_arns = {
    s3_read = aws_iam_policy.s3_read_policy.arn
  }
}
```

### VPC CNI plugin

```text
‼️ VPC CNI assigns real VPC IP addresses to each pod.
   This means pods are directly routable within the VPC.

Benefits:
  - Pod-to-pod traffic stays within VPC (no overlay network overhead)
  - Security groups can be applied to individual pods
  - Pods can communicate with VPC resources (RDS, ElastiCache) directly
  - ALB Ingress Controller can route directly to pod IPs (IP target type)

Limitations:
  - Each EC2 instance type has a max number of ENIs (network interfaces)
  - Each ENI has a max number of secondary IPs
  - This limits pods-per-node: m5.large = ~29 pods max

  ‼️ To increase pod density, enable VPC CNI prefix delegation:
     aws eks create-addon --addon-name vpc-cni \
       --configuration-values '{"env":{"ENABLE_PREFIX_DELEGATION":"true"}}'
     This assigns /28 prefixes instead of individual IPs → 100+ pods per node
```

### EKS upgrades

```text
‼️ EKS upgrade process (IMPORTANT — plan carefully):

1. Review Kubernetes changelog for breaking changes
2. Test upgrade in a non-production cluster first
3. Update EKS add-ons compatibility matrix

Upgrade order:
  a. Control plane (managed by AWS — in-place, no downtime)
     aws eks update-cluster-version --name my-cluster --kubernetes-version 1.29

  b. Add-ons (CoreDNS, kube-proxy, VPC CNI, EBS CSI)
     aws eks update-addon --cluster-name my-cluster --addon-name coredns \
       --addon-version v1.11.1-eksbuild.4

  c. Worker nodes (rolling update)
     - Managed node groups: update AMI version, EKS rolls nodes
     - Karpenter: set drift detection, new nodes get new AMI automatically

  d. Validate applications
     - Run health checks, smoke tests
     - Check pod status, events, logs

‼️ EKS supports N-2 version skew (e.g., if latest is 1.30, oldest supported is 1.28)
‼️ You cannot skip versions — must upgrade one minor version at a time
‼️ Standard support: 14 months per version; extended support: 26 months (costs more)
```

### EKS cost optimization

```text
1. Right-size instances:
   Use VPA in recommendation mode to find optimal resource requests
   kubectl get vpa -o yaml → see recommendations

2. Spot instances for non-critical workloads:
   - CI runners, dev/staging environments, batch jobs
   - Karpenter handles spot interruptions automatically
   - Set pod disruption budgets for graceful handling

3. Karpenter consolidation:
   disruption.consolidationPolicy: WhenUnderutilized
   Actively moves pods to fewer nodes and terminates empty ones

4. Reserved Instances / Savings Plans:
   - Compute Savings Plans: 1-year or 3-year commit, up to 66% savings
   - Cover baseline workload with RI, use spot/on-demand for burst

5. Fargate for sporadic workloads:
   - CronJobs, batch jobs — pay only when running
   - No idle EC2 costs

6. Monitor with:
   - Kubecost (open source) — shows per-namespace, per-deployment costs
   - AWS Cost Explorer with EKS tags
```

### Common kubectl commands

```bash
# ── Context & Cluster ──────────────────────────────────────
kubectl config get-contexts              # list all contexts (clusters)
kubectl config use-context my-cluster    # switch cluster
kubectl config set-context --current --namespace=production  # default namespace
kubectl cluster-info                     # cluster endpoint info

# ── Get / Inspect ──────────────────────────────────────────
kubectl get pods                         # list pods (current namespace)
kubectl get pods -n production           # list pods in namespace
kubectl get pods -A                      # all namespaces
kubectl get pods -o wide                 # show node + IP
kubectl get pods -l app=api              # filter by label
kubectl get all                          # pods, services, deployments, replicasets
kubectl describe pod my-pod              # full details + events (best debug tool)
kubectl describe node my-node            # node capacity, allocatable, events
kubectl get events --sort-by=.lastTimestamp   # recent cluster events

# ── Logs ───────────────────────────────────────────────────
kubectl logs my-pod                      # pod logs
kubectl logs my-pod -c container-name    # specific container in multi-container pod
kubectl logs my-pod --previous           # logs from previous (crashed) container
kubectl logs -f my-pod                   # follow / stream logs
kubectl logs -l app=api --tail=100       # logs from ALL pods with label

# ── Execute ────────────────────────────────────────────────
kubectl exec -it my-pod -- /bin/sh       # interactive shell
kubectl exec my-pod -- ls /app           # run single command
kubectl exec -it my-pod -c sidecar -- bash   # exec into specific container
kubectl cp my-pod:/app/logs/app.log ./   # copy file from pod to local

# ── Apply / Delete ─────────────────────────────────────────
kubectl apply -f deployment.yaml         # create or update
kubectl apply -f ./manifests/            # apply all YAML in directory
kubectl delete -f deployment.yaml        # delete resources in file
kubectl delete pod my-pod                # delete specific pod
kubectl delete pod my-pod --grace-period=0  # force delete (avoid if possible)

# ── Scale ──────────────────────────────────────────────────
kubectl scale deployment api --replicas=5
kubectl autoscale deployment api --min=2 --max=10 --cpu-percent=70  # create HPA

# ── Rollout ────────────────────────────────────────────────
kubectl rollout status deployment/api
kubectl rollout history deployment/api
kubectl rollout undo deployment/api
kubectl set image deployment/api api=myapp:1.2.4

# ── Port Forwarding (local dev / debugging) ───────────────
kubectl port-forward pod/my-pod 8080:3000         # local:8080 → pod:3000
kubectl port-forward service/api-service 8080:80  # via service

# ── Resource usage ─────────────────────────────────────────
kubectl top pods                  # CPU + memory per pod (requires metrics-server)
kubectl top nodes                 # CPU + memory per node

# ── Debugging ──────────────────────────────────────────────
kubectl get pod my-pod -o yaml    # full YAML spec + status
kubectl describe pod my-pod       # events section shows scheduling failures, pulls, errors
# Pod stuck in Pending:  describe to see scheduler message (no nodes fit, PVC not bound)
# Pod in CrashLoopBackOff: logs --previous to see why it crashed
# ImagePullBackOff:       wrong image name, tag, or missing imagePullSecret
```

---

# Part 2 — Infrastructure as Code

---

## 18. Terraform Fundamentals

### Core concepts

```text
‼️ Terraform = declarative Infrastructure as Code tool by HashiCorp.
   You describe WHAT you want, Terraform figures out HOW to create it.

Provider:    plugin that knows how to talk to a cloud API (AWS, GCP, Azure, K8s)
Resource:    a piece of infrastructure (EC2 instance, RDS database, S3 bucket)
Data source: read existing infrastructure (lookup an AMI ID, VPC ID, etc.)
State:       Terraform's record of what it has created (maps config → real resources)
Module:      reusable group of resources (like a function for infrastructure)

Workflow:
  terraform init    → download providers and initialize backend
  terraform plan    → preview what will change (ALWAYS review)
  terraform apply   → create/update/delete resources
  terraform destroy → tear down everything
```

### Basic Terraform configuration

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
    bucket         = "my-tf-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"   # state locking
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = var.environment
      Project     = var.project_name
    }
  }
}

# Variables
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
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
  storage_encrypted = true

  db_name  = var.app_name
  username = "postgres"
  password = var.db_password  # from secrets, not hardcoded

  backup_retention_period = 7
  deletion_protection     = true

  tags = {
    Environment = var.environment
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

---

## 19. Terraform State Management

### S3 + DynamoDB backend

```text
‼️ State is Terraform's brain — it maps your config to real resources.
   NEVER store state locally for shared projects. Use remote backend.

S3 backend with DynamoDB locking:
  - State file stored in S3 (versioned, encrypted)
  - DynamoDB table provides locking (prevents concurrent modifications)
  - Multiple team members can safely run terraform at the same time
  - S3 versioning = state history (can recover from bad applies)
```

```hcl
# Backend configuration
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "production/networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}

# ‼️ Bootstrap: create the S3 bucket and DynamoDB table FIRST
# (manually or with a separate Terraform config using local backend)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "company-terraform-state"

  lifecycle {
    prevent_destroy = true   # never accidentally delete state bucket
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### State manipulation commands

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show aws_db_instance.main

# Import existing infrastructure into Terraform
terraform import aws_db_instance.main my-existing-db-identifier
# ‼️ Import brings the resource under Terraform management
# You must write the corresponding resource block in your config FIRST

# Move a resource (rename, move to module)
terraform state mv aws_db_instance.main module.database.aws_db_instance.main

# Remove a resource from state (Terraform stops managing it, doesn't delete it)
terraform state rm aws_db_instance.legacy
# ‼️ Use when you want to keep the resource but stop managing it with Terraform

# Force unlock (if someone's apply crashed and left a lock)
terraform force-unlock LOCK_ID
```

### Workspaces

```text
‼️ Workspaces let you manage multiple environments with the same config.
   Each workspace has its own state file.

terraform workspace new staging
terraform workspace new production
terraform workspace select staging
terraform workspace list

Access current workspace: terraform.workspace

  resource "aws_instance" "app" {
    instance_type = terraform.workspace == "production" ? "m5.xlarge" : "t3.small"
  }

‼️ Workspaces are useful for simple env separation.
   For complex setups, prefer separate directories or Terragrunt.
```

---

## 20. Terraform Modules

### Module design

```text
‼️ Modules are reusable infrastructure components.
   Like functions: inputs (variables), logic (resources), outputs.

Good module structure:
  modules/
    vpc/
      main.tf         — resources
      variables.tf    — input variables
      outputs.tf      — output values
      versions.tf     — required providers
      README.md       — documentation
    eks/
    rds/
    s3/
```

```hcl
# modules/rds/main.tf
resource "aws_db_instance" "this" {
  identifier        = var.identifier
  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_encrypted = true

  db_name  = var.db_name
  username = var.username
  password = var.password

  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = var.subnet_group_name

  backup_retention_period = var.backup_retention_days
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"

  tags = var.tags
}

# modules/rds/variables.tf
variable "identifier" { type = string }
variable "engine_version" { type = string; default = "16" }
variable "instance_class" { type = string; default = "db.t3.medium" }
variable "allocated_storage" { type = number; default = 20 }
variable "db_name" { type = string }
variable "username" { type = string }
variable "password" { type = string; sensitive = true }
variable "security_group_id" { type = string }
variable "subnet_group_name" { type = string }
variable "backup_retention_days" { type = number; default = 7 }
variable "environment" { type = string }
variable "tags" { type = map(string); default = {} }

# modules/rds/outputs.tf
output "endpoint" {
  value = aws_db_instance.this.endpoint
}
output "port" {
  value = aws_db_instance.this.port
}
```

### Using modules

```hcl
# environments/production/main.tf
module "database" {
  source = "../../modules/rds"

  identifier       = "production-api-db"
  db_name          = "api"
  username         = "postgres"
  password         = var.db_password
  instance_class   = "db.r6g.xlarge"
  allocated_storage = 100
  environment      = "production"
  backup_retention_days = 30

  security_group_id = module.vpc.database_security_group_id
  subnet_group_name = module.vpc.database_subnet_group_name

  tags = {
    Service = "api"
    Team    = "platform"
  }
}
```

### Public registry modules

```hcl
# Use community-maintained modules for common patterns
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"   # ‼️ Always pin module versions

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false   # one per AZ for HA in production
  enable_dns_hostnames = true

  # EKS requirements
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1   # for public-facing ALBs
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1   # for internal ALBs
  }
}
```

---

## 21. Terraform Advanced

### for_each vs count

```hcl
# count — use when you want N identical copies
resource "aws_instance" "worker" {
  count         = 3
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  tags = { Name = "worker-${count.index}" }  # worker-0, worker-1, worker-2
}
# ‼️ Problem with count: removing item 0 shifts all indices → Terraform recreates all

# for_each — use when each item has a unique key (preferred)
resource "aws_iam_user" "engineer" {
  for_each = toset(["alice", "bob", "charlie"])
  name     = each.key
}
# Removing "bob" only affects that user — no shifting

# for_each with map
variable "buckets" {
  default = {
    logs   = { versioning = true }
    assets = { versioning = false }
    backup = { versioning = true }
  }
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "${var.project}-${each.key}"
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = { for k, v in var.buckets : k => v if v.versioning }
  bucket   = aws_s3_bucket.this[each.key].id
  versioning_configuration { status = "Enabled" }
}
```

### Dynamic blocks

```hcl
# Dynamic blocks generate repeated nested blocks from a list/map
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}

variable "ingress_rules" {
  default = [
    { port = 80,  cidr_blocks = ["0.0.0.0/0"], description = "HTTP" },
    { port = 443, cidr_blocks = ["0.0.0.0/0"], description = "HTTPS" },
    { port = 22,  cidr_blocks = ["10.0.0.0/8"], description = "SSH internal" },
  ]
}
```

### Lifecycle rules

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  lifecycle {
    # Prevent accidental destruction
    prevent_destroy = true

    # Ignore changes made outside Terraform (e.g., auto-scaling tags)
    ignore_changes = [tags, ami]

    # Create replacement before destroying original (blue-green infra)
    create_before_destroy = true
  }
}
```

### depends_on, locals, outputs

```hcl
# depends_on — explicit dependency (use when Terraform can't infer it)
resource "aws_ecs_service" "app" {
  # ...
  depends_on = [aws_lb_listener.https]   # service needs LB listener first
}

# locals — computed values, reduce duplication
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = "platform"
  }

  name_prefix = "${var.project_name}-${var.environment}"
  is_production = var.environment == "production"
}

resource "aws_instance" "app" {
  instance_type = local.is_production ? "m5.xlarge" : "t3.small"
  tags          = merge(local.common_tags, { Name = "${local.name_prefix}-app" })
}

# outputs — expose values for other modules or for display
output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}
```

### Provisioners (and why to avoid them)

```text
‼️ Provisioners (local-exec, remote-exec, file) run scripts on resources.
   They are a LAST RESORT — break the declarative model.

Problems:
  - Not tracked in state (if provisioner fails, resource is tainted)
  - Not idempotent (running twice may cause different results)
  - SSH access required for remote-exec (security concern)

Better alternatives:
  - User data scripts for EC2 (cloud-init)
  - Packer for custom AMIs with pre-installed software
  - Configuration management (Ansible, Chef) triggered after Terraform
  - Kubernetes operators for in-cluster configuration

If you must use provisioners:
  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> hosts.txt"
  }
```

---

## 22. Terraform for AWS

### VPC module

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "${local.name_prefix}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = !local.is_production  # one per AZ in prod
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # EKS subnet tags
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"             = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
  }

  tags = local.common_tags
}
```

### EKS module

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.4"

  cluster_name    = local.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Public API endpoint (restrict by CIDR in production)
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # EKS add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 10

      instance_types = ["m6i.xlarge"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "general"
      }

      tags = local.common_tags
    }

    spot = {
      desired_size = 2
      min_size     = 0
      max_size     = 20

      instance_types = ["m5.xlarge", "m6i.xlarge", "c5.xlarge", "c6i.xlarge"]
      capacity_type  = "SPOT"

      labels = {
        role = "spot-workers"
      }

      taints = {
        spot = {
          key    = "spot"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  tags = local.common_tags
}
```

### Environment-specific config

```text
environments/
  dev/
    terraform.tfvars    # dev-specific values
    main.tf             # calls shared modules
    backend.hcl         # backend config for dev
  staging/
    terraform.tfvars
    main.tf
    backend.hcl
  production/
    terraform.tfvars
    main.tf
    backend.hcl

modules/                # reusable infrastructure modules
  vpc/
    main.tf
    variables.tf
    outputs.tf
  eks/
    main.tf
    variables.tf
    outputs.tf
  rds/
    main.tf
    variables.tf
    outputs.tf
```

```hcl
# environments/production/terraform.tfvars
environment    = "production"
aws_region     = "us-east-1"
instance_class = "db.r6g.xlarge"
eks_node_count = 5
eks_node_type  = "m6i.xlarge"

# environments/dev/terraform.tfvars
environment    = "dev"
aws_region     = "us-east-1"
instance_class = "db.t3.micro"
eks_node_count = 2
eks_node_type  = "t3.medium"
```

---

## 23. Policy as Code — Sentinel, OPA, Checkov, tfsec

### What policy as code solves

```text
‼️ Policy as Code = automated enforcement of security and compliance rules.
   Instead of reviewing Terraform plans manually, define rules as code.

Examples:
  - All S3 buckets must have encryption enabled
  - No security group can have 0.0.0.0/0 on port 22
  - All resources must have required tags
  - RDS instances must have encryption at rest
  - No public EC2 instances in production VPC
```

### Checkov (open source, most popular)

```bash
# Scan Terraform files
checkov -d .
checkov --directory . --framework terraform

# Scan specific file
checkov -f main.tf

# Common checks:
# CKV_AWS_18:  Ensure S3 bucket logging is enabled
# CKV_AWS_19:  Ensure S3 bucket has server-side encryption enabled
# CKV_AWS_23:  Ensure every security group rule has a description
# CKV_AWS_145: Ensure RDS database instance is using encryption

# Skip specific checks
checkov -d . --skip-check CKV_AWS_18

# Output as JUnit XML (for CI integration)
checkov -d . -o junitxml > checkov-report.xml
```

### tfsec (Terraform-specific scanner)

```bash
# Install
brew install tfsec

# Scan
tfsec .
tfsec --format json .

# In GitLab CI
tfsec_scan:
  stage: validate
  image: aquasec/tfsec:latest
  script:
    - tfsec . --format json --out tfsec-report.json
  artifacts:
    paths:
      - tfsec-report.json
    when: always
```

### OPA/Conftest for custom policies

```bash
# Conftest uses OPA Rego language for custom policies

# policy/terraform.rego
package main

deny[msg] {
  resource := input.resource.aws_s3_bucket[name]
  not resource.server_side_encryption_configuration
  msg := sprintf("S3 bucket '%s' must have encryption enabled", [name])
}

deny[msg] {
  resource := input.resource.aws_security_group[name]
  ingress := resource.ingress[_]
  ingress.cidr_blocks[_] == "0.0.0.0/0"
  ingress.from_port <= 22
  ingress.to_port >= 22
  msg := sprintf("Security group '%s' allows SSH from the world", [name])
}

# Run
conftest test --policy policy/ terraform-plan.json
```

### Integrating with GitLab CI

```yaml
# .gitlab-ci.yml — policy checks in pipeline
terraform_validate:
  stage: validate
  image: hashicorp/terraform:1.7
  script:
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check -recursive

security_scan:
  stage: validate
  image: bridgecrew/checkov:latest
  script:
    - checkov -d . --framework terraform --output cli --output junitxml > checkov.xml
  artifacts:
    reports:
      junit: checkov.xml
    when: always
```

---

## 24. Terraform vs CloudFormation vs Pulumi

```text
┌───────────────┬──────────────────┬──────────────────┬──────────────────┐
│               │ Terraform        │ CloudFormation    │ Pulumi           │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Language      │ HCL (declarative)│ YAML/JSON        │ TypeScript,      │
│               │                  │ (declarative)     │ Python, Go, etc. │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Cloud support │ Multi-cloud      │ AWS only          │ Multi-cloud      │
│               │ (AWS, GCP, Azure,│                   │                  │
│               │  K8s, Datadog,   │                   │                  │
│               │  etc.)           │                   │                  │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ State         │ S3, TF Cloud,    │ Managed by AWS    │ Pulumi Cloud,    │
│               │ local, etc.      │ (automatic)       │ S3, local        │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Learning curve│ Moderate (HCL is │ Low for AWS users │ Low for devs     │
│               │ a new language)  │                   │ (familiar lang)  │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Ecosystem     │ Largest (huge    │ AWS native, good  │ Growing, smaller │
│               │ community,       │ integration       │ community        │
│               │ module registry) │                   │                  │
├───────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Best for      │ Multi-cloud,     │ AWS-only shops    │ Teams that want  │
│               │ large teams,     │ want zero state   │ real programming │
│               │ enterprise       │ management        │ over DSL         │
└───────────────┴──────────────────┴──────────────────┴──────────────────┘

‼️ For AWS + EKS environments, Terraform is the most common choice.
   It manages both AWS resources AND Kubernetes resources with different providers.
   CloudFormation is viable for AWS-only but lacks K8s resource management.
   Pulumi is great if your team prefers TypeScript over HCL.
```

---

## 25. Terragrunt — DRY Patterns

### What Terragrunt solves

```text
‼️ Terragrunt is a thin wrapper around Terraform that:
  - Keeps backend config DRY (no copy-paste across environments)
  - Manages dependencies between Terraform modules
  - Provides inputs from parent configs (inheritance)
  - Runs Terraform across multiple modules in order

Without Terragrunt: copy-paste backend.tf, provider.tf, variables across
  every environment directory.

With Terragrunt: define once, inherit everywhere.
```

### Terragrunt directory structure

```text
infrastructure/
  terragrunt.hcl                    # root config (backend, provider defaults)
  dev/
    env.hcl                         # environment-specific variables
    vpc/
      terragrunt.hcl                # includes root + env, passes inputs to module
    eks/
      terragrunt.hcl
    rds/
      terragrunt.hcl
  staging/
    env.hcl
    vpc/
      terragrunt.hcl
    eks/
      terragrunt.hcl
    rds/
      terragrunt.hcl
  production/
    env.hcl
    vpc/
      terragrunt.hcl
    eks/
      terragrunt.hcl
    rds/
      terragrunt.hcl
  modules/
    vpc/
    eks/
    rds/
```

### Root terragrunt.hcl

```hcl
# infrastructure/terragrunt.hcl
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "company-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      ManagedBy = "terraform"
    }
  }
}
EOF
}
```

### Environment and module configs

```hcl
# infrastructure/production/env.hcl
locals {
  environment = "production"
  aws_region  = "us-east-1"
}

# infrastructure/production/eks/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "../../../modules/eks"
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id          = "vpc-mock"
    private_subnets = ["subnet-mock-1", "subnet-mock-2"]
  }
}

inputs = {
  environment    = local.env_vars.locals.environment
  aws_region     = local.env_vars.locals.aws_region
  cluster_name   = "production-eks"
  vpc_id         = dependency.vpc.outputs.vpc_id
  subnet_ids     = dependency.vpc.outputs.private_subnets
  node_count     = 5
  instance_types = ["m6i.xlarge"]
}
```

```bash
# Terragrunt commands
cd infrastructure/production
terragrunt run-all plan    # plan ALL modules in order (respects dependencies)
terragrunt run-all apply   # apply ALL modules in order

cd infrastructure/production/eks
terragrunt plan            # plan single module
terragrunt apply           # apply single module
```

---

# Part 3 — CI/CD & GitLab

---

## 26. CI/CD Concepts

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
Trigger (on: push, merge_request)
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
Security scan            (trivy, snyk, SAST)
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

### Trunk-based development vs GitFlow

```text
TRUNK-BASED DEVELOPMENT (recommended for CI/CD):
  - Everyone commits to main (trunk) frequently
  - Short-lived feature branches (1-2 days max)
  - Feature flags for incomplete work
  - Main is always deployable
  - Merge requests reviewed quickly
  - Best for: teams doing continuous delivery/deployment

GITFLOW:
  - Long-lived branches: main, develop, release, hotfix
  - Features branch off develop
  - Release branches for stabilization
  - Complex merge process
  - Best for: packaged software with versioned releases
  - ‼️ Anti-pattern for CI/CD — long-lived branches cause merge hell

‼️ For microservices on EKS with GitLab CI: use trunk-based development.
   Short-lived branches, fast review, merge to main, auto-deploy.
```

---

## 27. Self-Hosted GitLab — Architecture & Runners

### GitLab architecture

```text
‼️ Self-hosted GitLab components:

GitLab Rails (Puma):     Web UI + API + Git operations
PostgreSQL:              Metadata storage (users, projects, MRs, CI data)
Redis:                   Caching, Sidekiq job queue
Sidekiq:                 Background job processing (emails, CI pipeline triggers)
Gitaly:                  Git storage service (RPC interface to Git repos)
GitLab Container Registry: Built-in Docker registry
GitLab Runner:           Executes CI/CD jobs (can be on separate machines)
Nginx:                   Reverse proxy / TLS termination
Prometheus + Grafana:    Built-in monitoring

Deployment options:
  - Omnibus package (single node, includes everything)
  - Helm chart on Kubernetes (recommended for production)
  - Docker Compose (development/small teams)
  - AWS reference architecture (HA, multi-AZ)
```

### GitLab Runner — architecture

```text
‼️ GitLab Runner = the agent that executes CI/CD jobs.
   Runs OUTSIDE the GitLab server (on separate machines/clusters).

Runner types:
  Shared runners:   available to ALL projects in the instance
  Group runners:    available to all projects in a group
  Project runners:  attached to a specific project only

Runner executors (how the runner executes jobs):
  shell:           runs directly on the host (simple, less isolated)
  docker:          each job runs in a fresh Docker container (recommended)
  docker+machine:  auto-provisions Docker hosts on cloud (auto-scaling)
  kubernetes:      each job runs as a pod in K8s (recommended for EKS)
  docker-autoscaler: next-gen auto-scaling (replacing docker+machine)
```

### GitLab Runner on EKS (Kubernetes executor)

```yaml
# values.yaml for GitLab Runner Helm chart
gitlabUrl: https://gitlab.company.com
runnerToken: $RUNNER_TOKEN          # or use runnerRegistrationToken

runners:
  config: |
    [[runners]]
      [runners.kubernetes]
        namespace = "gitlab-runners"
        image = "alpine:latest"
        privileged = false
        cpu_request = "500m"
        cpu_limit = "2"
        memory_request = "512Mi"
        memory_limit = "4Gi"
        service_cpu_request = "100m"       # for service containers (postgres, redis)
        service_memory_request = "256Mi"
        poll_timeout = 600
        [runners.kubernetes.node_selector]
          role = "ci-runners"
        [runners.kubernetes.pod_annotations]
          "iam.amazonaws.com/role" = "gitlab-runner-role"
        [[runners.kubernetes.volumes.empty_dir]]
          name = "docker-certs"
          mount_path = "/certs/client"
          medium = "Memory"

# ‼️ Each CI job = a new K8s pod. Job finishes → pod deleted.
# ‼️ Use node selectors to run CI on dedicated nodes (don't compete with production)
# ‼️ Use Karpenter to auto-provision spot instances for CI runners
```

```bash
# Install GitLab Runner on EKS
helm repo add gitlab https://charts.gitlab.io
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runners --create-namespace \
  -f values.yaml
```

### Scaling runners

```text
‼️ Scaling strategies for GitLab runners on EKS:

1. Karpenter (recommended):
   - Dedicated NodePool for CI with spot instances
   - Pods requesting specific resources auto-provision matching nodes
   - Nodes scale to zero when idle

2. HPA on runner deployment:
   - Doesn't work well — runner pods are long-lived
   - Better to let Karpenter handle node scaling

3. Multiple runner configurations:
   - Small runner for lint/test (500m CPU, 1Gi memory)
   - Large runner for Docker builds (2 CPU, 8Gi memory)
   - GPU runner for ML jobs (if needed)
   - Tag-based routing in .gitlab-ci.yml

Best practices:
  - Use spot instances for CI runners (interruptions are fine — jobs retry)
  - Set resource requests/limits to prevent CI from starving production
  - Use separate namespace (gitlab-runners) with ResourceQuota
  - Cache Docker layers and npm/pip packages in S3 or shared PVC
```

---

## 28. GitLab CI/CD Deep Dive

### .gitlab-ci.yml structure

```yaml
# .gitlab-ci.yml — defines the CI/CD pipeline

# Global settings
image: node:20-alpine          # default Docker image for all jobs
default:
  timeout: 30m                  # max job duration
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure

# Cache — persisted between pipeline runs
cache:
  key:
    files:
      - package-lock.json      # new cache key when lockfile changes
  paths:
    - node_modules/
  policy: pull-push             # pull: download cache, push: upload after job

# Stages — define execution order
stages:
  - validate
  - test
  - build
  - scan
  - deploy-staging
  - integration-test
  - deploy-production

# Variables — available to all jobs
variables:
  NODE_ENV: test
  DOCKER_TLS_CERTDIR: "/certs"

# ────────────────────────────────────────────────
# Jobs
# ────────────────────────────────────────────────

lint:
  stage: validate
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run lint
    - npm run type-check
  cache:
    key: npm-$CI_COMMIT_REF_SLUG
    paths:
      - .npm/
    policy: pull-push

unit_test:
  stage: test
  services:
    - name: postgres:16-alpine
      alias: postgres             # accessible as hostname "postgres"
      variables:
        POSTGRES_DB: testdb
        POSTGRES_PASSWORD: postgres
    - name: redis:7-alpine
      alias: redis
  variables:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/testdb
    REDIS_URL: redis://redis:6379
  script:
    - npm ci
    - npm run db:migrate
    - npm run test:coverage
  coverage: '/All files\s+\|\s+(\d+\.?\d*)\s+\|/'   # regex to extract coverage %
  artifacts:
    reports:
      junit: junit.xml            # show test results in MR
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    when: always

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind               # Docker-in-Docker for building images
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build
        --cache-from $CI_REGISTRY_IMAGE:latest
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        --build-arg BUILDKIT_INLINE_CACHE=1
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

# Build to ECR (AWS)
build_and_push_ecr:
  stage: build
  image:
    name: amazon/aws-cli:latest
    entrypoint: [""]
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    AWS_DEFAULT_REGION: us-east-1
  before_script:
    - amazon-linux-extras install docker
    - aws ecr get-login-password | docker login --username AWS --password-stdin
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  script:
    - export IMAGE_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/myapp
    - docker build -t $IMAGE_URI:$CI_COMMIT_SHORT_SHA .
    - docker push $IMAGE_URI:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy_staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - kubectl config use-context staging
    - kubectl set image deployment/api api=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        -n staging
    - kubectl rollout status deployment/api -n staging --timeout=120s
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy_production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://api.example.com
  script:
    - kubectl config use-context production
    - kubectl set image deployment/api api=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        -n production
    - kubectl rollout status deployment/api -n production --timeout=300s
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual                   # ‼️ Manual gate for production
  allow_failure: false
```

### Rules, artifacts, caching

```yaml
# Rules — control WHEN jobs run (replaces deprecated only/except)
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"   # on MR creation/update
  - if: $CI_COMMIT_BRANCH == "main"                    # on push to main
  - if: $CI_COMMIT_TAG                                 # on tag creation
  - if: $CI_COMMIT_BRANCH =~ /^release\//              # on release branches

# With additional conditions
rules:
  - if: $CI_COMMIT_BRANCH == "main"
    when: manual                # require manual click
    allow_failure: true         # pipeline doesn't fail if not triggered
  - if: $CI_PIPELINE_SOURCE == "schedule"
    when: always                # always run on schedule
  - changes:                   # only run when specific files changed
      - src/**/*
      - package.json
    when: on_success

# Artifacts — files passed between jobs
artifacts:
  paths:
    - dist/                     # pass build output to deploy job
    - coverage/
  reports:
    junit: junit.xml            # display test results in MR UI
    coverage_report:
      coverage_format: cobertura
      path: coverage/cobertura-coverage.xml
  expire_in: 1 week             # auto-cleanup
  when: always                   # save even if job fails

# Caching — persists between pipeline runs (not between jobs in same pipeline)
cache:
  key:
    files:
      - package-lock.json       # invalidate when lockfile changes
    prefix: $CI_COMMIT_REF_SLUG # per-branch cache
  paths:
    - node_modules/
    - .npm/
  policy: pull-push              # pull: use cache, push: update cache
  # pull: only download (for jobs that don't modify cache)
  # push: only upload
  # pull-push: both (default)
```

### DAG (needs keyword) and parent-child pipelines

```yaml
# DAG — define job dependencies explicitly (faster than stage-based ordering)
# Jobs in the same stage can run in parallel if they don't depend on each other

lint:
  stage: validate
  script: npm run lint

type_check:
  stage: validate
  script: npm run type-check

unit_test:
  stage: test
  needs: [lint, type_check]    # ‼️ starts as soon as lint AND type_check finish
  script: npm test             # doesn't wait for ALL validate jobs

build:
  stage: build
  needs: [unit_test]           # start immediately after unit_test
  script: npm run build

# Without needs: build waits for ALL test stage jobs to finish
# With needs: build starts as soon as unit_test finishes (even if other test jobs are running)

# ────────────────────────────────────────────────
# Parent-child pipelines — split large pipelines
# ────────────────────────────────────────────────

# .gitlab-ci.yml (parent)
stages:
  - triggers

trigger_api:
  stage: triggers
  trigger:
    include: services/api/.gitlab-ci.yml
    strategy: depend                    # parent waits for child
  rules:
    - changes:
        - services/api/**/*

trigger_web:
  stage: triggers
  trigger:
    include: services/web/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - services/web/**/*

# ‼️ Parent-child pipelines are ideal for monorepos:
#    Only build/test the services that actually changed.
```

### Multi-project pipelines

```yaml
# Trigger a pipeline in another project
trigger_deploy_repo:
  stage: deploy
  trigger:
    project: platform/deploy-manifests    # other GitLab project
    branch: main
    strategy: depend
  variables:
    IMAGE_TAG: $CI_COMMIT_SHORT_SHA       # pass variables to child
    SERVICE_NAME: api
```

### Protected variables and environments

```text
‼️ Protected variables:
  - Only available on protected branches (main, release/*)
  - Use for: production credentials, API keys, deploy tokens
  - Settings → CI/CD → Variables → Protected checkbox

Environment variables:
  - Scoped to specific environments (staging, production)
  - Settings → CI/CD → Variables → Environment scope

Variable precedence (highest to lowest):
  1. Job-level variables
  2. Pipeline-level variables (trigger)
  3. Project-level variables (CI/CD settings)
  4. Group-level variables
  5. Instance-level variables

Masking:
  - Check "Mask variable" to hide from logs
  - Must be a single line, no special characters in some cases
  - ‼️ Even masked variables can be leaked via script output — be careful
```

---

## 29. Pipeline Patterns

### Monorepo pipelines

```yaml
# ‼️ In a monorepo, only run CI for changed services.
# Use changes: keyword or parent-child pipelines.

stages:
  - detect
  - build
  - deploy

# Detect which services changed
.only_api:
  rules:
    - changes:
        - services/api/**/*
        - libs/shared/**/*           # shared libraries affect all
      when: on_success

.only_web:
  rules:
    - changes:
        - services/web/**/*
        - libs/shared/**/*
      when: on_success

build_api:
  extends: .only_api
  stage: build
  script:
    - cd services/api && docker build -t $REGISTRY/api:$CI_COMMIT_SHORT_SHA .

build_web:
  extends: .only_web
  stage: build
  script:
    - cd services/web && docker build -t $REGISTRY/web:$CI_COMMIT_SHORT_SHA .
```

### Merge request pipelines

```yaml
# Run lightweight checks on MRs, full pipeline on main
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# MR-only job
review_app:
  stage: deploy-staging
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.preview.example.com
    on_stop: stop_review_app         # cleanup when MR is merged/closed
    auto_stop_in: 1 week             # auto-cleanup after 1 week
  script:
    - deploy-preview-environment.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

stop_review_app:
  stage: deploy-staging
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  script:
    - destroy-preview-environment.sh
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
```

### Merge trains

```text
‼️ Merge trains prevent broken builds on main.

Without merge trains:
  - MR A passes CI, MR B passes CI
  - Both merge to main
  - Combined A+B breaks main (they conflict)

With merge trains:
  - MR A enters the train
  - MR B enters — GitLab tests A+B combined BEFORE merging
  - If A+B combined fails, MR B is ejected
  - Main is always green

Enable: Settings → Merge requests → Merge trains
Requires: pipelines for merged results
```

---

## 30. Artifact Management

### Versioning strategy

```text
‼️ Image tagging strategy for production:

1. Git SHA (recommended primary tag):
   myapp:abc1234
   Immutable, traceable, unique per commit.
   ‼️ NEVER use :latest in production — not reproducible.

2. Semver (for releases):
   myapp:1.2.3
   Use semantic-release or manual tagging.
   Tag when cutting a release.

3. Branch tag (for non-prod):
   myapp:main, myapp:feature-auth
   Mutable — for dev/staging reference only.

4. Promotion model:
   myapp:abc1234-dev     → built, tested
   myapp:abc1234-staging → promoted after staging tests pass
   myapp:abc1234-prod    → promoted after production approval
   ‼️ Same image, different tags — no rebuilding between environments!
```

### Docker image tagging in CI

```yaml
# .gitlab-ci.yml
build:
  stage: build
  script:
    # Tag with git SHA (primary, immutable)
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

    # Also tag with branch name (mutable, for reference)
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
        $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG

    # If this is a semver tag
    - |
      if [ -n "$CI_COMMIT_TAG" ]; then
        docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA \
          $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
        docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
      fi
```

### Promotion pipeline (dev → staging → prod)

```text
‼️ Image promotion = re-tag the same image for the next environment.
   DO NOT rebuild. The same binary goes through all environments.

dev pipeline:
  1. Build image → myapp:abc1234
  2. Push to ECR
  3. Run unit/integration tests
  4. Deploy to dev cluster

staging pipeline (triggered after dev):
  1. Pull myapp:abc1234 (already in ECR)
  2. Run E2E tests against staging
  3. Tag as myapp:staging-latest (for reference)

production pipeline (manual trigger after staging approval):
  1. Pull same myapp:abc1234
  2. Deploy to production cluster
  3. Tag as myapp:prod-latest
  4. Create Git tag v1.2.3
```

### GitLab Package Registry / Nexus / Artifactory

```text
GitLab Package Registry:
  - Built into self-hosted GitLab
  - Supports npm, Maven, NuGet, PyPI, Conan, Helm, Terraform modules
  - Use for: internal packages shared between projects

Nexus Repository Manager:
  - Self-hosted artifact repository
  - Proxy upstream registries (npm, Maven Central, Docker Hub)
  - Reduces external dependency, faster builds (local cache)
  - Supports all package types + Docker images

Artifactory (JFrog):
  - Enterprise artifact management
  - Similar to Nexus but more features
  - Virtual repositories, build info, license scanning
  - Used in large enterprises with strict compliance

‼️ For most teams: GitLab Container Registry for Docker images +
   GitLab Package Registry for npm packages + ECR for production images.
```

---

# Part 4 — GitOps & Deployment

---

## 31. GitOps Principles

### What GitOps is

```text
‼️ GitOps = Git is the single source of truth for infrastructure and application state.

Core principles:
  1. Declarative desired state (YAML manifests in Git)
  2. Versioned and immutable (Git history = audit log)
  3. Pulled automatically (controller syncs from Git, not pushed by CI)
  4. Continuously reconciled (drift is automatically corrected)

PUSH-BASED deployment (traditional CI/CD):
  CI pipeline → kubectl apply → cluster
  ✗ Requires cluster credentials in CI
  ✗ No drift detection
  ✗ No audit trail of what's deployed

PULL-BASED deployment (GitOps):
  Developer pushes to Git → ArgoCD watches Git repo → ArgoCD syncs to cluster
  ✓ Cluster credentials stay in-cluster (more secure)
  ✓ Continuous reconciliation (if someone manually changes something, ArgoCD reverts it)
  ✓ Complete audit trail (Git log = deployment history)
  ✓ Easy rollback (git revert → ArgoCD syncs previous state)
```

### GitOps repository structure

```text
‼️ Two-repo model (recommended):
  Repo 1: Application code (source code, Dockerfile, tests)
  Repo 2: Deployment manifests (Helm values, Kustomize overlays, ArgoCD apps)

Why separate repos:
  - Decouple application changes from deployment changes
  - Different access controls (devs vs. platform team)
  - CI pipeline updates image tag in deploy repo → ArgoCD picks it up
  - Avoids infinite CI loops (code change → CI → update manifest → CI → ...)

Deploy repo structure:
  deploy-manifests/
    apps/
      api/
        base/
          deployment.yaml
          service.yaml
          kustomization.yaml
        overlays/
          dev/
            kustomization.yaml
            values.yaml
          staging/
            kustomization.yaml
            values.yaml
          production/
            kustomization.yaml
            values.yaml
      web/
        base/
        overlays/
    argocd/
      applications/
        api-dev.yaml
        api-staging.yaml
        api-production.yaml
```

---

## 32. ArgoCD

### Architecture

```text
‼️ ArgoCD = declarative GitOps continuous delivery tool for Kubernetes.

Components:
  API Server:          Web UI + REST/gRPC API
  Repo Server:         Clones Git repos, generates K8s manifests
  Application Controller: Watches apps, compares desired vs live state, syncs
  Redis:               Caching
  Dex:                 SSO/OIDC authentication

How it works:
  1. ArgoCD watches a Git repo (deploy-manifests)
  2. On change detection (or periodic poll), it renders manifests
  3. Compares rendered manifests with live K8s state
  4. Shows diff — synced, out-of-sync, degraded, healthy
  5. Auto-sync (or manual sync) applies changes to cluster
```

### Application CRD

```yaml
# ArgoCD Application — defines what to deploy and where
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default

  source:
    repoURL: https://gitlab.company.com/platform/deploy-manifests.git
    targetRevision: main                    # branch to track
    path: apps/api/overlays/production      # path within repo

    # If using Helm:
    # helm:
    #   valueFiles:
    #     - values-production.yaml
    #   parameters:
    #     - name: image.tag
    #       value: abc1234

  destination:
    server: https://kubernetes.default.svc   # in-cluster
    namespace: production

  syncPolicy:
    automated:
      prune: true                           # delete resources removed from Git
      selfHeal: true                        # revert manual changes
      allowEmpty: false                     # prevent accidental deletion of all
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true                      # delete old resources last
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### App-of-apps pattern

```yaml
# ‼️ App-of-apps: one "root" Application that manages other Applications.
# Single entry point that deploys all services.

# argocd/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://gitlab.company.com/platform/deploy-manifests.git
    targetRevision: main
    path: argocd/applications              # directory containing Application YAMLs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

# argocd/applications/ contains:
#   api-dev.yaml
#   api-staging.yaml
#   api-production.yaml
#   web-dev.yaml
#   web-staging.yaml
#   web-production.yaml
#   monitoring.yaml
#   cert-manager.yaml

# ‼️ Adding a new service = adding a new Application YAML → ArgoCD deploys it
```

### ApplicationSets — dynamic application generation

```yaml
# ‼️ ApplicationSet generates multiple Applications from a template.
# Useful for: multi-cluster, multi-environment, many microservices.

apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: api-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            cluster: dev-cluster
            namespace: dev
          - env: staging
            cluster: staging-cluster
            namespace: staging
          - env: production
            cluster: production-cluster
            namespace: production
  template:
    metadata:
      name: 'api-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://gitlab.company.com/platform/deploy-manifests.git
        targetRevision: main
        path: 'apps/api/overlays/{{env}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### ArgoCD rollbacks and notifications

```bash
# Rollback via CLI
argocd app rollback api-production
argocd app history api-production         # see sync history
argocd app get api-production             # current status

# Rollback via Git (preferred — keeps Git as source of truth)
git revert HEAD                           # revert the last commit in deploy repo
git push                                  # ArgoCD picks up the revert automatically
```

```yaml
# ArgoCD Notifications — alert on sync status changes
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-failed: |
    - when: app.status.sync.status == 'OutOfSync' and app.status.operationState.phase == 'Failed'
      send: [slack-notification]
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [slack-notification]
  template.slack-notification: |
    message: |
      App {{.app.metadata.name}} sync {{.app.status.operationState.phase}}.
      {{.app.status.operationState.message}}
  service.slack: |
    token: $slack-token
    channel: deployments
```

---

## 33. Helm Charts — Deep Dive

### What Helm is

```text
Helm = package manager for Kubernetes (like npm for Node.js, apt for Ubuntu).

Chart:   a package of Kubernetes YAML templates + default values.
Release: an instance of a chart installed in the cluster.
Values:  configuration that overrides chart defaults.

Without Helm: manage 20 YAML files manually for one app.
With Helm:    helm install my-app ./charts/my-app -f production-values.yaml
```

### Chart structure

```text
my-chart/
  Chart.yaml          — chart metadata (name, version, description, dependencies)
  values.yaml         — default values
  templates/          — Kubernetes YAML templates (Go templating)
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
    hpa.yaml
    _helpers.tpl      — reusable template snippets
    NOTES.txt         — post-install message
  charts/             — chart dependencies (sub-charts)
  .helmignore         — files to ignore during packaging
```

### Chart.yaml

```yaml
apiVersion: v2
name: api
description: API service Helm chart
type: application           # application or library
version: 1.2.3              # chart version (semver)
appVersion: "abc1234"       # version of the app being deployed

dependencies:
  - name: postgresql
    version: "13.2.1"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled       # optionally skip dependency
  - name: redis
    version: "18.3.2"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

### Template examples

```yaml
# templates/deployment.yaml — Go template syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels:
    {{- include "api.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "api.selectorLabels" . | nindent 8 }}
      annotations:
        # ‼️ Force rollout when ConfigMap changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      serviceAccountName: {{ include "api.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.containerPort }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          {{- if .Values.envFromSecret }}
          envFrom:
            - secretRef:
                name: {{ .Values.envFromSecret }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path }}
              port: http
            initialDelaySeconds: {{ .Values.healthCheck.initialDelay }}
          readinessProbe:
            httpGet:
              path: {{ .Values.readinessCheck.path | default .Values.healthCheck.path }}
              port: http

# templates/_helpers.tpl — reusable template snippets
{{- define "api.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "api.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "api.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "api.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "api.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

### Values files for different environments

```yaml
# values.yaml (defaults)
replicaCount: 1
image:
  repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/api
  tag: "latest"
  pullPolicy: IfNotPresent
containerPort: 3000
env:
  NODE_ENV: development
  LOG_LEVEL: debug
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
healthCheck:
  path: /health
  initialDelay: 5
autoscaling:
  enabled: false
serviceAccount:
  create: true

# values-production.yaml (production overrides)
replicaCount: 3
image:
  tag: "abc1234"       # specific commit SHA
  pullPolicy: Always
env:
  NODE_ENV: production
  LOG_LEVEL: info
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
envFromSecret: api-production-secrets
```

### Helm commands

```bash
# Install a chart from a repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install my-postgres bitnami/postgresql \
  --namespace production \
  --set auth.postgresPassword=secret \
  --set primary.persistence.size=50Gi

# Install with a values file
helm install my-app ./my-chart -f values.prod.yaml

# Upgrade (update an existing release)
helm upgrade my-app ./my-chart -f values.prod.yaml

# Install or upgrade (idempotent)
helm upgrade --install my-app ./my-chart -f values.prod.yaml

# Rollback
helm rollback my-app 1           # roll back to revision 1
helm history my-app              # see release history

# Dry run — see what would be applied without applying
helm install my-app ./my-chart --dry-run --debug

# Render templates locally
helm template my-app ./my-chart -f values.prod.yaml

# Show differences before upgrade (requires helm-diff plugin)
helm diff upgrade my-app ./my-chart -f values.prod.yaml
```

### Helmfile — manage multiple charts

```yaml
# helmfile.yaml — declarative Helm release management
repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
  - name: prometheus-community
    url: https://prometheus-community.github.io/helm-charts

environments:
  dev:
    values:
      - environments/dev/values.yaml
  production:
    values:
      - environments/production/values.yaml

releases:
  - name: api
    namespace: {{ .Environment.Name }}
    chart: ./charts/api
    values:
      - values/api/common.yaml
      - values/api/{{ .Environment.Name }}.yaml

  - name: prometheus
    namespace: monitoring
    chart: prometheus-community/kube-prometheus-stack
    version: 55.0.0
    values:
      - values/monitoring/prometheus.yaml

  - name: postgresql
    namespace: {{ .Environment.Name }}
    chart: bitnami/postgresql
    version: 13.2.1
    values:
      - values/postgresql/{{ .Environment.Name }}.yaml
    condition: postgresql.enabled
```

```bash
# Helmfile commands
helmfile -e production diff     # show what would change
helmfile -e production sync     # apply all releases
helmfile -e production destroy  # remove all releases
```

---

## 34. Kustomize

### What Kustomize is

```text
‼️ Kustomize = template-free YAML customization tool built into kubectl.
   Instead of Go templates (Helm), it uses overlays and patches.

vs Helm:
  - No template syntax — plain YAML files
  - No chart packaging needed
  - Built into kubectl (kubectl apply -k)
  - Patches and overlays for environment differences
  - Simpler for small projects, more limited for complex ones

Use Kustomize when:
  - You want plain K8s YAML without templating
  - Simple environment overrides (change replicas, images, resources)
  - You don't need chart packaging or Helm's ecosystem

Use Helm when:
  - Complex templating needed (loops, conditionals)
  - You want to share charts as packages
  - You need chart dependencies
  - Public chart ecosystem (bitnami, etc.)
```

### Kustomize structure

```text
apps/api/
  base/
    kustomization.yaml       # list of resources
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml     # patches for dev
      replicas-patch.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml     # patches for production
      hpa.yaml
      resources-patch.yaml
```

### Base and overlays

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
commonLabels:
  app: api

# base/deployment.yaml — plain K8s YAML, no templates
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1
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
          image: myapp:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base                    # include base resources
  - hpa.yaml                     # add HPA (only in production)

namespace: production             # set namespace for all resources

images:
  - name: myapp                  # ‼️ override image tag without patching
    newName: 123456789012.dkr.ecr.us-east-1.amazonaws.com/api
    newTag: abc1234

replicas:
  - name: api
    count: 3

patches:
  - target:
      kind: Deployment
      name: api
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi

configMapGenerator:
  - name: api-config
    literals:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

```bash
# Apply with Kustomize
kubectl apply -k overlays/production/

# Preview what would be applied
kubectl kustomize overlays/production/

# ArgoCD supports Kustomize natively — just point source.path to the overlay
```

---

## 35. Deployment Strategies Deep Dive

### Rolling updates — maxSurge/maxUnavailable

```yaml
# Fine-tuning rolling update behavior
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # maxSurge: how many EXTRA pods can exist during update
      maxSurge: 25%         # 25% of desired replicas (rounded up)
      # maxUnavailable: how many pods can be unavailable during update
      maxUnavailable: 0     # ‼️ zero = never fewer than desired, safest

# Fast rollout (more aggressive):
# maxSurge: 50%, maxUnavailable: 25%
# → up to 50% extra pods, up to 25% can be down simultaneously

# Slow/safe rollout:
# maxSurge: 1, maxUnavailable: 0
# → one new pod at a time, never fewer than desired
```

### Canary with Argo Rollouts

```yaml
# ‼️ Argo Rollouts = Kubernetes controller for advanced deployment strategies.
#    Replaces Deployment with Rollout CRD.

apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api
spec:
  replicas: 10
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
          image: myapp:1.2.3
          ports:
            - containerPort: 3000
  strategy:
    canary:
      steps:
        - setWeight: 5              # 5% traffic to canary
        - pause: { duration: 5m }   # wait 5 minutes
        - analysis:                 # run automated analysis
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: api
        - setWeight: 25             # increase to 25%
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100            # full rollout

      # Traffic routing (requires service mesh or ingress controller)
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        nginx:
          stableIngress: api-ingress

      # Auto-rollback on failure
      abortScaleDownDelaySeconds: 30

---
# AnalysisTemplate — automated rollback based on metrics
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      successCondition: result[0] >= 0.95    # 95% success rate required
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"2.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

### Blue-Green with Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    # ... pod template
  strategy:
    blueGreen:
      activeService: api-active          # current production
      previewService: api-preview        # new version (preview)
      autoPromotionEnabled: false        # require manual promotion
      scaleDownDelaySeconds: 600         # keep old version for 10 min after switch
      prePromotionAnalysis:
        templates:
          - templateName: smoke-test
        args:
          - name: preview-url
            value: http://api-preview.production.svc.cluster.local
```

### Progressive delivery — traffic splitting

```text
‼️ Progressive delivery = automated, metric-driven rollout.

Workflow:
  1. Deploy canary (5% traffic)
  2. Automated analysis runs (Prometheus metrics)
     - Check error rate < 1%
     - Check p99 latency < 500ms
     - Check business metrics (conversion rate, etc.)
  3. If healthy → increase traffic (25%, 50%, 100%)
  4. If unhealthy → automatic rollback

Tools:
  - Argo Rollouts (most popular for K8s)
  - Flagger (works with Istio, Linkerd, NGINX, Gloo)
  - Istio VirtualService (manual traffic splitting)
```

---

## 36. Database Migrations in CI/CD

### Migration strategy

```text
‼️ The most dangerous part of deployment: schema changes.

Safe migration pattern (expand-contract / three-phase):
  Phase 1 (Expand):
    - Add new nullable column / index / table
    - Deploy new code that can write to both old and new structure
    - Both old and new code work during rollout

  Phase 2 (Migrate):
    - Backfill data in new column
    - Run as background job or maintenance task

  Phase 3 (Contract):
    - Drop old column / constraint
    - Only safe once 100% of traffic uses new code

  ✗ Never drop or rename columns in the same deployment as code that relies on them.
    Old instances still running will crash immediately.
```

### Zero-downtime migration in practice

```text
Deploy N: current code + no new column
Deploy N+1: run migration (add column nullable) THEN deploy code
Deploy N+2: code writes to both columns
Deploy N+3: backfill + add constraint
Deploy N+4: drop old column
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

### Migration tools — Flyway and Liquibase

```text
FLYWAY:
  - SQL-based migrations (V1__create_users.sql, V2__add_email.sql)
  - Versioned migrations run in order
  - Tracks applied migrations in a schema_version table
  - Simple, convention-based
  - Best for: teams that write raw SQL migrations

LIQUIBASE:
  - Supports SQL, YAML, XML, JSON for change definitions
  - Changelog-based (changes tracked in a changelog file)
  - Supports rollback commands per changeset
  - More complex but more features
  - Best for: teams needing formal change management

DRIZZLE/PRISMA (Node.js ecosystem):
  - Generate migrations from schema changes
  - drizzle-kit generate → creates SQL migration files
  - prisma migrate deploy → runs pending migrations
  - Best for: Node.js/TypeScript projects

‼️ In CI pipeline:
  1. Run migrations BEFORE deploying new code
  2. Migration must be compatible with BOTH old and new code
  3. If migration fails → pipeline stops → old code keeps running
  4. Never run destructive migrations (DROP COLUMN) in the same deploy as the code change
```

### Running migrations in GitLab CI

```yaml
# .gitlab-ci.yml
migrate:
  stage: deploy-staging
  image: myapp:$CI_COMMIT_SHORT_SHA
  script:
    - npm run db:migrate
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  # ‼️ This job runs BEFORE the deploy job
  # ‼️ If migration fails, deploy job is skipped (old code stays running)

deploy_staging:
  stage: deploy-staging
  needs: [migrate]
  script:
    - kubectl set image deployment/api api=$IMAGE:$CI_COMMIT_SHORT_SHA
```

### Schema versioning

```text
‼️ Schema versioning best practices:

1. Every migration is a forward-only script (V001, V002, V003...)
2. Never edit an applied migration — create a new one
3. Migrations are idempotent where possible (IF NOT EXISTS)
4. Test migrations on a copy of production data
5. Large data migrations run as background jobs, not in-line

Example migration naming:
  V001__create_users_table.sql
  V002__add_email_to_users.sql
  V003__create_orders_table.sql
  V004__add_user_id_to_orders.sql
  V005__add_index_orders_user_id.sql
```

---

## 37. Secrets Management — Vault, AWS Secrets Manager, External Secrets

### Never do this

```bash
# ✗ Secrets in code
const secret = 'super-secret-key-12345';

# ✗ Secrets committed to git
echo "JWT_SECRET=abc123" >> .env
git add .env  # .env in .gitignore! But even once committed = compromised forever

# ✗ Secrets in CI logs
echo "Password: $DB_PASSWORD"  # printed in build logs

# ✗ Secrets baked into Docker images
RUN export API_KEY=secret123 && npm run build
# The secret is in the image layer history FOREVER
```

### HashiCorp Vault

```text
‼️ Vault is the enterprise standard for secrets management.

Architecture:
  - Centralized secret storage with access policies
  - API-driven — apps request secrets at runtime
  - Audit logging of all secret access
  - Encryption as a service (transit engine)
  - Dynamic secrets (generate DB credentials on-demand, auto-expire)

Key features:
  1. Static secrets: key-value store (like AWS Secrets Manager)
  2. Dynamic secrets: generate short-lived credentials on demand
     - Database: create temp DB user with specific permissions, auto-revoke
     - AWS: generate temporary IAM credentials
     - PKI: issue TLS certificates
  3. Transit engine: encrypt/decrypt without exposing encryption keys
     - App sends plaintext → Vault returns ciphertext
     - App never handles encryption keys directly
  4. Identity-based access: authenticate via K8s ServiceAccount, AWS IAM, LDAP

Vault + Kubernetes:
  - Vault Agent Sidecar: injects secrets into pods as files
  - Vault CSI Provider: mounts secrets via CSI volume driver
  - External Secrets Operator: syncs Vault secrets to K8s Secrets
```

```yaml
# Vault Agent Sidecar — inject secrets into pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "api-role"
        vault.hashicorp.com/agent-inject-secret-db: "secret/data/production/db"
        vault.hashicorp.com/agent-inject-template-db: |
          {{- with secret "secret/data/production/db" -}}
          export DB_PASSWORD="{{ .Data.data.password }}"
          export DB_HOST="{{ .Data.data.host }}"
          {{- end }}
    spec:
      serviceAccountName: api-sa
      containers:
        - name: api
          command: ["/bin/sh", "-c", "source /vault/secrets/db && node dist/server.js"]
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
// EKS pods use IRSA to assume a role that has permission to read the secret
```

### Secret rotation

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

### SOPS (Secrets OPerationS)

```text
‼️ SOPS encrypts YAML/JSON values in-place using AWS KMS, GCP KMS, or PGP.
   Encrypted files are safe to commit to Git.

# Encrypt
sops --encrypt --kms arn:aws:kms:us-east-1:123456:key/abc123 secrets.yaml > secrets.enc.yaml

# Decrypt
sops --decrypt secrets.enc.yaml > secrets.yaml

# Edit in-place (decrypts, opens editor, re-encrypts on save)
sops secrets.enc.yaml

# The encrypted file:
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
stringData:
  DB_PASSWORD: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
  JWT_SECRET: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456:key/abc123
  version: 3.8.1

# ‼️ Use with ArgoCD: install ksops plugin or argocd-vault-plugin
# ArgoCD decrypts SOPS files during sync
```

---

# Part 5 — QA & Testing in the Pipeline

---

## 38. QA Workflow for Large Projects

### Test pyramid in CI

```text
‼️ The test pyramid determines WHERE tests run in CI:

                     ╱╲
                    ╱  ╲         E2E / UI Tests
                   ╱ FEW╲        (slow, fragile, expensive)
                  ╱──────╲       Run: post-deploy to staging
                 ╱        ╲
                ╱  SOME    ╲     Integration Tests
               ╱────────────╲    (medium speed, test real dependencies)
              ╱              ╲   Run: CI pipeline, needs services
             ╱    MANY        ╲  Unit Tests
            ╱──────────────────╲ (fast, isolated, cheap)
           ╱                    ╲ Run: CI pipeline, no dependencies
          ╱────────────────────────╲

Placement in GitLab CI:
  Stage: validate     → lint, type-check (seconds)
  Stage: test         → unit tests (seconds-minutes)
  Stage: test         → integration tests with services (minutes)
  Stage: build        → Docker build + push
  Stage: deploy-stg   → deploy to staging
  Stage: e2e          → E2E tests against staging
  Stage: deploy-prod  → deploy to production
```

### Test environments

```text
‼️ Environment types for large projects:

1. LOCAL (developer machine):
   docker compose up — runs full stack locally
   Fast iteration, hot reload, debugger attached

2. EPHEMERAL / PREVIEW (per merge request):
   Spin up a full environment for each MR
   URL: https://feature-xyz.preview.example.com
   Auto-destroy when MR is merged/closed
   ‼️ Best for testing full-stack changes before merging

3. DEV (shared development):
   Always running, updated on every push to develop
   Used for: integration testing between services
   Reset nightly (fresh data)

4. STAGING (pre-production):
   Mirror of production (same config, same data volume)
   Updated on every push to main
   Used for: E2E tests, performance tests, QA sign-off
   ‼️ Must be as close to production as possible

5. PRODUCTION:
   Deployed after staging validation + manual approval
   Feature flags control feature visibility
```

### Preview environments per MR in GitLab

```yaml
# .gitlab-ci.yml — preview environment
deploy_preview:
  stage: deploy
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.preview.example.com
    on_stop: stop_preview
    auto_stop_in: 3 days
  script:
    # Deploy to a dedicated namespace in the dev cluster
    - export NAMESPACE="preview-${CI_COMMIT_REF_SLUG}"
    - kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    - helm upgrade --install preview-$CI_COMMIT_REF_SLUG ./chart
        --namespace $NAMESPACE
        --set image.tag=$CI_COMMIT_SHORT_SHA
        --set ingress.host=$CI_COMMIT_REF_SLUG.preview.example.com
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

stop_preview:
  stage: deploy
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  script:
    - kubectl delete namespace preview-${CI_COMMIT_REF_SLUG}
  when: manual
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: manual
```

### Test data management

```text
‼️ Test data strategies:

1. Fixtures / Seed data:
   - Predefined datasets loaded before tests
   - Deterministic, fast, version-controlled
   - Risk: drift from production data patterns

2. Anonymized production data:
   - Copy of production DB with PII removed/hashed
   - Most realistic
   - ‼️ NEVER use raw production data in non-prod (GDPR/HIPAA)

3. Factory pattern:
   - Generate test data programmatically (Faker, factories)
   - Create exactly what each test needs
   - Best for unit and integration tests

4. Database snapshots:
   - RDS snapshots restored to test environments
   - Pre-migrations applied
   - Good for staging environments

5. Test containers:
   - Spin up real databases (Postgres, Redis) per test suite
   - Each test gets a fresh database
   - Testcontainers library handles lifecycle
```

---

## 39. Testing Stages

### Linting and static analysis

```yaml
# .gitlab-ci.yml — static analysis
lint:
  stage: validate
  script:
    - npm run lint               # ESLint
    - npm run type-check         # tsc --noEmit

hadolint:
  stage: validate
  image: hadolint/hadolint:latest
  script:
    - hadolint Dockerfile
    # ‼️ Hadolint lints Dockerfiles for best practices
    # Catches: missing USER instruction, unpinned versions, shell form CMD

sonarqube:
  stage: validate
  image: sonarsource/sonar-scanner-cli:latest
  variables:
    SONAR_HOST_URL: https://sonar.company.com
    SONAR_TOKEN: $SONAR_TOKEN
  script:
    - sonar-scanner
        -Dsonar.projectKey=$CI_PROJECT_NAME
        -Dsonar.sources=src
        -Dsonar.tests=test
        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
  # ‼️ SonarQube provides: code smells, bugs, vulnerabilities, coverage, duplication
  # Quality gate can block merge if thresholds not met
```

### Unit tests

```yaml
unit_test:
  stage: test
  script:
    - npm ci
    - npm run test:unit -- --reporter=junit --outputFile=junit.xml
  artifacts:
    reports:
      junit: junit.xml
    when: always
  # ‼️ Unit tests should:
  #   - Run in < 2 minutes
  #   - Not require any external services
  #   - Mock all dependencies
  #   - Cover business logic thoroughly
```

### Integration tests (with testcontainers)

```yaml
integration_test:
  stage: test
  services:
    - postgres:16-alpine
    - redis:7-alpine
  variables:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/testdb
    REDIS_URL: redis://redis:6379
    POSTGRES_DB: testdb
    POSTGRES_PASSWORD: postgres
  script:
    - npm ci
    - npm run db:migrate
    - npm run test:integration
  artifacts:
    reports:
      junit: junit-integration.xml
    when: always
```

```ts
// Using testcontainers for integration tests (Node.js)
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('User repository', () => {
  let container;
  let db;

  beforeAll(async () => {
    // Spin up a real Postgres container for the test suite
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('testdb')
      .start();

    db = createConnection(container.getConnectionUri());
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.close();
    await container.stop();
  });

  it('should create a user', async () => {
    const user = await userRepo.create({ name: 'Alice', email: 'alice@test.com' });
    expect(user.id).toBeDefined();
  });
});
```

### Contract testing (Pact)

```text
‼️ Contract testing verifies that services can communicate correctly.
   Instead of full E2E: test the API contract between consumer and provider.

Consumer (frontend/client):
  - Generates a "pact" file: "I expect GET /users/1 to return { id, name, email }"
  - Test runs against a mock server

Provider (backend/API):
  - Verifies the pact: "Yes, GET /users/1 returns { id, name, email }"
  - Runs pact against the real API

If provider changes the response format → pact verification fails → caught in CI.
No need to deploy both services together to find the incompatibility.

Tools: Pact (most popular), Spring Cloud Contract
```

### Security scanning

```yaml
# SAST — Static Application Security Testing
sast:
  stage: test
  image: returntocorp/semgrep:latest
  script:
    - semgrep --config=auto --json -o semgrep-report.json src/
  artifacts:
    reports:
      sast: semgrep-report.json
    when: always

# DAST — Dynamic Application Security Testing (against running app)
dast:
  stage: e2e
  image: owasp/zap2docker-stable:latest
  script:
    - zap-baseline.py -t https://$CI_COMMIT_REF_SLUG.preview.example.com
        -J zap-report.json
  artifacts:
    paths:
      - zap-report.json
    when: always
  needs: [deploy_preview]

# SCA — Software Composition Analysis (dependency vulnerabilities)
dependency_scan:
  stage: test
  script:
    - npm audit --production --audit-level=high
    # Or: snyk test --severity-threshold=high
  allow_failure: true   # warn but don't block (many false positives)

# License compliance
license_scan:
  stage: test
  image: licensefinder/license_finder
  script:
    - license_finder --decisions-file=doc/dependency_decisions.yml
  # ‼️ Ensures no GPL/AGPL dependencies in proprietary software
```

### E2E tests (Playwright)

```yaml
e2e_test:
  stage: e2e
  image: mcr.microsoft.com/playwright:latest
  needs: [deploy_staging]
  script:
    - npm ci
    - npx playwright test --reporter=junit
  variables:
    BASE_URL: https://staging.example.com
  artifacts:
    reports:
      junit: playwright-results/results.xml
    paths:
      - playwright-report/              # HTML report with screenshots
    when: always
  retry:
    max: 2
    when: script_failure                  # retry flaky tests
```

---

## 40. Load & Performance Testing

### Load testing tools

```text
k6 (recommended):
  - Written in Go, scriptable in JavaScript
  - Fast, low overhead
  - Cloud and self-hosted options
  - Integrates with Grafana for visualization

Locust:
  - Python-based, distributed load testing
  - Web UI for real-time monitoring
  - Good for complex user flows

JMeter:
  - Java-based, GUI + CLI
  - Oldest, most feature-rich
  - Heavy resource usage
  - Good for: protocol-level testing (JDBC, LDAP, etc.)
```

### k6 load test example

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // ramp up to 50 users
    { duration: '5m', target: 50 },    // hold at 50 users
    { duration: '2m', target: 200 },   // ramp up to 200 users
    { duration: '5m', target: 200 },   // hold at 200 users
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // less than 1% failure rate
  },
};

export default function () {
  const res = http.get('https://staging.example.com/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Load testing in CI

```yaml
# .gitlab-ci.yml
load_test:
  stage: e2e
  image: grafana/k6:latest
  needs: [deploy_staging]
  script:
    - k6 run --out json=k6-results.json tests/load/api-load.js
  artifacts:
    paths:
      - k6-results.json
    when: always
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "schedule"   # run on nightly schedule
  allow_failure: true   # don't block deploy if thresholds are soft
```

### Chaos engineering

```text
‼️ Chaos engineering = intentionally break things to find weaknesses.

Tools:
  Litmus (open source, K8s native):
    - Pod kill, node drain, network loss, CPU stress
    - ChaosEngine CRD defines experiments
    - GameDay automation

  AWS Fault Injection Simulator (FIS):
    - Managed chaos engineering for AWS
    - EC2 instance termination, AZ failure simulation
    - EKS pod deletion, network disruption
    - Safe: automatic rollback conditions

  Chaos Monkey (Netflix):
    - Randomly terminates instances in production
    - Forces teams to build resilient systems

Start small:
  1. Kill a single pod → does the service stay up?
  2. Kill a node → do pods reschedule correctly?
  3. Inject network latency → does circuit breaker work?
  4. Simulate AZ failure → does multi-AZ work?
```

---

## 41. Quality Gates

### Blocking merge on test failure

```yaml
# GitLab merge request settings:
# Settings → Merge requests → "Pipelines must succeed"
# ‼️ Prevents merging if any required job fails

# Distinguish required vs optional jobs:
required_test:
  stage: test
  script: npm test
  allow_failure: false     # ‼️ BLOCKS merge if fails (default)

optional_scan:
  stage: test
  script: npm audit
  allow_failure: true      # warns but doesn't block merge
```

### Coverage thresholds

```yaml
# GitLab: enforce minimum coverage
unit_test:
  stage: test
  script:
    - npm run test:coverage
  coverage: '/All files\s+\|\s+(\d+\.?\d*)\s+\|/'
  # Settings → CI/CD → General pipelines → "Test coverage parsing"

# In vitest.config.ts or jest.config.ts:
# coverageThreshold: {
#   global: {
#     branches: 80,
#     functions: 80,
#     lines: 80,
#     statements: 80,
#   },
# }
# ‼️ Test runner exits with non-zero if coverage below threshold → pipeline fails
```

### SonarQube quality gates

```text
‼️ SonarQube quality gates define pass/fail criteria:

Default quality gate:
  - New code coverage > 80%
  - Duplicated lines on new code < 3%
  - No new bugs (reliability rating A)
  - No new vulnerabilities (security rating A)
  - No new code smells (maintainability rating A)
  - Security hotspots reviewed

Customize per project:
  - Different thresholds for different services
  - Stricter for payment/auth services
  - Relaxer for internal tools

Integration with GitLab:
  - SonarQube posts quality gate status to MR
  - Block merge if quality gate fails
  - Show code coverage diff in MR
```

### Security vulnerability thresholds

```yaml
# Block merge if critical/high vulnerabilities found
security_gate:
  stage: validate
  script:
    - trivy image --exit-code 1 --severity CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - snyk test --severity-threshold=high
  allow_failure: false
  # ‼️ Pipeline fails if ANY critical vulnerability exists
  # ‼️ High vulnerabilities also block (configurable per team policy)
```

---

# Part 6 — Observability & Production Operations

---

## 42. Observability Stack — The Three Pillars

```text
‼️ Observability = the ability to understand what's happening inside a system
   from its external outputs.

The three pillars:

1. METRICS — numeric measurements over time
   "What is happening?" "How fast?" "How much?"
   Examples: request rate, error rate, latency, CPU usage, queue depth
   Tools: Prometheus, CloudWatch, Datadog
   Use for: dashboards, alerting, capacity planning

2. LOGS — structured records of discrete events
   "What happened?" "Why did this request fail?"
   Examples: error messages, request details, audit trails
   Tools: Elasticsearch + Fluentd + Kibana (EFK), CloudWatch Logs
   Use for: debugging, auditing, troubleshooting

3. TRACES — request journey across services
   "Where is the bottleneck?" "Which service is slow?"
   Examples: request spans across API → DB → cache → external API
   Tools: Jaeger, AWS X-Ray, Zipkin, Tempo
   Use for: distributed debugging, latency analysis

‼️ OpenTelemetry (OTel) — vendor-neutral standard for all three pillars.
   Single SDK that produces metrics, logs, and traces.
   Send to any backend (Prometheus, Jaeger, Datadog, etc.)
```

### The Four Golden Signals (Google SRE)

```text
The Four Golden Signals:
  Latency:     p50, p95, p99 response times
  Traffic:     requests per second
  Errors:      error rate (4xx, 5xx)
  Saturation:  CPU %, memory %, DB connections, queue depth

‼️ Alert on SYMPTOMS (user-visible), not causes.
   Good: "Error rate > 1% for 5 minutes"
   Bad:  "CPU spike" (transient, often harmless)
```

---

## 43. Metrics & Monitoring — Prometheus, Grafana, CloudWatch

### Prometheus architecture

```text
‼️ Prometheus = open-source time-series database + monitoring system.

Architecture:
  Prometheus Server:     scrapes metrics from targets at regular intervals
  Targets:               apps expose /metrics endpoint (HTTP pull model)
  TSDB:                  built-in time-series database
  AlertManager:          evaluates alert rules, sends notifications
  Grafana:               visualization (dashboards)
  Exporters:             expose metrics from third-party systems
                         (node-exporter for OS, postgres-exporter for DB)

How it works:
  1. App exposes /metrics endpoint (text format)
  2. Prometheus scrapes /metrics every 15-30 seconds
  3. Data stored in TSDB (retention: typically 15-90 days)
  4. PromQL queries for dashboards and alerts
  5. AlertManager sends alerts to PagerDuty/Slack/email

On EKS:
  Install via kube-prometheus-stack Helm chart (includes Prometheus, Grafana, AlertManager,
  node-exporter, kube-state-metrics, and default dashboards/alerts)
```

### Custom application metrics (Node.js)

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

const requestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
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
  requestsTotal.inc({
    method: req.method,
    route: req.routerPath,
    status: reply.statusCode,
  });
  activeRequests.dec();
});

// Metrics endpoint (scraped by Prometheus)
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

### PromQL examples

```text
# Request rate (requests per second over 5 minutes)
rate(http_requests_total[5m])

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage per pod
container_memory_usage_bytes{namespace="production", container="api"}

# CPU usage per pod
rate(container_cpu_usage_seconds_total{namespace="production"}[5m])

# Pod restart count
increase(kube_pod_container_status_restarts_total{namespace="production"}[1h])
```

### Alerting rules

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-alerts
  namespace: monitoring
spec:
  groups:
    - name: api.rules
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5..", service="api"}[5m]))
            /
            sum(rate(http_requests_total{service="api"}[5m])) > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate on API"
            description: "Error rate is {{ $value | humanizePercentage }} (>1%) for 5 minutes"

        - alert: HighLatency
          expr: |
            histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="api"}[5m])) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High p99 latency on API"
            description: "p99 latency is {{ $value }}s (>500ms) for 10 minutes"

        - alert: PodCrashLooping
          expr: |
            increase(kube_pod_container_status_restarts_total{namespace="production"}[10m]) > 3
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.pod }} is crash-looping"
```

### Recording rules (pre-computed queries)

```yaml
# ‼️ Recording rules pre-compute expensive queries at scrape time.
# Saves query time on dashboards and alert evaluation.

groups:
  - name: api.recording_rules
    rules:
      - record: api:http_request_rate:5m
        expr: sum(rate(http_requests_total{service="api"}[5m])) by (method, route)

      - record: api:http_error_rate:5m
        expr: |
          sum(rate(http_requests_total{service="api", status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total{service="api"}[5m]))

      - record: api:http_latency_p99:5m
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="api"}[5m]))
```

### Grafana dashboards

```text
‼️ Grafana = visualization platform for metrics data.

Key dashboards for production:
  1. Service Overview:
     - Request rate, error rate, latency (p50, p95, p99)
     - Active pods, CPU/memory per pod
     - Latest deployment timestamp

  2. Infrastructure:
     - Node CPU, memory, disk, network
     - EKS cluster health
     - Pod scheduling failures

  3. Database:
     - Active connections, query latency
     - Replication lag, deadlocks
     - Disk usage, IOPS

  4. Business Metrics:
     - Users online, sign-ups, orders
     - Revenue, conversion rates

Grafana provisioning (Infrastructure as Code for dashboards):
  - Store dashboards as JSON in Git
  - Use ConfigMap to provision dashboards to Grafana
  - Or use Grafana Terraform provider
```

### CloudWatch integration

```text
‼️ CloudWatch for AWS-native metrics:
  - EKS control plane logs
  - EC2 instance metrics (CPU, network, disk)
  - RDS metrics (connections, IOPS, replication lag)
  - ALB metrics (request count, latency, 5xx count)
  - S3 metrics (bucket size, request count)

CloudWatch Container Insights:
  - Collects metrics from EKS (pod, node, cluster level)
  - Pre-built dashboards
  - Integrates with CloudWatch Alarms

‼️ Tradeoff: Prometheus is more powerful and cheaper for large clusters.
   CloudWatch is simpler and integrates with AWS services natively.
   Many teams use both: CloudWatch for AWS services, Prometheus for apps.
```

---

## 44. Logging — Centralized Logging, EFK, Structured Logging

### Centralized logging with EFK stack

```text
‼️ EFK = Elasticsearch + Fluentd/Fluent Bit + Kibana

Fluent Bit (lightweight) or Fluentd (full-featured):
  - Runs as DaemonSet on every node
  - Collects container stdout/stderr from /var/log/containers/
  - Parses, filters, enriches log entries
  - Forwards to Elasticsearch

Elasticsearch:
  - Stores and indexes log data
  - Full-text search across all logs
  - Retention policies (delete logs older than 30 days)

Kibana:
  - Web UI for searching and visualizing logs
  - Dashboards, filters, saved searches
  - Index patterns for different log sources

On AWS:
  - Use Amazon OpenSearch (managed Elasticsearch + Kibana)
  - Or CloudWatch Logs (simpler, less powerful)
  - Fluent Bit → OpenSearch / CloudWatch Logs
```

### Fluent Bit DaemonSet on EKS

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: containerlog
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 50m
              memory: 100Mi
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: containerlog
          hostPath:
            path: /var/lib/docker/containers
        - name: config
          configMap:
            name: fluent-bit-config
```

### Structured logging

```text
‼️ Always use structured logging (JSON) in production.

Unstructured (bad):
  console.log("User 123 created order 456 for $99.99")

Structured (good):
  logger.info("Order created", {
    userId: 123,
    orderId: 456,
    amount: 99.99,
    currency: "USD",
    traceId: req.headers["x-trace-id"]
  })

Output:
  {"level":"info","msg":"Order created","userId":123,"orderId":456,
   "amount":99.99,"currency":"USD","traceId":"abc123","timestamp":"2024-01-15T10:30:00Z"}

Benefits:
  - Machine-parseable (Elasticsearch can index fields)
  - Filter by field: userId=123, level=error
  - Aggregate: count errors per endpoint
  - Correlate: filter by traceId across all services
```

### Log levels

```text
‼️ Log levels (from most to least verbose):

TRACE:   extremely detailed (framework internals, every function call)
         Almost never used in production.

DEBUG:   detailed information for debugging
         OFF in production (too noisy, too much volume)

INFO:    normal operational messages
         "Server started on port 3000", "User logged in", "Order created"

WARN:    potential issues that aren't failures yet
         "Retrying request", "Disk usage at 80%", "Deprecated API used"

ERROR:   failures that need attention
         "Database connection failed", "Payment processing error"

FATAL:   application cannot continue
         "Cannot bind to port", "Missing required config"

‼️ Production default: INFO
‼️ Debugging production issue: temporarily set to DEBUG for the affected service
‼️ Never log PII (names, emails, SSNs) or secrets (passwords, tokens)
```

### Correlation IDs

```text
‼️ Correlation ID = a unique ID attached to every request as it flows through services.
   Essential for debugging in microservices.

How it works:
  1. Ingress/API Gateway generates a unique ID (or uses X-Request-Id header)
  2. Every service includes this ID in all logs
  3. When a request fails, search logs by correlation ID
  4. See the complete request journey across all services

Implementation:
  - Middleware: extract or generate X-Request-Id
  - Pass to all downstream service calls
  - Include in every log entry
  - Include in error responses (for support tickets)
```

```ts
// Express middleware for correlation IDs
import { v4 as uuid } from 'uuid';

app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || uuid();
  res.setHeader('x-request-id', req.correlationId);

  // Attach to logger context
  req.log = logger.child({ correlationId: req.correlationId });
  next();
});

// All subsequent logs include correlationId automatically
req.log.info('Processing order', { orderId: 456 });
// Output: {"correlationId":"abc-123","msg":"Processing order","orderId":456}
```

---

## 45. Distributed Tracing — Jaeger, X-Ray, OpenTelemetry

### How distributed tracing works

```text
‼️ A trace represents a single request's journey across services.

Trace:
  A complete request lifecycle (from ingress to response)
  Identified by a unique Trace ID

Span:
  A single operation within a trace (one service call, one DB query)
  Has: start time, duration, status, attributes, parent span

Example trace:
  Trace ID: abc-123
  ├── Span: API Gateway (2ms)
  │   ├── Span: Auth Service (5ms)
  │   │   └── Span: Redis CACHE GET (1ms)
  │   ├── Span: Order Service (50ms)
  │   │   ├── Span: PostgreSQL INSERT (10ms)
  │   │   ├── Span: Payment Service HTTP (30ms)
  │   │   │   └── Span: Stripe API (25ms)
  │   │   └── Span: SQS SendMessage (5ms)
  │   └── Span: Email Service (async, 100ms)

When investigating latency:
  - Sort spans by duration
  - See exactly which service/operation is slow
  - See if calls are sequential vs parallel
```

### OpenTelemetry SDK

```ts
// OpenTelemetry auto-instrumentation for Node.js
// tracing.ts — import BEFORE anything else

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
    }),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument: HTTP, Express, Fastify, pg, redis, etc.
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
  serviceName: 'api-service',
});

sdk.start();

// ‼️ Auto-instrumentation captures:
//    - All HTTP requests (inbound and outbound)
//    - Database queries (PostgreSQL, MySQL, MongoDB)
//    - Redis commands
//    - gRPC calls
//    - And propagates trace context automatically
```

### OpenTelemetry Collector on EKS

```yaml
# Deploy OTel Collector as a DaemonSet or Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          ports:
            - containerPort: 4317   # gRPC
            - containerPort: 4318   # HTTP
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

```yaml
# OTel Collector config
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 5s
        send_batch_size: 1024

    exporters:
      # Send traces to Jaeger
      jaeger:
        endpoint: jaeger-collector.observability:14250
        tls:
          insecure: true

      # Send metrics to Prometheus
      prometheus:
        endpoint: 0.0.0.0:8889

      # Send to AWS X-Ray
      awsxray:
        region: us-east-1

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [jaeger, awsxray]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [prometheus]
```

### AWS X-Ray

```text
‼️ X-Ray is AWS's native distributed tracing service.
   Best integration with AWS services (Lambda, API Gateway, ECS, EKS).

Use X-Ray when:
  - Deep AWS service integration needed (Lambda traces, DynamoDB latency)
  - You want a managed service (no self-hosting Jaeger/Tempo)
  - Your team already uses AWS tools

Use Jaeger/Tempo when:
  - Self-hosted, more control
  - Multi-cloud or hybrid
  - Tighter integration with Prometheus/Grafana

‼️ OTel Collector can export to BOTH (use awsxray exporter + jaeger exporter)
```

---

## 46. Alerting & On-Call

### Alert design principles

```text
‼️ Good alerts are actionable, relevant, and not noisy.

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
  ✗ Disk usage > 50% (too early, not actionable)

‼️ Every alert must have:
  1. A clear description of what is happening
  2. A runbook link with investigation steps
  3. An owner (team/person responsible)
  4. A severity level (determines response time)
```

### PagerDuty/Opsgenie integration

```text
Alerting flow:
  Prometheus AlertManager → PagerDuty/Opsgenie → On-call engineer

Alert routing:
  critical:   page immediately (phone call + push notification)
  warning:    create ticket, notify in Slack, don't page
  info:       log only, no notification

AlertManager config:
  route:
    receiver: 'default-slack'
    routes:
      - match:
          severity: critical
        receiver: 'pagerduty-critical'
        continue: true       # also send to Slack
      - match:
          severity: warning
        receiver: 'slack-warnings'

  receivers:
    - name: 'pagerduty-critical'
      pagerduty_configs:
        - service_key: '<pagerduty-integration-key>'
    - name: 'slack-warnings'
      slack_configs:
        - api_url: '<slack-webhook-url>'
          channel: '#alerts'
```

### SLOs, SLIs, and error budgets

```text
‼️ SLO/SLI framework — the foundation of reliability engineering.

SLI (Service Level Indicator):
  A specific metric that measures service quality.
  Examples:
    - Availability: % of successful requests (status < 500)
    - Latency: % of requests faster than 500ms
    - Throughput: requests per second

SLO (Service Level Objective):
  A target value for an SLI.
  Examples:
    - Availability SLO: 99.9% of requests succeed (allows 43 min downtime/month)
    - Latency SLO: 99% of requests complete in < 500ms

Error Budget:
  The allowed amount of unreliability.
  99.9% availability = 0.1% error budget = 43 minutes of downtime per month.
  
  ‼️ If error budget is consumed:
    - Freeze non-critical deployments
    - Focus on reliability improvements
    - No new features until budget recovers

  ‼️ If error budget is healthy:
    - Deploy faster, take more risks
    - Run chaos experiments
    - Ship new features

Common SLO targets:
  99.9%  (three nines)  = 8.76 hours downtime/year  = most web services
  99.95% (three and a half nines) = 4.38 hours/year  = critical services
  99.99% (four nines)   = 52.6 min/year              = payment systems
  99.999% (five nines)  = 5.26 min/year              = extremely rare
```

### Escalation policies

```text
‼️ Escalation ensures alerts don't go unnoticed.

Level 1 (0 min):    On-call primary engineer — phone call
Level 2 (15 min):   On-call secondary engineer — phone call
Level 3 (30 min):   Engineering manager — phone call
Level 4 (60 min):   VP of Engineering — phone call

On-call rotation:
  - Weekly rotation, 2 engineers per shift (primary + secondary)
  - Handoff meeting at rotation change
  - Compensation: extra pay or comp time
  - Reduce on-call burden: fewer, better alerts
```

### Runbooks

```text
‼️ Every alert MUST have a runbook. A runbook is a step-by-step guide
   for investigating and resolving an alert.

Runbook template:
  1. Alert description: what does this alert mean?
  2. Impact: what is affected? Who is impacted?
  3. Investigation steps:
     - Check dashboard: [link]
     - Check logs: [query]
     - Check recent deployments: [link]
  4. Remediation:
     - If caused by deployment: kubectl rollout undo
     - If caused by traffic spike: scale up pods
     - If caused by DB: check connections, restart if needed
  5. Escalation: who to contact if you can't resolve

Store runbooks:
  - In a wiki (Confluence, Notion)
  - Link from alert annotations
  - Keep up-to-date (review quarterly)
```

---

## 47. Service Mesh — Istio, App Mesh, Linkerd

### What a service mesh is

```text
‼️ A service mesh adds infrastructure-level features to service-to-service
   communication WITHOUT changing application code.

Features:
  - mTLS (mutual TLS): encrypt all traffic between services automatically
  - Traffic management: canary routing, traffic splitting, retries, timeouts
  - Observability: automatic metrics, traces, access logs for every request
  - Circuit breaking: prevent cascade failures
  - Rate limiting: per-service rate limits
  - Access control: fine-grained authorization policies

How it works:
  A sidecar proxy (Envoy) is injected into every pod.
  All traffic in/out of the pod goes through the proxy.
  The control plane configures all proxies centrally.

  Pod:
  ┌─────────────────────────────────┐
  │  ┌────────────┐  ┌───────────┐ │
  │  │ App        │←→│ Envoy     │←→ Network
  │  │ Container  │  │ Sidecar   │ │
  │  └────────────┘  └───────────┘ │
  └─────────────────────────────────┘
```

### Istio

```text
‼️ Istio = most feature-rich service mesh. CNCF project.

Architecture:
  istiod (control plane):
    - Pilot: configures Envoy proxies (traffic rules)
    - Citadel: manages certificates for mTLS
    - Galley: configuration validation

  Envoy (data plane):
    - Sidecar proxy in every pod
    - Handles all network traffic
    - Reports telemetry to control plane

Install on EKS:
  istioctl install --set profile=default
  kubectl label namespace production istio-injection=enabled
  # ‼️ Label the namespace → Istio auto-injects Envoy sidecar into all new pods
```

```yaml
# Istio VirtualService — traffic splitting for canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: stable
          weight: 95
        - destination:
            host: api-service
            subset: canary
          weight: 5
      retries:
        attempts: 3
        perTryTimeout: 2s
      timeout: 10s

---
# DestinationRule — define subsets + circuit breaking
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
    outlierDetection:                    # circuit breaker
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
```

### AWS App Mesh

```text
‼️ App Mesh = AWS-managed service mesh.

Pros:
  - Fully managed by AWS (no control plane to maintain)
  - Integrates with EKS, ECS, EC2
  - Uses Envoy as data plane (same as Istio)
  - Integrates with AWS X-Ray for tracing
  - Integrates with CloudWatch for metrics

Cons:
  - AWS-only (no multi-cloud)
  - Fewer features than Istio
  - Smaller community
  - ‼️ Less actively developed — AWS is investing more in VPC Lattice

‼️ For new projects on AWS: consider VPC Lattice (newer, simpler)
   For existing Istio users: Istio works fine on EKS
```

### Linkerd

```text
‼️ Linkerd = simplest service mesh. CNCF graduated project.

vs Istio:
  - Much simpler to install and operate
  - Lighter weight (Rust-based proxy instead of Envoy)
  - Fewer features but covers 90% of use cases
  - mTLS, observability, retries, timeouts
  - ‼️ No VirtualService-style traffic splitting (limited routing)

Install:
  curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
  linkerd install | kubectl apply -f -
  linkerd inject deployment.yaml | kubectl apply -f -

‼️ Choose Linkerd when:
  - You want mTLS + observability without Istio's complexity
  - Your team doesn't have dedicated service mesh expertise
  - You don't need advanced traffic management

‼️ Choose Istio when:
  - Complex traffic management (canary, fault injection, mirroring)
  - Multi-cluster service mesh
  - Advanced authorization policies
```

### When you actually need a service mesh

```text
‼️ You probably DON'T need a service mesh if:
  - You have < 10 services
  - You're not doing mTLS between services
  - You don't need per-service traffic policies
  - Your observability stack already works well
  - Your team is small (service mesh adds operational complexity)

You SHOULD consider a service mesh if:
  - 20+ microservices
  - Compliance requirement for encrypted in-transit traffic (mTLS)
  - Complex traffic routing (canary, A/B testing per service)
  - Need service-to-service authorization policies
  - Want zero-trust networking within the cluster

‼️ Start without a service mesh. Add one when the pain of NOT having one
   exceeds the operational overhead of maintaining one.
```

---

# Part 7 — Platform Engineering & Operations

---

## 48. Internal Developer Platform

### What a platform team does

```text
‼️ Platform engineering = building an internal developer platform (IDP)
   so that application developers can self-serve infrastructure.

Platform team responsibilities:
  - Maintain EKS clusters, networking, observability stack
  - Build CI/CD pipeline templates (reusable GitLab CI includes)
  - Manage Terraform modules for common infrastructure
  - Operate ArgoCD, Vault, service mesh
  - Define golden paths (opinionated, well-supported workflows)
  - Build developer portal (Backstage)
  - On-call for platform issues (not application issues)

‼️ The goal: developers focus on business logic, not infrastructure.
   "I need a new microservice" → create from template, CI/CD auto-configured,
   observability built-in, deployed to EKS within minutes.
```

### Backstage (developer portal)

```text
‼️ Backstage = open-source developer portal by Spotify.

Features:
  - Software catalog: all services, teams, APIs in one place
  - Templates: scaffold new services with best practices built-in
  - TechDocs: documentation as code (markdown in repos → rendered in Backstage)
  - Plugins: Kubernetes, ArgoCD, PagerDuty, Grafana, cost tracking

Software catalog:
  Each service has a catalog-info.yaml in its repo:
    apiVersion: backstage.io/v1alpha1
    kind: Component
    metadata:
      name: api-service
      description: Main API service
      annotations:
        backstage.io/kubernetes-id: api
        argocd/app-name: api-production
    spec:
      type: service
      owner: platform-team
      lifecycle: production
      system: order-platform
      dependsOn:
        - component:database
        - component:redis

Templates (golden paths):
  "Create a new Node.js microservice"
  → Scaffolds: repo, Dockerfile, Helm chart, GitLab CI, ArgoCD Application,
    Terraform for any AWS resources, monitoring dashboards
  → Developer just fills in service name + basic config
```

### Golden paths

```text
‼️ Golden paths = opinionated, pre-built, supported workflows.

Example golden path for a new microservice:
  1. Create from Backstage template
     → Git repo created with boilerplate
     → Dockerfile (multi-stage, security-hardened)
     → Helm chart (with health checks, resource limits, HPA)
     → .gitlab-ci.yml (lint, test, build, scan, deploy)
     → Terraform module for AWS resources (if needed)

  2. Push code → CI pipeline auto-runs
  3. Merge to main → ArgoCD auto-deploys to dev
  4. Promote to staging → E2E tests run
  5. Promote to production → manual approval

‼️ Golden paths are NOT enforced — teams CAN deviate.
   But following the golden path = full platform team support.
   Deviating = you own the operational burden.
```

### Reusable GitLab CI templates

```yaml
# templates/node-ci.yml — reusable CI template for Node.js services
# Include in any project:
# include:
#   - project: 'platform/ci-templates'
#     file: 'templates/node-ci.yml'

.node_base:
  image: node:20-alpine
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/

lint:
  extends: .node_base
  stage: validate
  script:
    - npm ci
    - npm run lint
    - npm run type-check

test:
  extends: .node_base
  stage: test
  script:
    - npm ci
    - npm run test:coverage
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

scan:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

---

## 49. Cost Optimization for Infrastructure

### Right-sizing

```text
‼️ Right-sizing = matching instance types to actual resource usage.

Step 1: Use VPA in recommendation mode
  kubectl get vpa api-vpa -o yaml
  # Shows: recommended CPU/memory based on actual usage over 7 days

Step 2: Set requests to recommended values
  # requests too high = wasted capacity (paying for unused resources)
  # requests too low = OOMKilled, CPU throttling

Step 3: Choose instance types to match
  # Compute-optimized (c5/c6i): CPU-heavy (API servers, data processing)
  # Memory-optimized (r5/r6i): memory-heavy (caches, databases)
  # General-purpose (m5/m6i): balanced (most workloads)
  # Burstable (t3): variable CPU usage, good for dev/staging
```

### Spot instances for non-prod

```text
‼️ Spot instances = up to 90% cheaper than on-demand, but can be interrupted.

Use spot for:
  ✓ CI/CD runners (jobs can retry)
  ✓ Dev/staging environments
  ✓ Batch processing / data pipelines
  ✓ Stateless microservices with proper PDB

Do NOT use spot for:
  ✗ Databases / stateful workloads
  ✗ Single-replica production services
  ✗ Long-running jobs that can't be interrupted

Karpenter handles spot gracefully:
  - Diversifies across instance types (lower interruption rate)
  - Automatically replaces interrupted instances
  - Moves pods to on-demand if spot unavailable
```

### FinOps dashboards

```text
‼️ FinOps = financial operations for cloud spending.

Tools:
  Kubecost (recommended for K8s):
    - Per-namespace, per-deployment, per-label cost breakdown
    - Identifies idle resources
    - Right-sizing recommendations
    - Cost allocation to teams

  AWS Cost Explorer:
    - Tag-based cost allocation
    - Reserved Instance recommendations
    - Savings Plan recommendations

  Infracost (Terraform):
    - Shows cost impact of Terraform changes BEFORE apply
    - Integrates with GitLab MR — posts cost diff as comment

Best practices:
  1. Tag everything (team, environment, service)
  2. Review costs weekly
  3. Set budget alerts (80%, 100% thresholds)
  4. Right-size quarterly
  5. Negotiate reserved capacity for stable workloads
```

---

## 50. Incident Response

### Incident classification

```text
‼️ Incident severity levels:

SEV1 (Critical):
  - Complete service outage
  - Data loss or security breach
  - All customers affected
  - Response time: immediate (page on-call)
  - Communication: every 15 minutes until resolved
  - Example: production database down, API returning 500 for all requests

SEV2 (High):
  - Major feature unavailable
  - Significant performance degradation
  - Many customers affected
  - Response time: 15 minutes
  - Communication: every 30 minutes
  - Example: payment processing failing, login broken

SEV3 (Medium):
  - Minor feature unavailable
  - Some customers affected
  - Workaround exists
  - Response time: 1 hour (business hours)
  - Example: report generation slow, non-critical API endpoint down

SEV4 (Low):
  - Cosmetic issues, minor bugs
  - Few customers affected
  - Response time: next business day
  - Example: typo in error message, dashboard showing wrong timezone
```

### Incident commander role

```text
‼️ The Incident Commander (IC) coordinates the response.

IC responsibilities:
  1. Assess severity and declare incident
  2. Create incident channel (Slack #incident-YYYY-MM-DD-description)
  3. Assign roles: IC, investigator(s), communicator
  4. Coordinate investigation (don't investigate yourself)
  5. Make decisions (rollback? scale up? fail over?)
  6. Ensure status updates are communicated
  7. Declare resolution
  8. Schedule postmortem

Communication template:
  "INCIDENT: [SEV1] API returning 500 for all requests
   Impact: All customers cannot access the platform
   Status: Investigating — last deploy was 30 min ago, checking rollback
   ETA: Unknown
   IC: @alice
   Channel: #incident-2024-01-15-api-outage"
```

### Blameless postmortems

```text
‼️ Every SEV1/SEV2 incident gets a postmortem within 48 hours.

Blameless = focus on SYSTEMS, not individuals.
"Why did the system allow this?" not "Who made the mistake?"

Postmortem template:
  1. Incident summary (what happened, duration, impact)
  2. Timeline (minute-by-minute sequence of events)
  3. Root cause analysis:
     - 5 Whys: keep asking "why" to find the root cause
       Why did the API go down? → Pods were OOMKilled
       Why were pods OOMKilled? → Memory limit too low
       Why was memory limit too low? → Not updated after adding caching
       Why wasn't it updated? → No process to review resource limits
       Why no process? → Missing from deployment checklist
     - Fishbone diagram: categorize potential causes
       (People, Process, Technology, Environment)
  4. Contributing factors (not just root cause)
  5. What went well (what worked in the response)
  6. What went poorly (what slowed down response)
  7. Action items:
     - Each has an OWNER and DEADLINE
     - Prioritize: prevent recurrence > improve detection > improve response
     - Track completion in project management tool

‼️ Action items must be tracked and completed.
   If the same incident happens again, the postmortem failed.
```

### RCA techniques

```text
5 Whys:
  Simple, effective for linear causation chains.
  Keep asking "why" until you reach a systemic/process issue.

Fishbone (Ishikawa) diagram:
  Brainstorm causes across categories:
  ┌──────────────────────────────────────┐
  │ People    Process    Technology       │
  │   │          │           │           │
  │   └──────────┼───────────┘           │
  │              │                       │
  │          INCIDENT                    │
  │              │                       │
  │   ┌──────────┼───────────┐           │
  │   │          │           │           │
  │ Environment  Data     External       │
  └──────────────────────────────────────┘

Fault tree analysis:
  For complex incidents with multiple contributing factors.
  Model as AND/OR gates: what combination of failures caused the incident?
```

---

## 51. End-to-End Workflow — Code to Production

### The complete flow

```text
‼️ This is the complete flow from code to production for a microservice
   on AWS EKS with self-hosted GitLab and ArgoCD.

┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                              │
│                                                                         │
│  1. Developer writes code locally                                       │
│     └── docker compose up (local dev with DB, Redis)                    │
│     └── writes tests, runs locally                                      │
│                                                                         │
│  2. Pushes to GitLab (feature branch)                                   │
│     └── Creates Merge Request                                           │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         MR PIPELINE (GitLab CI)                         │
│                                                                         │
│  3. Pipeline triggers automatically                                     │
│     ├── Stage: validate                                                 │
│     │   ├── lint (ESLint)                                               │
│     │   ├── type-check (tsc --noEmit)                                   │
│     │   └── hadolint (Dockerfile lint)                                   │
│     ├── Stage: test                                                     │
│     │   ├── unit tests (vitest)                                         │
│     │   └── integration tests (with Postgres + Redis services)          │
│     ├── Stage: build                                                    │
│     │   └── docker build → push to GitLab Registry (MR image)           │
│     ├── Stage: scan                                                     │
│     │   ├── trivy image scan (CVE check)                                │
│     │   ├── SonarQube analysis                                          │
│     │   └── SAST (semgrep)                                              │
│     └── Stage: preview                                                  │
│         └── deploy preview environment (optional)                       │
│                                                                         │
│  4. Code review by team members                                         │
│     └── Approve MR when tests pass + review complete                    │
│                                                                         │
│  5. Merge to main                                                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         MAIN PIPELINE (GitLab CI)                       │
│                                                                         │
│  6. Pipeline triggers on main branch                                    │
│     ├── Stage: test (full test suite)                                   │
│     ├── Stage: build                                                    │
│     │   ├── docker build (multi-stage, production target)               │
│     │   ├── push to ECR: myapp:<git-sha>                                │
│     │   └── push to ECR: myapp:latest                                   │
│     ├── Stage: scan                                                     │
│     │   └── trivy scan (block on CRITICAL)                              │
│     └── Stage: update-manifests                                         │
│         └── update Helm values in deploy-manifests repo:                │
│             image.tag: <git-sha>                                        │
│             (commits to deploy-manifests repo)                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         GITOPS (ArgoCD)                                 │
│                                                                         │
│  7. ArgoCD detects change in deploy-manifests repo                      │
│     ├── Renders Helm chart with new image tag                           │
│     ├── Compares with live state in EKS staging                         │
│     └── Auto-syncs to staging cluster                                   │
│         └── Rolling update: new pods with new image                     │
│                                                                         │
│  8. Staging validation                                                  │
│     ├── Automated E2E tests (Playwright against staging)                │
│     ├── QA team manually tests (if applicable)                          │
│     └── Performance tests (k6 load test)                                │
│                                                                         │
│  9. Promotion to production                                             │
│     ├── Manual approval in GitLab / ArgoCD                              │
│     ├── ArgoCD syncs to production cluster                              │
│     │   └── Rolling update (maxSurge: 1, maxUnavailable: 0)             │
│     └── Readiness probes gate traffic to new pods                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         POST-DEPLOY                                     │
│                                                                         │
│  10. Monitoring & alerting                                              │
│      ├── Prometheus scrapes new pods /metrics                           │
│      ├── Grafana dashboards show request rate, latency, errors          │
│      ├── AlertManager evaluates alert rules                             │
│      ├── Fluent Bit collects logs → OpenSearch                          │
│      └── OpenTelemetry traces flow through Jaeger                      │
│                                                                         │
│  11. If issues detected:                                                │
│      ├── Automatic: AlertManager pages on-call via PagerDuty            │
│      ├── Fast rollback: git revert in deploy-manifests                  │
│      │   └── ArgoCD auto-syncs previous version                         │
│      └── Or: kubectl rollout undo deployment/api                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### ASCII diagram — simplified flow

```text
                    ┌──────────────┐
                    │  Developer   │
                    │  writes code │
                    └──────┬───────┘
                           │ git push
                           ▼
                    ┌──────────────┐
                    │   GitLab     │
                    │   (repo)     │
                    └──────┬───────┘
                           │ MR created
                           ▼
              ┌────────────────────────┐
              │    GitLab CI Pipeline   │
              │  ┌────┐ ┌────┐ ┌─────┐ │
              │  │Lint│→│Test│→│Build│ │
              │  └────┘ └────┘ └──┬──┘ │
              │                   │    │
              │  ┌────┐      ┌───▼──┐ │
              │  │Scan│      │ Push  │ │
              │  │CVE │      │ ECR   │ │
              │  └────┘      └───┬──┘ │
              └──────────────────┼────┘
                                 │ update image tag
                                 ▼
                    ┌──────────────────┐
                    │ Deploy Manifests │
                    │ Git Repo (Helm)  │
                    └────────┬─────────┘
                             │ watched by
                             ▼
                    ┌──────────────────┐
                    │     ArgoCD       │
                    │   (GitOps)       │
                    └────────┬─────────┘
                             │ sync
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
           ┌──────────────┐   ┌──────────────┐
           │  EKS Staging  │   │ EKS Production│
           │   Cluster     │   │   Cluster     │
           └──────┬────────┘   └──────┬────────┘
                  │                   │
                  ▼                   ▼
           ┌──────────────┐   ┌──────────────┐
           │  Validate    │   │  Monitor     │
           │  E2E + QA    │   │  Prometheus  │
           │  Load test   │   │  Grafana     │
           └──────────────┘   │  Alerting    │
                              └──────────────┘
```

### Key files in the ecosystem

```text
APPLICATION REPO (services/api):
  src/                        — application source code
  test/                       — unit and integration tests
  Dockerfile                  — multi-stage build
  .dockerignore               — exclude unnecessary files
  .gitlab-ci.yml              — CI/CD pipeline
  package.json                — dependencies
  tsconfig.json               — TypeScript config

DEPLOY MANIFESTS REPO (platform/deploy-manifests):
  apps/
    api/
      Chart.yaml              — Helm chart metadata
      values.yaml             — default values
      values-staging.yaml     — staging overrides
      values-production.yaml  — production overrides
      templates/
        deployment.yaml       — Deployment template
        service.yaml          — Service template
        ingress.yaml          — Ingress template
        hpa.yaml              — HPA template
        configmap.yaml        — ConfigMap template
  argocd/
    applications/
      api-staging.yaml        — ArgoCD Application for staging
      api-production.yaml     — ArgoCD Application for production

INFRASTRUCTURE REPO (platform/infrastructure):
  modules/
    vpc/                      — Terraform VPC module
    eks/                      — Terraform EKS module
    rds/                      — Terraform RDS module
  environments/
    production/
      terragrunt.hcl          — Terragrunt config
      terraform.tfvars        — Environment variables
    staging/
    dev/
```

---

*This document is a living reference. Update it as your infrastructure evolves.*
