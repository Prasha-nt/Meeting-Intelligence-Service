import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { NotFoundError } from '../utils/errors';

export async function createActionItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { task, assignee, dueDate, meetingId, citations } = req.body;
    const userId = req.user!.id;

    // Verify meeting exists and belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId }
    });
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        task,
        assignee,
        dueDate: new Date(dueDate),
        meetingId,
        citations: JSON.stringify(citations || []),
        status: 'PENDING'
      }
    });

    res.status(201).json({
      traceId: req.traceId,
      success: true,
      data: {
        id: actionItem.id,
        task: actionItem.task,
        assignee: actionItem.assignee,
        dueDate: actionItem.dueDate,
        status: actionItem.status,
        citations: citations || [],
        meetingId: actionItem.meetingId,
        createdAt: actionItem.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateActionItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const userId = req.user!.id;

    // Find the action item and make sure it belongs to a meeting created by the user
    const actionItem = await prisma.actionItem.findFirst({
      where: {
        id,
        meeting: {
          userId
        }
      }
    });

    if (!actionItem) {
      throw new NotFoundError('Action item not found');
    }

    const updated = await prisma.actionItem.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: {
        id: updated.id,
        task: updated.task,
        assignee: updated.assignee,
        dueDate: updated.dueDate,
        status: updated.status,
        citations: JSON.parse(updated.citations),
        meetingId: updated.meetingId,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listActionItems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;
    const assignee = req.query.assignee as string | undefined;
    const meetingId = req.query.meetingId as string | undefined;

    const actionItems = await prisma.actionItem.findMany({
      where: {
        meeting: {
          userId
        },
        ...(status ? { status } : {}),
        ...(assignee ? { assignee } : {}),
        ...(meetingId ? { meetingId } : {})
      },
      orderBy: { dueDate: 'asc' }
    });

    const formatted = actionItems.map(item => ({
      id: item.id,
      task: item.task,
      assignee: item.assignee,
      dueDate: item.dueDate,
      status: item.status,
      citations: JSON.parse(item.citations),
      meetingId: item.meetingId,
      createdAt: item.createdAt
    }));

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
}

export async function getOverdueActionItems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const actionItems = await prisma.actionItem.findMany({
      where: {
        meeting: {
          userId
        },
        status: {
          not: 'COMPLETED'
        },
        dueDate: {
          lt: now
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const formatted = actionItems.map(item => ({
      id: item.id,
      task: item.task,
      assignee: item.assignee,
      dueDate: item.dueDate,
      status: item.status,
      citations: JSON.parse(item.citations),
      meetingId: item.meetingId,
      createdAt: item.createdAt
    }));

    res.status(200).json({
      traceId: req.traceId,
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
}
