import cron from 'node-cron';
import prisma from '../config/db';
import logger from '../utils/logger';

export async function triggerReminderJob(): Promise<{ processedCount: number; successes: number; failures: number }> {
  logger.info('Starting scheduled reminder job scanning for overdue action items');
  
  const now = new Date();
  
  // 1. Identify overdue action items (status != COMPLETED and dueDate < now)
  const overdueItems = await prisma.actionItem.findMany({
    where: {
      status: {
        not: 'COMPLETED'
      },
      dueDate: {
        lt: now
      }
    },
    include: {
      meeting: true
    }
  });

  logger.info(`Found ${overdueItems.length} overdue action items to notify`);

  let successes = 0;
  let failures = 0;

  for (const item of overdueItems) {
    let integrationName = 'None';
    let success = false;
    let errorDetail = '';

    try {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      const resendApiKey = process.env.RESEND_API_KEY;

      const formattedDueDate = item.dueDate.toISOString().split('T')[0];

      // Priority 1: Slack Webhook
      if (slackUrl && slackUrl !== 'https://hooks.slack.com/services/mock_webhook') {
        integrationName = 'Slack Webhook';
        
        const slackPayload = {
          text: `🔔 Reminder: ${item.task}\nAssigned To: ${item.assignee}\nDue Date: ${formattedDueDate}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🔔 Overdue Action Item Reminder',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Task:* ${item.task}\n*Assigned To:* ${item.assignee}\n*Due Date:* ${formattedDueDate}\n*Meeting:* ${item.meeting.title}`
              }
            }
          ]
        };

        const res = await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Slack returned status ${res.status}: ${text}`);
        }
        success = true;
      }
      // Priority 2: Resend Email
      else if (resendApiKey && resendApiKey !== 're_mock' && item.assignee.includes('@')) {
        integrationName = 'Resend Email';
        
        const emailPayload = {
          from: 'Meeting Intelligence <onboarding@resend.dev>', // Resend sandbox default from
          to: [item.assignee],
          subject: `🔔 Overdue Action Item: ${item.task}`,
          html: `
            <h3>Overdue Action Item Reminder</h3>
            <p>Hi ${item.assignee},</p>
            <p>The following action item assigned to you from the meeting <strong>"${item.meeting.title}"</strong> is overdue:</p>
            <ul>
              <li><strong>Task:</strong> ${item.task}</li>
              <li><strong>Due Date:</strong> ${formattedDueDate}</li>
            </ul>
            <p>Please update the status as soon as possible.</p>
          `
        };

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify(emailPayload)
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Resend returned status ${res.status}: ${text}`);
        }
        success = true;
      } 
      // Fallback: Mock Integration log
      else {
        integrationName = 'Mock Integration (Log)';
        logger.info(`[MOCK NOTIFICATION] Reminder: ${item.task} | Assigned To: ${item.assignee} | Due Date: ${formattedDueDate}`);
        success = true;
      }

      successes++;
    } catch (err: any) {
      failures++;
      success = false;
      errorDetail = err.message || String(err);
      logger.error(`Failed to send reminder for ActionItem ${item.id}`, err);
    }

    // 3. Record reminder history
    await prisma.reminderHistory.create({
      data: {
        actionItemId: item.id,
        status: success ? 'SUCCESS' : 'FAILED',
        error: errorDetail || null,
        integration: integrationName
      }
    });
  }

  logger.info(`Reminder job complete. Successes: ${successes}, Failures: ${failures}`);
  return {
    processedCount: overdueItems.length,
    successes,
    failures
  };
}

export function startReminderScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '* * * * *'; // default every minute
  logger.info(`Initializing Overdue Action Items Cron Scheduler on pattern: "${schedule}"`);
  
  return cron.schedule(schedule, async () => {
    try {
      await triggerReminderJob();
    } catch (error) {
      logger.error('Error occurred during scheduled reminder job execution', error);
    }
  });
}
