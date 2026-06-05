import dotenv from 'dotenv';
// Load environment variables before importing modules that rely on them
dotenv.config();

import app from './app';
import { startReminderScheduler } from './services/reminder.service';
import logger from './utils/logger';
import prisma from './config/db';

const PORT = process.env.PORT || 5000;

// Start background cron scheduler for overdue action items
const reminderCron = startReminderScheduler();

const server = app.listen(PORT, () => {
  logger.info(`Meeting Intelligence Service started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  // Stop cron job
  if (reminderCron) {
    reminderCron.stop();
    logger.info('Reminder cron scheduler stopped');
  }

  server.close(async () => {
    logger.info('Express server closed');
    
    // Close Prisma database connection
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.warn('Forcing process shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
