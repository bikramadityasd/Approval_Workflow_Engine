import { Router } from 'express';
import { createRequestInput } from '../controllers/requestController.js';

const router = Router();

//Create Request
router.post('/requests', createRequestInput);
export default router;