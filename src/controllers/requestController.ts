
import { createRequestSchema } from "../schema/requestSchema.js"
import { createRequest } from "../services/requestService.js";

import type { Request, Response } from "express";

// async function createRequestInput(req: Request,res : Response) {

// const input = createRequestSchema.parse(req.body);

// const userIdString = req.headers['user-id'];
// if (!userIdString || Array.isArray(userIdString)) {
//   return res.status(400).json({ error: "Invalid user-id header" });
// }
// const userId = Number(userIdString);

// const request =await createRequest(input.description, input.amount, userId);

// res.json(request);
// }

// export { createRequestInput };


async function createRequestInput(req: Request,res : Response) {
  try {
    const input = createRequestSchema.parse(req.body);

    const userIdString = req.headers['user-id'];
    if (!userIdString || Array.isArray(userIdString)) {
      return res.status(400).json({ error: "Invalid user-id header" });
    }
    const userId = Number(userIdString);

    const request =await createRequest(input.description, input.amount, userId);

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
  }
}

export { createRequestInput };