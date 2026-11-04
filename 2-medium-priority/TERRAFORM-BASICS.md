# Terraform — Beginner's Guide

**Priority: MEDIUM**

> A plain-language introduction to Terraform: what problem it solves, the core words
> (provider, resource, state), the init → plan → apply workflow, a first project you can
> run for free on your laptop, a real AWS example, variables and outputs, state, modules,
> environments, and the mistakes that cause real outages.
>
> Assumes you can use a terminal. No cloud or DevOps experience needed.

---

## Table of Contents

- [Terraform — Beginner's Guide](#terraform--beginners-guide)
  - [Table of Contents](#table-of-contents)
  - [1. The Problem It Solves](#1-the-problem-it-solves)
  - [2. The Core Words](#2-the-core-words)
  - [3. Setup](#3-setup)
  - [4. The Workflow — init, plan, apply](#4-the-workflow--init-plan-apply)
  - [5. Your First Project — Free, No Cloud Account](#5-your-first-project--free-no-cloud-account)
  - [6. Reading a Plan](#6-reading-a-plan)
  - [7. A Real Example — AWS](#7-a-real-example--aws)
  - [8. Variables, Locals & Outputs](#8-variables-locals--outputs)
  - [9. State — Terraform's Memory](#9-state--terraforms-memory)
  - [10. Many of the Same Thing — `for_each` & `count`](#10-many-of-the-same-thing--for_each--count)
  - [11. Modules — Reusable Blocks](#11-modules--reusable-blocks)
  - [12. Environments — dev, staging, prod](#12-environments--dev-staging-prod)
  - [13. Common Beginner Mistakes](#13-common-beginner-mistakes)
  - [14. Cheat Sheet](#14-cheat-sheet)
  - [Related Files](#related-files)

---

## 1. The Problem It Solves

```text
Your app needs: a database, a storage bucket, two queues, a server, DNS.

The manual way — click through the AWS console:
  - nobody remembers exactly what was clicked, or why
  - setting up staging to match prod = clicking it all again (and missing a step)
  - someone changes a setting by hand → nobody knows
  - deleted by accident → rebuild it from memory

‼️ TERRAFORM IN ONE SENTENCE
   You WRITE DOWN the infrastructure you want in text files, and Terraform
   creates, updates or deletes real cloud resources until reality matches
   what you wrote.‼️

That's called INFRASTRUCTURE AS CODE (IaC):
  ✓ it's in git — reviewed in pull requests, with history
  ✓ staging and prod built from the SAME code
  ✓ repeatable — rebuild everything with one command
  ✓ the code IS the documentation
```

```text
‼️ DECLARATIVE — you describe WHAT you want, not the steps to get there.

  ✗ "create a bucket, then turn on versioning, then..."      (a script)
  ✓ "there should be a bucket called X with versioning on"  (Terraform)

  Run it once  → it creates the bucket.
  Run it again → nothing to do — it already matches.
  Change the file → it changes ONLY what's different.

Works with AWS, Google Cloud, Azure, Cloudflare, GitHub, Datadog, Vercel…
thousands of services, through PROVIDERS (§2).

Note: OpenTofu is an open-source fork of Terraform. Same language, same
commands (`tofu` instead of `terraform`). Everything here works in both.
```

---

## 2. The Core Words

```text
‼️ THE WORDS YOU'LL SEE IN EVERY FILE.

  PROVIDER      A plugin that talks to one service's API.
                "aws", "google", "cloudflare", "github".
  RESOURCE      One thing Terraform CREATES and MANAGES.
                A bucket, a database, a DNS record.
  DATA SOURCE   Something that already exists that you only READ.
                "what's my AWS account id?", "find the latest Ubuntu image".
  VARIABLE      An input — so the same code works for dev AND prod.
  OUTPUT        A value printed after apply — a URL, a bucket name.
  LOCAL         A named value used inside the config, to avoid repeating yourself.
  STATE         Terraform's record of what it created (§9).
  MODULE        A reusable folder of Terraform code (§11).

Files end in .tf and are written in HCL (HashiCorp Configuration Language).
Terraform reads ALL .tf files in a folder together — the file names are
just for humans.
```

```hcl
# The shape of almost every block:
#   TYPE   "provider_thing"  "your_name"  { settings }
resource "aws_s3_bucket"   "uploads"    {
  bucket = "my-app-uploads"
}

# Refer to it elsewhere as:  TYPE.NAME.ATTRIBUTE
#   aws_s3_bucket.uploads.id
#   aws_s3_bucket.uploads.arn
```

---

## 3. Setup

```bash
# Mac
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

terraform version
```

```text
Other systems: download from developer.hashicorp.com/terraform/install

For AWS you also need credentials. Terraform uses the SAME ones as the AWS CLI:
  aws configure        (access keys)   or
  aws sso login        (company single sign-on — preferred)

‼️ NEVER put access keys inside .tf files. They end up in git.‼️

Editor: install the HashiCorp Terraform extension for VS Code —
syntax highlighting, autocomplete, and format-on-save.
```

---

## 4. The Workflow — init, plan, apply

```text
‼️ THE FOUR COMMANDS YOU'LL USE 95% OF THE TIME.

  terraform init       Download providers, set up the folder.
                       Run once, and again after adding a provider or module.

  terraform plan       DRY RUN. "Here's what I WOULD change." Changes nothing.‼️

  terraform apply      Show the plan again, ask "yes?", then DO it.

  terraform destroy    Delete EVERYTHING this config created. ‼️ Careful.

  ┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
  │ edit .tf│ ─▶ │   plan   │ ─▶ │ read it!    │ ─▶ │  apply   │
  └─────────┘    └──────────┘    └─────────────┘    └──────────┘
       ▲                                                  │
       └──────────────────────────────────────────────────┘

‼️ ALWAYS READ THE PLAN before typing "yes". It's the only thing standing
   between a typo and a deleted database.‼️
```

```bash
# Two helpers worth running all the time
terraform fmt        # auto-format all .tf files (like Prettier)
terraform validate   # check syntax and references, without touching the cloud
```

---

## 5. Your First Project — Free, No Cloud Account

```text
The "local" provider creates FILES on your own computer. It's a safe way to
learn the whole workflow — nothing in the cloud, nothing to pay for.
```

```hcl
# hello/main.tf
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local" # where to download it from
      version = "~> 2.5"          # any 2.x from 2.5 up — ‼️ always pin versions
    }
  }
}

variable "name" {
  type    = string
  default = "world"
}

# A RESOURCE: "there should be a file called hello.txt with this content"
resource "local_file" "hello" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, ${var.name}!" # ${...} puts a value inside a string
}

output "file_path" {
  value = local_file.hello.filename
}
```

```bash
cd hello
terraform init                       # downloads the "local" provider
terraform plan                       # "Plan: 1 to add, 0 to change, 0 to destroy."
terraform apply                      # type "yes" → hello.txt appears
cat hello.txt                        # Hello, world!

terraform apply -var 'name=Harry'    # change the input → Terraform updates the file
cat hello.txt                        # Hello, Harry!

terraform destroy                    # type "yes" → hello.txt is deleted
```

```text
‼️ Notice what you DIDN'T do: you never wrote "create file" or "delete file".
   You described the result, and Terraform worked out the steps.‼️

After apply, look in the folder:
  .terraform/              downloaded providers     → ‼️ don't commit
  .terraform.lock.hcl      exact provider versions  → ‼️ DO commit
  terraform.tfstate        Terraform's memory (§9)  → ‼️ never commit
```

---

## 6. Reading a Plan

```text
‼️ THE SYMBOLS — learn these before you touch anything real.

  +    CREATE        a new resource
  ~    UPDATE        change a setting in place — the resource stays
  -    DESTROY       delete it
  -/+  REPLACE       DELETE it, then create a new one‼️
       (shows as "must be replaced")

  Plan: 1 to add, 2 to change, 0 to destroy.    ← always read this line

‼️ "must be replaced" IS THE DANGEROUS ONE.
   Some settings can't be changed in place — e.g. a database's name or a
   bucket's name. Terraform deletes the old one and makes a new, EMPTY one.
   For a database, that means ALL ITS DATA IS GONE.

   In the first project, changing `name` replaced the file — harmless there.
   On a real database, stop and check before saying yes.‼️
```

```hcl
# Safety net for things that must NEVER be deleted
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    prevent_destroy = true # plan/apply fails instead of deleting it
  }
}
```

---

## 7. A Real Example — AWS

```text
A typical small project folder:

  infra/
  ├── versions.tf      Terraform + provider versions, where state lives
  ├── variables.tf     inputs
  ├── main.tf          the resources
  ├── outputs.tf       values to print
  └── dev.tfvars       input values for dev
```

```hcl
# versions.tf
terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region # credentials come from `aws configure` / SSO, not here
}
```

```hcl
# main.tf
# DATA SOURCE — read something that already exists (your account id)
data "aws_caller_identity" "current" {}

# RESOURCE — a storage bucket for user uploads
resource "aws_s3_bucket" "uploads" {
  # ‼️ Bucket names must be unique across ALL of AWS — adding the account id helps
  bucket = "${var.project}-${var.environment}-uploads-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform" # ‼️ so people know not to edit it by hand
  }
}

# Turn on versioning — keeps old copies of every file
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id # ‼️ a REFERENCE to the bucket above

  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access — uploads must not be readable by the world
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

```text
‼️ REFERENCES SET THE ORDER AUTOMATICALLY.
   aws_s3_bucket_versioning uses aws_s3_bucket.uploads.id, so Terraform knows
   the bucket must exist FIRST. You never write "do this, then that" —
   Terraform builds the order from the references. Unrelated resources are
   created in parallel.

‼️ Look up every resource's settings in the provider docs:
   registry.terraform.io → hashicorp/aws → search "s3_bucket".
   Each page has examples and a list of every argument.
```

---

## 8. Variables, Locals & Outputs

```hcl
# variables.tf — INPUTS
variable "region" {
  type        = string
  default     = "us-east-1"     # used if you don't give a value
  description = "AWS region to create everything in"
}

variable "project" {
  type    = string
  default = "taskboard"
}

variable "environment" {
  type        = string          # no default → Terraform ASKS, or you pass it
  description = "dev, staging or prod"

  # Reject bad values before anything is created
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}
```

```hcl
# dev.tfvars — the VALUES for one environment
environment = "dev"
```

```bash
terraform plan  -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
terraform apply -var 'environment=dev'   # or one at a time
```

```hcl
# LOCALS — named values to avoid repeating yourself
locals {
  name_prefix = "${var.project}-${var.environment}"   # "taskboard-dev"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# use as:  local.name_prefix,  local.common_tags
```

```hcl
# outputs.tf — values printed after apply (and readable by other tools)
output "uploads_bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}

output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}
```

```text
  var.x      an INPUT, set from outside         (variable "x")
  local.x    a value computed INSIDE            (locals { x = ... })
  output     something you want to SEE or share

  terraform output                  print all outputs again
  terraform output -raw uploads_bucket_name   just the value (for scripts)
```

---

## 9. State — Terraform's Memory

```text
‼️ THE MOST IMPORTANT CONCEPT AFTER PLAN/APPLY.

terraform.tfstate is a JSON file where Terraform records:
  "the resource I call aws_s3_bucket.uploads is the real bucket
   taskboard-dev-uploads-1234, and these are its current settings."

Every plan = compare THREE things:
  your .tf files  vs  the state file  vs  what's really in the cloud

‼️ Lose the state file → Terraform forgets it created anything. The next
   apply tries to create EVERYTHING again (and fails, or makes duplicates).‼️
```

```text
‼️ THE STATE RULES

1. NEVER EDIT IT BY HAND. Use terraform state commands if you must.

2. NEVER COMMIT IT TO GIT. It often contains SECRETS in plain text —
   database passwords, keys — because providers store resource details.

3. ON A TEAM, STORE IT REMOTELY — not on one person's laptop. Everyone
   (and CI) must use the SAME state, with a LOCK so two people can't
   apply at the same time and corrupt it.
```

```hcl
# versions.tf — store state in an S3 bucket, with locking
terraform {
  backend "s3" {
    bucket       = "my-company-terraform-state" # created once, separately
    key          = "taskboard/dev/terraform.tfstate" # path inside the bucket
    region       = "us-east-1"
    use_lockfile = true # ‼️ lock while someone is applying
  }
}
# After adding or changing a backend → run `terraform init` again.
```

```gitignore
# .gitignore
.terraform/
*.tfstate
*.tfstate.*
crash.log
# ‼️ DO commit .terraform.lock.hcl
# Commit .tfvars files only if they contain NO secrets
```

```text
DRIFT — when reality no longer matches the code
  Someone changes a setting by hand in the AWS console.
  Next `terraform plan` shows it as a change → Terraform will put it BACK.
  ‼️ So: once something is managed by Terraform, change it ONLY through
     Terraform. Hand edits get silently undone on the next apply.‼️
```

---

## 10. Many of the Same Thing — `for_each` & `count`

```hcl
# for_each — one resource per item in a set or map
resource "aws_sqs_queue" "jobs" {
  for_each = toset(["emails", "reports"])

  name = "${local.name_prefix}-${each.key}" # taskboard-dev-emails, taskboard-dev-reports
  tags = local.common_tags
}

# Refer to one:   aws_sqs_queue.jobs["emails"].url
# All of them:    { for name, q in aws_sqs_queue.jobs : name => q.url }
```

```hcl
# count — mostly used as an on/off switch
resource "aws_s3_bucket" "preview" {
  count  = var.environment == "prod" ? 0 : 1 # not in prod, 1 everywhere else
  bucket = "${local.name_prefix}-preview-${data.aws_caller_identity.current.account_id}"
}

# Refer to it:  aws_s3_bucket.preview[0].bucket
```

```text
‼️ Prefer for_each for lists of things. With count, items are numbered
   [0], [1], [2] — remove the FIRST one and every item after it shifts,
   so Terraform destroys and recreates them all. for_each uses names, so
   removing "emails" only touches "emails".‼️
```

---

## 11. Modules — Reusable Blocks

```text
A MODULE is just a folder of .tf files with variables (inputs) and
outputs. It's a FUNCTION for infrastructure: write it once, call it many times.

  infra/
  ├── main.tf
  └── modules/
      └── bucket/
          └── main.tf     ← the module
```

```hcl
# modules/bucket/main.tf — the "function"
variable "name" {
  type = string
}

variable "versioning" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_s3_bucket" "this" {
  bucket = var.name
  tags   = var.tags
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versioning ? "Enabled" : "Suspended"
  }
}

output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}
```

```hcl
# main.tf — "calling" the module
module "logs_bucket" {
  source     = "./modules/bucket" # a local folder…
  name       = "${local.name_prefix}-logs-${data.aws_caller_identity.current.account_id}"
  versioning = false
  tags       = local.common_tags
}

# Use its outputs:  module.logs_bucket.bucket_name
```

```text
Modules can also come from the public registry (registry.terraform.io):

  module "vpc" {
    source  = "terraform-aws-modules/vpc/aws"
    version = "~> 6.0"   # ‼️ pin it
    # ...
  }

‼️ After adding a module → run `terraform init` again.
‼️ Beginner advice: don't build modules on day one. Write plain resources
   first; pull out a module when you're copy-pasting the same block.
```

---

## 12. Environments — dev, staging, prod

```text
‼️ EACH ENVIRONMENT NEEDS ITS OWN STATE. If dev and prod share one state,
   a dev apply can change or delete prod.

The simplest setup — same code, different inputs, different state:

  infra/
  ├── main.tf  variables.tf  outputs.tf  versions.tf
  ├── dev.tfvars
  └── prod.tfvars

  # each environment points at its own state file
  terraform init -backend-config="key=taskboard/dev/terraform.tfstate"
  terraform apply -var-file=dev.tfvars

Another common setup — one folder per environment, each calling shared modules:

  infra/
  ├── modules/...
  ├── dev/main.tf     (module calls + dev values + dev backend)
  └── prod/main.tf    (module calls + prod values + prod backend)

‼️ Either works. What matters: separate state, and ALWAYS check which
   environment you're in before apply.
```

```text
TERRAFORM IN CI — how most teams run it
  On every pull request:   terraform fmt -check
                           terraform validate
                           terraform plan       → posted as a PR comment
  On merge to main:        terraform apply

  ‼️ The reviewer reads the PLAN, not just the code. "+1 to add" and
     "-1 to destroy" look very different in review.
```

---

## 13. Common Beginner Mistakes

```text
‼️ 1. Applying without reading the plan.
   Read every line — especially "destroy" and "must be replaced".

‼️ 2. Committing terraform.tfstate.
   It contains secrets in plain text. Add it to .gitignore; use a remote backend.

‼️ 3. Keeping state on one laptop.
   Laptop dies → Terraform forgets everything. Use remote state with locking.

‼️ 4. Changing things by hand in the console.
   The next apply undoes them (drift). Change it in code instead.

‼️ 5. Access keys inside .tf files.
   Use `aws configure` / SSO / environment variables. Never in the code.

‼️ 6. Not pinning provider versions.
   A new major version changes behaviour under you. Use version = "~> 6.0"
   and commit .terraform.lock.hcl.

‼️ 7. Forgetting `terraform init` after adding a provider, module or backend.
   "Module not installed" / "provider not available" errors.

‼️ 8. Dev and prod sharing state.
   One wrong apply hits production. Separate state per environment.

‼️ 9. count for lists of things.
   Removing one item shifts the rest → mass replace. Use for_each.

‼️ 10. Renaming a resource in code.
   aws_s3_bucket.uploads → aws_s3_bucket.files looks like "delete one, create
   another". Use a `moved` block so Terraform knows it's the same thing:
     moved {
       from = aws_s3_bucket.uploads
       to   = aws_s3_bucket.files
     }

‼️ 11. Running destroy in the wrong folder or environment.
   Double-check which state you're pointed at. Add prevent_destroy to
   anything precious.
```

---

## 14. Cheat Sheet

```bash
# ── WORKFLOW ──────────────────────────────────────────────────────────────
terraform init                        # set up / after adding providers, modules, backend
terraform fmt                         # format files
terraform validate                    # check syntax
terraform plan  -var-file=dev.tfvars  # dry run
terraform apply -var-file=dev.tfvars  # do it (asks "yes")
terraform destroy                     # delete everything ‼️

# ── INSPECT ───────────────────────────────────────────────────────────────
terraform output                      # show outputs
terraform state list                  # everything Terraform manages
terraform state show aws_s3_bucket.uploads   # details of one resource
```

```hcl
# ── BLOCKS ────────────────────────────────────────────────────────────────
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" { region = var.region }

resource "TYPE" "NAME" { ... }          # create + manage     → TYPE.NAME.attr
data     "TYPE" "NAME" { ... }          # read existing        → data.TYPE.NAME.attr
variable "x" { type = string }          # input                → var.x
locals   { y = "..." }                  # internal value       → local.y
output   "z" { value = ... }            # print                → terraform output
module   "m" { source = "./modules/m" } # reuse                → module.m.output_name

# ── LOOPS ─────────────────────────────────────────────────────────────────
for_each = toset(["a", "b"])            # → each.key
count    = var.enabled ? 1 : 0          # on/off switch → [0]

# ── SAFETY ────────────────────────────────────────────────────────────────
lifecycle { prevent_destroy = true }   # inside a resource
moved {
  from = aws_s3_bucket.old_name
  to   = aws_s3_bucket.new_name
}
```

```text
PLAN SYMBOLS
  +  create     ~  update in place     -  destroy     -/+  replace (delete + create)‼️

RULES
  1. Read the plan before every apply
  2. State: never commit, never hand-edit, store remotely with a lock
  3. Separate state per environment
  4. Pin provider versions; commit .terraform.lock.hcl
  5. No credentials in .tf files
  6. Once Terraform manages it, change it only through Terraform
```

---

## Related Files

- [DEVOPS-INFRASTRUCTURE-DEEP.md](../1-high-priority/DEVOPS-INFRASTRUCTURE-DEEP.md) — §18–20: Terraform fundamentals, state management and modules at senior depth, plus EKS and CI/CD
- [DOCKER-BASICS.md](DOCKER-BASICS.md) — containers, the things Terraform often deploys
- [DOCKER-KUBERNETES-DEEP.md](DOCKER-KUBERNETES-DEEP.md) — running containers at scale
- [CICD-DEPLOYMENT-DEEP.md](CICD-DEPLOYMENT-DEEP.md) — running plan and apply in a pipeline
