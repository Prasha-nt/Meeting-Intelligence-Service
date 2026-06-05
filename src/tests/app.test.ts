import request from 'supertest';
import app from '../app';
import prisma from '../config/db';
import { triggerReminderJob } from '../services/reminder.service';

let authToken: string;
let meetingId: string;
let actionItemId: string;

const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
  name: 'Testy Tester'
};

beforeAll(async () => {
  // Clean DB before test execution
  await prisma.reminderHistory.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.reminderHistory.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Meeting Intelligence Service REST API', () => {

  describe('GET /health', () => {
    it('should return UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'UP' });
    });
  });

  describe('GET /api/evaluation', () => {
    it('should return developer details and integration type', async () => {
      const res = await request(app).get('/api/evaluation');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('candidateName');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('externalIntegration');
      expect(res.body.features).toContain('Authentication');
    });
  });

  describe('Authentication APIs', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.name).toBe(testUser.name);
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('traceId');
    });

    it('should not register the same user email twice (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should login user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUser.email);
      authToken = res.body.data.token;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Meetings Management APIs', () => {
    it('should create a meeting for the authenticated user', async () => {
      const meetingData = {
        title: 'Project Kickoff',
        participants: ['alice@example.com', 'bob@example.com'],
        meetingDate: new Date().toISOString(),
        transcript: [
          { timestamp: '00:05', speaker: 'Alice', text: 'We should begin developing the service.' },
          { timestamp: '00:15', speaker: 'Bob', text: 'I will write the test cases by tomorrow.' },
          { timestamp: '00:25', speaker: 'Alice', text: 'Great, let us meet next Monday.' }
        ]
      };

      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(meetingData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(meetingData.title);
      expect(res.body.data.participants).toEqual(meetingData.participants);
      meetingId = res.body.data.id;
    });

    it('should reject creating a meeting if unauthenticated', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .send({ title: 'No Auth' });
      expect(res.status).toBe(401);
    });

    it('should list meetings for authenticated user with pagination', async () => {
      const res = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: '1', limit: '5' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meetings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should fetch a single meeting by id', async () => {
      const res = await request(app)
        .get(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Project Kickoff');
    });
  });

  describe('AI Meeting Analysis API', () => {
    it('should perform AI analysis and auto-populate action items in database', async () => {
      const res = await request(app)
        .post(`/api/meetings/${meetingId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('actionItems');
      expect(res.body.data.actionItems.length).toBeGreaterThanOrEqual(1);
      
      // Citations checking (should contain at least one citation timestamp)
      const actionItem = res.body.data.actionItems[0];
      expect(actionItem).toHaveProperty('citations');
      expect(actionItem.citations[0]).toHaveProperty('timestamp');
      
      actionItemId = actionItem.id;
    });
  });

  describe('Action Item Management APIs', () => {
    it('should update the status of an action item', async () => {
      const res = await request(app)
        .patch(`/api/action-items/${actionItemId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('should return validation error for an invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/action-items/${actionItemId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should manually create a new action item linked to meeting', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 1); // Overdue by 1 day

      const manualActionItem = {
        task: 'Setup Slack Webhook Channels',
        assignee: 'bob@example.com',
        dueDate: overdueDate.toISOString(),
        meetingId: meetingId,
        citations: [{ timestamp: '00:15' }]
      };

      const res = await request(app)
        .post('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(manualActionItem);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task).toBe(manualActionItem.task);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should get the list of action items with status and assignee filter', async () => {
      const res = await request(app)
        .get('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'PENDING', assignee: 'bob@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].assignee).toBe('bob@example.com');
    });

    it('should get overdue action items', async () => {
      const res = await request(app)
        .get('/api/action-items/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Verify that due date is indeed less than current time
      const overdueDate = new Date(res.body.data[0].dueDate);
      expect(overdueDate.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('Background Overdue Reminders Job', () => {
    it('should execute overdue reminder job, process notifications and log history', async () => {
      const results = await triggerReminderJob();
      expect(results.processedCount).toBeGreaterThanOrEqual(1);
      expect(results.successes).toBeGreaterThanOrEqual(1);
      
      // Verify reminder history is recorded in SQLite
      const logs = await prisma.reminderHistory.findMany();
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].status).toBe('SUCCESS');
      expect(logs[0].integration).toContain('Mock');
    });
  });
});
