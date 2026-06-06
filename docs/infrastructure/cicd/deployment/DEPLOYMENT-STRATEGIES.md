# Deployment Strategies — Topologies, GitOps & Configuration Management

This document defines the architectures, strategies, and operational methodologies used to deploy software products securely, reliably, and with zero downtime. It covers deployment topologies, CD pipeline patterns, Infrastructure as Code (IaC), and production configuration principles.

---

## 1. Evolution of Deployment

Deployment has evolved from manual, high-risk processes to automated, cloud-native orchestration:

```
Manual VM Copies ──▶ VM Images (Packer) ──▶ Container Orchestration (Kubernetes/ECS) ──▶ GitOps (ArgoCD)
  (SSH / FTP)         (Mutable Virtual)          (Immutable Containers)               (Continuous Reconciliation)
```

In modern cloud-native architectures, the core requirement is **zero-downtime deployment** — the ability to release new software without interrupting active user traffic (Humble & Farley, 2010).

---

## 2. Zero-Downtime Deployment Topologies

To achieve zero downtime, traffic must be transitioned from the old version (v1) to the new version (v2) using isolated environments or traffic controls.

### 2.1 Rolling Updates

A rolling update gradually replaces instances of the old version with the new version.

```
Step 1:  [ v1 ]  [ v1 ]  [ v1 ]  [ v1 ]
Step 2:  [ v2 ]  [ v1 ]  [ v1 ]  [ v1 ]   (1 instance replaced)
Step 3:  [ v2 ]  [ v2 ]  [ v1 ]  [ v1 ]   (2 instances replaced)
Step 4:  [ v2 ]  [ v2 ]  [ v2 ]  [ v2 ]   (Complete)
```

- **Mechanics**: Orchestrators (like Kubernetes or AWS ECS) control the roll out using two parameters:
  - `maxUnavailable`: The maximum number of instances that can be offline during the update.
  - `maxSurge`: The maximum number of instances that can be created above the desired count.
- **Rollback**: If health checks fail, the orchestrator halts the roll out and reverses the process, replacing v2 instances with v1.
- **Pros**: Cost-effective (requires little to no extra infrastructure margin).
- **Cons**: Slow; during the roll out, both v1 and v2 run simultaneously, meaning the application must support backward-compatible data schemas.

### 2.2 Blue-Green Deployments

Blue-Green deployments maintain two identical physical or logical environments: Blue (active production v1) and Green (staged v2).

```
         ┌──────────────┐
         │ Load Balancer│
         └──────┬───────┘
          Switch│ (Atomic DNS or routing rule change)
         ┌──────▼──────┐
         │             │
   ┌─────▼─────┐ ┌─────▼─────┐
   │ Environment│ │ Environment│
   │    Blue   │ │   Green   │
   │    [v1]   │ │    [v2]   │
   └───────────┘ └───────────┘
     (Active)     (Staging)
```

- **Mechanics**:
  1. The new release (v2) is deployed to the idle Green environment.
  2. QA and smoke tests run directly against the Green environment.
  3. The load balancer switches traffic atomically to Green. Blue is kept idle for quick rollbacks.
- **Data Synchronization**: Database changes must be backward-compatible because both environments share the same persistence layer. Teams utilize the **Expand/Contract (Parallel Change)** pattern:
  - **Expand**: Add new database columns/tables (supports both v1 and v2).
  - **Transition**: Deploy v2.
  - **Contract**: Remove old columns/tables once Blue is decommissioned.
- **Pros**: Instant rollback (reverting load balancer path); complete isolation.
- **Cons**: High cost (requires double the infrastructure capacity during deployment).

### 2.3 Canary Deployments

Canary deployments route a small fraction of real production traffic (e.g., 2%, 5%, 10%) to the new version to evaluate performance, latency, and error rates before expanding the rollout.

```
                  ┌──────────────┐
                  │ Load Balancer│
                  └──────┬───────┘
                         │
             ┌───────────┴───────────┐
         90% │ Traffic           10% │ Traffic
         ┌───▼───────┐           ┌───▼───────┐
         │ Production│           │ Canary    │
         │    [v1]   │           │    [v2]   │
         └───────────┘           └───────────┘
```

- **Mechanics**:
  1. Deploy a small subset of instances running v2.
  2. Route a slice of traffic to v2 using weight-based routing (via Service Mesh, API Gateway, or Load Balancer).
  3. Monitor key telemetry (error rate, HTTP 500s, P99 latency, host metrics).
  4. Automatically scale up v2 and scale down v1 if metrics are stable; trigger automatic rollback if errors spike.
- **Pros**: Minimizes blast radius of bugs; tests performance with real production load.
- **Cons**: Complex to orchestrate; requires sophisticated observability and alerting.

---

## 3. GitOps vs. Push-Based CD

Continuous Delivery pipelines are categorized by how deployment manifests are applied to environments.

### 3.1 Push-Based CD

In a push-based model, the CI/CD runner (e.g. Jenkins, GitHub Actions) executes script commands that push configuration or container updates to target servers.

```
[ Git Repo ] ──▶ [ CI Runner ] ──( push kubectl/CLI commands )──▶ [ Prod Cluster ]
```

- **Security Constraint**: The CI runner must store credentials with write access to production clusters. If a runner is compromised, the production environment is fully exposed.
- **Drift**: If someone manually changes a server config (configuration drift), the CI system remains unaware until the next push.

### 3.2 GitOps (Pull-Based CD)

GitOps (coined by Weaveworks in 2017) defines the Git repository as the single source of truth for infrastructure and application state.

```
[ Git Repo ] ◀──( pull/poll )── [ GitOps Agent ] ──( apply/heal )──▶ [ Prod Cluster ]
                               (Runs inside cluster)
```

- **Mechanics**: An agent (e.g., ArgoCD, Flux) runs inside the production cluster. It continuously polls Git for manifest updates, compares Git's state to the cluster's actual state, and pulls changes to reconcile them.
- **Drift Detection**: If a manual configuration change is made to the cluster, the agent detects the drift and automatically overwrites it with the state declared in Git.
- **Security**: Production credentials never leave the cluster. The CI system only needs permissions to write commits/tags to Git.

---

## 4. Infrastructure as Code (IaC)

To prevent snowflake servers (servers built manually that cannot be reproduced), infrastructure must be managed declaratively.

### 4.1 Key Principles of IaC

- **Declarative vs. Imperative**: Declarative tools (Terraform, CloudFormation, OpenTofu) define the _desired final state_ of infrastructure. Imperative tools (Ansible, Chef, Shell scripts) define the _steps_ to build it. Declarative is preferred because it handles dependency resolution and state management automatically.
- **Idempotency**: The property where executing a command multiple times produces the exact same result without unintended side effects.
- **State Files & Locking**: IaC tools maintain state files mapping code resources to real cloud IDs. In pipelines, the state file must be locked during runs (e.g. using DynamoDB or Consul locks) to prevent concurrent executions from destroying infrastructure.

---

## 5. Production Configuration & Secrets

Production configuration must follow the **12-Factor App methodology** (Wiggins, 2017).

### 5.1 Factors for Production Config

- **Factor III: Config in the Environment**: Configuration that varies across deploys (database URIs, hostnames, external keys) must be stored in environment variables, never committed as hardcoded files in source code.
- **Build-Once-Deploy-Many**: The container image or build package must be compiled **exactly once** in the build stage. The same image is promoted to Staging and Production, with behavior modified strictly via environment variable injections.

```
[ Compile/Build ] ──▶ [ Staging Env ] ──▶ [ Production Env ]
   (Produces 1 image)   (Injects Staging Keys) (Injects Production Keys)
```

### 5.2 Secret Management Topologies

Secrets (passwords, private keys) must never be injected as plain text variables in Git.

1. **Build-time Injection (Anti-pattern)**: Baking secrets into Docker images. This leaks credentials to anyone with access to the container registry.
2. **Environment Injection**: Injecting secrets as environment variables from the orchestrator (Kubernetes Secrets, ECS Task Definitions).
3. **Dynamic API Retrieval**: The application connects to a central vault (HashiCorp Vault, AWS Secrets Manager, Doppler) using an ephemeral IAM role at boot time, fetches secrets into memory, and rotates them periodically.

---

## 6. Deployment Anti-Patterns

| Anti-Pattern                      | Problem                                                                                                              | Remediation                                                                                                                                                     |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coupling Deployment & Release** | Merging code automatically makes it visible to users. Teams delay deployments because features are half-finished.    | Decouple deployment (moving code to servers) from release (making features active). Use **Feature Flags** (LaunchDarkly, Unleash) to hide uncompleted features. |
| **Mutable Infrastructure**        | Patching production virtual machines via SSH. This creates untrackable server drift and prevents horizontal scaling. | Enforce **Immutable Infrastructure**: deploy updates by destroying old containers/VMs and creating new ones from base images.                                   |
| **Baking Configurations**         | Compiling separate Docker images for `staging` and `production` containing different build settings.                 | Compile one image. Use runtime environment variables to load configurations.                                                                                    |
| **Manual Schema Migrations**      | Running database migrations manually during deployment windows.                                                      | Automate migrations in the deployment pipeline. Ensure all migrations are backward-compatible (Expand/Contract).                                                |

---

## 7. References & Academic Reading

1. Humble, J. & Farley, D. (2010). _Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation_. Addison-Wesley. ISBN 978-0321601919.
2. Wiggins, A. (2017). _The Twelve-Factor App_. https://12factor.net/
3. Richardson, C. (2018). _Microservices Patterns: With examples in Java_. Manning. ISBN 978-1617294549. (Expand/Contract database refactoring pattern).
4. Morris, K. (2020). _Infrastructure as Code: Managing Servers in the Cloud_. O'Reilly. ISBN 978-1492080619.
5. CNCF (Cloud Native Computing Foundation). (2023). _GitOps Principles_. https://github.com/open-gitops/project/blob/main/docs/principles.md
