import { Router } from 'express';
import { 
  createActionItem, 
  updateActionItemStatus, 
  listActionItems, 
  getOverdueActionItems 
} from '../controllers/action-item.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  createActionItemSchema, 
  updateActionItemStatusSchema, 
  getActionItemsQuerySchema 
} from '../utils/schemas';

const router = Router();

// Apply auth to all action item routes
router.use(authMiddleware);

router.post('/', validateRequest({ body: createActionItemSchema }), createActionItem);
router.get('/overdue', getOverdueActionItems);
router.get('/', validateRequest({ query: getActionItemsQuerySchema }), listActionItems);
router.patch('/:id/status', validateRequest({ body: updateActionItemStatusSchema }), updateActionItemStatus);

export default router;
