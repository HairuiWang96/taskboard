# AWS — Senior Developer Deep Reference

> Covers core services, compute, databases, networking, security, and architecture patterns.

---

## Table of Contents

1. [Core Concepts — Regions, AZs & IAM](#1-core-concepts--regions-azs--iam)
2. [Compute — EC2, Lambda, ECS & EKS](#2-compute--ec2-lambda-ecs--eks)
3. [Storage — S3, EBS & EFS](#3-storage--s3-ebs--efs)
4. [Databases — RDS, DynamoDB & ElastiCache](#4-databases--rds-dynamodb--elasticache)
5. [Networking — VPC, ALB & CloudFront](#5-networking--vpc-alb--cloudfront)
6. [Security — IAM, KMS & Secrets Manager](#6-security--iam-kms--secrets-manager)
7. [Architecture Patterns](#7-architecture-patterns)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Core Concepts — Regions, AZs & IAM

### Regions & Availability Zones

```text
‼️ AWS Global Infrastructure:

Region (e.g., us-east-1)
  — Independent geographic area
  — Multiple AZs per region (usually 3-6)
  — Data does NOT leave region without explicit cross-region config
  — Latency ~ 1-2ms between AZs within a region

Availability Zone (e.g., us-east-1a, us-east-1b)
  — One or more physically separate data centers within a region
  — Independent power, cooling, networking
  — Connected by low-latency private fiber
  — ‼️ Deploy across AZs for high availability

Edge Locations (~450+)
  — CloudFront CDN points of presence
  — Route 53 DNS
  — WAF, Shield

Design rule: if one AZ goes down, your service must stay up ‼️
  → Multi-AZ deployments for RDS, ElastiCache, ELB, ECS
  → Auto-scaling group spans multiple AZs
```

### IAM Deep Dive

```text
‼️ IAM — Identity and Access Management
   Authentication (who are you?) + Authorization (what can you do?)

Identities:
  User    — long-term credentials (username/password, access keys)
  Group   — collection of users, attach policies to group
  Role    — assumed by services, EC2 instances, Lambda, cross-account
            → temporary credentials via STS (no long-term keys!)
  Service Principal — AWS service acting on your behalf

Policies:
  Identity policy  — attached to user/group/role (what THIS entity can do)
  Resource policy  — attached to resource (who can access THIS resource)
  Permission boundary — max permissions an entity can have
  SCP (Service Control Policy) — org-level max permissions (AWS Organizations)
  Session policy   — further restrict assumed role session

‼️ Policy evaluation:
  1. Explicit Deny anywhere → DENY (overrides everything)
  2. No explicit allow     → DENY (default)
  3. Explicit Allow        → ALLOW (if no explicit deny)
```

```json
// Example policy — least privilege ‼️
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::my-bucket/uploads/*",
            "Condition": {
                "StringEquals": { "s3:prefix": ["uploads/"] },
                "Bool": { "aws:SecureTransport": "true" }
            }
        },
        {
            "Effect": "Deny",
            "Action": "s3:DeleteObject",
            "Resource": "*"
        }
    ]
}
```

---

## 2. Compute — EC2, Lambda, ECS & EKS

### EC2 Instance Types & Pricing

```text
Instance families:
  t3/t4g  — burstable (CPU credits), low baseline, cheap — dev/test, low-traffic web
  m6i/m7g — general purpose, balanced CPU/RAM — web servers, app servers
  c6i/c7g — compute optimized — batch processing, HPC, gaming servers
  r6i/r7g — memory optimized — in-memory databases, large caches
  i3/i4i  — storage optimized — NoSQL, data warehousing, local NVMe SSD
  p3/p4   — GPU — ML training, rendering
  inf2    — AWS Inferentia — ML inference

Pricing models:
  On-Demand  — pay by second, no commitment, highest price
  Reserved   — 1 or 3 year commitment, up to 72% savings, fixed or convertible
  Spot       — unused capacity, up to 90% savings, ‼️ can be reclaimed with 2-min warning
  Savings Plans — flexible compute commitment (not instance-type locked)

‼️ Spot best practices:
  Use Spot for: batch jobs, CI/CD workers, stateless web tier (with on-demand mix)
  Handle interruption: poll instance-metadata IMDS for termination notice
  Use Spot + ASG with mixed instance types to reduce interruption probability
  curl http://169.254.169.254/latest/meta-data/spot/termination-time
```

### Lambda Deep Dive

```text
‼️ Lambda execution model:
  1. Invocation arrives → Lambda assigns execution environment (cold or warm)
  2. Cold start: provision container, download code, init runtime, run init code
  3. Warm start: reuse existing environment — skip steps 1-2
  4. Handler function called
  5. Environment paused (not destroyed) — frozen for reuse

Cold start latency:
  Python/Node.js: 50-200ms (without VPC)
  Java/.NET: 500ms-2s (JVM startup)
  VPC cold starts add ~500ms (ENI attachment) — mitigated with Hyperplane ENI (2019+)

‼️ Reducing cold starts:
  - Provisioned Concurrency — pre-warm N environments (costs money)
  - SnapStart (Java) — snapshot after init, restore on invocation
  - Minimize package size (tree-shake, Lambda Layers for shared deps)
  - Use arm64 (Graviton2) — faster init, 20% cheaper
  - Keep handlers lean — heavy init code stays warm between invocations

Concurrency:
  Account limit: 1000 concurrent executions by default (requestable increase)
  Reserved concurrency: guarantee + cap for a specific function
  Provisioned concurrency: pre-warmed executions (always ready, higher cost)

‼️ Lambda anti-patterns:
  - Long-running work (max 15 min timeout) → use ECS Fargate or Step Functions
  - Large payload (6 MB sync, 256 KB async) → use S3 + event notification
  - High fan-out without throttling → SQS queue in front
  - Stateful processing → external state store (ElastiCache, DynamoDB)
```

### ECS vs EKS

```text
ECS (Elastic Container Service):
  AWS-native container orchestration
  Launch types:
    EC2    — your instances, more control, you manage capacity
    Fargate — serverless containers, AWS manages servers, per-vCPU/GB pricing
  Simpler than Kubernetes — no control plane to manage
  Deep AWS integration: IAM task roles, CloudWatch, ALB, Service Discovery
  ‼️ Use ECS when: team unfamiliar with K8s, simpler ops desired, all-AWS stack

EKS (Elastic Kubernetes Service):
  Managed Kubernetes control plane (AWS manages etcd, API server)
  Worker nodes: EC2 node groups or Fargate profiles
  Full Kubernetes API compatibility
  ‼️ Use EKS when: existing K8s expertise, multi-cloud strategy, need K8s ecosystem (Helm, etc.)

ECS Fargate task definition key fields:
  taskRoleArn     — IAM role for the application code (S3, DynamoDB access)
  executionRoleArn — IAM role for ECS agent (pull ECR image, CloudWatch logs)
  cpu/memory      — task-level limits
  container definitions:
    image, portMappings, environment, secrets (from Secrets Manager/SSM)
    logConfiguration (awslogs → CloudWatch Logs)
    healthCheck
```

---

## 3. Storage — S3, EBS & EFS

### S3 Deep Dive

```text
‼️ S3 is the backbone of AWS — durability 11 9s (99.999999999%)
   Partitioned by prefix — requests to same prefix share the same backend partition

Storage Classes (hot → cold):
  S3 Standard           — frequently accessed, 3+ AZ, ms latency
  S3 Standard-IA        — infrequent access, lower storage cost, retrieval fee
  S3 One Zone-IA        — single AZ, 20% cheaper than Standard-IA, less durable
  S3 Glacier Instant    — archival, ms retrieval, very cheap storage
  S3 Glacier Flexible   — 1-12 hour retrieval, cheapest archival
  S3 Glacier Deep Archive — 12-48 hour retrieval, lowest cost storage in AWS
  S3 Intelligent-Tiering — auto-moves objects between tiers based on access patterns

‼️ S3 performance:
  3,500 PUT/COPY/POST/DELETE + 5,500 GET/HEAD per second PER PREFIX
  Use random prefixes or hash to distribute across multiple prefixes for high-throughput
  S3 Transfer Acceleration — edge locations → faster uploads from far clients
  Multipart upload — required for >5GB, recommended for >100MB

‼️ S3 security:
  Block Public Access — account-level override of all public access (ENABLE this by default)
  Bucket policy — resource policy (who can access this bucket)
  ACLs — legacy, avoid if possible
  Signed URLs/Cookies — temporary access without AWS credentials
  Server-side encryption: SSE-S3 (AWS manages), SSE-KMS (your keys in KMS), SSE-C (your keys)

S3 Event notifications → Lambda, SQS, SNS, EventBridge
S3 Object Lambda — transform object on-the-fly during GET (resize image, redact PII)
```

### EBS vs EFS vs Instance Store

```text
EBS (Elastic Block Store):
  Persistent block storage for EC2 — like a network-attached hard drive
  Types:
    gp3  — general purpose SSD, 3000 IOPS baseline (configurable to 16000), ‼️ default choice
    io2  — provisioned IOPS SSD, up to 64000 IOPS, Multi-Attach, high durability
    st1  — throughput optimized HDD, sequential workloads (data warehouse, log processing)
    sc1  — cold HDD, cheapest, infrequent access
  ‼️ EBS is AZ-specific — cannot attach to instance in different AZ
  ‼️ EBS Multi-Attach (io2): attach to multiple EC2 instances in same AZ (cluster use cases)
  Snapshots: stored in S3 (cross-AZ/region), incremental, use for backup + AMI creation

EFS (Elastic File System):
  Managed NFS — shared filesystem, multiple EC2/containers mount simultaneously ‼️
  Scales automatically (petabytes), pay per GB used
  Multi-AZ by default, Regional scope
  Performance modes: General Purpose (default), Max I/O (high parallelism, higher latency)
  Storage classes: Standard, Standard-IA, Archive (lifecycle policies)
  ‼️ Use EFS when: multiple instances need shared access to same files (shared config, ML checkpoints)

Instance Store:
  Physical NVMe SSDs on the host — extremely fast, but EPHEMERAL ‼️
  Data lost on stop/terminate/failure
  Use for: temp data, shuffle space for Spark/Hadoop, buffers — never for persistent data
```

---

## 4. Databases — RDS, DynamoDB & ElastiCache

### RDS & Aurora

```text
RDS:
  Managed relational DB: MySQL, PostgreSQL, MariaDB, Oracle, SQL Server
  Multi-AZ: synchronous replication to standby in different AZ, auto-failover (~60s) ‼️
  Read Replicas: async replication, up to 15 replicas, can be in different regions
  ‼️ Multi-AZ = high availability; Read Replica = read scaling (different purposes)

Aurora:
  AWS-built storage engine compatible with MySQL/PostgreSQL APIs
  Storage: auto-grows up to 128TB, 6-way replication across 3 AZs (write quorum = 4 of 6)
  ‼️ Aurora Serverless v2: scales in ~0.5 ACU increments within seconds (use for variable load)
  Aurora Global Database: <1s replication to secondary regions, promote in <1 min for DR
  Faster failover than RDS Multi-AZ (~30s vs 60s) — uses shared storage, not replication

RDS Proxy:
  Connection pooler sitting between Lambda/app and RDS
  ‼️ Prevents Lambda from exhausting DB connections (Lambda can scale to 1000s of concurrents)
  IAM authentication, Secrets Manager integration
```

### DynamoDB

```text
‼️ DynamoDB — key-value and document database, single-digit ms at any scale

Data model:
  Table → Items (rows) → Attributes (columns, schema-flexible)
  Partition Key (PK)     — determines partition (hash distributed) — required
  Sort Key (SK)          — optional — enables range queries within a partition

‼️ Choosing partition key:
  High cardinality (many distinct values) → even distribution across partitions
  ✗ status field with 3 values → hot partition anti-pattern
  ✓ user_id, order_id → even distribution

Read/Write capacity:
  Provisioned — specify RCU/WCU, auto-scaling available
  On-Demand  — pay per request, scales instantly, no capacity planning ‼️ use for unpredictable

‼️ DynamoDB Accelerator (DAX):
  In-memory cache for DynamoDB, microsecond latency, read-through/write-through
  API-compatible with DynamoDB — minimal code change

Global Tables:
  Multi-region active-active replication, ~1s propagation
  Last-writer-wins conflict resolution

Streams:
  Change data capture — 24hr window of item-level changes
  Triggers: Lambda, Kinesis Data Streams
  Use for: event-driven pipelines, cross-region replication, audit logs

‼️ Single Table Design:
  Store multiple entity types in one table using composite keys and overloaded attributes
  PK=USER#123, SK=PROFILE  → user profile
  PK=USER#123, SK=ORDER#456 → user's order
  Enables fetching multiple entity types in one query
```

### ElastiCache

```text
ElastiCache Redis:
  In-memory cache + data structure store
  Cluster mode: sharded across 1-500 nodes (scale horizontally)
  Multi-AZ with automatic failover (read replicas)
  Persistence: RDB snapshots + AOF log (optional — adds overhead)
  Use for: session storage, leaderboards, pub/sub, rate limiting, cache-aside

‼️ Cache patterns:
  Cache-aside (lazy loading): app checks cache → if miss, load from DB → write to cache
  Write-through: write to cache AND DB simultaneously — cache always fresh, double writes
  Write-behind (write-back): write to cache → async flush to DB — risk of data loss
  TTL + cache invalidation: expire on write, or short TTL for eventual consistency

ElastiCache Valkey/Memcached:
  Simple key-value only (no data structures), multi-threaded, pure cache (no persistence)
  ‼️ Use when: simple caching, horizontal scaling is sole requirement, Redis features not needed
```

---

## 5. Networking — VPC, ALB & CloudFront

### VPC Architecture

```text
‼️ VPC — Virtual Private Cloud: your isolated network in AWS

Key components:
  Subnets         — partition VPC CIDR into smaller ranges, tied to one AZ
  Public subnet   — has route to Internet Gateway (0.0.0.0/0 → igw-xxx)
  Private subnet  — no direct internet route, uses NAT Gateway for outbound only
  Internet Gateway — allows inbound + outbound internet for public subnets
  NAT Gateway     — allows private subnet instances to reach internet (outbound only)
                    ‼️ Per-AZ for HA — put NAT GW in each AZ, route from that AZ's private subnet
  Route Table     — rules for where traffic goes, associated with subnets
  Security Group  — stateful firewall at instance/ENI level (inbound + outbound rules)
  NACL            — stateless firewall at subnet level (both in and out rules must allow)

‼️ Security Group vs NACL:
  Security Group: stateful (return traffic auto-allowed), attached to instance, allow only
  NACL: stateless (must allow both directions), attached to subnet, allow + deny

Typical 3-tier VPC:
  Public subnet   → ALB
  Private subnet  → EC2/ECS (app tier)
  Private subnet  → RDS/ElastiCache (data tier)
  NAT Gateway in public subnet per AZ → app tier outbound internet

VPC Endpoints:
  Gateway endpoint — S3 and DynamoDB only, free, route table entry
  Interface endpoint — all other services, creates ENI in subnet (small cost)
  ‼️ Use endpoints to keep traffic off public internet, required for private subnets accessing AWS APIs
```

### Load Balancers

```text
ALB (Application Load Balancer):
  Layer 7 (HTTP/HTTPS/gRPC), content-based routing
  Rules: by path (/api/*), host header (api.example.com), headers, query params
  Target types: EC2 instances, IP addresses, Lambda, ECS tasks
  ‼️ ALB + ECS: service discovery via target groups, health checks, rolling deploys
  Sticky sessions: via cookie (AWSALB), duration-based

NLB (Network Load Balancer):
  Layer 4 (TCP/UDP/TLS), millions of requests/sec, ultra-low latency
  Static IP address per AZ (useful for IP whitelisting) ‼️
  Use for: TCP workloads, gaming, IoT, static IP requirement

GLB (Gateway Load Balancer):
  For third-party network appliances (firewalls, IDS/IPS) — transparent bump-in-the-wire

‼️ Health checks:
  ALB checks target response code (200-399 by default)
  Unhealthy threshold — remove from rotation after N failures
  Grace period — don't check until instance stabilizes (ECS rolling deploys)
```

### CloudFront & Route 53

```text
CloudFront (CDN):
  Edge locations cache content close to users
  Origins: S3, ALB, EC2, API Gateway, any HTTP endpoint
  Behaviors: cache policy per path pattern, origin groups for failover
  ‼️ S3 + CloudFront: Origin Access Control (OAC) — CF can access private S3, block direct access
  Lambda@Edge / CloudFront Functions — run code at edge (A/B testing, auth, header manipulation)
  WAF integration — block bad actors at edge before hitting origin

Route 53 routing policies:
  Simple         — one record, no health check
  Failover       — primary/secondary, health check triggers failover ‼️
  Weighted       — split traffic by weight (canary deployments: 95/5 split)
  Latency        — route to lowest-latency region
  Geolocation    — route by geographic location (GDPR data residency)
  Geoproximity   — route by distance to resource, adjustable bias
  Multivalue     — return multiple IPs, basic health checking (not a substitute for LB)
```

---

## 6. Security — IAM, KMS & Secrets Manager

### KMS

```text
‼️ KMS — Key Management Service
  Customer Managed Keys (CMK): you create and control, $1/month/key + API calls
  AWS Managed Keys: created by services (S3-SSE, RDS encryption), free, limited control
  AWS Owned Keys: fully AWS-managed, no visibility or control

Envelope encryption ‼️ (used by all AWS services):
  1. Generate Data Key from CMK (plaintext + encrypted data key)
  2. Encrypt data locally with plaintext Data Key
  3. Discard plaintext Data Key, store encrypted Data Key alongside ciphertext
  4. To decrypt: call KMS Decrypt to get plaintext Data Key, then decrypt data
  Benefit: KMS not in the data path, data encrypted locally, only the small key goes to KMS

Key policies + IAM policies:
  Both must allow access — Key Policy is a resource policy
  Root account must be allowed in Key Policy or the key becomes unmanageable ‼️

CloudTrail logs all KMS API calls — audit who decrypted what and when
```

### Secrets Manager vs Parameter Store

```text
Secrets Manager:
  Stores + auto-rotates secrets (DB passwords, API keys)
  Rotation: Lambda function called on schedule, updates secret + database
  Cross-account secret sharing via resource policies
  Cost: $0.40/secret/month + API calls
  ‼️ Use for: anything requiring rotation (DB credentials, OAuth tokens)

Parameter Store (SSM):
  Hierarchical key-value store
  Standard: free, 4KB limit, no rotation
  Advanced: $0.05/parameter/month, 8KB, higher throughput
  SecureString: encrypted with KMS
  ‼️ Use for: configuration values, non-rotating secrets, feature flags
  Path-based hierarchy: /myapp/prod/database/url, /myapp/prod/database/password

Best practice: use Secrets Manager for credentials, Parameter Store for config
```

---

## 7. Architecture Patterns

### Well-Architected Framework Pillars

```text
1. Operational Excellence  — run and monitor systems, improve processes
2. Security               — protect data, systems, assets
3. Reliability            — recover from failures, scale dynamically
4. Performance Efficiency — use resources efficiently, select right resource types
5. Cost Optimization      — avoid unnecessary costs, right-sizing
6. Sustainability         — minimize environmental impact
```

### Common Architecture Patterns

```text
Serverless Web API:
  Route 53 → CloudFront → API Gateway → Lambda → DynamoDB
  ‼️ Lambda scales automatically, no idle cost, DynamoDB on-demand matches

Container Microservices:
  Route 53 → ALB → ECS Fargate (multiple services) → RDS Aurora / ElastiCache
  Service-to-service: AWS App Mesh (Envoy), or ALB path-based routing

Event-Driven Pipeline:
  S3 upload → EventBridge/S3 Event → Lambda/ECS → SQS (DLQ) → processors → DynamoDB/S3
  ‼️ SQS decouples producers from consumers, DLQ captures failed messages

Data Lake:
  Ingest: Kinesis Data Streams → Kinesis Firehose → S3 (partitioned by date/type)
  Process: AWS Glue (ETL) or EMR (Spark)
  Query: Athena (serverless SQL on S3)
  Visualize: QuickSight

Multi-Region Active-Active:
  Route 53 Latency/Geolocation → CloudFront → ALB (per region) → ECS → Aurora Global Tables + DynamoDB Global Tables
  ‼️ Application must handle eventual consistency (last-writer-wins or CRDTs)

Disaster Recovery tiers (by RTO/RPO):
  Backup & Restore    — cheapest, hours RTO    (S3 backups, AMIs)
  Pilot Light         — core infra running, scale on failover (~minutes RTO)
  Warm Standby        — scaled-down full env, scale up on failover
  Multi-Site Active   — full capacity in multiple regions, seconds RTO (~most expensive)
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between Security Groups and NACLs?
A: Security Groups: stateful (return traffic allowed automatically), instance/ENI level, allow-only rules.
   NACLs: stateless (must explicitly allow both inbound AND outbound), subnet level, allow + deny rules.
   ‼️ Practical: SGs protect instances, NACLs are a subnet-level additional layer (often left as default).

Q: What is the difference between RDS Multi-AZ and Read Replicas?
A: Multi-AZ: synchronous replication to standby in different AZ, auto-failover, NO read traffic to standby.
   Purpose: high availability.
   Read Replicas: async replication, handle read traffic, can be in different regions.
   Purpose: read scaling.
   ‼️ Aurora does both with its storage layer — no lag for replicas due to shared storage.

Q: Explain S3 consistency model.
A: S3 provides strong read-after-write consistency for all objects (since December 2020).
   PUT new object → immediately visible to GET/LIST.
   Overwrite PUT/DELETE → immediately consistent.
   ‼️ This replaced the eventual consistency model. No more "read old version after overwrite" window.

Q: What is envelope encryption and why does AWS use it?
A: Encrypt a data encryption key (DEK) with a master key (CMK). Use DEK to encrypt data locally.
   AWS KMS never sees your plaintext data — only the small DEK. Enables encrypting large data
   without sending it to KMS. Only the DEK is sent to KMS for encrypt/decrypt.

Q: What is the difference between a NAT Instance and a NAT Gateway?
A: NAT Instance: EC2 instance with source/dest check disabled, you manage HA, scaling, patching. Legacy.
   NAT Gateway: AWS-managed, highly available within an AZ, scales automatically, no maintenance.
   ‼️ Always use NAT Gateway. Caveat: one per AZ needed — route tables in each AZ's private subnet
   should point to the NAT Gateway in the SAME AZ (avoid cross-AZ traffic costs + AZ dependency).

Q: How does Lambda handle concurrency?
A: Each invocation runs in its own isolated execution environment.
   Concurrent invocations = N simultaneous Lambda environments.
   Account default: 1000 concurrent (soft limit). Reserved concurrency: cap + guarantee.
   Provisioned concurrency: pre-warmed environments, eliminates cold starts.
   ‼️ Without reserved concurrency, one function can exhaust the account limit — starving others.

Q: What is the difference between SQS and SNS?
A: SQS: queue, pull model, one consumer (or competing consumers on same queue), message persistence (4 days default).
   SNS: pub/sub, push model, fan-out to multiple subscribers (SQS, Lambda, HTTP, email).
   ‼️ Common pattern: SNS → multiple SQS queues (fan-out + durability).
   SNS FIFO + SQS FIFO for ordered, deduplicated fan-out.
```
