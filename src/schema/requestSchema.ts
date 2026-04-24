import  {z} from "zod";

const createRequestSchema = z.object({
    description: z.string(),
    amount: z.number(),
    // userId: z.number(),
});


const getRequestByUserIdSchema = z.object({
    userId: z.number(),
});

//for approve 
const approveStatusSchema = z.object({
    requestId: z.string(),
    approverId: z.number(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

//for reject
const rejectStatusSchema = z.object({
    requestId: z.string(),
    approverId: z.number(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export { createRequestSchema, approveStatusSchema, rejectStatusSchema, getRequestByUserIdSchema };