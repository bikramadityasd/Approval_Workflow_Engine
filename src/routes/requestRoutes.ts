import { Router } from 'express';
import { approveStatusInput, createRequestInput, getRequestsByUserIdInput, rejectStatusInput} from '../controllers/requestController.js';

const router = Router();

//Create Request
router.post('/', createRequestInput);

//get Request
router.get('/:userId', getRequestsByUserIdInput)

//approve request
router.post('/:requestId/approve', approveStatusInput)

//reject request
router.post('/:requestId/reject', rejectStatusInput) 
export default router;