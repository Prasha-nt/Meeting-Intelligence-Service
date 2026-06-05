import { Router } from 'express';
import { createMeeting, getMeeting, listMeetings, analyzeMeeting } from '../controllers/meeting.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createMeetingSchema, listMeetingsQuerySchema } from '../utils/schemas';

const router = Router();

// Apply auth to all meeting routes
router.use(authMiddleware);

router.post('/', validateRequest({ body: createMeetingSchema }), createMeeting);
router.get('/', validateRequest({ query: listMeetingsQuerySchema }), listMeetings);
router.get('/:id', getMeeting);
router.post('/:id/analyze', analyzeMeeting);

export default router;
