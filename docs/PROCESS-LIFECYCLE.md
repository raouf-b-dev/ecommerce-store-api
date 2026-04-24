# Process Lifecycle Guide — PIDs, Signals & Graceful Shutdown

> A reference guide covering how operating systems manage processes and how this E-Commerce API handles termination signals in production.
>
> **Companion docs**: [`ROADMAP.md`](ROADMAP.md), [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## 1. Process Identifiers (PIDs)

When the OS starts a program (e.g. `node dist/main.js`), it creates a **process** and assigns it a unique **Process ID (PID)** — a positive integer used to track, signal, and manage the running instance.

### Key concepts

| Term       | Definition                                                                                                                                                                |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PID**    | Unique integer assigned to every running process by the kernel.                                                                                                           |
| **PID 1**  | The first user-space process started at boot (`init` or `systemd`). All other processes descend from it. Inside a Docker container, the entrypoint process becomes PID 1. |
| **PPID**   | Parent Process ID — the PID of the process that spawned the current one. Viewable via `ps -o pid,ppid` or `process.ppid` in Node.js.                                      |
| **Orphan** | A child process whose parent has exited. The kernel re-parents orphans to PID 1 (the init process).                                                                       |
| **Zombie** | A terminated child whose exit status has not yet been collected by its parent via `wait()`. It occupies a slot in the process table but consumes no CPU or memory.        |

> **Source**: The concepts of PID, PPID, orphan adoption, and zombie processes are defined in _POSIX.1-2017 (IEEE Std 1003.1)_, §3.296 "Process ID" and §3.297 "Process Group", and documented in `wait(2)` and `fork(2)` Linux man pages.

---

## 2. Signals

**Signals** are a form of asynchronous inter-process communication (IPC) defined by the POSIX standard. The kernel delivers a signal to a process to notify it of an event. When a signal arrives, the kernel interrupts normal execution and either:

1. Runs a **signal handler** registered by the application (e.g. `process.on('SIGTERM', handler)` in Node.js), or
2. Applies the **default action** if no handler is registered.

Default actions include: **Term** (terminate), **Core** (terminate + core dump), **Stop** (suspend), **Cont** (resume), and **Ign** (ignore).

> **Source**: Signal semantics, default actions, and the full signal table are specified in `signal(7)` — Linux Programmer's Manual, and in POSIX.1-2017 `<signal.h>`.

---

## 3. Termination Signals

These are the three signals most relevant to server application lifecycle:

### SIGINT — Signal 2 (Interrupt)

| Property           | Value        |
| :----------------- | :----------- |
| **Number**         | 2            |
| **Default action** | Term         |
| **Catchable**      | Yes          |
| **POSIX standard** | POSIX.1-1990 |

- **Trigger**: Pressing `Ctrl+C` in a terminal sends `SIGINT` to the foreground process group.
- **Meaning**: The user is requesting an interactive interruption.
- **In Node.js**: Can be caught via `process.on('SIGINT', handler)`. If a handler is registered, the default behavior (immediate exit) is suppressed and the handler runs instead.

### SIGTERM — Signal 15 (Terminate)

| Property           | Value        |
| :----------------- | :----------- |
| **Number**         | 15           |
| **Default action** | Term         |
| **Catchable**      | Yes          |
| **POSIX standard** | POSIX.1-1990 |

- **Trigger**: The default signal sent by the `kill` command (`kill <PID>` sends `SIGTERM`). Also the signal sent by Docker (`docker stop`), Kubernetes (Pod termination), and `systemd` during service shutdown.
- **Meaning**: A polite request to terminate — the application should clean up resources (close DB connections, drain HTTP requests, finish in-flight jobs) and exit.
- **In Node.js**: Can be caught via `process.on('SIGTERM', handler)`. This is the primary signal used for graceful shutdown.

### SIGKILL — Signal 9 (Kill)

| Property           | Value        |
| :----------------- | :----------- |
| **Number**         | 9            |
| **Default action** | Term         |
| **Catchable**      | **No**       |
| **POSIX standard** | POSIX.1-1990 |

- **Trigger**: `kill -9 <PID>`, the Linux OOM killer, or container orchestrators after a grace period expires.
- **Meaning**: Immediate, unconditional termination. The kernel removes the process without notifying it.
- **In Node.js**: **Cannot** be caught or intercepted. `process.on('SIGKILL', ...)` has no effect.
- **Consequences**: Open file descriptors are abandoned, in-flight database transactions are left uncommitted, network sockets are dropped, and shared memory may be corrupted.

> **Source**: The Linux `signal(7)` man page states: _"The signals SIGKILL and SIGSTOP cannot be caught, blocked, or ignored."_ This is also mandated by POSIX.1-2017: _"SIGKILL — Kill (cannot be caught or ignored)."_

---

## 4. Other Notable Signals

| Signal    | Number | Default | Catchable | Description                                                                                                  |
| :-------- | :----: | :-----: | :-------: | :----------------------------------------------------------------------------------------------------------- |
| `SIGHUP`  |   1    |  Term   |    Yes    | Hangup on controlling terminal. Daemons (Nginx, PostgreSQL) conventionally reload configuration on `SIGHUP`. |
| `SIGQUIT` |   3    |  Core   |    Yes    | Terminal quit (`Ctrl+\`). Terminates the process and produces a core dump for post-mortem debugging.         |
| `SIGSTOP` |   19   |  Stop   |  **No**   | Unconditional process suspension. Like `SIGKILL`, it cannot be caught or ignored.                            |
| `SIGCONT` |   18   |  Cont   |    Yes    | Resume a stopped process.                                                                                    |
| `SIGUSR1` |   10   |  Term   |    Yes    | User-defined signal. Node.js reserves `SIGUSR1` to start the built-in debugger.                              |
| `SIGUSR2` |   12   |  Term   |    Yes    | User-defined signal. Available for application-specific purposes.                                            |
| `SIGPIPE` |   13   |  Term   |    Yes    | Write to a pipe/socket with no reader. Node.js ignores `SIGPIPE` by default to prevent unexpected crashes.   |

> **Source**: Signal numbers shown are for x86/ARM/most architectures. Numbers may differ on Alpha, SPARC, and MIPS — see the signal numbering table in `signal(7)`.

---

## 5. Exit Codes

When a process terminates, it returns an integer **exit code** (0–255) to the parent process. The convention is:

| Exit Code | Meaning                                                                                                                         |
| :-------: | :------------------------------------------------------------------------------------------------------------------------------ |
|    `0`    | Success — clean exit.                                                                                                           |
|    `1`    | General error / uncaught fatal exception (Node.js).                                                                             |
|    `2`    | Reserved by Bash for builtin misuse.                                                                                            |
| `128 + N` | Process was killed by signal `N`. For example: `128 + 9 = 137` (SIGKILL), `128 + 15 = 143` (SIGTERM), `128 + 2 = 130` (SIGINT). |

The `128 + N` convention is a POSIX standard practice. The Node.js documentation confirms: _"If Node.js receives a fatal signal such as SIGKILL or SIGHUP, then its exit code will be 128 plus the value of the signal code."_

### Common Docker/Kubernetes exit codes

| Exit Code | Signal       | Typical Cause                                                                      |
| :-------: | :----------- | :--------------------------------------------------------------------------------- |
|   `137`   | SIGKILL (9)  | Container killed by OOM killer, or Kubernetes sent SIGKILL after the grace period. |
|   `143`   | SIGTERM (15) | Container received SIGTERM and exited (normal shutdown).                           |
|   `130`   | SIGINT (2)   | Process interrupted by Ctrl+C.                                                     |

> **Source**: Node.js documentation — [Exit Codes](https://nodejs.org/docs/latest/api/process.html#exit-codes). POSIX exit status conventions are defined in `waitpid(2)` and the Shell Command Language specification (§2.8.2).

---

## 6. Container Orchestrator Shutdown Flow

Understanding the signal lifecycle is critical for container deployments. Here is the sequence that occurs when Kubernetes or Docker terminates a container:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Orchestrator decides to terminate the pod/container         │
│     (deployment update, scale-down, node drain, OOM, etc.)     │
├─────────────────────────────────────────────────────────────────┤
│  2. Sends SIGTERM to PID 1 inside the container                │
│     → The app should begin graceful shutdown:                  │
│       • Stop accepting new connections                         │
│       • Drain in-flight HTTP requests                          │
│       • Close database/Redis connections                       │
│       • Wait for BullMQ workers to finish active jobs          │
│       • Disconnect WebSocket clients                           │
├─────────────────────────────────────────────────────────────────┤
│  3. Grace period begins (default: 30s in Kubernetes,           │
│     10s in Docker)                                             │
│     → The app has this window to exit cleanly (exit code 0)    │
├─────────────────────────────────────────────────────────────────┤
│  4. If the app is still running after the grace period:        │
│     → Orchestrator sends SIGKILL (uncatchable)                 │
│     → Process is terminated immediately (exit code 137)        │
│     → In-flight requests are dropped, connections are severed  │
└─────────────────────────────────────────────────────────────────┘
```

> **Source**: Kubernetes documentation — [Pod Termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination). Docker documentation — [`docker stop`](https://docs.docker.com/reference/cli/docker/container/stop/).

---

## 7. How This API Handles Graceful Shutdown

This project implements graceful shutdown via NestJS lifecycle hooks. The shutdown flow is:

### `main.ts` — Bootstrap

```typescript
// Enable NestJS shutdown hooks (listens for SIGTERM/SIGINT)
app.enableShutdownHooks();

// Safety net: force exit after 15s if graceful shutdown stalls
setTimeout(() => process.exit(1), 15_000).unref();
```

When `enableShutdownHooks()` is active and a termination signal arrives, NestJS calls `onApplicationShutdown()` on all registered providers in reverse dependency order, then closes the HTTP server.

### Shutdown hook implementations

| Service                      | Hook                      | Action                                                                                                   |
| :--------------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------- |
| `WebsocketConnectionGateway` | `onApplicationShutdown()` | Disconnects all connected WebSocket clients via `server.disconnectSockets(true)`.                        |
| `OrdersProcessor`            | `onApplicationShutdown()` | Calls `this.worker.close()` — stops polling for new checkout jobs, waits for in-flight jobs to complete. |
| `NotificationsProcessor`     | `onApplicationShutdown()` | Calls `this.worker.close()` — stops polling for new notification jobs.                                   |
| `PaymentEventsProcessor`     | `onApplicationShutdown()` | Calls `this.worker.close()` — stops polling for new payment event jobs.                                  |
| `FlowProducerService`        | `onApplicationShutdown()` | Calls `flowProducer.close()` — closes the BullMQ flow producer connection.                               |
| `QueueEventsService`         | `onApplicationShutdown()` | Closes all `QueueEvents` listener instances.                                                             |
| `RedisService`               | `onApplicationShutdown()` | Calls `client.quit()` — sends the Redis `QUIT` command for a clean disconnect.                           |
| `RedisIoAdapter`             | `server.on('close')`      | Calls `pubClient.quit()` and `subClient.quit()` — closes the Socket.IO Redis adapter connections.        |

---

## References

|  #  | Source                                                                      | URL                                                                               |
| :-: | :-------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
|  1  | `signal(7)` — Linux Programmer's Manual                                     | https://man7.org/linux/man-pages/man7/signal.7.html                               |
|  2  | POSIX.1-2017 `<signal.h>` — The Open Group                                  | https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/signal.h.html           |
|  3  | Node.js `process` — Signal Events                                           | https://nodejs.org/docs/latest/api/process.html#signal-events                     |
|  4  | Node.js `process` — Exit Codes                                              | https://nodejs.org/docs/latest/api/process.html#exit-codes                        |
|  5  | Kubernetes — Pod Lifecycle (Termination)                                    | https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination |
|  6  | Docker — `docker stop` Reference                                            | https://docs.docker.com/reference/cli/docker/container/stop/                      |
|  7  | Kerrisk, M. — _The Linux Programming Interface_ (2010), Ch. 20–22 (Signals) | ISBN 978-1-59327-220-3                                                            |
