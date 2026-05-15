# GCP — Senior Developer Deep Reference

> Covers core services, compute, databases, networking, security, data/ML, and architecture patterns.

---

## Table of Contents

1. [Core Concepts — Projects, IAM & Resource Hierarchy](#1-core-concepts--projects-iam--resource-hierarchy)
2. [Compute — GCE, Cloud Run, GKE & Cloud Functions](#2-compute--gce-cloud-run-gke--cloud-functions)
3. [Storage — GCS, Persistent Disk & Filestore](#3-storage--gcs-persistent-disk--filestore)
4. [Databases — Cloud SQL, Firestore, Bigtable & Spanner](#4-databases--cloud-sql-firestore-bigtable--spanner)
5. [Networking — VPC, Cloud Load Balancing & Cloud CDN](#5-networking--vpc-cloud-load-balancing--cloud-cdn)
6. [Security — IAM, KMS & Secret Manager](#6-security--iam-kms--secret-manager)
7. [Data & AI — BigQuery, Dataflow & Vertex AI](#7-data--ai--bigquery-dataflow--vertex-ai)
8. [Architecture Patterns](#8-architecture-patterns)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. Core Concepts — Projects, IAM & Resource Hierarchy

### Resource Hierarchy

```text
‼️ GCP resource hierarchy determines IAM inheritance:

Organization (Workspace/Cloud Identity domain)
  └── Folders (optional — departments, teams, environments)
        └── Projects (fundamental isolation unit — billing, APIs, resources)
              └── Resources (VMs, buckets, databases, etc.)

‼️ IAM policies are additive and inherited downward:
  Policy on Folder → applies to all Projects inside it
  Policy on Project → applies to all Resources inside it
  Child can't REMOVE permissions granted by parent
  Deny policies (Preview) can restrict inherited permissions

Project:
  - Billing unit — all costs tied to a project
  - API enablement — each API must be enabled per project
  - Quota boundary — per-project quotas for most services
  - Service accounts scoped to project
  ‼️ Create separate projects for: dev/staging/prod, teams, or sensitive workloads

gcloud commands:
  gcloud config set project PROJECT_ID
  gcloud projects list
  gcloud iam policy-get PROJECT_ID
```

### IAM

```text
‼️ GCP IAM: Who (principal) can do What (role) on Which (resource)

Principals:
  Google Account         — individual user
  Service Account        — non-human identity for apps/services ‼️ prefer over user accounts
  Google Group           — collection of users and service accounts
  Workspace Domain       — all users in a Google Workspace domain
  allAuthenticatedUsers  — any authenticated Google account (‼️ use carefully)
  allUsers               — anyone, including unauthenticated (public access)

Roles:
  Primitive roles (legacy, too broad — avoid): Owner, Editor, Viewer
  Predefined roles: roles/storage.objectViewer, roles/compute.instanceAdmin
  Custom roles: define exact set of permissions for least privilege ‼️

‼️ Service Account best practices:
  One SA per application/service (principle of least privilege)
  Grant only predefined roles to SA, or custom roles
  Use Workload Identity for GKE (no key files) ‼️
  Avoid downloading SA keys — use Application Default Credentials
  Audit SA key usage: Cloud Audit Logs

gcloud iam service-accounts create my-sa \
    --display-name "My Service Account"
gcloud projects add-iam-policy-binding PROJECT \
    --member "serviceAccount:my-sa@PROJECT.iam.gserviceaccount.com" \
    --role "roles/storage.objectViewer"
```

---

## 2. Compute — GCE, Cloud Run, GKE & Cloud Functions

### Compute Engine (GCE)

```text
VM instance types:
  E2   — cost-optimized, shared core options, web servers, dev
  N2/N2D — general purpose balanced, high-traffic web, databases
  C2/C3 — compute-optimized, HPC, batch, gaming
  M1/M2/M3 — memory-optimized, SAP HANA, large in-memory caches
  A2/A3 — GPU, ML training
  T2A  — Arm (Ampere), 40% cheaper than x86 for same performance

Pricing:
  On-Demand (standard): per-second billing, 1-minute minimum
  Preemptible/Spot VMs: up to 91% discount, can be reclaimed 30-second notice ‼️
  Committed Use Discounts (CUD): 1 or 3 year, up to 57% off
  Sustained Use Discounts: automatic 20-30% discount for running 25%+ of the month

‼️ Instance templates + Managed Instance Groups (MIGs):
  Instance Template defines VM config (machine type, image, startup script)
  MIG creates identical VMs from template
  Auto-scaling: scale based on CPU, custom metrics, load balancing capacity
  Auto-healing: health check → replace unhealthy instances
  Rolling updates: canary, rolling, or blue-green deploys
  Regional MIG spans multiple zones for HA ‼️
```

### Cloud Run

```text
‼️ Cloud Run — fully managed containers, serverless, scale to zero

Key characteristics:
  Runs any container that listens on HTTP
  Scales 0 → N instances based on concurrent requests (or CPU/memory/custom metrics)
  Scale to zero when idle — no idle costs ‼️
  Max request timeout: 60 minutes
  Per-instance concurrency: 1-1000 concurrent requests (default 80)
  CPU: only allocated during requests (default) OR always-on (for background tasks)

Cold start:
  Time to start container + reach HTTP readiness
  Minimize: small images, fast startup code, min-instances > 0 ‼️
  Min instances: keep N instances warm (small cost, eliminates cold starts for users)

Cloud Run vs Cloud Functions:
  Cloud Run  — full container, any language, longer timeout, custom binaries
  Cloud Functions — managed runtime (Node, Python, Go, Java, etc.), simpler, event-triggered

Cloud Run Jobs:
  Run-to-completion workloads (batch processing), no HTTP server required
  Parallelism: multiple task instances run simultaneously
  Indexed tasks: CLOUD_RUN_TASK_INDEX env var for data partitioning

Deployment:
  gcloud run deploy my-service \
      --image gcr.io/PROJECT/my-image:latest \
      --region us-central1 \
      --platform managed \
      --allow-unauthenticated \
      --set-env-vars "DB_URL=..." \
      --set-secrets "DB_PASS=my-secret:latest" \
      --min-instances 1 \
      --max-instances 100 \
      --concurrency 80 \
      --cpu 2 --memory 2Gi
```

### GKE Deep Dive

```text
‼️ GKE — Google Kubernetes Engine, most mature managed K8s

Cluster modes:
  Standard — you manage node pools, full control
  Autopilot — Google manages nodes, you pay per Pod (not node), ‼️ recommended for new clusters

Node pools:
  Group of nodes with same machine type and config
  Multiple pools per cluster (mixed instance types, GPU pools, spot pools)
  Spot node pool: significant cost savings, handle preemptions with PodDisruptionBudgets

Key GKE features:
  Workload Identity ‼️ — Pods use K8s ServiceAccount bound to GCP SA, no key files
  Binary Authorization — policy: only signed images from trusted registries
  GKE Dataplane V2 (eBPF) — Cilium-based networking, network policy, pod-level metrics
  Vertical Pod Autoscaler — right-size pod CPU/memory requests automatically
  Config Connector — manage GCP resources as Kubernetes CRDs
  GKE Enterprise (Anthos) — multi-cluster, multi-cloud, on-prem management

Workload Identity setup:
  # Bind K8s SA to GCP SA
  gcloud iam service-accounts add-iam-policy-binding \
      gcp-sa@PROJECT.iam.gserviceaccount.com \
      --role roles/iam.workloadIdentityUser \
      --member "serviceAccount:PROJECT.svc.id.goog[NAMESPACE/KSA]"

  kubectl annotate serviceaccount KSA \
      iam.gke.io/gcp-service-account=gcp-sa@PROJECT.iam.gserviceaccount.com
```

### Cloud Functions (2nd Gen)

```text
‼️ Cloud Functions Gen 2 runs on Cloud Run under the hood (all Cloud Run features available)

Triggers:
  HTTP trigger        — direct HTTP/HTTPS invocation
  Pub/Sub trigger     — message from Pub/Sub topic
  Cloud Storage       — object created/deleted/archived
  Firestore           — document create/update/delete
  Eventarc            — all GCP events via Eventarc routing

Runtimes: Node.js, Python, Go, Java, .NET, Ruby, PHP

Cold start optimization:
  Global scope — initialize clients OUTSIDE the handler (reused across invocations)
  Lazy initialization — initialize on first request, cache for subsequent

# Python example
from google.cloud import firestore

# ‼️ Global scope — initialized once, reused
db = firestore.Client()

def my_function(request):
    # db already initialized — no cold-start penalty for client creation
    doc = db.collection("users").document("alice").get()
    return doc.to_dict()
```

---

## 3. Storage — GCS, Persistent Disk & Filestore

### Cloud Storage (GCS)

```text
‼️ GCS — object storage, 11 9s durability, globally accessible

Storage classes:
  Standard       — frequent access, no min duration, lowest latency
  Nearline       — access ≤ once/month, 30-day min, retrieval fee
  Coldline       — access ≤ once/quarter, 90-day min, higher retrieval fee
  Archive        — access ≤ once/year, 365-day min, highest retrieval fee

Location types:
  Multi-region (US, EU, ASIA) — highest availability, geo-redundant, highest cost
  Dual-region (e.g., nam4 = US-EAST1+US-CENTRAL1) — geo-redundant, lower latency
  Region (e.g., us-central1) — single region, lowest cost

‼️ Autoclass — automatically transitions objects to appropriate storage class based on access patterns
   Set on bucket, no retrieval fee for transitions, ~6.5% overhead on Standard cost

IAM vs ACLs:
  Use Uniform bucket-level access (IAM only) ‼️ — disables ACLs, simpler security model
  Legacy ACLs: per-object permissions (more complex, avoid for new buckets)

Signed URLs: temporary access without GCP credentials (GET, PUT, DELETE)
gcloud storage sign-url gs://bucket/object \
    --duration=1h \
    --private-key-file=key.json

Object Lifecycle Management:
  Delete objects after N days
  Transition to cheaper storage class after N days
  Delete versioned objects older than N versions

‼️ Retention policies + Object holds: prevent deletion/modification (compliance use cases)
```

---

## 4. Databases — Cloud SQL, Firestore, Bigtable & Spanner

### Choosing the Right Database

```text
‼️ GCP database decision tree:

Relational / SQL?
  Yes → Cloud SQL (MySQL, PostgreSQL, SQL Server) or Cloud Spanner
  Cloud SQL:    regional, vertical scale, familiar SQL, managed backups/HA
  Cloud Spanner: globally distributed, horizontal scale, 99.999% SLA, strong consistency
                 ‼️ Use Spanner when you need: global scale + SQL + transactions (rare requirement)

NoSQL?
  Document model, mobile/web? → Firestore (also Firebase)
  Wide column, analytics, IoT, time-series, large scale? → Bigtable
  Simple cache / session? → Memorystore (Redis or Memcached)

Cloud SQL HA:
  Primary instance + standby in different zone (same region)
  Automatic failover in ~60s
  Read replicas: same region or cross-region
  ‼️ Cloud SQL Auth Proxy: secure connection without managing SSL certs or IPs

Cloud Spanner:
  True NewSQL — global ACID transactions at horizontal scale
  99.999% SLA (5 nines) with multi-region config ‼️
  Splits data across nodes (spanner nodes) — add nodes to scale reads AND writes
  External consistency — stronger than serializable (timestamps based on TrueTime)
  ‼️ Cost: expensive (~$0.90/node/hour for single-region) — reserve for truly global apps
```

### Firestore

```text
‼️ Firestore — serverless, real-time NoSQL document database

Data model:
  Database → Collections → Documents → Fields
  Subcollections: documents can contain collections (hierarchy)
  Collection Groups: query across all collections with same name

‼️ Key characteristics:
  Real-time listeners — onSnapshot() pushes updates to clients instantly
  Offline support — local cache, sync when online (Firebase SDK)
  Transactions + batched writes — atomic multi-document operations
  Strong consistency for single-document reads
  Eventual consistency across different documents (outside transactions)

Queries:
  Limited to a single collection (or collection group)
  Must create composite indexes for multi-field queries ‼️
  No server-side joins — denormalize or fetch related docs separately
  Real-time queries: onSnapshot listener updates whenever data changes

‼️ Data modeling — favor denormalization:
  User doc: embed address (1 read for user + address)
  Don't normalize like SQL — Firestore has no joins
  Duplicate data that's frequently read together

Security Rules:
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == userId; // ‼️ users can only write their own doc
      }
    }
  }
```

### Bigtable

```text
‼️ Bigtable — managed wide-column store (HBase compatible), petabyte scale

Use cases: IoT telemetry, time-series, ML feature store, ad-tech, financial data
NOT for: transactional data, complex queries, small datasets

Data model:
  Table → Rows → Column families → Columns → Versioned cells (timestamped values)
  ‼️ Row key is the ONLY index — all reads are single-row or sequential range scans
  Query pattern must be designed into the row key

‼️ Row key design is critical:
  Bad: monotonically increasing timestamp as key → all writes to same server (hotspot)
  Good: reverse timestamp (latest first), hash prefix for even distribution
  Pattern: sensor_id#reverse_timestamp → efficient range scan for one sensor's history

Performance:
  Scales linearly: add nodes to increase throughput
  SSD (default) or HDD (analytics, less $ for write-heavy)
  Replication: multi-cluster within same region (HA) or cross-region (DR/geo-local reads)
```

---

## 5. Networking — VPC, Cloud Load Balancing & Cloud CDN

### VPC

```text
‼️ GCP VPC key differences from AWS:
  VPC is global — spans all regions (no region boundary for the VPC itself)
  Subnets are regional (single region, but spans zones within it) ‼️
  Auto-mode VPC creates one subnet per region automatically (easy, less control)
  Custom-mode VPC: you define subnets (use in production)

Private Google Access:
  Enabled on subnet — allows VMs without external IPs to reach Google APIs (GCS, BigQuery)
  ‼️ Required for private GKE nodes to pull container images from Artifact Registry

Cloud NAT:
  Managed NAT for VMs without external IPs → internet outbound
  Regional, not zonal — one Cloud NAT covers all zones in a region ‼️ (simpler than AWS)

Shared VPC:
  Host project owns the VPC, service projects use subnets from it
  Centralized network control, cross-project service communication
  ‼️ Use for enterprise: platform team manages network, app teams deploy into shared subnets

VPC Peering:
  Connect two VPCs (same or different projects/orgs)
  Non-transitive: A↔B, B↔C does NOT mean A↔C ‼️
  Alternative: Network Connectivity Center (hub-and-spoke topology)

Private Service Connect:
  Access Google services or third-party services via private IP in your VPC
  No public internet exposure ‼️ — preferred over Private Google Access for production
```

### Cloud Load Balancing

```text
‼️ GCP load balancers are global by default (anycast IP) — key differentiator from AWS

External Application Load Balancer (global):
  Layer 7, HTTP/HTTPS/HTTP2/gRPC
  Single global anycast IP → routes to nearest backend ‼️
  URL maps: route by path, host, headers
  Backends: instance groups, NEGs (Network Endpoint Groups), Cloud Run, GCS

External Network Load Balancer (regional):
  Layer 4, TCP/UDP/ESP/GRE/ICMP
  Static external IPs per region
  Low latency, high throughput

Internal Application Load Balancer:
  Layer 7, private IPs, within VPC or Shared VPC
  Use for: service mesh, microservice-to-microservice

Network Endpoint Groups (NEGs):
  zonal NEG: GCE instances or containers (fine-grained port targeting)
  serverless NEG: Cloud Run, Cloud Functions, App Engine as backends ‼️
  internet NEG: external backends (on-prem, other clouds)
  Private Service Connect NEG: connect to Private Service Connect endpoints

‼️ Health checks: defined at backend service level, not LB level
  Probe from Google's health checking infra (specific CIDR — must allow in firewall rules)
  Cloud Armor attached to backend service for WAF/DDoS protection
```

---

## 6. Security — IAM, KMS & Secret Manager

```text
‼️ Cloud KMS:
  Key rings (regional or global) → keys → key versions
  Algorithms: symmetric (AES-256-GCM), asymmetric (RSA, EC), HMAC
  HSM keys (Cloud HSM): FIPS 140-2 Level 3, non-exportable ‼️
  External key manager (EKM): keys stored outside GCP (compliance)
  Envelope encryption: same pattern as AWS — data key encrypted by KMS key

Customer-Managed Encryption Keys (CMEK):
  GCS, BigQuery, Spanner, Cloud SQL support CMEK
  You control the key — can revoke access (renders data inaccessible)
  ‼️ Key rotation: create new primary version, old versions still decrypt old data

Secret Manager:
  Versioned secrets with IAM control per secret
  Automatic replication (global) or user-managed replication (specific regions)
  Rotation: Pub/Sub notification on rotation schedule → Cloud Function/Run rotates
  Audit log: every secret access logged to Cloud Audit Logs ‼️

Organization Policy Service:
  Constraints applied at org/folder/project level — CANNOT be overridden by child resources
  Examples:
    constraints/compute.requireShieldedVm — all VMs must use Shielded VM
    constraints/storage.uniformBucketLevelAccess — enforce uniform IAM on all buckets
    constraints/iam.allowedPolicyMemberDomains — restrict IAM members to your org domain ‼️
    constraints/compute.restrictCloudRunRegions — limit Cloud Run to specific regions

VPC Service Controls:
  Create security perimeter around GCP services
  Prevent data exfiltration even if credentials compromised ‼️
  Define which APIs are accessible from inside vs outside perimeter
```

---

## 7. Data & AI — BigQuery, Dataflow & Vertex AI

### BigQuery

```text
‼️ BigQuery — serverless data warehouse, columnar storage, petabyte scale

Architecture:
  Decoupled compute and storage — Dremel query engine reads from Colossus (GFS)
  Slot-based execution: queries broken into jobs, run on distributed workers
  On-demand pricing: $5/TB scanned (use partitioning + clustering to reduce ‼️)
  Capacity pricing: buy slot commitments (100 slots = ~$2000/month)

Partitioned tables ‼️:
  Ingestion-time partitioning: _PARTITIONTIME auto-column
  Column partitioning: DATE/TIMESTAMP column you specify
  Integer-range partitioning
  Query with partition filter → only relevant partitions scanned → cost + speed ‼️

Clustered tables:
  Data sorted by clustering columns within each partition
  Co-locate related data on disk → less data scanned for filtered queries
  ‼️ Cluster on: most frequently filtered columns (after partition column)
  CREATE TABLE my_table PARTITION BY DATE(created_at) CLUSTER BY user_id, region ...

Advanced features:
  BigQuery ML: train models with SQL (logistic regression, k-means, time series, AutoML)
  BigQuery Omni: query data in AWS S3 or Azure Blob using BigQuery SQL
  Authorized views: share query results without exposing underlying data ‼️
  Row-level security: restrict which rows a user can see
  Column-level encryption: AEAD encrypt/decrypt specific columns

Cost optimization:
  Partition pruning: always include partition column in WHERE ‼️
  Clustering: filter on cluster columns → prune data within partitions
  Column selection: SELECT * scans all columns — select only needed ‼️
  Materialized views: cache expensive query results, auto-refreshed
  BI Engine: in-memory analysis layer for dashboards, sub-second latency
```

### Dataflow & Pub/Sub

```text
Pub/Sub:
  Fully managed messaging service (no-ops, serverless)
  Topics → Subscriptions (pull or push)
  Push: Pub/Sub delivers to HTTP endpoint (Cloud Run, Cloud Functions)
  Pull: subscriber polls and acknowledges messages
  ‼️ At-least-once delivery — design consumers idempotently
  Message ordering: Ordering key on messages → ordered delivery within key ‼️
  Dead letter topic: route undeliverable messages for inspection
  Pub/Sub Lite: lower cost, zonal, less durable (lower SLA)

Dataflow (Apache Beam):
  Managed stream AND batch processing (unified model)
  Auto-scaling workers, no cluster management
  Runners: Dataflow (managed), local, Spark
  ‼️ Use Dataflow for: ETL pipelines, stream processing, ML preprocessing

Apache Beam pipeline:
  with beam.Pipeline(runner='DataflowRunner', options=options) as p:
      (p
       | 'Read' >> beam.io.ReadFromPubSub(subscription=sub)
       | 'Parse' >> beam.Map(json.loads)
       | 'Filter' >> beam.Filter(lambda r: r['status'] == 'active')
       | 'Transform' >> beam.Map(enrich)
       | 'Write' >> beam.io.WriteToBigQuery(table='project:dataset.table'))
```

### Vertex AI

```text
‼️ Vertex AI — unified MLOps platform

Key services:
  Vertex AI Workbench: managed Jupyter notebooks (user-managed or managed instances)
  Training: custom training jobs (any framework), distributed training, hyperparameter tuning
  Prediction: deploy models to endpoints, autoscaling, A/B testing, traffic splitting
  Feature Store: centralized feature repository for training and serving
  Pipelines: Kubeflow Pipelines-based MLOps pipelines (orchestrate training workflows)
  Model Registry: version, track, and govern models
  Model Monitoring: detect training-serving skew, prediction drift

Model Garden:
  Foundation models: Gemini Pro/Flash/Nano, PaLM 2, Codey, Imagen
  Deploy to endpoints or call via API (Generative AI on Vertex)
  Fine-tuning: supervised fine-tuning, RLHF

Vertex AI Search & Conversation:
  RAG-based search over your documents (GCS, BigQuery, websites)
  Grounding: Gemini responses grounded in your data ‼️
```

---

## 8. Architecture Patterns

### Common GCP Patterns

```text
Serverless microservices:
  Cloud Endpoints/API Gateway → Cloud Run → Firestore + Memorystore
  Cloud Pub/Sub for async events between services
  Cloud Tasks for scheduled/delayed work

Data streaming pipeline:
  Pub/Sub → Dataflow (stream) → BigQuery (real-time analytics) + GCS (raw archive)
  With DLQ: Pub/Sub dead-letter → investigate failed messages

ML platform:
  GCS (data lake) → Vertex AI Pipelines (train) → Vertex AI Prediction (serve)
  → Feature Store (share features across models)

Enterprise on GCP:
  Cloud Interconnect (Dedicated/Partner) — private connectivity to GCP ‼️
  Shared VPC — centralized networking
  Organization policies — guardrails
  Cloud Audit Logs — compliance
  VPC Service Controls — data exfiltration prevention

GKE platform team pattern:
  Config Sync (GitOps) — sync K8s configs from Git to cluster
  Policy Controller — enforce guardrails with OPA/Gatekeeper
  Workload Identity — no SA key files in pods ‼️
  GKE Gateway (Gateway API) — manage ingress at cluster level
```

---

## 9. Common Interview Questions

```text
Q: What is the difference between a GCP Project, Folder, and Organization?
A: Organization: root node, tied to Google Workspace domain, IAM here applies to everything.
   Folder: optional grouping (team, env, business unit) — inherit from org, apply to projects inside.
   Project: the fundamental unit — billing boundary, API enablement, resource container.
   ‼️ IAM is inherited downward and is additive — child can't restrict what parent granted.

Q: What is Workload Identity and why is it preferred over SA keys?
A: Workload Identity lets GKE pods assume GCP service account permissions using Kubernetes
   ServiceAccount annotation, without downloading and managing JSON key files.
   SA keys are long-lived credentials — if leaked, they grant access until manually rotated.
   Workload Identity uses short-lived tokens issued by GKE's OIDC provider — auto-rotated, no leakage risk.

Q: What is the difference between Cloud Run and Cloud Functions?
A: Cloud Functions: event-triggered, managed runtime (no container config), simpler deployment.
   Cloud Run: any container, HTTP or events, longer timeouts, more control over environment.
   ‼️ Cloud Functions Gen 2 runs ON Cloud Run — the distinction is mainly the deployment interface.
   Use Cloud Functions for simple event handlers; Cloud Run for complex services with dependencies.

Q: How does BigQuery achieve high performance?
A: Columnar storage — only reads columns needed. Dremel execution engine — massively parallel.
   Decoupled storage/compute — scales independently. Automatic slot allocation.
   ‼️ Key optimizations: partition pruning (reduce data scanned), clustering (sort within partitions),
   avoid SELECT * (columnar — only scan needed columns), use LIMIT carefully (doesn't reduce scan cost).

Q: What is the difference between Firestore and Bigtable?
A: Firestore: document model, real-time sync, offline support, strong consistency per document,
   limited query capabilities (single collection, needs indexes). For mobile/web apps.
   Bigtable: wide-column, petabyte scale, row-key-only queries, no secondary indexes,
   no real-time sync, millisecond latency, for IoT/time-series/analytics workloads.

Q: How does Cloud Spanner differ from Cloud SQL?
A: Cloud SQL: regional (single region), vertical scaling only, familiar managed MySQL/PostgreSQL.
   Cloud Spanner: globally distributed, horizontal scale (add nodes), 99.999% SLA (multi-region),
   external consistency (stronger than serializable), SQL + ACID at global scale.
   ‼️ Cost: Spanner is ~10x more expensive. Use only when global consistency + horizontal SQL scale is needed.

Q: What is VPC Service Controls and when would you use it?
A: VPC Service Controls creates a security perimeter around GCP services. Even if an attacker
   steals credentials, they cannot exfiltrate data outside the perimeter (e.g., can't copy
   BigQuery data to an external project's GCS bucket).
   Use for: regulated industries (healthcare, finance), sensitive data, compliance requirements.
   ‼️ Adds operational complexity — misconfigurations block legitimate access. Audit thoroughly first.
```
