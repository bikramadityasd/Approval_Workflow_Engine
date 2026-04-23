import {z} from "zod";

const createUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    designation: z.enum(["MANAGER", "HR", "EMPLOYEE"]),
});

const deleteUserSchema = z.object({
    email: z.string().email(),
});

export { createUserSchema, deleteUserSchema };