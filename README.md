# Meeting Intelligence Service Backend

The **Meeting Intelligence Service** is a robust RESTful API that stores meeting information and transcripts, performs AI-powered transcript analysis (with transcript citation grounding), extracts and tracks action items, detects overdue items, and schedules Slack/email alerts through third-party integrations.

---

## Features

- **JWT Authentication**: Secure registration and login endpoints.
- **Meeting Management**: Storing transcripts and meeting data with pagination support.
- **AI-Powered Transcript Analysis**: Extracts grounded summaries, action items, decisions, and follow-up suggestions with timestamps as citations using the Gemini API.
- **Action Item Tracking**: Update statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`) and query filters (by status, assignee, meeting ID).
- **Overdue Detection**: Highlights action items that are incomplete and past their due dates.
- **Background cron Reminder Scheduler**: Runs in the background to identify overdue action items and send Slack block cards or Resend emails.
- **Structured Logging & Traceability**: Structured JSON logging matching logs with unique request `traceId` context globally.
- **OpenAPI Documentation**: Interactive API testing available publicly at `/api-docs`.

---

## Tech Stack

- **Runtime**: Node.js (tested on v20.15.0)
- **Framework**: Express (v5.x)
- **Database ORM**: Prisma with SQLite
- **Validation**: Zod
- **Testing**: Jest & Supertest
- **Linter / Language**: TypeScript

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-meeting-intelligence-key-2026-xyz"
GEMINI_API_KEY="your_gemini_api_key"                  # If missing, fallback to dynamic mock analyzer
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." # Optional
RESEND_API_KEY="re_..."                                 # Optional
CRON_SCHEDULE="* * * * *"                               # Runs every minute by default
NODE_ENV="development"
```

---

## Setup and Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
Create and synchronize the SQLite database schema:
```bash
npm run prisma:migrate
```

### 3. Run the Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000`. You can access the API documentation at `http://localhost:5000/api-docs`.

### 4. Build for Production
```bash
npm run build
npm start
```

### 5. Run Integration Tests
```bash
npm test
```

---

## API Documentation

### Public Endpoints

#### Health Check
- **Request**: `GET /health`
- **Response**:
  ```json
  {
    "status": "UP"
  }
  ```

#### Evaluation Endpoint
- **Request**: `GET /api/evaluation`
- **Response**:
  ```json
  {
    "candidateName": "Hintro Candidate",
    "email": "candidate@example.com",
    "repositoryUrl": "https://github.com/hintro/meeting-intelligence-service",
    "deployedUrl": "https://meeting-intelligence-service.onrender.com",
    "externalIntegration": "Slack Webhook & Resend Email API",
    "features": ["Authentication", "AI Analysis", "Reminder Scheduler"]
  }
  ```

---

### Protected API Usage Examples

For the following endpoints, retrieve the JWT token from the Login response and include it in the `Authorization` header: `Bearer <token>`.

#### 1. Register a User
- **Endpoint**: `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "securepassword",
    "name": "Alice"
  }
  ```

#### 2. Log In
- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "securepassword"
  }
  ```

#### 3. Create a Meeting
- **Endpoint**: `POST /api/meetings`
- **Request Body**:
  ```json
  {
    "title": "Sprint Planning",
    "participants": ["alice@example.com", "bob@example.com"],
    "meetingDate": "2026-05-20T10:00:00Z",
    "transcript": [
      {
        "timestamp": "00:10",
        "speaker": "John",
        "text": "We should launch next Friday."
      },
      {
        "timestamp": "00:20",
        "speaker": "Alice",
        "text": "I will prepare release notes."
      }
    ]
  }
  ```

#### 4. List Meetings (Paginated)
- **Endpoint**: `GET /api/meetings?page=1&limit=5`

#### 5. Analyze Meeting Transcript (AI Grounding)
- **Endpoint**: `POST /api/meetings/:id/analyze`
- **Response Body**:
  ```json
  {
    "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "success": true,
    "data": {
      "summary": [
        {
          "text": "Discussion on planning: \"We should launch next Friday.\"",
          "citations": [{ "timestamp": "00:10" }]
        }
      ],
      "actionItems": [
        {
          "id": "e3056ab2-dcd3-4903-8d07-6bb90c102a0a",
          "task": "Prepare release notes",
          "assignee": "Alice",
          "dueDate": "2026-05-27T10:00:00.000Z",
          "status": "PENDING",
          "citations": [{ "timestamp": "00:20" }]
        }
      ],
      "decisions": [
        {
          "text": "Decided: We should launch next Friday.",
          "citations": [{ "timestamp": "00:10" }]
        }
      ],
      "followUps": []
    }
  }
  ```

#### 6. Update Action Item Status
- **Endpoint**: `PATCH /api/action-items/:id/status`
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```

#### 7. Get Overdue Action Items
- **Endpoint**: `GET /api/action-items/overdue`

---

## Deployment Instructions

### Deploy to Render / Railway

1. Add your repository to Render or Railway.
2. Select **Web Service** with Node runtime environment.
3. Configure environmental variables inside the dashboard setting production secrets.
4. Set Build Command:
   ```bash
   npm run build
   ```
5. Set Start Command:
   ```bash
   npm run prisma:deploy && npm start
   ```
   *Note: Using SQLite on Render is transient unless configured with a Persistent Disk. For persistent staging/production databases, change `DATABASE_URL` to point to a PostgreSQL instance.*
