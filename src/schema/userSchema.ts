import {z} from "zod";

const createUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    designation: z.string(),
});

export { createUserSchema };