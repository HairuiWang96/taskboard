# Docker & Kubernetes — Senior Developer Deep Reference

**Priority: HIGH**

> Deep dive into Docker internals, Dockerfile optimization, networking, and full Kubernetes architecture — Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, RBAC, HPA, and production patterns.
> Complements DOCKER-CICD-MED-DEEP.md (CI/CD pipelines, GitHub Actions, compose basics).

---

## Table of Contents

**Docker**
1. [Docker Internals — How Containers Work](#1-docker-internals--how-containers-work)
2. [Dockerfile — Deep Optimization](#2-dockerfile--deep-optimization)
3. [Multi-Stage Builds](#3-multi-stage-builds)
4. [Docker Networking](#4-docker-networking)
5. [Docker Volumes & Storage](#5-docker-volumes--storage)
6. [Docker Security](#6-docker-security)

**Kubernetes**
7. [Kubernetes Architecture](#7-kubernetes-architecture)
8. [Core Objects — Pod, Deployment, ReplicaSet](#8-core-objects--pod-deployment-replicaset)
9. [Services & Networking](#9-services--networking)
10. [Ingress & Ingress Controllers](#10-ingress--ingress-controllers)
11. [ConfigMaps & Secrets](#11-configmaps--secrets)
12. [Persistent Storage](#12-persistent-storage)
13. [Resource Management & HPA](#13-resource-management--hpa)
14. [RBAC & Security](#14-rbac--security)
15. [Deployment Strategies in Kubernetes](#15-deployment-strategies-in-kubernetes)
16. [Probes — Liveness, Readiness, Startup](#16-probes--liveness-readiness-startup)
17. [Namespaces & Multi-tenancy](#17-namespaces--multi-tenancy)
18. [Helm — Package Manager for Kubernetes](#18-helm--package-manager-for-kubernetes)
19. [Common kubectl Commands](#19-common-kubectl-commands)
20. [Common Interview Questions](#20-common-interview-questions)

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

### A production-ready Node.js Dockerfile

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

## 3. Multi-Stage Builds

### Why multi-stage

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

---

## 4. Docker Networking

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

### Container DNS in compose

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

---

## 5. Docker Volumes & Storage

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

## 6. Docker Security

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

---

## 8. Core Objects — Pod, Deployment, ReplicaSet

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
      terminationGracePeriodSeconds: 30  # time to finish in-flight requests on shutdown
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

```yaml
# Ingress — routing rules
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /        # strip path prefix
    cert-manager.io/cluster-issuer: letsencrypt-prod     # auto TLS via cert-manager
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

---

## 12. Persistent Storage

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

### StatefulSets for databases

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
```

### Blue/Green deployment

```yaml
# Run two identical deployments, switch traffic instantly via Service selector
# Blue = current, Green = new version

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

```yaml
# Route a percentage of traffic to the new version
# Simplest approach: run both, adjust replica counts

# stable: 9 replicas (90% of traffic)
# canary: 1 replica  (10% of traffic)
# Both have label app: api — Service routes to both equally per-pod

# More precise: use Ingress annotations (nginx)
# nginx.ingress.kubernetes.io/canary: "true"
# nginx.ingress.kubernetes.io/canary-weight: "10"   # 10% to canary

# Best: use a service mesh (Istio, Linkerd) for fine-grained traffic splitting
# with VirtualService weight-based routing
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

---

## 17. Namespaces & Multi-tenancy

```text
Namespaces are a way to divide cluster resources between teams/environments.

Common namespace structure:
  default       — avoid using; kubectl commands default here
  kube-system   — Kubernetes system components (do not touch)
  kube-public   — publicly accessible (rarely used)
  production    — production workloads
  staging       — staging environment
  development   — dev workloads
  monitoring    — Prometheus, Grafana
  logging       — Fluentd, Elasticsearch

Namespaces provide:
  ✓ Resource quotas per namespace (ResourceQuota)
  ✓ RBAC scoped to namespace
  ✓ DNS scoping (services only reachable by short name within same namespace)
  ✗ NOT a security boundary — NetworkPolicies needed for network isolation
```

```bash
kubectl get pods -n production          # list pods in production namespace
kubectl apply -f deploy.yaml -n staging # apply to staging namespace
kubectl get all -n monitoring           # all resources in monitoring

# Set default namespace for current context
kubectl config set-context --current --namespace=production
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
```

---

## 18. Helm — Package Manager for Kubernetes

### What Helm is

```text
Helm = package manager for Kubernetes (like npm for Node.js, apt for Ubuntu).

Chart:   a package of Kubernetes YAML templates + default values.
Release: an instance of a chart installed in the cluster.
Values:  configuration that overrides chart defaults.

Without Helm: manage 20 YAML files manually for one app.
With Helm:    helm install my-app ./charts/my-app -f production-values.yaml
```

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

# Rollback
helm rollback my-app 1           # roll back to revision 1
helm history my-app              # see release history

# Dry run — see what would be applied without applying
helm install my-app ./my-chart --dry-run --debug

# Render templates locally
helm template my-app ./my-chart -f values.prod.yaml
```

### Chart structure

```text
my-chart/
  Chart.yaml          — chart metadata (name, version, description)
  values.yaml         — default values
  templates/          — Kubernetes YAML templates (Go templating)
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
    _helpers.tpl      — reusable template snippets
  charts/             — chart dependencies (sub-charts)
```

```yaml
# templates/deployment.yaml — Go template syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-api            # release name prefix
  labels:
    {{- include "mychart.labels" . | nindent 4 }}   # reusable helper
spec:
  replicas: {{ .Values.replicaCount }}     # from values.yaml
  template:
    spec:
      containers:
        - image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}  # inline YAML block

# values.yaml
replicaCount: 3
image:
  repository: myapp
  tag: "1.2.3"
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

---

## 19. Common kubectl Commands

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

## 20. Common Interview Questions

### "What is the difference between a container and a VM?"

```text
VM: full OS per instance, separate kernel, ~GBs RAM, minutes to start.
    Hypervisor virtualizes hardware. Strong isolation.

Container: shared host kernel, isolated via Linux namespaces + cgroups.
    Only app + its libs. ~MBs. Milliseconds to start.
    Weaker isolation than VMs (shared kernel — kernel exploit affects all containers).

Use both: VMs for strong isolation between tenants;
          containers within VMs for fast, lightweight app packaging.
```

### "Explain the Docker image layer system"

```text
Each Dockerfile instruction (RUN, COPY, ADD) creates a read-only layer.
Layers are stacked using OverlayFS. Only the top layer is writable (per container).

Copy-on-write: if a container writes to a read-only file,
               it's copied to the writable layer first.

Caching: if a layer hasn't changed, Docker reuses the cached version.
         This is why instruction ORDER matters — put stable instructions first.

Implications:
  - Put COPY package.json before COPY . . to cache npm install
  - Each RUN creates a layer — chain commands to minimize layers:
    RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
  - Secrets written in a RUN and "deleted" in a later RUN are still in the earlier layer
    → use BuildKit secrets or multi-stage builds
```

### "What happens when you run kubectl apply?"

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

### "What is the difference between livenessProbe and readinessProbe?"

```text
readinessProbe: Is the pod ready to RECEIVE TRAFFIC?
  Fail → pod removed from Service endpoints, no traffic sent.
  Pod is NOT restarted. Useful during startup and when dependencies are down.

livenessProbe: Is the pod still ALIVE?
  Fail → kubelet kills and restarts the container.
  Use for: deadlocks, memory leaks causing unresponsiveness.
  ✗ Don't check external dependencies in livenessProbe — if DB is down,
    restarting your pod doesn't help and causes a restart storm.

startupProbe: Has the pod FINISHED STARTING?
  Disables liveness/readiness until it passes once.
  Prevents killing slow-starting apps (JVM, ML models).
```

### "How do Services work in Kubernetes?"

```text
A Service provides a stable virtual IP (ClusterIP) and DNS name for a set of pods.

kube-proxy on each node watches for Service and Endpoint changes via apiserver.
It programs iptables (or IPVS) rules: any packet to ClusterIP:port → forward
to one of the healthy pod IPs (chosen round-robin).

Endpoints are automatically updated: when a pod's readinessProbe fails,
it's removed from the Endpoints list → traffic stops going to it.

DNS: CoreDNS resolves service-name.namespace.svc.cluster.local → ClusterIP.
```

### "Explain ConfigMaps vs. Secrets"

```text
ConfigMap: non-sensitive config (LOG_LEVEL, DB_HOST, feature flags).
           Stored in etcd as plain text. Visible in kubectl get configmap.

Secret: sensitive data (passwords, API keys, TLS certs).
        Stored in etcd as base64-encoded (NOT encrypted by default).
        base64 is NOT encryption — it just prevents accidental display.

To actually secure Secrets:
  1. Enable etcd encryption at rest (AES-GCM or KMS provider)
  2. Use External Secrets Operator + AWS Secrets Manager / HashiCorp Vault
  3. Strict RBAC (only pods that need a Secret can read it)
  4. Audit logs to detect unauthorized reads

Both can be consumed as env vars or mounted as files.
Mounted Secrets are stored as tmpfs — never written to disk on the node.
```

### "What is Helm and why use it?"

```text
Helm is a package manager for Kubernetes.
It bundles related K8s YAML files into a "chart" with configurable values.

Without Helm: 20+ YAML files per app, duplicate values everywhere,
              no versioning, manual environment differences.

With Helm:
  - Install/upgrade/rollback with one command
  - Values files for different environments (values.prod.yaml, values.staging.yaml)
  - Chart versioning (semver)
  - Public charts for common software (postgres, redis, nginx, prometheus)
  - Reusable templates — DRY across teams

Helm 3 vs Helm 2:
  Helm 2 required "Tiller" (a server-side component) — security risk.
  Helm 3 is client-only — talks directly to apiserver with your kubeconfig credentials.
```

### "How would you achieve zero-downtime deployments in Kubernetes?"

```text
1. Use Deployment with RollingUpdate strategy:
   maxUnavailable: 0  → never remove old pods until new ones are ready
   maxSurge: 1        → create one extra pod during update

2. Configure readinessProbe:
   New pods only receive traffic after readinessProbe passes.
   Without this, K8s sends traffic to pods that are still starting up.

3. Set terminationGracePeriodSeconds:
   Give pods time to finish in-flight requests before being killed.
   App must handle SIGTERM — stop accepting new requests, drain existing.

4. PodDisruptionBudget (PDB):
   Ensures a minimum number of pods remain available during voluntary disruptions
   (node drain, cluster upgrades).

   apiVersion: policy/v1
   kind: PodDisruptionBudget
   spec:
     minAvailable: 2      # or maxUnavailable: 1
     selector:
       matchLabels:
         app: api

5. Connection draining:
   Service removes the pod from endpoints when readinessProbe fails.
   In-flight connections finish. New connections go elsewhere.
```
