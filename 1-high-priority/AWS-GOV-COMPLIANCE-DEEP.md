# AWS Government, Security & Compliance — Senior Deep Reference

Government cloud and enterprise compliance is one of the most lucrative and misunderstood areas in cloud architecture. Companies selling to federal agencies, healthcare organizations, financial institutions, and defense contractors need architects who understand both the technical controls AND the bureaucratic process. This file covers everything from GovCloud isolation to FedRAMP authorization to multi-account enterprise architecture — the kind of knowledge that separates a senior cloud architect from someone who just passed the cert exam.

---

## Table of Contents

1. [AWS GovCloud](#1-aws-govcloud)
2. [FedRAMP](#2-fedramp)
3. [FISMA & NIST 800-53](#3-fisma--nist-800-53)
4. [Compliance Frameworks Overview](#4-compliance-frameworks-overview)
5. [AWS Organizations & Multi-Account Strategy](#5-aws-organizations--multi-account-strategy)
6. [Network Architecture for Gov/Enterprise](#6-network-architecture-for-goventerprise)
7. [Security Tooling Stack](#7-security-tooling-stack)
8. [Identity & Access for Gov](#8-identity--access-for-gov)
9. [Encryption & Key Management](#9-encryption--key-management)
10. [Logging, Audit & SIEM](#10-logging-audit--siem)
11. [Disaster Recovery & Resilience](#11-disaster-recovery--resilience)
12. [Infrastructure as Code & Governance](#12-infrastructure-as-code--governance)
13. [Cost Governance for Large Projects](#13-cost-governance-for-large-projects)
14. [Large-Scale Migration](#14-large-scale-migration)
15. [Common Interview Questions](#15-common-interview-questions)

---

## 1. AWS GovCloud

### What Is GovCloud

```text
AWS GovCloud is a set of isolated AWS regions designed for US government
workloads and regulated industries. They are physically and logically
separated from commercial AWS regions.‼️

Two GovCloud regions:
  us-gov-west-1  (Oregon)    — launched 2011, most services available
  us-gov-east-1  (Ohio)      — launched 2018, still catching up on services

Key facts:
  - Operated by US persons on US soil (ITAR requirement)‼️
  - Separate AWS accounts — you cannot use your commercial account
  - Separate IAM — no identity federation between commercial and GovCloud
  - Separate billing — though you can link via AWS Organizations
  - NOT automatically compliant — GovCloud provides the environment,
    YOU still need to implement controls and get your own ATO‼️
  - GovCloud is FedRAMP High authorized by AWS itself

Who needs GovCloud vs commercial AWS:
  MUST use GovCloud:
    - Workloads handling ITAR/EAR data (defense articles, technical data)
    - DOD Impact Level 4 and 5 workloads (IL4/IL5)
    - Workloads requiring FedRAMP High baseline (some agencies require it)
    - Organizations handling CUI (Controlled Unclassified Information)
      when the contract mandates GovCloud

  Can use commercial AWS:
    - FedRAMP Low and Moderate workloads (many commercial regions are
      FedRAMP Moderate authorized)
    - HIPAA workloads (commercial regions support BAA)
    - PCI-DSS workloads
    - SOC 2 workloads
    - State and local government (unless policy requires GovCloud)

  Common mistake: assuming all government work requires GovCloud.
  Many federal agencies run FedRAMP Moderate workloads in commercial
  US regions (us-east-1, us-west-2). GovCloud adds cost and complexity —
  only use it when regulations demand it.‼️
```

### GovCloud Access & Account Structure

```text
Getting access to GovCloud:
  1. You need an existing commercial AWS account as the "linked" payer
  2. Apply for GovCloud access through AWS (requires US entity validation)
  3. AWS creates a separate GovCloud account
  4. You get separate root credentials for the GovCloud account
  5. Console URL is different: https://console.amazonaws-us-gov.com

Account linking:
  - Your commercial account is the "payer" account
  - GovCloud accounts appear under consolidated billing
  - But IAM, resources, and services are completely separate
  - You CANNOT assume roles cross-region between commercial and GovCloud‼️

AWS Organizations in GovCloud:
  - You can create a separate AWS Organization within GovCloud
  - This is INDEPENDENT of your commercial Organization
  - SCPs, OUs, and account structure are managed separately
  - Best practice: mirror your commercial OU structure in GovCloud
    but expect to manage them as two separate environments

Identity considerations:
  - IAM users/roles are per-account (same as commercial)
  - IAM Identity Center (SSO) works in GovCloud but is a separate instance
  - SAML federation works — you can federate to your on-prem AD
  - No cross-region STS federation between commercial and GovCloud
```

### GovCloud Pricing & Service Gaps

```text
Pricing differences:
  - GovCloud is typically 2-5% more expensive than commercial regions‼️
  - Some services have higher premiums (especially newer ones)
  - Data transfer between GovCloud regions costs more
  - No free tier in GovCloud
  - Reserved Instances and Savings Plans work but are GovCloud-specific

Service availability gaps (common pain points):
  Services NOT available in GovCloud (or launched much later):
    - Newer AI/ML services (SageMaker is available, but newer features lag)
    - Some managed services launch 6-18 months after commercial
    - Marketplace has fewer AMIs and products
    - Some third-party integrations don't support GovCloud endpoints
    - CloudFormation resource types may lag behind commercial

  Services available in GovCloud:
    - Core compute: EC2, ECS, EKS, Lambda, Fargate
    - Storage: S3, EBS, EFS, Glacier
    - Database: RDS, DynamoDB, Aurora, ElastiCache, Redshift
    - Networking: VPC, Transit Gateway, Direct Connect, Route 53
    - Security: KMS, CloudHSM, GuardDuty, Security Hub, Config
    - Management: CloudFormation, CloudWatch, Systems Manager

  Workaround patterns for missing services:
    - Run workloads that need unavailable services in commercial regions
      (only if data classification allows)
    - Use open-source alternatives deployed on EC2/EKS
    - Wait — AWS continuously adds services to GovCloud
    - Submit feature requests through your AWS account team

ITAR/EAR explained:‼️
  ITAR (International Traffic in Arms Regulations):
    - Controls defense articles, services, and technical data
    - Administered by State Department (DDTC)
    - Data must be accessed only by US persons
    - GovCloud satisfies this — all operators are US persons on US soil

  EAR (Export Administration Regulations):
    - Controls dual-use items (commercial items with military applications)
    - Administered by Commerce Department (BIS)
    - Broader scope than ITAR but generally less restrictive
    - Some EAR data can run in commercial regions depending on classification
```

---

## 2. FedRAMP

### What Is FedRAMP

```text
FedRAMP (Federal Risk and Authorization Management Program) is the US
government's standardized approach to security assessment, authorization,
and continuous monitoring for cloud products and services.‼️

Why it matters:
  - If you want to sell cloud services to federal agencies, you need FedRAMP
  - It's based on NIST 800-53 controls
  - Once authorized, the authorization can be reused by other agencies
    ("do once, use many times")‼️
  - It applies to CSPs (Cloud Service Providers), not to agencies themselves

Authorization levels (impact levels):‼️
  FedRAMP Low:
    - For systems where loss of CIA would have LIMITED adverse effect
    - ~125 controls
    - Examples: public websites, non-sensitive collaboration tools
    - Fastest and cheapest to achieve
    - Rare — most agencies require at least Moderate

  FedRAMP Moderate:
    - For systems where loss of CIA would have SERIOUS adverse effect
    - ~325 controls‼️
    - Covers ~80% of federal use cases
    - Examples: email, case management, HR systems, CRM
    - This is the sweet spot — most SaaS vendors target Moderate first
    - AWS commercial regions (us-east-1, us-west-2, etc.) are
      FedRAMP Moderate authorized

  FedRAMP High:
    - For systems where loss of CIA would have SEVERE or CATASTROPHIC effect
    - ~421 controls‼️
    - Examples: law enforcement, healthcare, financial, defense
    - Much more expensive and time-consuming
    - AWS GovCloud is FedRAMP High authorized
    - Requires additional controls like FIPS 140-2 validated encryption,
      enhanced logging, stricter access controls
```

### The ATO Process

```text
ATO = Authority to Operate — the formal authorization to run a system‼️

Two paths to FedRAMP authorization:

Path 1: JAB (Joint Authorization Board) Provisional ATO (P-ATO)‼️
  - JAB = DOD CIO, DHS CIO, GSA CIO
  - More rigorous but more prestigious
  - P-ATO is "provisional" — agencies still issue their own ATO on top
  - Best for: broad market appeal (many agencies will use it)
  - Timeline: 6-12 months after readiness
  - The JAB selects which CSPs to review (limited capacity)

Path 2: Agency ATO‼️
  - A single agency sponsors and authorizes the CSP
  - Faster to start (no JAB queue)
  - The sponsoring agency's Authorizing Official (AO) signs off
  - Other agencies can reuse, but may add additional requirements
  - Best for: you have one agency customer willing to sponsor
  - Timeline: 3-9 months after readiness

The process step by step:
  1. Preparation Phase (3-6 months)
     - Engage a 3PAO (Third-Party Assessment Organization)
     - Document your system in the SSP (System Security Plan)
     - Implement all required NIST 800-53 controls
     - Create the full documentation package:
       - SSP (System Security Plan) — the big one, 300-500 pages‼️
       - SAP (Security Assessment Plan) — how the 3PAO will test
       - SAR (Security Assessment Report) — test results
       - POA&M (Plan of Action and Milestones) — remediation plan

  2. Assessment Phase (1-3 months)
     - 3PAO performs the assessment
     - Penetration testing, vulnerability scanning
     - Control testing (interviews, documentation review, technical tests)
     - Produces the SAR with findings

  3. Authorization Phase (1-3 months)
     - Submit package to JAB or agency AO
     - Review and feedback cycles
     - Address findings, update POA&M
     - AO signs the ATO letter

  4. Continuous Monitoring (ongoing, forever)‼️
     - Monthly vulnerability scans
     - Annual penetration testing
     - Monthly POA&M updates
     - Significant Change Requests (SCRs) for architecture changes
     - Annual security assessment (subset of controls)
     - Report to FedRAMP PMO

Cost estimates (real-world):‼️
  Initial authorization:
    - 3PAO assessment: $200K - $600K
    - Documentation/consulting: $150K - $400K
    - Tooling and remediation: $100K - $500K
    - Total initial: $500K - $1.5M (Moderate), $1M - $3M+ (High)

  Annual continuous monitoring:
    - 3PAO annual assessment: $100K - $200K
    - Monthly scanning/reporting: $50K - $150K/year
    - Staff (2-3 FTEs minimum): $300K - $600K/year
    - Total annual: $500K - $1M+

  This is why FedRAMP is a significant business decision — it's not
  just a technical checkbox. You need revenue to justify the investment.
```

### 3PAO and POA&M

```text
3PAO (Third-Party Assessment Organization):‼️
  - Independent assessors accredited by A2LA (American Association for
    Laboratory Accreditation) or FedRAMP-recognized body
  - They test your controls — you cannot self-assess
  - They produce the SAR (Security Assessment Report)
  - Common 3PAOs: Coalfire, Schellman, A-LIGN, Kratos, Deloitte
  - Choose carefully — a good 3PAO helps you pass, a bad one wastes months

  What 3PAOs test:
    - Technical controls (pen testing, vulnerability scanning, config review)
    - Operational controls (incident response procedures, change management)
    - Management controls (risk assessments, security plans, training)
    - Interview personnel who implement/manage controls
    - Review evidence (screenshots, logs, policies, tickets)

POA&M (Plan of Action and Milestones):‼️
  - A living document tracking all known security weaknesses
  - Every finding from the assessment goes into the POA&M
  - Each entry has: finding, risk level, remediation plan, milestone dates
  - You must show progress — agencies and FedRAMP PMO review monthly

  Risk levels for POA&M items:
    Critical: must remediate within 30 days
    High: must remediate within 90 days
    Moderate: must remediate within 180 days
    Low: must remediate within 365 days

  You can get your ATO with open POA&M items (this is normal) but
  too many high/critical items will block authorization.

  Operational requirements (POA&M management):
    - False positives must be documented and approved
    - Risk acceptance requires AO (Authorizing Official) signature
    - Deviation requests for controls you can't fully implement
    - Vendor dependencies must be tracked (e.g., waiting for AWS
      to release a feature you need for a control)
```

### FedRAMP for SaaS/PaaS/IaaS

```text
How FedRAMP applies at each layer:

IaaS (e.g., AWS, Azure, GCP):‼️
  - The cloud provider handles physical, infrastructure controls
  - AWS's FedRAMP authorization covers ~60% of controls at Moderate
  - You inherit these controls — document them as "inherited" in your SSP
  - Example: PE (Physical and Environmental Protection) controls are
    fully inherited from AWS

PaaS (e.g., Heroku, managed databases):
  - Inherits IaaS controls plus some operational controls
  - Fewer controls for you to implement, but you still own application-level
  - Example: if you use RDS, AWS handles database patching (CM controls),
    but you own access control (AC controls) and audit logging (AU controls)

SaaS (e.g., your application on top of AWS):‼️
  - You inherit infrastructure controls from your IaaS/PaaS
  - You implement application-level controls
  - You own: access control, audit logging, incident response,
    configuration management, vulnerability management for your code
  - The shared responsibility model is CRITICAL to understand and document

                ┌─────────────────────────────────────────┐
                │         Shared Responsibility           │
                ├──────────┬──────────┬───────────────────┤
                │   IaaS   │   PaaS   │       SaaS        │
                │ (AWS)    │ (managed │ (your app)         │
                │          │ services)│                    │
                ├──────────┼──────────┼───────────────────┤
                │ Physical │ Physical │ Physical           │
                │ Network  │ Network  │ Network            │
  AWS owns →    │ Hypervis │ OS/Patch │ Infrastructure     │
                │          │ Runtime  │ Platform           │
                ├──────────┼──────────┼───────────────────┤
                │ OS       │ App Code │ App Code           │
  You own →     │ App Code │ Data     │ Data               │
                │ Data     │ IAM      │ IAM                │
                │ IAM      │ Client   │ Client config      │
                └──────────┴──────────┴───────────────────┘

  When writing your SSP, for each control you state:‼️
    "Fully Implemented"  — you do it yourself
    "Inherited"          — your IaaS/PaaS does it (cite their authorization)
    "Shared"             — split between you and the infrastructure
    "Planned"            — not yet done (goes into POA&M)
    "Alternative"        — you meet the intent differently (needs justification)
    "Not Applicable"     — doesn't apply (needs justification)
```

---

## 3. FISMA & NIST 800-53

### FISMA Overview

```text
FISMA (Federal Information Security Modernization Act):‼️
  - Federal law requiring agencies to secure their information systems
  - Applies to federal agencies and contractors operating federal systems
  - Mandates use of NIST standards and guidelines
  - Requires annual reporting to Congress on security posture
  - Originally FISMA 2002, updated in 2014 (FISMA Modernization)

  FISMA requires agencies to:
    1. Categorize information systems (FIPS 199)
    2. Select security controls (NIST 800-53)
    3. Implement controls
    4. Assess controls
    5. Authorize systems (ATO)
    6. Monitor continuously

  FISMA vs FedRAMP:
    - FISMA applies to agency-owned systems
    - FedRAMP applies to cloud services USED BY agencies
    - Both use NIST 800-53 controls
    - FedRAMP is essentially FISMA for the cloud‼️
```

### FIPS 199 — Security Categorization

```text
FIPS 199 defines three security objectives and three impact levels:‼️

Security objectives:
  Confidentiality — protection against unauthorized disclosure
  Integrity      — protection against unauthorized modification
  Availability   — ensuring timely and reliable access

Impact levels (for each objective):
  Low:      limited adverse effect
  Moderate: serious adverse effect
  High:     severe or catastrophic adverse effect

System categorization formula:‼️
  SC = { (confidentiality, impact), (integrity, impact), (availability, impact) }

  The OVERALL system categorization = the HIGH WATER MARK
  (the highest impact level across all three objectives)

  Example:
    SC = { (confidentiality, Moderate), (integrity, Low), (availability, Low) }
    System is categorized as: MODERATE (because of confidentiality)

  Example:
    SC = { (confidentiality, High), (integrity, Moderate), (availability, Low) }
    System is categorized as: HIGH (because of confidentiality)

  This categorization drives:
    - Which NIST 800-53 baseline you use (Low, Moderate, High)
    - How many controls you must implement
    - How rigorous your assessment must be
    - How much your ATO will cost

  Common mistake: over-categorizing your system. If you rate everything
  as High, you'll implement 400+ controls when you might only need 125.
  Be precise about what data your system actually handles.‼️
```

### NIST 800-53 Control Families

```text
NIST 800-53 Rev 5 defines 20 control families with ~1,000+ controls:‼️

  AC — Access Control (who can access what)
       AC-2: Account Management
       AC-3: Access Enforcement (RBAC, ABAC)
       AC-6: Least Privilege‼️
       AC-17: Remote Access (VPN, MFA)

  AT — Awareness and Training
       AT-2: Literacy Training and Awareness
       AT-3: Role-Based Training

  AU — Audit and Accountability‼️
       AU-2: Event Logging (what to log)
       AU-3: Content of Audit Records (what each log must contain)
       AU-6: Audit Record Review, Analysis, and Reporting
       AU-9: Protection of Audit Information (immutable logs)
       AU-11: Audit Record Retention (how long to keep)

  CA — Assessment, Authorization, and Monitoring
       CA-2: Control Assessments
       CA-6: Authorization (the ATO itself)
       CA-7: Continuous Monitoring

  CM — Configuration Management‼️
       CM-2: Baseline Configuration
       CM-3: Configuration Change Control
       CM-6: Configuration Settings (hardening)
       CM-7: Least Functionality (disable unnecessary services)
       CM-8: System Component Inventory

  CP — Contingency Planning
       CP-2: Contingency Plan
       CP-4: Contingency Plan Testing
       CP-9: System Backup
       CP-10: System Recovery and Reconstitution

  IA — Identification and Authentication‼️
       IA-2: Identification and Authentication (Organizational Users)
       IA-2(1): MFA for privileged accounts
       IA-2(2): MFA for non-privileged accounts
       IA-5: Authenticator Management (password policies)
       IA-8: Identification and Authentication (Non-Organizational Users)

  IR — Incident Response‼️
       IR-2: Incident Response Training
       IR-4: Incident Handling
       IR-5: Incident Monitoring
       IR-6: Incident Reporting (timelines matter — 1 hour for critical)
       IR-8: Incident Response Plan

  MA — Maintenance
       MA-2: Controlled Maintenance
       MA-4: Nonlocal Maintenance

  MP — Media Protection
       MP-2: Media Access
       MP-6: Media Sanitization (data destruction)

  PE — Physical and Environmental Protection
       PE-2: Physical Access Authorizations
       PE-3: Physical Access Control
       (mostly inherited from AWS in cloud environments)

  PL — Planning
       PL-2: System Security and Privacy Plans (the SSP)

  PM — Program Management
       PM-1: Information Security Program Plan

  PS — Personnel Security
       PS-3: Personnel Screening (background checks)
       PS-4: Personnel Termination (access revocation)

  PT — PII Processing and Transparency (new in Rev 5)
       PT-2: Authority to Process PII
       PT-3: PII Processing Purposes

  RA — Risk Assessment
       RA-3: Risk Assessment
       RA-5: Vulnerability Monitoring and Scanning‼️

  SA — System and Services Acquisition
       SA-4: Acquisition Process (security in procurement)
       SA-11: Developer Testing and Evaluation

  SC — System and Communications Protection‼️
       SC-7: Boundary Protection (firewalls, network segmentation)
       SC-8: Transmission Confidentiality and Integrity (TLS)
       SC-12: Cryptographic Key Establishment and Management
       SC-13: Cryptographic Protection (FIPS 140-2)
       SC-28: Protection of Information at Rest (encryption at rest)

  SI — System and Information Integrity‼️
       SI-2: Flaw Remediation (patching timelines)
       SI-3: Malicious Code Protection (antimalware)
       SI-4: System Monitoring
       SI-5: Security Alerts and Advisories
       SI-7: Software, Firmware, and Information Integrity

  SR — Supply Chain Risk Management (new in Rev 5)
       SR-2: Supply Chain Risk Management Plan
       SR-3: Supply Chain Controls and Processes

How NIST 800-53 maps to FedRAMP:‼️
  - FedRAMP uses NIST 800-53 as its foundation
  - FedRAMP adds "additional requirements and guidance" on top
  - FedRAMP parameter values are often stricter
    Example: NIST says "implement MFA" — FedRAMP says "implement
    FIPS 140-2 validated MFA with hardware token for privileged accounts"
  - FedRAMP baselines are subsets of NIST 800-53 with specific parameters
  - Think of FedRAMP as "NIST 800-53 with teeth" — it's prescriptive
    where NIST is flexible
```

### Risk Management Framework (RMF)

```text
NIST RMF (SP 800-37 Rev 2) — the 7-step process:‼️

  Step 1: PREPARE
    - Establish context and priorities
    - Identify stakeholders, risk tolerance, system boundaries
    - AWS context: define your system boundary diagram showing which
      AWS services are in scope, data flows, trust boundaries

  Step 2: CATEGORIZE
    - Apply FIPS 199 to determine impact levels
    - Document in the SSP
    - AWS context: what data does your system handle? PII? PHI? CUI?

  Step 3: SELECT
    - Choose the appropriate control baseline (Low, Moderate, High)
    - Tailor controls (add/remove based on system specifics)
    - Apply overlays if applicable (e.g., privacy overlay, cloud overlay)
    - AWS context: identify inherited vs shared vs implemented controls

  Step 4: IMPLEMENT
    - Put controls into action
    - Document HOW each control is implemented
    - AWS context: configure Security Groups, enable CloudTrail,
      set up KMS keys, enable MFA, configure VPC flow logs, etc.

  Step 5: ASSESS
    - 3PAO or internal assessor tests the controls
    - Produces SAR with findings
    - AWS context: pen test, vulnerability scan, config review

  Step 6: AUTHORIZE
    - AO reviews the security package and makes risk decision
    - Signs ATO letter (or denies/conditions it)
    - ATO is typically valid for 3 years with continuous monitoring

  Step 7: MONITOR
    - Ongoing assessment of controls
    - Report changes, vulnerabilities, incidents
    - Annual reauthorization or continuous ATO (cATO)‼️
    - AWS context: Security Hub dashboards, Config compliance,
      GuardDuty findings, regular vulnerability scans

  cATO (Continuous ATO) — the modern approach:‼️
    - Instead of a 3-year cycle, you maintain continuous authorization
    - Requires automated monitoring and reporting
    - Real-time dashboards showing control compliance
    - Much more aligned with DevSecOps and CI/CD
    - DOD is pushing hard toward cATO
    - Tools: AWS Security Hub, Config, automated evidence collection
```

---

## 4. Compliance Frameworks Overview

### SOC 2

```text
SOC 2 (System and Organization Controls 2):‼️
  - Developed by AICPA (American Institute of CPAs)
  - Not a certification — it's an audit report (attestation)
  - Focused on service organizations (SaaS, cloud providers, MSPs)
  - The most commonly requested compliance report in tech

Type I vs Type II:‼️
  Type I:
    - Point-in-time assessment
    - "Are controls designed properly as of [date]?"
    - Faster and cheaper (~$30K-$80K)
    - Good for: startups proving initial compliance posture
    - Less valued — only shows design, not operating effectiveness

  Type II:
    - Assessment over a period (typically 6-12 months)
    - "Are controls operating effectively over [period]?"‼️
    - More expensive (~$50K-$150K) and takes longer
    - This is what enterprise customers actually want
    - Shows sustained compliance, not just a snapshot
    - Must be renewed annually

Trust Service Criteria (TSC):
  Security (Common Criteria) — required for all SOC 2‼️
    - Logical and physical access controls
    - System operations, change management
    - Risk mitigation

  Availability — system uptime and recovery
    - SLAs, DR planning, monitoring
    - Include if you make availability commitments

  Processing Integrity — data processing accuracy
    - QA, data validation, error handling
    - Include if you process financial or critical data

  Confidentiality — protection of confidential information
    - Encryption, access controls, data classification
    - Include if you handle sensitive business data

  Privacy — personal information protection
    - PII handling, consent, retention, disposal
    - Include if you handle consumer PII

AWS controls that support SOC 2:
  - CloudTrail → audit logging (CC6.1, CC7.2)
  - IAM MFA → access control (CC6.1)
  - Security Hub → monitoring (CC7.1, CC7.2)
  - AWS Config → change management (CC8.1)
  - GuardDuty → threat detection (CC7.2)
  - S3 versioning + Object Lock → data integrity
  - Backup/DR → availability criteria
```

### ISO 27001 / 27017 / 27018

```text
ISO 27001 — Information Security Management System (ISMS):‼️
  - International standard for managing information security
  - Requires establishing an ISMS (policies, processes, controls)
  - Certification by accredited body (valid for 3 years with annual audits)
  - 93 controls across 4 themes (organizational, people, physical, tech)
  - More process-focused than SOC 2 (which is control-focused)

ISO 27017 — Cloud Security:
  - Extension of ISO 27001 for cloud services
  - Additional controls specific to cloud computing
  - Shared responsibility guidance
  - Relevant if you're a CSP

ISO 27018 — Cloud Privacy:
  - Extension for PII protection in public cloud
  - Maps to privacy principles (consent, data minimization, etc.)
  - Relevant if you process PII in the cloud

ISO vs SOC 2 — when to use which:‼️
  ISO 27001:
    - International recognition (European/Asian customers prefer it)
    - Requires certified ISMS — more process overhead
    - Good for: global companies, European market, mature orgs

  SOC 2:
    - US-centric (though increasingly global)
    - More flexible — you choose which TSC to include
    - Good for: US market, SaaS companies, startup to enterprise

  Many enterprises maintain both — ISO 27001 for global customers,
  SOC 2 Type II for US enterprise sales.
```

### HIPAA

```text
HIPAA (Health Insurance Portability and Accountability Act):‼️
  - US law protecting health information
  - Applies to Covered Entities (healthcare providers, insurers, clearinghouses)
    and Business Associates (anyone handling PHI on their behalf)
  - There is NO "HIPAA certification" — you either comply or you don't‼️
  - Enforced by HHS Office for Civil Rights (OCR)

Key terms:
  PHI (Protected Health Information):‼️
    - Any health data + identifying information
    - 18 identifiers: name, DOB, SSN, address, phone, email, MRN, etc.
    - If it has health data + any identifier = PHI
    - De-identified data (all 18 identifiers removed) is NOT PHI

  ePHI: PHI in electronic form (what we care about in cloud)

  BAA (Business Associate Agreement):‼️
    - Legal contract between covered entity and business associate
    - AWS will sign a BAA — you must request it through your account
    - The BAA covers specific "HIPAA-eligible services" on AWS
    - Not ALL AWS services are HIPAA-eligible — check the list
    - Without a BAA, you CANNOT store ePHI on AWS‼️

HIPAA technical safeguards (what you implement):
  Access Control:
    - Unique user IDs, emergency access procedures
    - Automatic logoff, encryption and decryption
    - MFA for all users accessing ePHI

  Audit Controls:
    - Record and examine access to ePHI
    - CloudTrail + CloudWatch for AWS environments
    - 6-year retention for HIPAA audit logs‼️

  Integrity Controls:
    - Protect ePHI from unauthorized alteration/destruction
    - S3 versioning, checksums, integrity monitoring

  Transmission Security:
    - Encrypt ePHI in transit (TLS 1.2+)
    - VPN or Direct Connect for hybrid architectures

  Encryption at rest:
    - Not explicitly "required" by HIPAA text, but effectively mandatory
    - Encrypt everything: EBS, S3, RDS, DynamoDB, etc.
    - Use KMS with customer-managed keys for audit trail

AWS HIPAA architecture pattern:
  - Sign BAA with AWS
  - Use only HIPAA-eligible services
  - Encrypt everything (at rest and in transit)
  - Enable CloudTrail with log file validation
  - Isolate ePHI workloads in dedicated VPCs
  - Use IAM policies to restrict access to ePHI resources
  - Enable VPC Flow Logs
  - Regular risk assessments
  - Incident response procedures (breach notification within 60 days)
```

### PCI-DSS

```text
PCI-DSS (Payment Card Industry Data Security Standard):‼️
  - Required for anyone who stores, processes, or transmits cardholder data
  - 12 requirements across 6 categories
  - Current version: PCI DSS 4.0 (effective March 2024)
  - Enforced by card brands (Visa, Mastercard, etc.) through acquiring banks

SAQ (Self-Assessment Questionnaire) levels:‼️
  Level 1: >6 million transactions/year → annual on-site audit by QSA
  Level 2: 1-6 million transactions/year → annual SAQ
  Level 3: 20K-1 million e-commerce transactions/year → annual SAQ
  Level 4: <20K e-commerce or <1M other → annual SAQ (least rigorous)

  Best strategy: minimize your cardholder data environment (CDE)‼️
    - Use tokenization (Stripe, Braintree) so you never touch card data
    - If you never see card numbers, your PCI scope shrinks dramatically
    - AWS can be "in scope" if it's part of your CDE

The 12 requirements (simplified):
  1. Install and maintain network security controls (firewalls, NACLs)
  2. Apply secure configurations (no defaults, hardening)
  3. Protect stored account data (encryption, tokenization, masking)
  4. Encrypt transmission of cardholder data (TLS everywhere)
  5. Protect against malicious software (antimalware, vulnerability mgmt)
  6. Develop secure systems and software (SDLC, code review)
  7. Restrict access by business need-to-know (RBAC)
  8. Identify users and authenticate access (MFA, unique IDs)
  9. Restrict physical access to cardholder data (inherited from AWS)
  10. Log and monitor all access (CloudTrail, SIEM)
  11. Test security regularly (pen testing, vulnerability scanning)
  12. Support infosec with organizational policies (governance)

Network segmentation for PCI on AWS:‼️
  - Isolate CDE in its own VPC (or dedicated subnets)
  - Security Groups: whitelist only necessary traffic to CDE
  - NACLs: additional layer of deny rules
  - No internet-facing resources in CDE (use ALB in separate subnet)
  - VPC Flow Logs on CDE subnets
  - Network Firewall for IDS/IPS on CDE traffic
  - Document all data flows in and out of CDE

  ┌────────────────────────────────────────────┐
  │              AWS Account                    │
  │  ┌────────────────┐  ┌──────────────────┐  │
  │  │  Public VPC     │  │  CDE VPC         │  │
  │  │  ┌──────────┐   │  │  ┌────────────┐ │  │
  │  │  │ ALB      │───┼──┼─→│ App Server │ │  │
  │  │  └──────────┘   │  │  └──────┬─────┘ │  │
  │  │                 │  │         │        │  │
  │  │  ┌──────────┐   │  │  ┌──────▼─────┐ │  │
  │  │  │ Web App  │   │  │  │ Tokenizer  │ │  │
  │  │  └──────────┘   │  │  └──────┬─────┘ │  │
  │  └────────────────┘  │         │        │  │
  │                      │  ┌──────▼─────┐  │  │
  │                      │  │ Encrypted  │  │  │
  │                      │  │ RDS        │  │  │
  │                      │  └────────────┘  │  │
  │                      └──────────────────┘  │
  └────────────────────────────────────────────┘
```

### CMMC, StateRAMP, CJIS, IRS 1075

```text
CMMC (Cybersecurity Maturity Model Certification):‼️
  - Required for DOD contractors handling CUI
  - Replaced self-attestation with third-party assessment
  - CMMC 2.0 has three levels:

  Level 1: Foundational (17 controls)
    - Basic cyber hygiene
    - Self-assessment allowed
    - For FCI (Federal Contract Information)

  Level 2: Advanced (110 controls — maps to NIST 800-171)‼️
    - For CUI (Controlled Unclassified Information)
    - Third-party assessment required for critical programs
    - Self-assessment for non-critical programs
    - This is where most defense contractors need to be

  Level 3: Expert (110+ controls with additional from NIST 800-172)
    - For highest priority programs
    - Government-led assessment (DIBCAC)
    - Advanced persistent threat protection

  CUI (Controlled Unclassified Information):
    - Not classified, but still sensitive government data
    - Marking: "CUI" or "Controlled"
    - Examples: technical drawings, export-controlled data, law enforcement
      sensitive data, proprietary business information from government

StateRAMP:
  - FedRAMP equivalent for state and local government
  - Uses same NIST 800-53 controls
  - Three levels: Impact Level 1, 2, 3 (similar to FedRAMP Low/Mod/High)
  - Growing adoption — some states mandate it
  - If you have FedRAMP, StateRAMP is easier to achieve

CJIS (Criminal Justice Information Services):‼️
  - FBI policy for anyone accessing criminal justice data
  - Applies to: law enforcement, courts, corrections, any vendor
    supporting these agencies
  - Key requirements:
    - Advanced authentication (MFA required)
    - Encryption at rest and in transit (FIPS 140-2)
    - Personnel screening (background checks)
    - Audit logging (who accessed what, when)
    - Media protection (secure disposal)
  - AWS has CJIS-compliant regions and will sign a CJIS security addendum
  - You still need to implement application-level controls

IRS 1075:
  - Safeguarding Federal Tax Information (FTI)
  - Applies to: agencies and contractors handling tax return data
  - Very restrictive:
    - Data must stay within US borders
    - Background checks for all personnel
    - Encryption requirements (FIPS 140-2)
    - Strict access controls and auditing
    - Annual safeguard reviews by IRS
  - AWS GovCloud supports IRS 1075 workloads
  - Consider GovCloud mandatory for IRS 1075 data
```

---

## 5. AWS Organizations & Multi-Account Strategy

### Why Multi-Account

```text
Single AWS account is NEVER appropriate for enterprise/gov workloads.‼️

Why multiple accounts:
  1. Blast radius reduction — compromised account doesn't affect others‼️
  2. Billing isolation — each team/project has clear costs
  3. Service quotas — per-account limits don't block other teams
  4. Security boundaries — IAM is per-account, hard limits between workloads
  5. Compliance isolation — HIPAA workloads separated from non-HIPAA
  6. Environment separation — dev/staging/prod in different accounts

Real-world account counts:
  Small startup: 3-5 accounts
  Mid-size company: 20-50 accounts
  Enterprise: 100-500+ accounts
  Large government program: 50-200+ accounts
```

### OU Structure & Landing Zone

```text
Recommended OU (Organizational Unit) structure:‼️

  Root
  ├── Security OU
  │   ├── Log Archive account (centralized logging)‼️
  │   ├── Security Tooling account (GuardDuty, Security Hub, Config)
  │   └── Audit account (read-only cross-account access)
  │
  ├── Infrastructure OU
  │   ├── Network Hub account (Transit Gateway, DNS, Direct Connect)‼️
  │   ├── Shared Services account (AD, CI/CD, artifact repos)
  │   └── Identity account (IAM Identity Center, if separate)
  │
  ├── Workloads OU
  │   ├── Production OU
  │   │   ├── App A - Prod
  │   │   ├── App B - Prod
  │   │   └── App C - Prod
  │   ├── Staging OU
  │   │   ├── App A - Staging
  │   │   └── App B - Staging
  │   └── Development OU
  │       ├── App A - Dev
  │       └── App B - Dev
  │
  ├── Sandbox OU
  │   ├── Developer Sandbox 1
  │   └── Developer Sandbox 2
  │
  ├── Suspended OU (for decommissioned accounts)‼️
  │   └── [accounts being decommissioned]
  │
  └── Exceptions OU (for accounts that need different policies)

Key accounts explained:

  Management Account (root of the org):‼️
    - ONLY used for organization management
    - No workloads, no applications, minimal resources
    - Controls billing, OU structure, SCPs
    - MFA on root user, hardware key required
    - Highly restricted access (2-3 people maximum)

  Log Archive Account:‼️
    - ALL logs flow here (CloudTrail, VPC Flow Logs, Config, etc.)
    - S3 buckets with Object Lock (WORM — Write Once Read Many)
    - Immutable logs for compliance and forensics
    - Restricted access — even admins can't delete logs
    - Cross-account log delivery via organization-level CloudTrail

  Security Tooling Account:
    - GuardDuty admin (delegated from management account)
    - Security Hub admin
    - AWS Config aggregator
    - Inspector admin
    - Macie admin
    - This is where your security team lives

  Network Hub Account:‼️
    - Transit Gateway owner
    - Direct Connect gateway
    - Route 53 hosted zones (shared via RAM)
    - DNS Firewall rules
    - Centralized egress (NAT Gateways, proxy)
    - Network Firewall for inspection

AWS Control Tower:‼️
  - Automated landing zone setup
  - Pre-configured guardrails (SCPs + Config rules)
  - Account Factory for automated account provisioning
  - Dashboard for compliance status
  - Built on Organizations, CloudTrail, Config, SSO

  Control Tower guardrails:
    Preventive (SCPs) — block actions:
      - Deny root account usage
      - Deny leaving the organization
      - Deny disabling CloudTrail
      - Deny creating resources outside approved regions

    Detective (Config rules) — detect violations:
      - Check S3 buckets are not public
      - Check EBS volumes are encrypted
      - Check MFA is enabled for IAM users

    Proactive (CloudFormation hooks) — prevent at deployment:
      - Block non-compliant resources before creation
      - Enforce tagging at deployment time

Account vending (automated account creation):
  - Control Tower Account Factory (built-in)
  - AFT (Account Factory for Terraform) — IaC-based account creation
  - Customizations for Control Tower (CfCT) — CloudFormation-based
  - Custom: Step Functions + Lambda + Organizations API

  What account vending should do:
    1. Create account in the correct OU
    2. Apply baseline (CloudTrail, Config, GuardDuty enrollment)
    3. Configure networking (VPC, TGW attachment)
    4. Set up IAM Identity Center permissions
    5. Apply mandatory tags
    6. Notify the requester
```

### Service Control Policies (SCPs)

```text
SCPs — organizational-level IAM guardrails:‼️

  Key concepts:
    - SCPs are DENY-only guardrails (they restrict, never grant)‼️
    - They apply to ALL principals in the account (including root)
    - They do NOT apply to the management account‼️
    - Applied at OU or account level, inherited downward
    - Even if an IAM policy allows it, SCP can deny it

  Essential SCPs for gov/enterprise:

  1. Region restriction:
     {
       "Effect": "Deny",
       "Action": "*",
       "Resource": "*",
       "Condition": {
         "StringNotEquals": {
           "aws:RequestedRegion": [
             "us-east-1",
             "us-west-2",
             "us-gov-west-1"
           ]
         },
         "ArnNotLike": {
           "aws:PrincipalARN": "arn:aws:iam::*:role/AdminBreakGlass"
         }
       }
     }

  2. Deny disabling security services:
     Deny actions:
       - guardduty:DeleteDetector
       - guardduty:DisassociateFromMasterAccount
       - securityhub:DisableSecurityHub
       - config:StopConfigurationRecorder
       - config:DeleteConfigurationRecorder
       - cloudtrail:StopLogging
       - cloudtrail:DeleteTrail

  3. Deny root account usage:
     Deny all actions where principal is root
     (except for things only root can do, like certain billing actions)

  4. Deny public S3 access:
     Deny s3:PutBucketPublicAccessBlock where
     BlockPublicAcls = false or BlockPublicPolicy = false

  5. Deny unencrypted resources:
     Deny ec2:RunInstances, rds:CreateDBInstance, etc.
     unless encryption is enabled

  6. Require IMDSv2 for EC2:
     Deny ec2:RunInstances where
     ec2:MetadataHttpTokens != "required"

  SCP strategy tips:‼️
    - Start with an "allow all" SCP and add deny statements
    - Test in Sandbox OU first before applying to Production
    - Always include break-glass role exceptions
    - Use Condition keys to exempt specific roles/services
    - SCPs can cause service disruptions if not tested carefully
    - Monitor SCP denials via CloudTrail (look for AccessDenied events)
```

---

## 6. Network Architecture for Gov/Enterprise

### Transit Gateway Hub-and-Spoke

```text
Transit Gateway (TGW) — the backbone of enterprise networking:‼️

  Without TGW:
    - VPC peering is point-to-point (N*(N-1)/2 connections)
    - 10 VPCs = 45 peering connections
    - 50 VPCs = 1,225 peering connections (unmanageable)
    - No transitive routing — if A peers with B and B peers with C,
      A cannot reach C through B‼️

  With TGW:
    - Hub-and-spoke: all VPCs connect to TGW
    - 50 VPCs = 50 TGW attachments (linear)
    - Supports transitive routing
    - Centralized route management
    - Cross-account support via RAM (Resource Access Manager)
    - Cross-region TGW peering

  Architecture:
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  VPC A   │   │  VPC B   │   │  VPC C   │
    │ (App 1)  │   │ (App 2)  │   │ (App 3)  │
    └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │
         │    TGW Attachments          │
         │              │              │
    ┌────▼──────────────▼──────────────▼─────┐
    │          Transit Gateway                │
    │  ┌─────────────────────────────────┐    │
    │  │    Route Tables                 │    │
    │  │  Production RT → isolated       │    │
    │  │  Shared RT → shared services    │    │
    │  │  Inspection RT → via firewall   │    │
    │  └─────────────────────────────────┘    │
    └────┬──────────────┬──────────────┬─────┘
         │              │              │
    ┌────▼─────┐  ┌─────▼────┐  ┌─────▼────────┐
    │ Shared   │  │ Egress   │  │ On-prem      │
    │ Services │  │ VPC      │  │ (Direct      │
    │ VPC      │  │ (NAT/    │  │  Connect/    │
    │          │  │  Proxy)  │  │  VPN)        │
    └──────────┘  └──────────┘  └──────────────┘

  TGW route table segmentation:‼️
    - Production RT: routes only to shared services and egress
    - Dev RT: routes to shared services, no cross-environment access
    - Inspection RT: forces traffic through Network Firewall
    - This prevents production VPCs from talking to dev VPCs

  TGW limits to know:
    - 5,000 attachments per TGW
    - 50 Gbps per VPC attachment (burst to 50 Gbps, sustained ~10 Gbps)
    - 20 route tables per TGW
    - TGW is regional — use TGW peering for cross-region
```

### Direct Connect & VPN

```text
Direct Connect (DX) — private dedicated connection to AWS:‼️

  Dedicated Connection:
    - Physical port at a DX location (colocation facility)
    - Speeds: 1 Gbps, 10 Gbps, 100 Gbps
    - You get a dedicated port on the AWS router
    - Lead time: weeks to months (physical installation)
    - You need equipment at the DX location (or partner)

  Hosted Connection:
    - Through a DX partner (e.g., Megaport, Equinix)
    - Speeds: 50 Mbps to 10 Gbps
    - Faster provisioning (days to weeks)
    - Lower commitment
    - Good for: smaller bandwidth needs, faster setup

  Virtual Interfaces (VIFs):
    Private VIF: connects to VPCs (via VGW or Direct Connect Gateway)
    Public VIF: connects to AWS public services (S3, DynamoDB)
    Transit VIF: connects to Transit Gateway‼️

  LAG (Link Aggregation Group):
    - Bundle multiple DX connections for throughput and resilience
    - All connections must be same speed and same DX location
    - Active-active: traffic distributed across all links
    - If one link fails, traffic shifts to remaining links

  High availability pattern:‼️
    ┌─────────┐        ┌──────────────┐       ┌────────┐
    │ On-prem │──DX──→ │ DX Location 1│──────→│        │
    │ Router  │        └──────────────┘       │  AWS   │
    │         │        ┌──────────────┐       │  TGW   │
    │         │──DX──→ │ DX Location 2│──────→│        │
    └─────────┘        └──────────────┘       └────────┘
                                                  │
                       ┌──────────────┐           │
    Backup: ──VPN────→ │   Internet   │──VPN────→ │
                       └──────────────┘

    - Two DX connections at DIFFERENT locations (not same building)‼️
    - VPN as backup (over internet, lower cost, higher latency)
    - Failover: if both DX connections fail, VPN takes over
    - BGP with AS path prepending for failover preference

Site-to-Site VPN:
  - IPSec tunnels over the internet
  - Each VPN connection has 2 tunnels (for redundancy)
  - Throughput: ~1.25 Gbps per tunnel
  - Latency: variable (internet-dependent)
  - Use cases: backup for DX, branch offices, quick connectivity
  - Accelerated VPN: uses AWS Global Accelerator for better performance

  VPN vs Direct Connect:‼️
    DX:  predictable latency, higher throughput, higher cost, longer setup
    VPN: variable latency, lower throughput, lower cost, quick setup
    Best: DX primary + VPN backup
```

### VPC Design & Network Segmentation

```text
Subnet strategy for gov/enterprise:‼️

  Three-tier subnet design per VPC:
    Public subnets:
      - ALB, NAT Gateway, bastion hosts (if any)
      - Route to Internet Gateway
      - MINIMAL resources here

    Private subnets:
      - Application servers, ECS tasks, Lambda (VPC-attached)
      - Route to NAT Gateway for outbound internet
      - No inbound from internet

    Isolated subnets (data tier):
      - RDS, ElastiCache, Elasticsearch
      - NO internet route (no NAT Gateway route)‼️
      - Can only be accessed from private subnets
      - Use VPC endpoints for AWS service access (S3, DynamoDB, KMS)

  CIDR planning:‼️
    - Plan your CIDR blocks BEFORE deploying anything
    - Use a consistent scheme across all VPCs
    - Avoid overlapping CIDRs (breaks peering and TGW)
    - Leave room for growth
    - Document everything in a central IP address management (IPAM) tool
    - AWS VPC IPAM can automate CIDR allocation

    Example scheme:
      10.0.0.0/8 — entire organization
      10.1.0.0/16 — Production
        10.1.0.0/20 — App A Prod
        10.1.16.0/20 — App B Prod
      10.2.0.0/16 — Staging
      10.3.0.0/16 — Development
      10.4.0.0/16 — Shared Services
      10.100.0.0/16 — Sandbox

NACLs vs Security Groups:‼️
  Security Groups:
    - Stateful (return traffic automatically allowed)
    - Applied at ENI (network interface) level
    - Allow rules only (no explicit deny)
    - Can reference other security groups
    - Evaluated as a whole (all rules checked)
    - Use for: application-level access control

  NACLs:
    - Stateless (must allow both inbound and outbound)‼️
    - Applied at subnet level
    - Both allow AND deny rules
    - Rules evaluated in order (lowest number first)
    - Use for: subnet-level guardrails, deny specific IPs/ranges

  For gov/compliance, use BOTH:
    - NACLs as coarse-grained subnet boundaries
    - Security Groups as fine-grained application rules
    - Document both in your SSP

VPC Flow Logs:‼️
  - Capture IP traffic going to/from network interfaces
  - Send to: CloudWatch Logs, S3, or Kinesis Data Firehose
  - Levels: VPC, subnet, or ENI
  - Essential for: compliance auditing, troubleshooting, threat detection
  - For compliance: enable on ALL VPCs, ALL subnets
  - Retention: align with compliance requirements (HIPAA=6yrs, PCI=1yr)
  - Format: source IP, dest IP, source port, dest port, protocol, action, bytes
  - Custom format in v5: add VPC ID, subnet ID, instance ID, TCP flags
```

### Zero Trust & Advanced Networking

```text
Zero Trust on AWS:‼️
  Core principle: "Never trust, always verify" — no implicit trust based
  on network location. Every request must be authenticated and authorized.

  Implementation patterns:
    1. Identity-centric access:
       - IAM Roles Anywhere (for on-prem workloads)
       - Short-lived credentials everywhere (no long-lived keys)
       - MFA for all human access
       - Service-to-service authentication (mutual TLS, IAM roles)

    2. Microsegmentation:
       - Security Groups per service (not per tier)
       - Each service can only talk to its dependencies
       - No broad "allow all within VPC" rules‼️

    3. Encryption everywhere:
       - TLS for all internal communication
       - VPC encryption in transit (available on some instance types)
       - PrivateLink for service-to-service instead of VPC peering

    4. Continuous verification:
       - CloudTrail logging all API calls
       - GuardDuty monitoring network traffic
       - Real-time alerting on anomalies

AWS PrivateLink:‼️
  Interface Endpoints:
    - ENI in your VPC with private IP
    - Connects to AWS services privately (no internet)
    - Supports: S3, DynamoDB, KMS, STS, EC2, SSM, CloudWatch, etc.
    - Also supports third-party services on AWS Marketplace
    - Costs: ~$0.01/hr per AZ + data processing charges
    - Essential for gov: keeps traffic off the internet

  Gateway Endpoints:
    - Route table entry (no ENI, no cost)
    - Only supports S3 and DynamoDB‼️
    - Preferred for S3/DynamoDB (free vs interface endpoint cost)
    - Add gateway endpoint policies to restrict access

  PrivateLink for your own services:
    - Expose your service through a Network Load Balancer
    - Create a VPC Endpoint Service
    - Consumers create interface endpoints in their VPCs
    - No VPC peering needed, no overlapping CIDR issues
    - Great for: shared services across accounts

AWS Network Firewall:‼️
  - Managed IDS/IPS and stateful firewall
  - Deployed in a dedicated firewall subnet
  - Inspect traffic using Suricata-compatible rules
  - Can inspect:
    - TLS SNI (Server Name Indication) — domain filtering without decryption
    - HTTP host headers
    - Full packet inspection (with TLS decryption)
  - Use cases:
    - Centralized egress filtering (allow only approved domains)
    - IDS/IPS for compliance (NIST SI-4, PCI 11.4)
    - East-west traffic inspection between VPCs

  Centralized egress inspection pattern:
    ┌────────┐     ┌────────┐     ┌────────┐
    │ VPC A  │     │ VPC B  │     │ VPC C  │
    └───┬────┘     └───┬────┘     └───┬────┘
        │              │              │
    ┌───▼──────────────▼──────────────▼───┐
    │          Transit Gateway             │
    │    (Inspection RT → firewall VPC)    │
    └──────────────┬──────────────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │        Firewall VPC                  │
    │  ┌────────────────────────────┐     │
    │  │   Network Firewall         │     │
    │  │   (Suricata rules)         │     │
    │  └───────────┬────────────────┘     │
    │              │                       │
    │  ┌───────────▼────────────────┐     │
    │  │   NAT Gateway              │     │
    │  └───────────┬────────────────┘     │
    │              │                       │
    │  ┌───────────▼────────────────┐     │
    │  │   Internet Gateway         │     │
    │  └────────────────────────────┘     │
    └─────────────────────────────────────┘

Route 53 Resolver & DNS Firewall:
  Route 53 Resolver:
    - Forward DNS queries between on-prem and VPC
    - Inbound endpoint: on-prem resolves VPC private DNS
    - Outbound endpoint: VPC resolves on-prem DNS
    - Resolver rules shared across accounts via RAM

  DNS Firewall:‼️
    - Filter outbound DNS queries from VPCs
    - Block known malicious domains
    - Allow only approved domains (whitelist mode)
    - Managed domain lists (e.g., AWS threat intelligence)
    - Custom domain lists for your organization
    - Complements Network Firewall (defense in depth)

WAF (Web Application Firewall):
  - Attached to ALB, CloudFront, API Gateway, AppSync
  - Rule types:
    - Rate-based: block IPs exceeding request threshold
    - IP set: allow/deny specific IPs/ranges
    - Managed rules: AWS and marketplace rule groups
    - Custom rules: match on headers, body, URI, query string
  - Gov-relevant managed rule groups:
    - AWSManagedRulesCommonRuleSet (OWASP Top 10)
    - AWSManagedRulesSQLiRuleSet (SQL injection)
    - AWSManagedRulesKnownBadInputsRuleSet
    - AWSManagedRulesAnonymousIpList (Tor, VPN, proxy)
  - Log WAF decisions to S3/CloudWatch for compliance evidence
```

---

## 7. Security Tooling Stack

### GuardDuty

```text
GuardDuty — intelligent threat detection:‼️

  What it does:
    - Analyzes CloudTrail events, VPC Flow Logs, DNS logs
    - Uses machine learning and threat intelligence
    - Detects reconnaissance, instance compromise, account compromise
    - No agents to install, no infrastructure to manage
    - Enable per-account, but use delegated admin for org-wide management

  Data sources:
    - CloudTrail management events (API calls)
    - CloudTrail S3 data events (S3 API calls)
    - VPC Flow Logs (network traffic metadata)
    - DNS logs (DNS queries from VPC)
    - EKS audit logs (Kubernetes API calls)
    - RDS login activity
    - Lambda network activity
    - Malware protection (EBS volume scanning)

  Finding types (know these for interviews):‼️
    Recon:
      - Recon:EC2/PortProbeUnprotectedPort — port scanning detected
      - Recon:EC2/Portscan — instance is scanning other hosts

    Instance compromise:
      - Backdoor:EC2/DenialOfService.Tcp — instance participating in DDoS
      - CryptoCurrency:EC2/BitcoinTool.B — crypto mining detected‼️
      - Trojan:EC2/BlackholeTraffic — instance sending traffic to blackhole IPs
      - UnauthorizedAccess:EC2/SSHBruteForce

    Account compromise:
      - UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B — anomalous login
      - PenTest:IAMUser/KaliLinux — API calls from Kali Linux
      - Persistence:IAMUser/UserPermissions — unusual IAM changes
      - UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration‼️
        (credentials used from outside the instance — possible SSRF/exfil)

    S3:
      - Policy:S3/BucketBlockPublicAccessDisabled
      - Stealth:S3/ServerAccessLoggingDisabled
      - Discovery:S3/MaliciousIPCaller

  GuardDuty architecture for organizations:
    Management Account → delegates admin to Security Tooling account
    Security Tooling Account → manages GuardDuty for all member accounts
    All findings flow to Security Tooling for centralized triage
    EventBridge rules → SNS/Lambda for automated response
```

### Security Hub

```text
Security Hub — centralized security posture management:‼️

  What it does:
    - Aggregates findings from GuardDuty, Inspector, Macie, Config,
      Firewall Manager, IAM Access Analyzer, and third-party tools
    - Runs automated compliance checks against standards
    - Provides a security score
    - Cross-account and cross-region aggregation

  Built-in standards:‼️
    AWS Foundational Security Best Practices (FSBP):
      - AWS-specific controls
      - ~200 automated checks
      - Good baseline for any AWS environment

    CIS AWS Foundations Benchmark:
      - Center for Internet Security benchmark
      - v1.4.0 and v3.0.0 available
      - Industry-standard hardening guide
      - 50+ controls (IAM, logging, monitoring, networking)

    PCI DSS v3.2.1:
      - Automated checks for PCI-relevant AWS controls
      - Does NOT make you PCI compliant, but helps

    NIST 800-53 Rev 5:
      - Maps Security Hub checks to NIST controls
      - Very relevant for FedRAMP and FISMA
      - Helps demonstrate continuous compliance

  Using Security Hub for compliance evidence:‼️
    - Enable all relevant standards
    - Set up cross-account aggregation (delegated admin)
    - Export findings to S3 for long-term retention
    - Create custom insights for compliance dashboards
    - Integrate with ticketing (Jira, ServiceNow) via EventBridge
    - Automate remediation for common findings

  Example automated remediation:
    Security Hub finding → EventBridge rule → Lambda function
      - S3 bucket public → Lambda removes public access
      - EBS volume unencrypted → Lambda snapshots and creates encrypted copy
      - Security Group allows 0.0.0.0/0 SSH → Lambda removes the rule
```

### AWS Config

```text
AWS Config — configuration tracking and compliance:‼️

  What it does:
    - Records configuration of AWS resources over time
    - Evaluates configurations against rules
    - Provides configuration history and change timeline
    - Essential for: "show me the configuration of this resource on [date]"

  Managed rules (know these):
    - s3-bucket-public-read-prohibited
    - s3-bucket-server-side-encryption-enabled
    - encrypted-volumes (EBS encryption)
    - rds-storage-encrypted
    - cloudtrail-enabled
    - iam-user-mfa-enabled
    - root-account-mfa-enabled
    - restricted-ssh (no 0.0.0.0/0 on port 22)
    - vpc-flow-logs-enabled
    - multi-region-cloudtrail-enabled
    - iam-password-policy (complexity, rotation)

  Conformance Packs:‼️
    - Collections of Config rules packaged together
    - Pre-built packs:
      - Operational Best Practices for NIST 800-53
      - Operational Best Practices for HIPAA
      - Operational Best Practices for PCI DSS
      - Operational Best Practices for FedRAMP Moderate
      - Operational Best Practices for CIS
    - Deploy across org via StackSets
    - These are goldmines for compliance — they map Config rules
      to specific control requirements‼️

  Auto-remediation:
    Config rule violation → SSM Automation document → fix
    Examples:
      - Enable S3 encryption → AWS-EnableS3BucketEncryption
      - Enable EBS encryption → custom SSM document
      - Remove public S3 access → AWS-DisableS3BucketPublicReadWrite
      - Enable VPC flow logs → custom SSM document

  Config aggregator:
    - Cross-account, cross-region aggregation
    - Deploy in Security Tooling account
    - View compliance across entire organization
    - Required for enterprise/gov — you need a single pane of glass
```

### Other Security Services

```text
CloudTrail:‼️
  - Logs ALL AWS API calls (management events)
  - Organization trail: one trail for all accounts‼️
  - Data events: S3 object-level, Lambda invocations, DynamoDB
    (more expensive but required for some compliance frameworks)
  - CloudTrail Insights: detect unusual API activity
  - Log file validation: detect if logs were tampered with
  - Send to: S3 (Log Archive account), CloudWatch Logs
  - Retention: keep forever in S3 (compliance), 90 days in CloudWatch
  - For gov: enable management + data events, org trail, log validation

Macie:
  - Discovers and protects sensitive data in S3
  - Uses ML to identify PII, PHI, financial data
  - Scans S3 buckets for: SSN, credit cards, passport numbers, API keys
  - Produces findings with severity levels
  - Use case: "prove we don't have PII in our S3 buckets" (compliance)
  - Can run on schedule (daily, weekly, monthly)

Inspector:
  - Automated vulnerability scanning
  - Scans: EC2 instances, Lambda functions, ECR container images
  - Checks for: CVEs, network reachability, software vulnerabilities
  - Produces findings with CVSS scores
  - Continuous scanning (no agents for Lambda/ECR, SSM agent for EC2)
  - For compliance: RA-5 (Vulnerability Scanning) control

Detective:
  - Investigation tool for security findings
  - Analyzes CloudTrail, VPC Flow Logs, GuardDuty findings
  - Creates behavior graphs (who did what, when, from where)
  - Use case: after GuardDuty alerts, use Detective to investigate

IAM Access Analyzer:‼️
  - Identifies resources shared with external principals
  - Analyzes: IAM roles, S3 buckets, Lambda functions, KMS keys,
    SQS queues, Secrets Manager secrets
  - Generates findings when external access is detected
  - Policy validation: checks IAM policies for issues
  - Policy generation: creates least-privilege policies from CloudTrail
  - For gov: essential for ensuring no unintended external access

Trusted Advisor:
  - High-level best practice checks
  - Categories: cost optimization, performance, security, fault tolerance
  - Security checks: open ports, MFA, IAM use, S3 permissions
  - Full checks require Business or Enterprise support plan
  - Less detailed than Security Hub but good for executive dashboards
```

---

## 8. Identity & Access for Gov

### IAM Identity Center (AWS SSO)

```text
IAM Identity Center — centralized access management:‼️

  What it does:
    - Single sign-on to all AWS accounts in your org
    - Centralized permission management
    - Supports MFA, external identity providers
    - Replaces per-account IAM users (which don't scale)‼️

  Identity sources:
    1. Identity Center directory (built-in, good for small orgs)
    2. Active Directory (AWS Managed Microsoft AD or AD Connector)‼️
    3. External IdP via SAML 2.0 (Okta, Azure AD, Ping)
    4. External IdP via SCIM (automatic user/group provisioning)

  Permission Sets:‼️
    - Define what a user/group can do in an account
    - Attach to user/group + account combinations
    - Pre-built: AdministratorAccess, ReadOnlyAccess, PowerUserAccess
    - Custom: your own IAM policy (inline or managed policy reference)
    - Session duration: configurable (1-12 hours)

    Example permission sets for gov:
      - SecurityAuditor: read-only access to security services
      - NetworkAdmin: manage VPC, TGW, Route 53
      - DeveloperAccess: EC2, ECS, Lambda, S3 (not IAM, not networking)
      - BreakGlass: full admin (time-limited, requires approval)‼️
      - BillingViewer: billing and cost data only

  Multi-account access pattern:
    User → Identity Center → selects account → assumes permission set role
    Behind the scenes: Identity Center creates IAM roles in each account
    Short-lived credentials (STS tokens) — no long-lived access keys‼️
```

### Federation & Active Directory

```text
SAML 2.0 Federation:‼️
  - Your existing IdP (Okta, Azure AD, ADFS) authenticates users
  - SAML assertion sent to AWS STS
  - STS returns temporary credentials
  - User assumes an IAM role mapped to their SAML attributes

  Flow:
    User → IdP (authenticate) → SAML Assertion → AWS STS
    → Temporary Credentials → Access AWS Console/API

OIDC Federation:
  - Similar to SAML but uses OpenID Connect
  - More common for web/mobile applications
  - Cognito User Pools or direct OIDC integration

Active Directory integration options:‼️

  AWS Managed Microsoft AD:
    - Full Microsoft AD running on AWS
    - Two domain controllers (multi-AZ)
    - Supports: Group Policy, trusts, LDAP, Kerberos
    - Can establish trust with on-prem AD
    - Use for: full AD functionality, RDS SQL Server, WorkSpaces
    - Cost: ~$250/month (Standard) to ~$500/month (Enterprise)

  AD Connector:
    - Proxy to your on-prem AD (no data stored in AWS)
    - Redirects authentication to on-prem
    - Requires VPN or Direct Connect to on-prem
    - Use for: don't want to replicate AD to cloud
    - Limitation: doesn't support trust relationships
    - Lower cost than Managed AD

  Simple AD:
    - Samba-based, not real Microsoft AD
    - Good for: basic LDAP/authentication, Linux workloads
    - Not recommended for gov (limited features)

PIV/CAC Card Integration:‼️
  (Personal Identity Verification / Common Access Card)
  - Required for DOD and many federal agencies
  - Physical smart card with x.509 certificate
  - Integration pattern:
    1. User inserts PIV/CAC card
    2. On-prem ADFS/IdP validates certificate against AD
    3. ADFS generates SAML assertion
    4. AWS STS returns temporary credentials
    5. User accesses AWS console or API

  Key requirements:
    - Certificate-based authentication (not just password)
    - OCSP/CRL checking (certificate revocation)
    - Integration with agency PKI infrastructure
    - Hardware MFA (the card itself is the second factor)
    - Session timeout aligned with agency policy (typically 15-30 min idle)
```

### Advanced IAM Patterns

```text
Attribute-Based Access Control (ABAC):‼️
  - Grant access based on tags/attributes, not explicit resource ARNs
  - More scalable than RBAC for large environments
  - Tag resources with: Project, Environment, CostCenter, DataClassification
  - IAM policies reference tags in conditions

  Example ABAC policy:
    Allow access to EC2 instances where
    user tag "Project" = resource tag "Project"
    AND user tag "Environment" = resource tag "Environment"

    This means:
    - Team A can only access Team A's resources
    - No need to update policies when new resources are created
    - Just tag resources correctly and access works automatically

Permission Boundaries:‼️
  - Maximum permissions an IAM entity CAN have
  - Even if a policy grants more, the boundary limits it
  - Use case: allow developers to create IAM roles, but only with
    permissions up to the boundary
  - Prevents privilege escalation‼️

  Without boundaries:
    Developer creates role → attaches AdministratorAccess → full access

  With boundaries:
    Developer creates role → must attach boundary → role limited to
    boundary permissions regardless of attached policies

Session Policies:
  - Passed at role assumption time (AssumeRole, GetFederationToken)
  - Further restrict the role's permissions for this session
  - Use case: give temporary access with narrower scope
  - Effective permissions = role policies ∩ session policy

Cross-Account Access Patterns:‼️
  1. Cross-account IAM roles:
     - Account A creates role with trust policy for Account B
     - Account B users assume the role in Account A
     - Best practice: require ExternalId to prevent confused deputy

  2. Resource-based policies:
     - S3 bucket policy granting access to another account
     - KMS key policy granting access to another account
     - No role assumption needed (direct access)

  3. AWS RAM (Resource Access Manager):
     - Share resources across accounts: Transit Gateway, subnets,
       Route 53 Resolver rules, License Manager, etc.
     - Can share within org or with specific accounts
     - Some resources MUST be shared via RAM (e.g., TGW)

Break-Glass Procedures:‼️
  - Emergency access when normal access is unavailable
  - Pattern:
    1. Break-glass IAM role exists in each account
    2. Normally blocked by SCP (Deny unless condition met)
    3. Emergency: authorized person activates break-glass
       (manual SCP update or separate trusted account)
    4. All actions during break-glass are heavily logged
    5. Post-incident: review all actions, restore normal access
    6. Document the incident

  Implementation options:
    - Separate break-glass AWS account with cross-account roles
    - Hardware MFA tokens in physical safe (root account recovery)
    - Time-limited SCP exception (CloudWatch alarm auto-reverts)
    - Step Functions workflow requiring multiple approvals
```

---

## 9. Encryption & Key Management

### KMS Deep Dive

```text
KMS (Key Management Service):‼️

  Key types:
    AWS Managed Keys (aws/service):
      - Created and managed by AWS for specific services
      - Auto-rotated every year (365 days)
      - You can't manage the key policy
      - Free (no per-key cost, just usage)
      - Example: aws/s3, aws/ebs, aws/rds

    Customer Managed Keys (CMKs):‼️
      - You create and manage the key
      - You control the key policy (who can use it)
      - Optional auto-rotation (every year, configurable)
      - Costs: $1/month per key + $0.03 per 10,000 API calls
      - Required for: gov/compliance (you need to control key policy)

    Customer Provided Keys (SSE-C for S3):
      - You provide the key with each request
      - AWS doesn't store the key
      - You manage the key lifecycle entirely
      - Use case: very strict key custody requirements

  Key Policies:‼️
    - The primary authorization mechanism for KMS keys
    - Key policy + IAM policy = effective permissions
    - Default key policy allows the account root full access
    - For cross-account: key policy must explicitly allow the other account

    Example key policy for cross-account use:
      {
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
        "Action": [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        "Resource": "*"
      }

  Key Grants:
    - Temporary, scoped access to a KMS key
    - Used by AWS services internally (e.g., EBS attaching encrypted volume)
    - Can be revoked (RetireGrant, RevokeGrant)
    - More granular than key policies for specific operations

  Key Rotation:‼️
    - Automatic rotation: new key material every year
    - Old key material kept for decryption (old data still accessible)
    - Key ID stays the same (transparent to applications)
    - For compliance: prove rotation is enabled and document the policy
    - Manual rotation: create new key, re-encrypt data (more disruptive)

  Multi-Region Keys:
    - Replicate a key to multiple regions
    - Same key material in each region
    - Use case: encrypt in us-east-1, decrypt in us-west-2
    - For DR: encrypted resources can be used in the DR region
    - Primary key + replica keys (same key ID, different ARNs)

  Envelope encryption (how KMS actually works):‼️
    1. You call KMS: GenerateDataKey
    2. KMS returns: plaintext data key + encrypted data key
    3. You encrypt your data with the plaintext data key
    4. You store the encrypted data + encrypted data key together
    5. You DISCARD the plaintext data key
    6. To decrypt: send encrypted data key to KMS → get plaintext key → decrypt

    Why: you don't send all your data to KMS (4KB limit on direct encrypt).
    Only the data key (small) crosses the network to KMS.
```

### CloudHSM & FIPS 140-2

```text
CloudHSM:‼️
  - Dedicated Hardware Security Module in AWS
  - FIPS 140-2 Level 3 validated‼️ (KMS is Level 2)
  - You own and manage the keys — AWS cannot access them
  - Single-tenant: the HSM is yours alone
  - Use cases:
    - Compliance requiring FIPS 140-2 Level 3
    - Contractual requirement for dedicated HSM
    - Custom key store for KMS (KMS + CloudHSM backend)
    - SSL/TLS offloading with keys in HSM
    - Oracle TDE (Transparent Data Encryption)
    - Certificate Authority private key storage

  CloudHSM cluster:
    - Minimum 2 HSMs across AZs for HA
    - Keys are synchronized across HSMs in the cluster
    - If you lose all HSMs AND backups, keys are GONE FOREVER‼️
    - Backup to S3 (encrypted backup that only your cluster can restore)

  KMS Custom Key Store:
    - Use KMS API, but keys stored in your CloudHSM
    - Best of both worlds: KMS integration + FIPS 140-2 Level 3
    - All KMS-integrated services can use it
    - Higher cost than standard KMS

FIPS 140-2 validation levels:
  Level 1: basic requirements, software crypto
  Level 2: tamper-evident seals, role-based auth (KMS)
  Level 3: tamper-resistant, identity-based auth (CloudHSM)‼️
  Level 4: tamper-active, environmental protection (not common in cloud)

FIPS endpoints:‼️
  - AWS provides FIPS-validated TLS endpoints for most services
  - URL pattern: fips.{service}.{region}.amazonaws.com
  - Example: kms-fips.us-east-1.amazonaws.com
  - For FedRAMP High and DOD: FIPS endpoints are REQUIRED
  - Configure your SDK/CLI to use FIPS endpoints:
    export AWS_USE_FIPS_ENDPOINT=true
    or set use_fips_endpoint = true in ~/.aws/config
```

### Encryption Everywhere

```text
S3 encryption options:‼️
  SSE-S3 (AES-256):
    - AWS manages keys entirely
    - Default encryption for all new buckets (Jan 2023+)
    - No additional cost
    - Least control but simplest

  SSE-KMS:
    - Uses KMS keys (AWS managed or customer managed)
    - Audit trail: every decrypt shows in CloudTrail‼️
    - Per-request KMS costs
    - Key policy controls who can decrypt
    - Required for most compliance frameworks

  SSE-C:
    - You provide the key with every request
    - AWS doesn't store the key
    - Must use HTTPS
    - Complex to manage (you handle key lifecycle)

  Client-side encryption:
    - Encrypt before sending to S3
    - AWS never sees plaintext data
    - You manage everything
    - Use case: maximum confidentiality requirements

EBS encryption:
  - Enable default EBS encryption per region‼️
  - Uses KMS key (AWS managed or CMK)
  - No performance impact (encryption in the Nitro hypervisor)
  - Encrypted snapshots → encrypted volumes (and vice versa)
  - Cannot un-encrypt a volume — must create new unencrypted copy
  - For compliance: enable default encryption in ALL regions via SCP

RDS encryption:
  - Enable at creation time (cannot encrypt existing DB)‼️
  - Uses KMS
  - Encrypts: storage, automated backups, snapshots, read replicas
  - Performance impact: minimal (1-5%)
  - To encrypt existing DB: snapshot → copy snapshot with encryption → restore

TLS everywhere:
  - ALB: TLS termination (ACM certificate)
  - NLB: TLS passthrough or termination
  - CloudFront: TLS to origin + TLS to viewers
  - API Gateway: TLS by default
  - RDS: force SSL connections (rds.force_ssl parameter)
  - ElastiCache: in-transit encryption
  - EKS: mutual TLS with service mesh (Istio, App Mesh)

ACM (AWS Certificate Manager):‼️
  - Free public TLS certificates for AWS services
  - Auto-renewal (no certificate expiration if using ACM)
  - DNS or email validation
  - Works with: ALB, NLB, CloudFront, API Gateway
  - Does NOT work with: EC2 (use Private CA or import certs)

  ACM Private CA:
    - Run your own Certificate Authority on AWS
    - Issue private certificates for internal services
    - Supports: mutual TLS, IoT device certificates, code signing
    - Cost: $400/month per CA + per-certificate charges
    - For gov: internal PKI requirements, zero-trust mTLS
```

---

## 10. Logging, Audit & SIEM

### Centralized Logging Architecture

```text
The Log Archive account is the foundation of gov/enterprise logging:‼️

  Architecture:
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Account A  │  │  Account B  │  │  Account C  │
    │             │  │             │  │             │
    │ CloudTrail  │  │ CloudTrail  │  │ CloudTrail  │
    │ VPC Flows   │  │ VPC Flows   │  │ VPC Flows   │
    │ App Logs    │  │ App Logs    │  │ App Logs    │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
    ┌──────▼────────────────▼────────────────▼──────┐
    │              Log Archive Account               │
    │                                                │
    │  ┌──────────────────────────────────────────┐  │
    │  │  S3 Bucket (org-wide logs)                │  │
    │  │  - Object Lock (WORM compliance)          │  │
    │  │  - Lifecycle: IA 90d → Glacier 1yr        │  │
    │  │  - Bucket policy: deny delete‼️            │  │
    │  │  - Versioning enabled                     │  │
    │  │  - KMS encryption (CMK)                   │  │
    │  └──────────────────────────────────────────┘  │
    │                                                │
    │  ┌──────────────────────────────────────────┐  │
    │  │  Athena / QuickSight for log analysis    │  │
    │  └──────────────────────────────────────────┘  │
    └────────────────────────────────────────────────┘

  Log sources and destinations:

    CloudTrail (org trail):‼️
      - ONE trail for the entire organization
      - Configured in management account, logs to Log Archive S3
      - Enable: management events + data events (S3, Lambda)
      - Enable: CloudTrail Insights
      - Enable: log file validation
      - Retention in S3: 7 years (common for gov compliance)

    VPC Flow Logs:
      - Enable on all VPCs in all accounts
      - Send to: S3 in Log Archive account (via cross-account)
      - OR: CloudWatch Logs → subscription filter → Kinesis → S3
      - Include: source/dest IP, ports, protocol, action, bytes
      - Custom fields: VPC ID, subnet ID, instance ID, TCP flags

    ALB/NLB Access Logs:
      - ALB: access logs to S3 (5-min intervals)
      - NLB: flow logs (similar to VPC Flow Logs)
      - Include: client IP, request processing time, response codes

    S3 Access Logs:
      - Server access logging for sensitive buckets
      - Who accessed what object, when, from where
      - Important for: data access auditing

    CloudWatch Logs:
      - Application logs, system logs, custom metrics
      - Cross-account subscription filters → Kinesis → centralized S3
      - Retention: set per log group (1 day to 10 years or never expire)
      - For compliance: set retention policy matching requirements

    Config:
      - Configuration snapshots and changes
      - Send to: S3 in Log Archive account
      - SNS notifications for changes
```

### Immutable Logs & SIEM

```text
Making logs tamper-proof:‼️

  S3 Object Lock (WORM):
    - Governance mode: can be overridden with special IAM permission
    - Compliance mode: NOBODY can delete or overwrite, not even root‼️
    - Retention period: set duration (e.g., 7 years)
    - Legal hold: indefinite retention until explicitly removed
    - For gov: use Compliance mode for audit logs

  S3 Glacier Vault Lock:
    - Similar to Object Lock but for Glacier
    - Vault lock policy: once confirmed, cannot be changed
    - Example: "deny delete for 7 years"
    - Useful for: long-term archival with regulatory retention

  Bucket policy for log protection:
    - Deny s3:DeleteObject, s3:DeleteBucket for all principals
    - Allow only the logging service to write (CloudTrail, Flow Logs)
    - Deny s3:PutBucketPolicy changes (lock the policy itself)
    - Use SCP to prevent Log Archive account admins from changing bucket

  CloudTrail log file validation:‼️
    - Creates a digest file every hour
    - Digest contains hashes of all log files delivered
    - You can verify: aws cloudtrail validate-logs
    - Proves: no log files were modified, deleted, or forged
    - Required for forensic and legal evidence

SIEM Integration:‼️
  Common SIEM platforms:
    Splunk:
      - AWS Add-on for Splunk (pulls from S3, CloudWatch, Kinesis)
      - Splunk on AWS (EC2/EKS) or Splunk Cloud
      - Data volume can get expensive — be selective about what you index

    Elastic (ELK/OpenSearch):
      - Amazon OpenSearch Service (managed)
      - Ingest via Kinesis Firehose or Lambda
      - Lower cost than Splunk, more operational overhead
      - OpenSearch Dashboards for visualization

    Amazon Security Lake:
      - Native AWS service for security data lake
      - Normalizes data to OCSF (Open Cybersecurity Schema Framework)
      - Aggregates: CloudTrail, VPC Flow Logs, Route 53, Security Hub, etc.
      - Third-party source integration
      - Query with Athena or feed to third-party SIEM

  Log aggregation pipeline:
    Source → CloudWatch Logs → Subscription Filter → Kinesis Data Firehose
    → S3 (Log Archive) → Athena (ad-hoc query) / SIEM (real-time analysis)

    OR

    Source → S3 → S3 Event Notification → Lambda → SIEM

Log retention requirements by framework:‼️
  HIPAA:        6 years
  PCI-DSS:      1 year (3 months immediately accessible)
  FedRAMP:      3 years minimum (often 7 years in practice)
  SOC 2:        1 year (or as defined in your policy)
  FISMA:        3 years
  CJIS:         1 year minimum
  IRS 1075:     7 years
  General best practice: 7 years in S3, 90 days in hot storage (CloudWatch/SIEM)

Audit readiness checklist:‼️
  □ CloudTrail org trail enabled with log file validation
  □ VPC Flow Logs on all VPCs
  □ S3 access logging on sensitive buckets
  □ CloudWatch agent on all EC2 instances
  □ Centralized log aggregation in Log Archive account
  □ Immutable storage (Object Lock Compliance mode)
  □ Log retention aligned with compliance requirements
  □ SIEM or log analysis tool configured with alerts
  □ Regular log review process documented
  □ Incident response procedures reference log sources
  □ Evidence of log monitoring (dashboards, alert history)
```

---

## 11. Disaster Recovery & Resilience

### DR Strategies

```text
Four DR strategies (increasing cost and decreasing RTO):‼️

  1. Backup and Restore
     RPO: hours    RTO: hours to days
     Cost: lowest
     ─────────────────────────────────────
     How: regular backups to S3/Glacier, restore when needed
     AWS services: AWS Backup, S3 cross-region replication,
       RDS automated backups, EBS snapshots
     When to use: non-critical workloads, cost-sensitive
     Trade-off: long recovery time, potential data loss

  2. Pilot Light‼️
     RPO: minutes  RTO: hours (minutes to start, hours to scale)
     Cost: low
     ─────────────────────────────────────
     How: core infrastructure running in DR region but scaled down
       - Database replicas running (RDS cross-region read replica)
       - AMIs and container images replicated
       - Infrastructure code ready to deploy
       - Scale up when disaster hits
     When to use: important workloads, moderate budget
     Trade-off: need to test scaling regularly

  3. Warm Standby‼️
     RPO: seconds to minutes  RTO: minutes
     Cost: moderate
     ─────────────────────────────────────
     How: scaled-down but fully functional copy in DR region
       - Full application stack running at minimum capacity
       - Database: synchronous or near-synchronous replication
       - Route 53 health checks ready to failover
       - Scale up to production capacity when needed
     When to use: critical workloads, faster recovery needed
     Trade-off: higher ongoing cost, must maintain two environments

  4. Multi-Site Active-Active‼️
     RPO: near zero  RTO: near zero (seconds)
     Cost: highest (2x or more)
     ─────────────────────────────────────
     How: full production capacity in multiple regions simultaneously
       - Traffic distributed across regions (Route 53 latency/weighted)
       - Database: multi-region active-active (DynamoDB Global Tables,
         Aurora Global Database)
       - Stateless applications in each region
       - If one region fails, other regions absorb traffic
     When to use: mission-critical, zero-downtime requirements
     Trade-off: highest cost, most complex, data consistency challenges

  ┌────────────────────────────────────────────────────────┐
  │  DR Strategy Comparison                                │
  │                                                        │
  │  Cost ──────────────────────────────────────→          │
  │  Low                                    High           │
  │                                                        │
  │  Backup/   Pilot      Warm        Active-Active        │
  │  Restore   Light      Standby     Multi-Site           │
  │                                                        │
  │  ←────────────────────────────────────── RTO           │
  │  Hours/Days           Minutes     Seconds              │
  └────────────────────────────────────────────────────────┘

RPO/RTO targets by tier:‼️
  Tier 1 (Mission Critical): RPO < 1 min, RTO < 15 min
    - Payment processing, authentication, core API
    - Strategy: Active-Active or Warm Standby

  Tier 2 (Business Critical): RPO < 1 hour, RTO < 4 hours
    - CRM, internal tools, secondary services
    - Strategy: Warm Standby or Pilot Light

  Tier 3 (Business Important): RPO < 24 hours, RTO < 24 hours
    - Reporting, batch processing, dev environments
    - Strategy: Pilot Light or Backup/Restore

  Tier 4 (Non-Critical): RPO < 7 days, RTO < 7 days
    - Archives, documentation, sandbox environments
    - Strategy: Backup/Restore
```

### Multi-Region Architecture

```text
Multi-region data replication options:‼️

  S3 Cross-Region Replication (CRR):
    - Asynchronous replication between S3 buckets
    - Can replicate to different account
    - Replication Time Control (RTC): 99.99% within 15 minutes‼️
    - Supports different storage classes in destination
    - Bi-directional replication available

  RDS Cross-Region Read Replicas:
    - Asynchronous replication
    - Can promote replica to standalone DB (manual failover)
    - Replication lag: seconds to minutes typically
    - For DR: pre-create replica, promote during failover

  Aurora Global Database:‼️
    - 1 primary region (read/write), up to 5 secondary regions (read-only)
    - Replication lag: typically <1 second
    - Failover: promote secondary to primary (RPO < 1 second possible)
    - Managed by Aurora (no application-level replication)
    - Write forwarding: secondary regions can forward writes to primary

  DynamoDB Global Tables:‼️
    - Multi-region, multi-active (read/write in any region)
    - Replication lag: typically <1 second
    - Conflict resolution: last-writer-wins
    - No manual failover needed — all regions are active
    - Costs: replicated write capacity in each region

Route 53 for failover:
  Health checks:
    - HTTP/HTTPS/TCP health checks on endpoints
    - CloudWatch alarm-based health checks
    - Calculated health checks (combination of multiple checks)
    - String matching health checks (check response body)

  Failover routing policies:
    - Active-passive: primary + secondary (failover on health check failure)
    - Active-active: weighted or latency-based routing
    - Geolocation: route based on user location
    - Multivalue answer: return multiple healthy endpoints

AWS Backup:‼️
  - Centralized backup management
  - Supports: EBS, RDS, DynamoDB, EFS, FSx, S3, EC2 (AMI)
  - Backup policies: schedule, retention, cross-region copy
  - Backup vault: isolated storage with access policies
  - Backup vault lock: WORM compliance for backup data
  - Organization-level backup policies via AWS Organizations
  - For compliance: automated, auditable, policy-driven backups

AWS Resilience Hub:
  - Define RPO/RTO targets per application
  - Assess if your architecture meets targets
  - Generates recommendations for improvement
  - Runs resiliency tests
  - Monitors compliance with targets over time
  - Good for: proving to auditors that DR requirements are met

Chaos Engineering (AWS Fault Injection Service — FIS):‼️
  - Inject faults to test resilience
  - Experiments:
    - Stop EC2 instances
    - Throttle API calls
    - Disrupt network connectivity
    - Inject latency
    - Increase CPU/memory stress
  - Templates: pre-built experiments
  - Safety: stop conditions (rollback if metrics breach threshold)
  - For compliance: prove your DR plan actually works
  - Run regularly (monthly) — don't just test DR once a year
```

---

## 12. Infrastructure as Code & Governance

### Terraform vs CloudFormation

```text
When to use which:‼️

  CloudFormation:
    - Native AWS (no additional tooling)
    - Deep AWS integration (faster support for new services)
    - StackSets: deploy across org accounts/regions‼️
    - Change sets: preview changes before applying
    - Drift detection: detect manual changes
    - AWS-only teams, simpler requirements
    - Control Tower uses it (CfCT)
    - Service Catalog uses it

  Terraform:
    - Multi-cloud and multi-provider (AWS + Azure + GCP + Datadog + PagerDuty)
    - HCL is more readable than JSON/YAML (subjective but widely agreed)
    - Rich module ecosystem (Terraform Registry)
    - State management gives you a record of what's deployed
    - Plan command for previewing changes
    - Large community, extensive documentation
    - Most enterprise teams prefer Terraform‼️

  For gov/enterprise, Terraform is typically the choice because:
    - Teams often manage AWS + on-prem + other clouds
    - Better module reusability and composition
    - Sentinel/OPA for policy-as-code
    - More mature CI/CD integration

Terraform state management for enterprise:‼️
  Remote state in S3 + DynamoDB locking:
    terraform {
      backend "s3" {
        bucket         = "org-terraform-state"
        key            = "project/environment/terraform.tfstate"
        region         = "us-east-1"
        dynamodb_table = "terraform-state-lock"
        encrypt        = true
        kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abc-123"
      }
    }

  State management best practices:
    - One state file per environment per component‼️
      (not one giant state file for everything)
    - S3 bucket: versioning enabled, encryption, Object Lock
    - DynamoDB table: prevents concurrent state modifications
    - Separate state for: networking, compute, database, security
    - Cross-stack references via terraform_remote_state data source
    - State bucket in a dedicated Infrastructure account

Terraform module patterns:
  Organizational module structure:
    modules/
    ├── vpc/              — standardized VPC with subnets, NACLs
    ├── eks-cluster/      — EKS with approved add-ons
    ├── rds/              — RDS with encryption, backups, monitoring
    ├── s3-compliant/     — S3 with encryption, logging, versioning
    ├── iam-role/         — roles with permission boundaries
    ├── security-baseline/— GuardDuty, Config, CloudTrail setup
    └── account-baseline/ — everything needed for a new account

  Module versioning:
    - Pin module versions (don't use latest)
    - Use a private module registry (Terraform Cloud, S3, Git tags)
    - Semantic versioning for module updates
    - Test modules in sandbox before promoting to production
```

### Policy as Code & Governance

```text
Sentinel (Terraform Cloud/Enterprise):‼️
  - Policy-as-code framework from HashiCorp
  - Evaluate policies against Terraform plans BEFORE apply
  - Example policies:
    - All S3 buckets must have encryption enabled
    - All EC2 instances must use approved AMIs
    - No security groups allowing 0.0.0.0/0 on port 22
    - All resources must have required tags
    - No resources outside approved regions

OPA (Open Policy Agent):
  - Open-source alternative to Sentinel
  - Uses Rego language for policy definitions
  - Can be used with: Terraform, Kubernetes, CI/CD pipelines
  - Conftest: run OPA policies against Terraform plans
  - More portable than Sentinel (not tied to HashiCorp ecosystem)

CloudFormation StackSets:‼️
  - Deploy CloudFormation stacks across multiple accounts and regions
  - Org-wide deployment (deploy to all accounts in an OU)
  - Use cases:
    - Deploy security baseline to all accounts
    - Enable Config rules across the org
    - Create standard IAM roles in every account
    - Deploy VPC with standard subnets to all accounts
  - Automatic deployment to new accounts (when added to OU)
  - Concurrency controls: max concurrent accounts/regions

Drift detection:
  - CloudFormation: built-in drift detection
  - Terraform: terraform plan shows drift from state
  - AWS Config: detect configuration changes vs baseline
  - Important for compliance: prove nobody made manual changes
  - Automate: schedule drift detection runs, alert on findings

Service Catalog:‼️
  - Curated catalog of approved AWS products
  - Users deploy from pre-approved templates
  - Products: CloudFormation templates with constraints
  - Constraints:
    - Template constraints (limit parameter values)
    - Launch constraints (specify IAM role for deployment)
    - Tag update constraints
  - Use case: developers can only deploy approved architectures
  - Portfolios: group products and share with specific accounts

Tagging strategy:‼️
  Mandatory tags (enforce via SCP or Config rules):
    - Environment: production, staging, development, sandbox
    - Project: project identifier
    - Owner: team or individual email
    - CostCenter: billing allocation code
    - DataClassification: public, internal, confidential, restricted‼️
    - ComplianceScope: hipaa, pci, fedramp, none
    - ManagedBy: terraform, cloudformation, manual

  Tag policies (via AWS Organizations):
    - Define allowed tag keys and values
    - Enforce consistency (e.g., "Environment" not "env" or "Env")
    - Report on tag compliance
    - Can be enforced or just reported

  Cost allocation tags:
    - Activated in billing console
    - Appear in Cost Explorer and billing reports
    - Enable showback/chargeback to teams
```

---

## 13. Cost Governance for Large Projects

### Cost Management Tools

```text
AWS Budgets:‼️
  - Set cost, usage, RI/SP coverage budgets
  - Alerts via email or SNS when thresholds are crossed
  - Action budgets: automatically apply SCPs or stop instances
    when budget exceeded‼️
  - Budget types:
    - Cost budget (most common): alert at 80%, 100%, 120%
    - Usage budget: alert when EC2 hours exceed threshold
    - RI/SP utilization: alert if utilization drops below 80%
    - RI/SP coverage: alert if coverage drops below target

Cost Anomaly Detection:
  - ML-based detection of unusual spending
  - Set up monitors: per account, per service, per cost category
  - Sends alerts with root cause analysis
  - Example: "Your EC2 spending increased 300% in us-east-1
    due to 50 new m5.xlarge instances launched by role XYZ"
  - No cost for the service — only pay for SNS notifications

Cost Explorer:
  - Visualize and analyze costs
  - Filter by: account, service, region, tag, usage type
  - Forecast future spending (ML-based)
  - Right-sizing recommendations
  - RI/SP recommendations based on usage history

Compute Optimizer:
  - Analyzes EC2, Auto Scaling, Lambda, EBS, ECS
  - Recommends optimal instance types based on utilization
  - Identifies: over-provisioned (wasting money) and
    under-provisioned (performance risk) resources
  - Savings potential: typically 25-40% on compute‼️
```

### Purchasing Models & FinOps

```text
Reserved Instances vs Savings Plans:‼️

  Reserved Instances (RIs):
    - Commitment: 1 or 3 years
    - Scope: specific instance family, region (or AZ for capacity)
    - Payment: All Upfront (biggest discount), Partial, No Upfront
    - Discount: up to 72% vs on-demand
    - Convertible RIs: can change instance family (lower discount)
    - Standard RIs: locked to instance family (higher discount)
    - Can sell unused RIs on RI Marketplace

  Savings Plans:‼️
    - Commitment: $/hr for 1 or 3 years
    - More flexible than RIs
    - Compute Savings Plans: any EC2, Fargate, Lambda (most flexible)
    - EC2 Instance Savings Plans: specific instance family + region
    - Discount: up to 72% (similar to RIs)
    - Automatically applies to usage (no manual assignment)
    - Recommended for most organizations over RIs

  When to use which:
    RIs: stable, predictable workloads, capacity reservation needed
    Savings Plans: mixed workloads, flexibility needed, simpler management
    On-Demand: unpredictable, short-term, spiky workloads
    Spot: fault-tolerant, flexible, batch processing (up to 90% discount)

EDP (Enterprise Discount Program):‼️
  - Negotiated volume discount with AWS
  - Typically requires $1M+ annual spend commitment
  - Discount: 5-15% on top of other discounts
  - Commit to spending X dollars over 1-3 years
  - If you don't meet the commitment, you still pay the commitment
  - Negotiate: data transfer discounts, support discounts, credits
  - Best negotiated at the end of AWS's fiscal quarter
  - Hire a cloud broker or FinOps consultant for negotiation

FinOps practices:‼️
  Showback: show teams what they're spending (visibility)
  Chargeback: charge teams for what they spend (accountability)

  FinOps lifecycle:
    1. Inform: visibility into costs, tagging, dashboards
    2. Optimize: right-sizing, purchasing commitments, waste removal
    3. Operate: governance, policies, continuous improvement

  Common cost optimizations:
    - Terminate idle resources (unused EC2, unattached EBS, old snapshots)
    - Right-size instances (Compute Optimizer recommendations)
    - Use Graviton instances (20% cheaper, 40% better perf/price)‼️
    - S3 Intelligent-Tiering (automatic cost optimization for S3)
    - NAT Gateway alternatives (reduce data processing charges)
    - Reserved capacity for databases (RDS, ElastiCache, Redshift)
    - Spot for EKS worker nodes (mixed instance groups)
    - Lambda: optimize memory (also affects CPU and cost)
    - CloudFront: reduce origin fetches with better caching
```

---

## 14. Large-Scale Migration

### The 7 Rs Migration Strategies

```text
The 7 Rs — evaluate each workload:‼️

  1. Rehost (Lift and Shift):
     - Move as-is to AWS (VM → EC2)
     - Fastest migration path
     - No application changes
     - Tools: Application Migration Service (MGN), CloudEndure
     - When: tight timeline, legacy apps, first wave
     - Risk: you bring all the tech debt with you
     - Cost: same or higher (not optimized for cloud)

  2. Replatform (Lift, Tinker, and Shift):‼️
     - Minor optimizations during migration
     - Examples:
       - SQL Server on EC2 → RDS SQL Server
       - Self-managed Kafka → Amazon MSK
       - On-prem app server → Elastic Beanstalk
       - File server → EFS
     - More benefit than rehost, less effort than refactor
     - When: want quick wins without full rewrite

  3. Refactor (Re-architect):‼️
     - Redesign the application for cloud-native
     - Monolith → microservices
     - EC2 → containers (ECS/EKS) or serverless (Lambda)
     - Self-managed DB → DynamoDB or Aurora
     - Most effort, most benefit
     - When: the app is strategic and will live for years
     - Risk: scope creep, timeline extension

  4. Repurchase (Drop and Shop):
     - Replace with a SaaS product
     - Examples:
       - On-prem CRM → Salesforce
       - On-prem email → Microsoft 365 / Google Workspace
       - Custom ITSM → ServiceNow
     - When: commercial product does what your custom app does

  5. Retire:
     - Decommission — turn it off
     - Often 10-20% of applications can be retired‼️
     - Check: does anyone actually use this?
     - Reduces migration scope and cost

  6. Retain:
     - Keep where it is (for now)
     - Reasons: not ready, too complex, regulatory, end of life soon
     - Plan to revisit later
     - Don't force everything to migrate at once

  7. Relocate:
     - Move to AWS without changes using VMware Cloud on AWS
     - VM-level migration with VMware compatibility
     - When: heavy VMware investment, tight timeline
```

### Migration Planning

```text
Migration phases:‼️

  Phase 1: Assess (2-4 weeks)
    - Portfolio discovery: what do you have?
    - AWS Application Discovery Service:
      - Agentless: VMware vCenter integration (basic data)
      - Agent-based: OS-level data (processes, connections, performance)‼️
    - Build application inventory
    - Map dependencies (which apps talk to which)
    - Categorize by 7 Rs
    - Prioritize migration waves

  Phase 2: Mobilize (4-8 weeks)
    - Set up Landing Zone (Organizations, accounts, networking)
    - Establish connectivity (Direct Connect, VPN)
    - Build CI/CD pipelines
    - Train teams
    - Pilot migration: move 1-2 small apps to validate process

  Phase 3: Migrate & Modernize (ongoing)
    - Execute in waves (5-20 apps per wave)‼️
    - Each wave follows: plan → migrate → test → cutover
    - Migration Hub: central tracking dashboard
    - Parallel run: old and new running simultaneously
    - Cutover: DNS switch, database sync, final validation

  Migration wave planning:
    Wave 1: simple, low-risk applications (prove the process)
    Wave 2-3: increasing complexity (add databases, dependencies)
    Wave 4+: complex, critical applications (with battle-tested process)
    Final wave: decommission remaining on-prem infrastructure

Database Migration Service (DMS):‼️
  - Continuous replication from source to target database
  - Supports: Oracle, SQL Server, MySQL, PostgreSQL, MongoDB, etc.
  - Homogeneous (same engine) and heterogeneous (different engine)
  - Schema Conversion Tool (SCT) for heterogeneous migrations
  - Full load + CDC (Change Data Capture) for zero-downtime migration
  - Validation: compare source and target data

  Migration pattern with DMS:
    1. SCT converts schema (if heterogeneous)
    2. DMS performs full load (initial data copy)
    3. DMS performs CDC (ongoing replication)
    4. Application cutover: point app to new database
    5. Validate data consistency
    6. Decommission source database

Cutover strategies:‼️
  Big bang cutover:
    - Switch everything at once during maintenance window
    - Simpler but higher risk
    - Rollback: switch back to old system
    - Best for: small applications, simple dependencies

  Phased cutover:
    - Migrate components incrementally
    - Use API gateway or load balancer to shift traffic
    - Canary: 5% → 25% → 50% → 100%
    - Lower risk, longer duration
    - Best for: complex applications, high availability requirements

  Blue-green cutover:
    - Old (blue) and new (green) running in parallel
    - DNS switch from blue to green
    - Rollback: switch DNS back to blue
    - Requires: both environments fully functional simultaneously
    - Best for: critical applications with zero-downtime requirement
```

---

## 15. Common Interview Questions

### Scenario-Based Questions with Detailed Answers

```text
Q1: "Design a FedRAMP Moderate architecture for a SaaS application
     that processes federal employee data."‼️

A: Start with the compliance baseline:
   - FedRAMP Moderate = ~325 NIST 800-53 controls
   - Data contains PII → additional privacy controls
   - Must document inherited controls from AWS

   Architecture:
   - Multi-account: separate accounts for prod, staging, security, logging
   - Commercial AWS (us-east-1, us-west-2) — FedRAMP Moderate authorized
   - VPC with three-tier subnets (public ALB, private app, isolated DB)
   - All traffic over TLS 1.2+ (FIPS endpoints for AWS API calls)
   - KMS CMK for encryption at rest (S3, RDS, EBS)
   - IAM Identity Center with SAML to agency IdP
   - MFA required for all users
   - CloudTrail org trail → Log Archive account → S3 with Object Lock
   - VPC Flow Logs on all VPCs
   - GuardDuty, Security Hub (NIST 800-53 standard), Config
   - AWS Backup with cross-region copy
   - Incident response runbooks documented
   - ConMon: monthly vulnerability scans, annual pen test, monthly POA&M

   Key decisions to explain:
   - Why commercial vs GovCloud (Moderate doesn't require GovCloud)
   - How you handle the ~60% inherited controls from AWS
   - Your approach to the SSP (300+ page document)
   - Continuous monitoring strategy (automated vs manual)
   - 3PAO selection and assessment timeline


Q2: "Your organization has 200 AWS accounts. Design the multi-account
     strategy and explain your OU structure."‼️

A: Organizations structure:
   Root
   ├── Security OU (Log Archive, Security Tooling, Audit)
   ├── Infrastructure OU (Network Hub, Shared Services, DNS)
   ├── Workloads OU
   │   ├── Production OU (highest restrictions)
   │   ├── Staging OU
   │   └── Development OU
   ├── Sandbox OU (experimental, auto-cleanup)
   └── Suspended OU (decommissioning)

   SCPs:
   - Root level: deny leaving org, deny disabling security services
   - Production OU: deny region outside approved, deny public S3,
     require encryption, require IMDSv2
   - Sandbox OU: deny expensive services, deny production data access,
     budget limits

   Account vending:
   - AFT (Account Factory for Terraform) for automated account creation
   - Baseline: CloudTrail, Config, GuardDuty enrollment, VPC, TGW attachment
   - Mandatory tags enforced at creation

   Identity:
   - IAM Identity Center with Okta SAML federation
   - Permission sets: Admin (break-glass only), Developer, ReadOnly,
     SecurityAuditor, NetworkAdmin
   - No IAM users in any account (all federated)

   Networking:
   - Transit Gateway in Network Hub account
   - Shared via RAM to all accounts
   - Route table segmentation (prod/non-prod isolation)
   - Centralized egress through Network Firewall
   - Direct Connect from on-prem


Q3: "A GuardDuty finding shows
     UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.
     Walk me through your incident response."‼️

A: This finding means EC2 instance credentials (from the instance
   metadata service) are being used from OUTSIDE the instance.
   This is a critical finding — possible SSRF attack or credential theft.

   Immediate response (first 15 minutes):
   1. Confirm the finding — check the source IP in CloudTrail
   2. Identify the affected instance and role
   3. DO NOT terminate the instance yet (preserve forensic evidence)
   4. Revoke the role's active sessions:
      aws iam put-role-policy —role-name ROLE —policy-name DenyAll \
        —policy-document '{"Statement":[{"Effect":"Deny","Action":"*","Resource":"*",
        "Condition":{"DateLessThan":{"aws:TokenIssueTime":"NOW"}}}]}'
   5. Isolate the instance:
      - Create a quarantine security group (deny all inbound/outbound)
      - Replace the instance's security group
      - This preserves the instance for forensics

   Investigation (next 1-4 hours):
   6. Check CloudTrail: what did the exfiltrated credentials do?
      - New IAM users/roles created? (persistence)
      - S3 data accessed? (data exfiltration)
      - EC2 instances launched? (crypto mining)
   7. Check VPC Flow Logs: where did traffic go?
   8. Snapshot the EBS volume for forensic analysis
   9. Review the instance's user data, startup scripts
   10. Check if IMDSv2 was enforced (likely wasn't)

   Remediation:
   11. Require IMDSv2 on all instances (SCP to enforce)
   12. Rotate any credentials the role had access to
   13. Check other instances with the same role
   14. Review the application for SSRF vulnerabilities
   15. Update WAF rules to block SSRF patterns

   Post-incident:
   16. Write incident report
   17. Update runbooks
   18. Add preventive controls (IMDSv2 enforcement via SCP)
   19. Brief management on the incident and response


Q4: "How do you design network segmentation for a PCI-DSS compliant
     environment on AWS?"‼️

A: PCI requires isolating the Cardholder Data Environment (CDE):

   Account-level isolation:
   - Dedicated AWS account for CDE workloads
   - Separate from non-CDE workloads (reduces PCI scope)

   VPC design for CDE account:
   - CDE VPC with NO internet gateway
   - Subnets: private app tier, isolated data tier
   - ALB in a separate "DMZ" VPC, traffic inspected by Network Firewall
   - All ingress through approved paths only

   Network controls:
   - Security Groups: whitelist specific IPs/ports only
   - NACLs: deny by default, allow specific flows
   - Network Firewall: IDS/IPS on all traffic entering/leaving CDE
   - VPC Flow Logs: all traffic logged and analyzed
   - No direct internet access from CDE (use PrivateLink for AWS services)

   Data flow documentation:
   - Diagram every path cardholder data takes
   - Document: source → encryption → processing → storage → deletion
   - Show network controls at each boundary

   Tokenization strategy:
   - Tokenize card data at the edge (before it enters your system)
   - Use Stripe/Braintree so raw card data never touches your AWS
   - If you must handle cards: encrypt immediately, process, tokenize, purge
   - Tokens stored in CDE, referenced from non-CDE systems

   Monitoring:
   - File integrity monitoring (FIM) on CDE systems
   - IDS/IPS on network segments (Network Firewall)
   - Log all access to CDE (CloudTrail + application logs)
   - Quarterly internal vulnerability scans
   - Annual penetration test by approved scanning vendor (ASV)
   - Daily log reviews


Q5: "Explain your encryption strategy for a FedRAMP High system."‼️

A: FedRAMP High requires FIPS 140-2 validated encryption:

   Data at rest:
   - KMS CMK with FIPS 140-2 Level 2 (standard KMS)
   - OR: CloudHSM custom key store for Level 3
   - S3: SSE-KMS with CMK (not SSE-S3 — need key policy control)
   - EBS: default encryption enabled org-wide
   - RDS: encryption enabled at creation
   - DynamoDB: encryption with CMK
   - SQS/SNS: CMK encryption
   - Lambda environment variables: CMK encryption

   Data in transit:
   - FIPS endpoints for ALL AWS API calls‼️
   - TLS 1.2+ for all connections
   - ALB/NLB with TLS termination (FIPS 140-2 validated)
   - VPN with FIPS-validated algorithms (AES-256-GCM)
   - Direct Connect with MACsec (Layer 2 encryption)
   - Internal service-to-service: mutual TLS

   Key management:
   - CMK per service per environment (not one key for everything)
   - Key policies: least privilege, no wildcard principals
   - Key rotation: automatic annual rotation enabled
   - Cross-account key sharing via key policies
   - Key deletion: 7-30 day waiting period (prevent accidental deletion)
   - Audit: all KMS API calls logged in CloudTrail

   Decision: KMS vs CloudHSM?
   - KMS (Level 2): sufficient for most FedRAMP High controls
   - CloudHSM (Level 3): required if contract specifies Level 3,
     or if you need PKCS#11 or JCE interface
   - KMS Custom Key Store: KMS API + CloudHSM backend (best of both)


Q6: "Design a disaster recovery plan for a government system with
     RPO of 15 minutes and RTO of 1 hour."‼️

A: This requires Warm Standby strategy:

   Primary: us-gov-west-1, DR: us-gov-east-1

   Database tier:
   - Aurora Global Database (PostgreSQL or MySQL)
   - Primary cluster in us-gov-west-1
   - Secondary (read-only) in us-gov-east-1
   - Replication lag: <1 second (meets RPO of 15 min)
   - Failover: promote secondary to primary (~1 minute)

   Application tier:
   - ECS/EKS running in both regions
   - DR region: minimum capacity (2 tasks instead of 10)
   - Auto Scaling configured to scale up on failover
   - Container images replicated to DR region ECR

   Storage:
   - S3: cross-region replication with RTC (15-min SLA)
   - EFS: not multi-region — use S3 for shared storage if needed

   DNS failover:
   - Route 53 health checks on primary region ALB
   - Failover routing: primary → DR
   - Health check interval: 10 seconds
   - Failover threshold: 3 failures (30 seconds detection)

   Runbook:
   1. Health check fails → Route 53 failover (automatic)
   2. Alert fires → on-call confirms and monitors
   3. Aurora: promote secondary (manual or automated via Lambda)
   4. ECS/EKS: scale up DR region tasks
   5. Validate: synthetic monitoring confirms DR is serving traffic
   6. Communicate: notify stakeholders

   Testing:
   - Monthly: validate replication, verify backups restore
   - Quarterly: full DR failover drill (planned maintenance window)
   - Annual: unannounced DR test (only leadership knows)
   - Document all tests for compliance evidence (CP-4 control)


Q7: "A developer wants to create an IAM role with AdministratorAccess.
     How do you prevent this while still allowing them to create roles?"‼️

A: Use permission boundaries:

   1. Create a permission boundary policy:
      - Allows: EC2, S3, Lambda, ECS, RDS, CloudWatch
      - Denies: IAM (except creating roles with boundary attached),
        Organizations, CloudTrail, GuardDuty, Config

   2. Developer's IAM policy allows:
      - iam:CreateRole, iam:AttachRolePolicy, iam:PutRolePolicy
      - BUT with condition: iam:PermissionsBoundary must be set
        to the boundary policy ARN

   3. Any role the developer creates:
      - Even if they attach AdministratorAccess
      - Effective permissions = Admin ∩ Boundary = only what boundary allows
      - They cannot escalate beyond the boundary

   4. SCP as additional guardrail:
      - Deny iam:CreateRole where iam:PermissionsBoundary is not set
      - This catches any IAM path that might bypass the boundary

   This is the standard pattern for delegated IAM administration
   in enterprise environments.


Q8: "How do you design a centralized egress architecture for
     100 VPCs across 50 accounts?"‼️

A: Centralized egress through inspection VPC:

   Architecture:
   - Network Hub account owns the Transit Gateway
   - Inspection VPC in Network Hub with:
     - AWS Network Firewall (Suricata rules)
     - NAT Gateways (multi-AZ)
     - Internet Gateway
   - All spoke VPCs have NO internet gateway, NO NAT gateway
   - Default route (0.0.0.0/0) in spoke VPCs → TGW → Inspection VPC

   Traffic flow:
   Spoke VPC → TGW → Firewall endpoint → Network Firewall
   → NAT Gateway → Internet Gateway → Internet

   Benefits:
   - Single point of inspection for all outbound traffic
   - Centralized domain allowlisting (only approved domains)
   - IDS/IPS on all outbound traffic
   - Cost savings (fewer NAT Gateways — major cost reduction)
   - Compliance: SI-4 (monitoring), SC-7 (boundary protection)

   Network Firewall rules:
   - Default: deny all outbound
   - Allow: specific domains (*.amazonaws.com, package repos, etc.)
   - TLS SNI inspection (domain filtering without decryption)
   - Suricata rules for known malicious patterns

   Cost considerations:
   - Network Firewall: ~$0.395/hr per endpoint + data processing
   - NAT Gateway: ~$0.045/hr per AZ + data processing
   - TGW: ~$0.05/hr per attachment + data processing
   - vs: NAT Gateway in every VPC (50 accounts × 3 AZs = 150 NAT GWs)
   - Centralized approach is significantly cheaper at scale


Q9: "What's the difference between FedRAMP and FISMA?
     When does each apply?"‼️

A: Key distinction:
   - FISMA applies to agency-owned and agency-operated systems
   - FedRAMP applies to cloud services used BY agencies

   If an agency builds an app on AWS for internal use:
   - The AWS infrastructure: covered by FedRAMP (AWS's authorization)
   - The agency's application: covered by FISMA (agency's ATO)

   If a vendor sells a SaaS to an agency:
   - The vendor's application + infrastructure: needs FedRAMP authorization
   - The agency still issues their own ATO (referencing FedRAMP package)

   Both use NIST 800-53 controls as the foundation.
   Both require ATO from an authorizing official.
   Both require continuous monitoring.

   The practical difference:
   - FISMA: agency security team does the assessment
   - FedRAMP: 3PAO does the assessment, JAB or agency authorizes
   - FedRAMP ATOs are reusable across agencies ("do once, use many")
   - FISMA ATOs are agency-specific


Q10: "You're designing a logging architecture for a FedRAMP High system.
      What do you log, where do you store it, and how do you protect it?"‼️

A: Log sources (AU-2 control):
   - CloudTrail: ALL API calls (management + data events)
   - VPC Flow Logs: ALL VPCs, ALL subnets
   - ALB access logs: ALL load balancers
   - S3 access logs: ALL sensitive buckets
   - Application logs: shipped via CloudWatch agent
   - Database audit logs: RDS enhanced monitoring, audit plugins
   - WAF logs: all blocked/allowed requests
   - DNS query logs: Route 53 Resolver query logging

   Storage (AU-9 control — protection of audit information):
   - Centralized in Log Archive account (dedicated account)
   - S3 bucket with:
     - Object Lock in Compliance mode (WORM — 7 year retention)
     - KMS CMK encryption
     - Versioning enabled
     - Bucket policy: deny delete for ALL principals
     - Access logging on the log bucket itself (meta-logging)
   - CloudTrail log file validation enabled

   Protection:
   - SCP: deny changes to Log Archive account's S3 bucket policies
   - SCP: deny disabling CloudTrail, Config, Flow Logs
   - No human write access to log buckets (only service roles)
   - Break-glass only for emergency investigation
   - Cross-region replication of logs for DR

   Analysis:
   - Athena for ad-hoc queries
   - Security Lake for normalization
   - SIEM (Splunk/Elastic) for real-time alerting
   - Security Hub for automated compliance checks

   Retention:
   - Hot (CloudWatch): 90 days
   - Warm (S3 Standard): 1 year
   - Cold (S3 Glacier): 7 years
   - Object Lock prevents deletion for 7 years


Q11: "How do you handle a situation where an AWS service you need
      is not available in GovCloud?"‼️

A: Options (in order of preference):

   1. Check if a similar service exists:
      - Example: managed service X not available, but underlying
        open-source technology can be deployed on EC2/EKS
      - Deploy Apache Kafka on EKS instead of Amazon MSK (if MSK not available)

   2. Evaluate if the data can run in commercial:
      - If the data is NOT ITAR/CUI/classified
      - Run the specific service in commercial us-east-1
      - Connect to GovCloud via VPN or Transit Gateway peering
      - Document the data flow and classification in your SSP

   3. Build it yourself:
      - Deploy the equivalent on EC2/EKS in GovCloud
      - More operational burden but keeps data in GovCloud
      - Example: deploy OpenSearch on EC2 if OpenSearch Service isn't available

   4. Request from AWS:
      - Work with your AWS account team
      - Submit feature request with business justification
      - If you have an EDP, you have more leverage

   5. Architecture around it:
      - Redesign to not need the service
      - Sometimes constraints lead to simpler architectures

   Key: ALWAYS document the decision and rationale in your SSP.
   Auditors will ask why you chose a particular approach.


Q12: "Explain how you would implement ABAC at scale across
      200 AWS accounts."‼️

A: ABAC (Attribute-Based Access Control) implementation:

   Tag strategy:
   - Define standard tags: Project, Environment, Team, DataClassification
   - Enforce via: tag policies (Organizations), SCP, Config rules
   - Propagate: IAM Identity Center passes user attributes as session tags

   IAM Identity Center configuration:
   - Map IdP attributes to AWS session tags:
     - IdP group "ProjectAlpha-Dev" → Project=Alpha, Environment=Dev
   - Permission sets use conditions referencing tags

   Permission set policy (example):
     Allow ec2:* on resources WHERE
       aws:ResourceTag/Project = ${aws:PrincipalTag/Project}
       AND aws:ResourceTag/Environment = ${aws:PrincipalTag/Environment}

   This means:
   - Alice (Project=Alpha) can only manage Alpha resources
   - Bob (Project=Beta) can only manage Beta resources
   - No policy changes needed when new projects are added
   - Just tag resources correctly and assign users to projects

   Enforcement:
   - SCP: deny resource creation without required tags
   - Config rule: check all resources have required tags
   - Automated remediation: Lambda adds missing tags from resource creator


Q13: "Walk through how you would migrate a 500-server on-prem
      data center to AWS GovCloud over 18 months."‼️

A: Phase approach:

   Months 1-3: Assess
   - Deploy Application Discovery agents on all servers
   - Map dependencies (which servers talk to which)
   - Categorize all 500 servers by 7 Rs:
     - ~50 retire (unused, redundant)
     - ~100 rehost (lift and shift, legacy)
     - ~200 replatform (move to managed services)
     - ~100 refactor (strategic apps, modernize)
     - ~50 retain (not ready, too complex)
   - Set up GovCloud Landing Zone (Organizations, accounts, networking)
   - Establish Direct Connect to GovCloud

   Months 3-6: Foundation + Wave 1
   - Network Hub: Transit Gateway, Direct Connect, VPN backup
   - Security baseline: CloudTrail, Config, GuardDuty in all accounts
   - Wave 1: 20 simple servers (low-risk, few dependencies)
   - Validate migration process, update runbooks

   Months 6-12: Waves 2-5
   - Wave 2: 50 servers (increasing complexity)
   - Wave 3-4: 100 servers each (databases, app clusters)
   - Wave 5: 80 servers (complex, high-dependency apps)
   - Each wave: plan → migrate → test → parallel run → cutover
   - DMS for database migrations (full load + CDC)
   - MGN (Application Migration Service) for server rehost

   Months 12-18: Final Waves + Optimization
   - Wave 6: remaining 50 servers (most complex)
   - Decommission on-prem for retired/migrated servers
   - Optimize: right-size, implement auto-scaling
   - Begin refactoring work for strategic applications

   Critical success factors:
   - Executive sponsor with authority to make cutover decisions
   - Dedicated migration team (not part-time)
   - Cutover windows coordinated with agency stakeholders
   - Rollback plan for every cutover
   - Regular status reporting to agency leadership


Q14: "How do you ensure continuous compliance after getting your ATO?"‼️

A: Continuous monitoring (ConMon) program:

   Automated controls (real-time):
   - Security Hub: continuous compliance checks against NIST 800-53
   - AWS Config: configuration compliance monitoring
   - GuardDuty: threat detection (fires within minutes)
   - EventBridge: automated remediation for common findings
   - CloudWatch alarms: operational metrics and thresholds

   Scheduled activities:
   - Monthly: vulnerability scans (Qualys, Tenable, or Inspector)
   - Monthly: POA&M updates (track remediation progress)
   - Monthly: submit ConMon deliverables to agency/FedRAMP PMO
   - Quarterly: review access controls (recertification)
   - Annually: penetration test (by 3PAO or approved vendor)
   - Annually: security assessment (subset of controls)

   Change management (CM-3):
   - All changes go through change control board (CCB)
   - Significant changes require SCR (Significant Change Request)
     to FedRAMP PMO and agency
   - What's "significant": new data flows, new services, architecture
     changes, boundary changes
   - Infrastructure-as-code: all changes through CI/CD with approval

   Evidence collection:
   - Automate evidence collection wherever possible
   - Screenshots, logs, configs exported regularly
   - Store in secure evidence repository
   - Map evidence to specific NIST 800-53 controls
   - Be ready for auditor requests at any time

   The goal: move toward cATO (continuous ATO) where compliance
   is demonstrated in real-time through automated dashboards,
   not annual paper exercises.


Q15: "Compare the cost and timeline of FedRAMP Moderate via JAB
      vs Agency path. When would you recommend each?"‼️

A: JAB Path:
   Timeline: 12-18 months (after readiness)
     - FedRAMP Connect application: 2-3 months
     - RAR (Readiness Assessment Report): 2-3 months
     - Full assessment: 3-4 months
     - JAB review: 3-6 months
     - P-ATO issuance: after JAB approval
   Cost: $800K - $2M total
   Pros:
     - Most prestigious (JAB review = gold standard)
     - P-ATO reusable by any agency
     - Broader market access immediately
   Cons:
     - Longer timeline
     - JAB has limited review capacity (they choose who to review)
     - More rigorous review (higher bar)

   Agency Path:
   Timeline: 6-12 months (after readiness)
     - Find sponsoring agency: 1-3 months
     - Assessment: 2-3 months
     - Agency review: 2-4 months
     - ATO issuance: after agency AO signs
   Cost: $500K - $1.5M total
   Pros:
     - Faster to start (no JAB queue)
     - Agency relationship drives it
     - Can reuse for other agencies afterward
   Cons:
     - Need a willing sponsoring agency
     - Other agencies may add requirements on top
     - Less "portable" than JAB P-ATO

   Recommendation:
   - If you have ONE agency customer: Agency path (faster to revenue)
   - If you want broad federal market: JAB path (once JAB accepts you)
   - If you need speed: Agency path, then pursue JAB P-ATO in parallel
   - Many companies do Agency ATO first, then "upgrade" to JAB P-ATO
```
