import type { User } from "@prisma/client";
import { createUserSchema, deleteUserSchema } from "../schema/userSchema.js"
import { createUser, deleteUser, getAllUsers } from "../services/userService.js";

import type { Request, Response } from "express";

async function createUserInput(req: Request,res : Response) {

const input = createUserSchema.parse(req.body);

const user =await createUser(input.name, input.email, input.designation);

res.json(user);
}

async function deleteUserInput(req: Request,res : Response) {

const {email}  = deleteUserSchema.parse(req.params);

await deleteUser(email);

res.json("User Deleted");
}

async function getUsers(req: Request,res : Response) {

const  users: User[] =await getAllUsers();
}


export { createUserInput, deleteUserInput, getUsers };