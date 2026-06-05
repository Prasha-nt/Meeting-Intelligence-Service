import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../utils/schemas';

const router = Router();

router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);

export default router;
