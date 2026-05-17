# Cloud & AWS — Senior Developer Deep Reference

> Covers AWS core services, cloud patterns, cost optimization, and interview topics for full stack engineers.

---

## Table of Contents

1. [Cloud Fundamentals](#1-cloud-fundamentals)
2. [Compute — EC2, ECS, Lambda](#2-compute--ec2-ecs-lambda)
3. [Networking — VPC, Load Balancers, CloudFront](#3-networking--vpc-load-balancers-cloudfront)
4. [Storage — S3, EBS, EFS](#4-storage--s3-ebs-efs)
5. [Databases — RDS, DynamoDB, ElastiCache](#5-databases--rds-dynamodb-elasticache)
6. [Messaging — SQS, SNS, EventBridge](#6-messaging--sqs-sns-eventbridge)
7. [Identity & Security — IAM, Cognito, KMS](#7-identity--security--iam-cognito-kms)
8. [Serverless Patterns](#8-serverless-patterns)
9. [Cost Optimization](#9-cost-optimization)
10. [Well-Architected Framework](#10-well-architected-framework)
11. [Common Interview Questions](#11-common-interview-questions)

---

## 1. Cloud Fundamentals

### Cloud service models

```text
IaaS (Infrastructure as a Service):
  You manage: OS, runtime, middleware, applications, data
  Provider manages: virtualization, servers, storage, networking
  Examples: EC2, raw VMs
  Use when: you need full control over the stack

PaaS (Platform as a Service):
  You manage: applications, data
  Provider manages: runtime, middleware, OS, infrastructure
  Examples: Heroku, App Engine, Elastic Beanstalk
  Use when: you want to focus on code, not infra

SaaS (Software as a Service):
  You manage: configuration, your data
  Provider manages: everything else
  Examples: Salesforce, GitHub, Datadog
```

### AWS Global Infrastructure

```text
Region: geographic area (us-east-1 = N. Virginia, eu-west-1 = Ireland)
  - Each region is independent — data doesn't leave unless you move it
  - Choose based on: user location, compliance (data residency), latency, cost

Availability Zone (AZ): one or more data centers within a region
  - us-east-1 has 6 AZs (us-east-1a through 1f)
  - Each AZ is physically separated — different power, cooling, networking
  - Design for AZ failure: spread resources across 2+ AZs

Edge Location: CDN points of presence (CloudFront, Route 53)
  - 400+ globally — much more than regions
  - Cache static content close to users

Multi-region architecture:
  Active-Active: traffic served from multiple regions simultaneously
  Active-Passive: one region active, another on standby (disaster recovery)
```

### The Shared Responsibility Model

```text
AWS is responsible for:
  Security OF the cloud: physical datacenters, hardware, hypervisor, global network

You are responsible for:
  Security IN the cloud: OS patches, firewall rules, encryption, IAM policies,
                         application security, data encryption

Example:
  AWS: ensures EC2 hypervisor is not compromised
  You: ensure EC2 OS is patched, security groups are correct, no public exposure

HIPAA (relevant for Solace):
  AWS is HIPAA-eligible: will sign BAA, provides compliant services
  You: must configure services correctly — S3 encryption, VPC isolation,
       CloudTrail logging, access controls are YOUR responsibility
```

---

## 2. Compute — EC2, ECS, Lambda

### EC2

```text
Elastic Compute Cloud — virtual machines

Instance types:
  t4g, t3: general purpose, burstable (dev, low-traffic)
  m7g, m6i: general purpose, balanced (web servers, app servers)
  c7g, c6i: compute optimized (CPU-intensive, video encoding)
  r7g, r6i: memory optimized (in-memory DBs, caching)
  p4d, g5:  GPU (ML training, video rendering)

Purchasing options:
  On-Demand:    pay per second, no commitment — most expensive, most flexible
  Reserved:     1 or 3 year commitment, 30-70% cheaper — for baseline load
  Spot:         unused capacity, up to 90% cheaper — can be interrupted 2min notice
  Savings Plans: flexible commitment (any instance type, any region) — like Reserved but flexible

Auto Scaling Group (ASG):
  Maintain desired number of instances
  Scale out (add) when CPU > 70%, scale in (remove) when CPU < 30%
  Replace unhealthy instances automatically
  Span multiple AZs for high availability

User Data: script run on first boot (install packages, configure app)
  #!/bin/bash
  yum install -y nodejs
  aws s3 cp s3://my-bucket/app.tar.gz /app/
  systemctl start myapp
```

### ECS (Elastic Container Service)

```text
Run Docker containers without managing Kubernetes

Launch types:
  EC2:     you manage the underlying EC2 instances
  Fargate: AWS manages the servers — serverless containers (most common)

Core concepts:
  Task Definition:  like a Dockerfile for deployment — image, CPU, memory, env vars
  Task:             running instance of a task definition
  Service:          keeps N tasks running, integrates with load balancer
  Cluster:          logical grouping of services

Fargate pricing: pay per vCPU/memory per second the task runs
  0.25 vCPU + 0.5 GB = ~$8/month per task
  Cheaper than EC2 for variable/low traffic, predictable for high traffic

When to use ECS vs EKS (Kubernetes):
  ECS: simpler, AWS-native, good for most teams
  EKS: more control, multi-cloud, large teams familiar with K8s
```

```json
// Task definition (simplified)
{
  "family": "api",
  "cpu": "256",
  "memory": "512",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ghcr.io/org/api:latest",
      "portMappings": [{ "containerPort": 3000 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:prod/db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Lambda

```text
Serverless functions — run code without managing servers

Characteristics:
  - Invoked by events (API Gateway, S3, SQS, EventBridge, scheduled)
  - Max execution time: 15 minutes
  - Max memory: 10 GB
  - Cold start: first invocation is slow (100ms-1s+) — container spin-up
  - Pricing: pay per invocation + GB-second of compute time
  - Free tier: 1 million invocations/month

Cold start mitigation:
  - Provisioned Concurrency: keep N containers warm (cost $)
  - Lambda SnapStart (Java): pre-initialize snapshot
  - Keep function lightweight: small bundle, minimal imports
  - Use arm64 (Graviton) — faster init + 20% cheaper

When to use Lambda:
  ✓ Event-driven: S3 upload processing, SQS consumer, cron jobs
  ✓ Low/unpredictable traffic: pay nothing when idle
  ✓ Glue code: file conversion, data transformation
  ✗ Long-running tasks (> 15 min)
  ✗ High-sustained traffic (containers cheaper)
  ✗ Websockets (ECS/EC2 better)
```

```ts
// Lambda handler (TypeScript, via esbuild or tsx)
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const userId = event.pathParameters?.id;

  try {
    const user = await fetchUser(userId!);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
```

---

## 3. Networking — VPC, Load Balancers, CloudFront

### VPC (Virtual Private Cloud)

```text
Your isolated network in AWS

Key components:
  VPC:               your private network (CIDR: 10.0.0.0/16 = 65,536 IPs)
  Subnet:            subdivision of VPC in one AZ
    Public subnet:   has route to Internet Gateway (web servers, load balancers)
    Private subnet:  no direct internet access (databases, app servers)
  Internet Gateway:  allows public subnets to reach the internet
  NAT Gateway:       allows private subnets to reach internet (outbound only)
                     e.g. app server pulling npm packages or calling Stripe API
  Security Group:    stateful firewall at instance level (which ports, which IPs)
  NACL:              stateless firewall at subnet level (broader rules)
  VPC Peering:       connect two VPCs privately (no internet transit)

Typical 3-tier architecture:
  Public subnet:  Application Load Balancer (ALB)
  Private subnet: ECS tasks / EC2 (app servers)
  Private subnet: RDS PostgreSQL (database)

The database should NEVER be in a public subnet.
```

```
Internet → IGW → ALB (public subnet) → ECS Tasks (private subnet) → RDS (private subnet)
                                      ↕
                              NAT Gateway (outbound internet for private subnet)
```

### Load Balancers

```text
ALB (Application Load Balancer) — Layer 7, HTTP/HTTPS:
  - Route by URL path: /api/* → API service, /admin/* → admin service
  - Route by hostname: api.example.com vs app.example.com
  - Sticky sessions (route same user to same target)
  - WebSocket support
  - TLS termination (cert managed by ACM — free!)
  - Best for: web apps, microservices, containers

NLB (Network Load Balancer) — Layer 4, TCP/UDP:
  - Extremely high performance (millions of req/s)
  - Static IP address (whitelisting by clients)
  - TLS passthrough (encryption all the way to app)
  - Best for: real-time apps, gaming, financial trading

Target Groups:
  What the LB routes traffic to:
  EC2 instances, ECS tasks, Lambda functions, IP addresses
```

### CloudFront (CDN)

```text
AWS CDN — 400+ edge locations globally

Origins:
  S3 bucket:  serve static files (React build, images, videos)
  ALB:        API responses (cache GET responses)
  Custom:     any HTTP server

Cache behaviors:
  /static/*   → cache indefinitely (content-hashed filenames)
  /api/*      → don't cache (or cache 60s for read-heavy endpoints)
  /           → cache 0s (always fetch latest index.html)

Benefits:
  - Latency: users hit nearest edge (~10ms vs 150ms cross-continent)
  - Cost: reduce origin requests (S3 transfer cheaper via CF)
  - Security: DDoS protection (AWS Shield Standard — free)
  - TLS: automatic certificate, HTTP → HTTPS redirect

S3 + CloudFront = perfect static site hosting:
  React app → npm build → S3 → CloudFront
  Cost: ~$0.50/month for most apps
```

---

## 4. Storage — S3, EBS, EFS

### S3 (Simple Storage Service)

```text
Object storage — files, backups, static assets

Key concepts:
  Bucket:     container for objects (globally unique name)
  Object:     file + metadata (max 5TB)
  Key:        object's path within bucket (users/123/photo.jpg)

Storage classes (tiers by access frequency):
  Standard:          frequently accessed, ms latency        ($0.023/GB)
  Standard-IA:       infrequently accessed, retrieval fee   ($0.0125/GB)
  Glacier Instant:   archive, ms retrieval                  ($0.004/GB)
  Glacier Flexible:  archive, 1-12 hour retrieval           ($0.0036/GB)
  Glacier Deep:      long-term archive, 12-48 hour          ($0.00099/GB)

Lifecycle rules: automatically transition between classes
  30 days → Standard-IA
  90 days → Glacier Instant
  365 days → Glacier Deep Archive

Versioning: keep all versions of an object — protect against accidental delete
  Enable on critical buckets (patient documents, financial records)

Security:
  Block all public access (enabled by default) — for user data buckets
  Bucket policy: grant access to specific IAM roles, AWS services
  Presigned URLs: temporary access (GET or PUT) without credentials
  Encryption: SSE-S3 (AWS managed), SSE-KMS (customer managed key)
  Access logs: who accessed what (HIPAA audit trail)
```

```ts
// Common S3 operations
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload
await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `documents/${userId}/${fileId}.pdf`,
  Body: fileBuffer,
  ContentType: 'application/pdf',
  ServerSideEncryption: 'AES256', // encrypt at rest
  Metadata: { userId, uploadedAt: new Date().toISOString() },
}));

// Presigned download URL (expire in 1 hour)
const url = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: `documents/${userId}/${fileId}.pdf`,
}), { expiresIn: 3600 });

// Presigned upload URL (client uploads directly, bypassing server)
const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `uploads/${uuid()}`,
  ContentType: 'image/jpeg',
}), { expiresIn: 300 }); // 5 minutes
```

---

## 5. Databases — RDS, DynamoDB, ElastiCache

### RDS (Relational Database Service)

```text
Managed relational databases: PostgreSQL, MySQL, Aurora

What AWS manages for you:
  - Hardware provisioning and patching
  - Database software installation and upgrades
  - Automated backups (point-in-time recovery up to 35 days)
  - Multi-AZ failover (automatic, ~1-2 min failover)
  - Read replicas (manual setup, but easy)

Multi-AZ:
  Primary in AZ-a, standby in AZ-b
  Synchronous replication
  Automatic failover if primary fails
  NOT for read scaling — standby is on standby, not serving reads

Read replicas:
  Asynchronous replication (small lag)
  Can be in same or different region
  Use for: read-heavy reporting, analytics, search

Aurora (AWS's own PostgreSQL-compatible engine):
  5x faster than regular PostgreSQL (benchmarks)
  Storage auto-scales up to 128 TB
  Up to 15 read replicas
  Aurora Serverless v2: scales from 0.5 to 128 ACUs automatically
  Good for: variable workload, cost optimization at low usage

RDS Proxy:
  Connection pooler managed by AWS
  Put between your app and RDS
  Critical for Lambda → RDS (Lambda creates many short connections)
```

### DynamoDB

```text
AWS's managed NoSQL key-value + document database

Pricing:
  On-demand: pay per request ($1.25 per million writes, $0.25 per million reads)
  Provisioned: set RCU/WCU in advance (cheaper for predictable load)

Key design:
  Primary key: Partition key (+ optional Sort key)
  Partition key determines which partition holds the item
  All items with same PK are in same partition → sorted by SK

Single-table design (DynamoDB best practice):
  Put all entities in one table with generic PK/SK
  Use access patterns to define PK/SK values

  Example:
    User:    PK="USER#123",   SK="PROFILE"
    Task:    PK="USER#123",   SK="TASK#456"
    Message: PK="CONV#789",   SK="MSG#2024-01-01T10:00:00Z"

  Query all tasks for user: PK="USER#123", SK begins_with "TASK#"

GSI (Global Secondary Index):
  Query on non-primary key attributes
  Each GSI = another partition of the data on different keys

When to use DynamoDB:
  ✓ Known access patterns (fits single-table design)
  ✓ Very high scale (millions of items, millions of reads/second)
  ✓ Simple queries (no complex joins needed)
  ✗ Complex queries / ad-hoc analytics
  ✗ Strong ACID transactions (limited, added in 2018)
  ✗ Unknown access patterns (flexibility of SQL better here)
```

### ElastiCache (Redis & Memcached)

```text
Managed in-memory caching — Redis or Memcached

ElastiCache for Redis:
  - Data structures: strings, lists, sets, sorted sets, hashes
  - Persistence: RDB (snapshots) + AOF (write-ahead log)
  - Pub/Sub messaging
  - Cluster mode: shard data across multiple nodes
  - Multi-AZ with automatic failover

Common use cases:
  Session storage:    store JWT or session data, fast access, TTL
  Query cache:        cache expensive DB results
  Rate limiting:      INCR + EXPIRE per user per minute
  Leaderboards:       Sorted Sets (ZADD, ZRANGE)
  Pub/Sub:            real-time messaging between services
  Distributed locks:  SET NX EX (atomic set-if-not-exists with expiry)

Cluster vs Single node:
  Single: one primary (+ optional read replica) — simple, <= 100GB
  Cluster: shard across 1-500 nodes — for large datasets or extreme throughput
```

---

## 6. Messaging — SQS, SNS, EventBridge

### SQS (Simple Queue Service)

```text
Managed message queue — decouple producer from consumer

Queue types:
  Standard:    at-least-once delivery, best-effort ordering, unlimited throughput
  FIFO:        exactly-once delivery, strict ordering, 3000 messages/second

Key settings:
  Visibility timeout:    time consumer has to process before message reappears
                         Set > your processing time (e.g. 5 min for image processing)
  Message retention:     1 min to 14 days (default 4 days)
  Dead letter queue:     after N failed attempts, move to DLQ for inspection
  Long polling:          consumer waits up to 20s for messages (reduces API calls)
  Delay queue:           messages invisible for 0-900 seconds after send

Lambda trigger:
  Lambda can poll SQS automatically (event source mapping)
  Batch size: process up to 10 messages per Lambda invocation
  Lambda scales up/down based on queue depth
```

```ts
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Send message (producer)
await sqs.send(new SendMessageCommand({
  QueueUrl: QUEUE_URL,
  MessageBody: JSON.stringify({
    type: 'patient.matched',
    patientId: '123',
    advocateId: '456',
    matchedAt: new Date().toISOString(),
  }),
  MessageAttributes: {
    EventType: { DataType: 'String', StringValue: 'patient.matched' },
  },
  // FIFO queue: MessageGroupId and MessageDeduplicationId required
}));

// Consume (manual polling — for long-running workers)
async function poll() {
  while (true) {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,       // long polling
      VisibilityTimeout: 300,    // 5 minutes to process
    }));

    for (const message of response.Messages ?? []) {
      try {
        await processMessage(JSON.parse(message.Body!));
        // Delete only after successful processing
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle!,
        }));
      } catch (err) {
        // Don't delete — visibility timeout expires, message returns to queue
        logger.error({ err, messageId: message.MessageId }, 'Failed to process message');
      }
    }
  }
}
```

### SNS (Simple Notification Service)

```text
Pub/Sub — one message, multiple subscribers

Topic:        named channel
Publisher:    sends messages to topic
Subscriber:   receives messages from topic

Subscription protocols:
  SQS:        push to another queue (fan-out pattern)
  Lambda:     invoke function per message
  HTTP/HTTPS: POST to your endpoint
  Email:      send email (alerting)
  SMS:        Twilio competitor

Fan-out pattern (SNS → multiple SQS):
  SNS topic: "patient.matched"
  → SQS queue 1 → Notification worker (sends welcome SMS)
  → SQS queue 2 → Billing worker (creates invoice)
  → SQS queue 3 → Analytics worker (records metric)

  One event → all three happen independently and reliably
  Each SQS queue has its own retry/DLQ — isolated failures
```

### EventBridge

```text
Serverless event bus — more powerful than SNS

Event bus:
  Default bus: AWS service events (EC2 start/stop, RDS failover, etc.)
  Custom bus:  your application events
  Partner bus: SaaS events (Stripe payments, Auth0 logins, Shopify orders)

Rules:
  Filter events by pattern: { "source": ["myapp"], "detail-type": ["task.created"] }
  Route matching events to targets

Targets:
  Lambda, SQS, SNS, Step Functions, ECS tasks, API destinations (external HTTP)

Schedule:
  Run on cron: rate(5 minutes), cron(0 9 * * MON-FRI *) — 9am weekdays
  Better than CloudWatch Events (same thing, rebranded)

Why EventBridge > SNS for event routing:
  - Schema registry: define and validate event shapes
  - Archive and replay: replay past events for testing or recovery
  - More powerful filtering: content-based routing
  - SaaS integrations built-in
```

---

## 7. Identity & Security — IAM, Cognito, KMS

### IAM (Identity and Access Management)

```text
Who can do what to which AWS resources

Key concepts:
  User:          a person or application with long-term credentials
  Group:         collection of users sharing permissions
  Role:          assumed by services, Lambda, EC2, ECS tasks — no password
  Policy:        JSON document defining permissions (Allow/Deny)

Principle of least privilege:
  Grant only the permissions needed — nothing more
  Start with no permissions, add only what's required

Policy example:
  ECS task reads secrets + writes S3:
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["secretsmanager:GetSecretValue"],
        "Resource": "arn:aws:secretsmanager:us-east-1:123:secret:prod/*"
      },
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject"],
        "Resource": "arn:aws:s3:::patient-documents/*"
      }
    ]
  }

IAM Roles for Services (vs access keys):
  ✗ Never use access keys in application code (they can leak)
  ✓ Assign IAM role to EC2/ECS/Lambda — SDK auto-gets temporary credentials
  Role credentials rotate automatically (short-lived, hours)
```

### Cognito (User Pools)

```text
Managed authentication and authorization

User Pool:     user directory — sign up, sign in, password reset, MFA
  - Issues JWT tokens (ID token, access token, refresh token)
  - Integrates with ALB and API Gateway for auth

Identity Pool:  gives authenticated users AWS credentials to call services directly
  - Use case: mobile app accesses S3 directly (without server)
  - User logs in via User Pool → Identity Pool gives temp S3 credentials

When to use Cognito vs custom JWT:
  ✓ Cognito: don't want to build auth, need MFA/social login, small-medium apps
  ✗ Cognito: complex custom auth flows, multiple microservices (JWT is simpler to share)
  ✓ Custom JWT: full control, complex business rules, existing user base

Social login with Cognito:
  Configure Google/Apple/Facebook as identity providers
  Users click "Sign in with Google" → Cognito handles OAuth flow
  Your app just gets a JWT from Cognito
```

### KMS (Key Management Service)

```text
Manage encryption keys

CMK (Customer Managed Key):
  - Your key, managed by AWS infrastructure
  - Used for: S3 SSE-KMS, RDS encryption, Secrets Manager
  - Audit who used the key and when (CloudTrail)
  - Rotate automatically (optional, annually)

Envelope encryption:
  1. KMS generates a Data Key (plaintext + encrypted version)
  2. Encrypt your data with the plaintext key
  3. Store encrypted data + encrypted key together
  4. To decrypt: call KMS to decrypt the key, then decrypt data
  This way: KMS never sees your data — only the key

HIPAA: all PHI must be encrypted at rest
  RDS: enable encryption at creation (can't enable after)
  S3: enable default encryption on bucket (SSE-KMS)
  EBS: enable encryption by default in account settings
```

---

## 8. Serverless Patterns

### API Gateway + Lambda

```text
HTTP API (newer, cheaper, faster) vs REST API (more features):
  HTTP API: simple proxy, JWT auth, CORS — 70% cheaper
  REST API: request/response transforms, API keys, usage plans, WAF

Lambda proxy integration:
  API Gateway passes entire request to Lambda
  Lambda returns response with statusCode, headers, body

Cold starts in production:
  TypeScript Lambda: 200-500ms cold start
  Mitigation:
    1. Provisioned Concurrency: keep N warm ($0.015/GB-hour)
    2. Lambda SnapStart: snapshot after init (Java only currently)
    3. Keep bundle small: tree-shake, bundle with esbuild

Patterns:
  GET /users → Lambda (or cache at API GW level)
  POST /users → Lambda → SQS → Worker Lambda (async processing)
  WebSocket → API Gateway WebSocket → Lambda (connect/disconnect/message)
```

### Step Functions

```text
Orchestrate multi-step workflows — visual, reliable, built-in retry

States:
  Task:     invoke Lambda, ECS task, API call
  Wait:     pause for time or until callback
  Choice:   conditional branching
  Parallel: run multiple branches in parallel
  Map:      iterate over array, run each through states

Use cases:
  - Patient onboarding: collect intake → match advocate → send welcome → schedule call
  - Order processing:   validate → charge → fulfill → notify → archive
  - Data pipeline:      extract → transform → load

Error handling built-in:
  Retry with exponential backoff: automatically
  Catch specific errors: route to error-handling state
  No try/catch in application code needed

Express vs Standard workflows:
  Standard: long-running (up to 1 year), exactly-once, audit history
  Express:  high-volume, at-least-once, 5 min max — for high-throughput
```

---

## 9. Cost Optimization

### Where money goes

```text
Typical cost breakdown for a web app:
  EC2/ECS:    30-40% (compute)
  RDS:        20-30% (database)
  Data transfer: 15-20% (egress is expensive)
  S3:         5-10%
  Other:      10%

Data transfer costs (often surprising):
  Intra-AZ:   free
  Inter-AZ:   $0.01/GB each way (within same region)
  Internet:   $0.09/GB (first 10 TB/month)
  CloudFront: $0.0085/GB (cheaper than direct — cache at edge)
```

### Cost optimization strategies

```text
Right-sizing:
  Monitor actual CPU/memory usage
  Most apps use < 20% of provisioned capacity
  Tools: AWS Compute Optimizer, Cost Explorer

Reserved capacity:
  1-year Reserved Instances: 30-40% savings vs On-Demand
  3-year: up to 70% savings
  Savings Plans: flexible (any instance type, any region)
  Cover baseline load with reserved, spikes with on-demand

Spot instances:
  80-90% cheaper than on-demand
  Use for: batch processing, CI/CD workers, non-critical background jobs
  Not for: stateful apps, anything that can't tolerate 2-min shutdown notice

S3 cost optimization:
  Use appropriate storage class (Lifecycle rules to Glacier for old data)
  CloudFront in front of S3 (reduce S3 requests, cheaper egress)
  Transfer Acceleration: not needed if using CloudFront

RDS cost optimization:
  Aurora Serverless v2: scales to 0 when idle (dev/staging environments)
  Use read replicas to offload analytics queries (cheaper than scaling primary)
  Snapshot and pause dev databases outside business hours

Cost monitoring:
  AWS Budgets: alert when spending exceeds threshold
  Cost Explorer: visualize and analyze spending
  Resource tagging: tag everything with app, environment, team
  Cost allocation tags: group spending by tag for chargebacks
```

---

## 10. Well-Architected Framework

### The 6 pillars

```text
1. Operational Excellence
   Automate everything, make frequent small changes, anticipate failure
   Key practices: IaC, runbooks, blameless post-mortems, observability

2. Security
   Apply security at every layer, principle of least privilege
   Protect data at rest and in transit, trace who does what (audit)
   Key practices: IAM, encryption, WAF, security groups, VPC isolation

3. Reliability
   Design to survive component failures
   Key practices: multi-AZ, auto-scaling, backups, circuit breakers, load testing

4. Performance Efficiency
   Use the right resource type, right size, evolve with technology
   Key practices: right-sizing, CDN, caching, serverless for bursty workloads

5. Cost Optimization
   Avoid unnecessary spend, measure value delivered
   Key practices: reserved capacity, right-sizing, spot, managed services

6. Sustainability (added 2021)
   Minimize environmental impact
   Key practices: right-sizing, reduce idle resources, efficient code
```

### High availability design

```text
Single AZ: any hardware failure = downtime
Multi-AZ: survive one AZ failure = 99.99% availability

Multi-AZ checklist:
  ALB spans multiple AZs: ✓ automatic
  ECS/EC2 spread across AZs: configure placement strategy
  RDS Multi-AZ: enable in RDS settings
  ElastiCache Multi-AZ: enable automatic failover
  No single points of failure: identify and eliminate SPOFs

RPO (Recovery Point Objective): how much data loss is acceptable?
  0 = no data loss (synchronous replication, Multi-AZ)
  1 hour = hourly snapshots acceptable

RTO (Recovery Time Objective): how fast must system recover?
  < 1 min = active-active, automatic failover (Multi-AZ)
  1-4 hours = automated recovery from backups
  > 4 hours = manual recovery process
```

---

## 11. Common Interview Questions

### "Explain the difference between SQS and SNS."

> SQS is a queue — a message goes in, ONE consumer processes it, and it's deleted. It's for work distribution (one task, one worker). SNS is pub/sub — a message is published to a topic and ALL subscribers receive a copy. The classic pattern is to combine them: SNS fan-out → multiple SQS queues. One event triggers multiple independent workers, each with their own retry/DLQ.

### "What is the difference between an IAM Role and an IAM User?"

> A User has permanent credentials (access key + secret) and represents a person or application. A Role has no permanent credentials — it's assumed by services (EC2, Lambda, ECS) or other AWS accounts, and generates temporary credentials that rotate automatically. In production, you should never have application access keys — every service should use a Role. Roles are more secure: no long-lived credentials to leak, and you can see exactly what each service is allowed to do.

### "How would you design a cost-effective architecture for a healthcare startup?"

```text
Early stage (< 1k users):
  Single ECS Fargate service (2 tasks, 0.5 vCPU / 1 GB each)
  RDS PostgreSQL t3.medium Single-AZ (upgrade to Multi-AZ at scale)
  ElastiCache t3.micro (single node)
  S3 + CloudFront for frontend
  Estimated cost: ~$200-300/month

Scaling (10k-100k users):
  ALB → ECS Fargate with Auto Scaling (2-20 tasks)
  RDS PostgreSQL r6g.large Multi-AZ + 1 read replica
  ElastiCache r6g.large with read replicas
  Estimated cost: ~$800-1500/month

Reserved capacity saves 30-40%:
  1-year Reserved for RDS and ElastiCache → significant savings
  Savings Plans for Fargate compute
```

### "What is CloudFront and when would you put it in front of your API?"

> CloudFront is AWS's CDN. For static assets (React app, images), always put CloudFront in front of S3 — it serves from edge nodes near users (~10ms vs 150ms), reduces S3 costs, and gives DDoS protection for free. For APIs: put CloudFront in front of ALB when you have publicly cacheable GET responses (product catalogs, reference data, public content). Not worth it for personalized or real-time data. CloudFront also lets you add WAF rules and rate limiting at the edge before requests reach your servers.

---

## Most Asked Cloud & AWS Interview Questions

### "What is the difference between EC2, Lambda, and ECS/EKS?"

> **EC2** — virtual machines you manage (OS, patches, scaling). Full control, highest overhead. Use when you need long-running processes, specific OS config, or GPU access. **Lambda** — serverless functions triggered by events; you only pay per execution; auto-scales to zero; limited to 15min timeout, 10GB memory. Use for event-driven tasks, short-lived jobs, API backends with spiky traffic. **ECS** — run Docker containers managed by AWS; less overhead than EC2. **EKS** — managed Kubernetes; most control and portability but most complexity.

### "What is the difference between S3, EBS, and EFS?"

> **S3** — object storage; flat namespace with buckets/keys; unlimited storage, globally accessible via URL, highly durable (11 9s), cheap. Use for: static assets, backups, data lakes, file uploads. Not a filesystem. **EBS** — block storage attached to a single EC2 instance (like a hard drive); low latency, high throughput; persists independently of the instance. Use for: EC2 root volumes, databases. **EFS** — elastic file system that can be mounted by multiple EC2 instances simultaneously (NFS); scales automatically. Use for: shared file storage across instances.

### "What is IAM and how do you follow least privilege?"

> IAM (Identity and Access Management) controls who can do what in AWS. Core concepts: **Users** (people), **Roles** (assumed by services/EC2/Lambda — no long-term credentials), **Groups** (collection of users), **Policies** (JSON documents defining allow/deny for actions on resources). Best practices: never use root account for daily work, use roles instead of access keys for services, grant minimum permissions needed, use SCPs in Organizations to set guardrails.

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

### "What is a VPC and why does it matter?"

> A VPC (Virtual Private Cloud) is your private network in AWS — isolated from other AWS customers. Key components: **Subnets** (public subnet has route to Internet Gateway; private subnet doesn't). **Security Groups** — stateful firewall at instance level (allow rules only). **NACLs** — stateless firewall at subnet level. **Internet Gateway** — connect VPC to internet. **NAT Gateway** — allow private subnet instances to make outbound internet requests without being publicly accessible. Databases should always be in private subnets.

### "What is the difference between RDS, DynamoDB, and ElastiCache?"

> **RDS** — managed relational database (PostgreSQL, MySQL, Aurora); auto-backups, read replicas, multi-AZ failover. Use when you need SQL, JOINs, ACID transactions. **DynamoDB** — managed NoSQL key-value/document store; single-digit millisecond latency at any scale; serverless, auto-scales. Use for: session storage, leaderboards, IoT, anything with predictable access patterns (no ad-hoc queries). **ElastiCache** — managed Redis or Memcached; in-memory caching layer in front of databases. Use to reduce database load for frequently-read data.

### "What is Auto Scaling and how does it work?"

> Auto Scaling automatically adjusts the number of EC2 instances (or ECS tasks, Lambda concurrency) based on demand. Components: **Launch Template** (what to launch), **Auto Scaling Group** (min/max/desired count), **Scaling Policies** (when to scale). Types: **Target Tracking** — maintain a metric (e.g., 70% CPU); **Step Scaling** — scale by N instances when threshold crossed; **Scheduled Scaling** — scale before known traffic spikes. Always set min > 0 for availability; pair with a load balancer.

### "What is the difference between SQS, SNS, and EventBridge?"

> **SQS** — message queue; consumer pulls messages; decouples producer/consumer; messages persist until consumed; use for task queues, work distribution. **SNS** — pub/sub; publisher sends to a topic, all subscribers receive (push); used for fan-out (one event → multiple destinations). **EventBridge** — event bus with routing rules; route events from AWS services, SaaS apps, or your code to targets based on content; use for event-driven architectures, replacing cron jobs, integrating services.

### "What is CloudFront and when do you use it?"

> CloudFront is AWS's CDN — caches content at edge locations globally. Reduces latency (content served from nearest location), reduces origin load, absorbs DDoS. Use for: serving static assets (S3-backed), API caching at the edge, protecting origins behind CloudFront (origin never directly exposed), Lambda@Edge for request/response manipulation. Set aggressive cache headers for immutable assets.

### "What are the key metrics to monitor in production?"

> **The Four Golden Signals** (Google SRE): **Latency** (how long requests take — distinguish success vs error latency), **Traffic** (requests/sec, transactions/sec), **Errors** (rate of failed requests — 5xx, timeouts), **Saturation** (how full the service is — CPU, memory, disk, DB connections). AWS tools: CloudWatch (metrics, logs, alarms), X-Ray (distributed tracing), CloudTrail (API audit log).
