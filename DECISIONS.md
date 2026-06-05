# Architecture Decisions

This document details the key technical decisions made during the development of the Meeting Intelligence Service, along with alternatives considered and trade-offs.

## 1. Database Choice: Prisma ORM with SQLite

- **Why**: SQLite is a file-based, zero-configuration database that is perfect for local execution and rapid evaluations. Prisma ORM provides a strongly typed client, automated schema-driven migrations, and simplifies the codebase.
- **Alternatives Considered**: 
  - **PostgreSQL**: A robust relational database.
  - **MongoDB**: A document-oriented NoSQL database.
- **Trade-offs**: 
  - *Pros*: SQLite requires no server setup on the host machine, making it extremely portable. Prisma makes it trivial to swap SQLite for PostgreSQL/MySQL by changing the `provider` in `schema.prisma` and updating the `DATABASE_URL` environment variable.
  - *Cons*: SQLite is not designed for high-concurrency write operations. However, for a meeting management and background reminder service, this is a reasonable trade-off.

## 2. Authentication Strategy: JWT (JSON Web Tokens)

- **Why**: JWTs are stateless, self-contained tokens that carry the user's payload (id, email, name). They allow the server to verify user identity without performing a database lookup on every incoming request.
- **Alternatives Considered**:
  - **Session-Based Authentication**: Storing session IDs in a database or Redis store.
- **Trade-offs**:
  - *Pros*: Completely stateless, highly scalable, and perfectly suited for RESTful APIs and serverless deployments (like Render/Railway).
  - *Cons*: Token revocation is difficult before expiration unless we implement a blacklist mechanism. We chose a 24-hour expiration window as a balanced security measure.

## 3. External Integration: Slack Webhooks & Resend Email API

- **Why**: We chose a dual-priority approach. Slack Webhooks are simple, standard, and support rich "Block Kit" formatting for beautiful overdue task cards. Resend Email is a clean, developer-friendly email provider that sends HTML reminders. Both can be invoked natively via HTTP requests without needing bulky SDKs.
- **Alternatives Considered**:
  - **Telegram Bot API**: Requires setting up a bot token and chat ID.
  - **Twilio SMS**: Requires paid API credits.
- **Trade-offs**:
  - *Pros*: Easy configuration via simple environmental variables (`SLACK_WEBHOOK_URL` / `RESEND_API_KEY`). A robust local mock fallback logs notifications if no keys are provided, allowing seamless evaluation without third-party accounts.

## 4. Project Structure and Request Traceability

- **Why**: We adopted a layered MVC/Controller-Service architecture using TypeScript. For request logging and traceability, we implemented Node's native `AsyncLocalStorage` inside `trace.middleware.ts` to propagate a unique request `traceId` across asynchronous operations (including database queries and background tasks) without polluting service signatures.
- **Alternatives Considered**:
  - **Explicit Parameter Passing**: Manually passing `traceId` to every helper and query.
- **Trade-offs**:
  - *Pros*: Extremely clean service code. Structured logs print the `traceId` automatically.
  - *Cons*: Slightly higher cognitive load if unfamiliar with Node's async hooks.
