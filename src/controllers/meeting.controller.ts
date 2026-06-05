import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { NotFoundError } from '../utils/errors';
import { analyzeTranscript } from '../services/gemini.service';

export async function createMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, participants, meetingDate, transcript } = req.body;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        participants: JSON.stringify(participants),
        meetingDate: new Date(meetingDate),
        transcript: JSON.stringify(transcript),
        userId,
      }
    });

    res.status(201).json({
      traceId: req.traceId,
      success: true,
      data: {
        id: meeting.id,
        title: meeting.title,
        participants,
        meetingDate: meeting.meetingDate,
        transcript,
        createdAt: meeting.createdAt,
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId }
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: {
        id: meeting.id,
        title: meeting.title,
        participants: JSON.parse(meeting.participants),
        meetingDate: meeting.meetingDate,
        transcript: JSON.parse(meeting.transcript),
        summary: meeting.summary ? JSON.parse(meeting.summary) : null,
        decisions: meeting.decisions ? JSON.parse(meeting.decisions) : null,
        followUps: meeting.followUps ? JSON.parse(meeting.followUps) : null,
        createdAt: meeting.createdAt,
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listMeetings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const total = await prisma.meeting.count({ where: { userId } });
    const meetings = await prisma.meeting.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { meetingDate: 'desc' }
    });

    const formattedMeetings = meetings.map(m => ({
      id: m.id,
      title: m.title,
      participants: JSON.parse(m.participants),
      meetingDate: m.meetingDate,
      transcript: JSON.parse(m.transcript),
      summary: m.summary ? JSON.parse(m.summary) : null,
      decisions: m.decisions ? JSON.parse(m.decisions) : null,
      followUps: m.followUps ? JSON.parse(m.followUps) : null,
      createdAt: m.createdAt,
    }));

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: {
        meetings: formattedMeetings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function analyzeMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId }
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    const parsedTranscript = JSON.parse(meeting.transcript);
    
    // Call Gemini Analysis
    const analysis = await analyzeTranscript(meeting.title, parsedTranscript);

    // Save analysis outputs back to meeting
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        summary: JSON.stringify(analysis.summary),
        decisions: JSON.stringify(analysis.decisions),
        followUps: JSON.stringify(analysis.followUps),
      }
    });

    // Save extracted action items to ActionItem table
    const actionItemsData = [];
    for (const item of analysis.actionItems) {
      const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
      if (!item.dueDate) {
        dueDate.setDate(dueDate.getDate() + 7); // Default 7 days
      }

      const createdActionItem = await prisma.actionItem.create({
        data: {
          task: item.task,
          assignee: item.assignee,
          dueDate,
          citations: JSON.stringify(item.citations),
          meetingId: meeting.id,
          status: 'PENDING'
        }
      });

      actionItemsData.push({
        id: createdActionItem.id,
        task: createdActionItem.task,
        assignee: createdActionItem.assignee,
        dueDate: createdActionItem.dueDate,
        status: createdActionItem.status,
        citations: item.citations
      });
    }

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: {
        summary: analysis.summary,
        actionItems: actionItemsData,
        decisions: analysis.decisions,
        followUps: analysis.followUps
      }
    });
  } catch (error) {
    next(error);
  }
}
