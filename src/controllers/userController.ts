import type { User } from "@prisma/client";
import { createUserSchema, deleteUserSchema } from "../schema/userSchema.js"
import { createUser, deleteUser } from "../services/userService.js";

import type { Request, Response } from "express";

async function createUserInput(req: Request,res : Response) {

const input = createUserSchema.parse(req.body);

const user =await createUser(input.name, input.email, input.designation);

res.json(user);
}

async function deleteUserInput(req: Request,res : Response) {

const input = deleteUserSchema.parse(req.body);

await deleteUser(input.email);

res.json("User Deleted");
}




export { createUserInput, deleteUserInput };