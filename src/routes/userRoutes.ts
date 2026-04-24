import { Router } from 'express';
import { createUserInput, deleteUserInput, getUsers } from '../controllers/userController.js';

const router = Router();
//Create User
router.post('/', createUserInput);
//Delete User
router.delete('/:email', deleteUserInput);
//Get all Users
router.get('/', getUsers);
//   async (req, res) => {
//   const users = await getAllUsers();
//   res.json(users);
// });

export default router;
