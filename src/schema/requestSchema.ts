import  {z} from "zod";

const createRequestSchema = z.object({
    description: z.string(),
    amount: z.number(),
    // userId: z.number(),
});

const updateRequestStatusSchema = z.object({
    requestId: z.string(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export { createRequestSchema, updateRequestStatusSchema };