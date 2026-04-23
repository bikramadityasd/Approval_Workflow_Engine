import { Router } from 'express';
import { createUserInput, deleteUserInput } from '../controllers/userController.js';
import { getAllUsers } from '../services/userService.js';

const router = Router();
//Create User
router.post('/users', createUserInput);
//Delete User
router.delete('/users/:email', deleteUserInput);
//Get all Users
router.get('/users', async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

export default router;