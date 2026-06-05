import { Request, Response } from 'express';

export function getHealth(req: Request, res: Response) {
  res.status(200).json({
    status: 'UP'
  });
}

export function getEvaluation(req: Request, res: Response) {
  res.status(200).json({
    candidateName: process.env.CANDIDATE_NAME || 'Hintro Candidate',
    email: process.env.CANDIDATE_EMAIL || 'candidate@example.com',
    repositoryUrl: process.env.REPOSITORY_URL || 'https://github.com/hintro/meeting-intelligence-service',
    deployedUrl: process.env.DEPLOYED_URL || 'https://meeting-intelligence-service.onrender.com',
    externalIntegration: 'Slack Webhook & Resend Email API',
    features: [
      'Authentication',
      'AI Analysis',
      'Reminder Scheduler'
    ]
  });
}
