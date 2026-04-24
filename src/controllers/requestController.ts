
import { createRequestSchema } from "../schema/requestSchema.js"
import { approveStatus, createRequest, getRequestsByUserId, rejectStatus } from "../services/requestService.js";

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

async function getRequestsByUserIdInput(req: Request, res: Response) {
  try {
    const userIdString = req.params.userId;
    if (!userIdString || Array.isArray(userIdString)) {
      return res.status(400).json({ error: "Invalid user-id header" });
    }
    const userId = Number(userIdString);

    const requests = await getRequestsByUserId(userId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
  }
}


// async function updateRequestStatusInput(req: Request, res: Response) {
//     try {
//         const { requestId, status, approverId, approveStatus } = req.body;
//         const updatedRequest = await updateRequestStatus(requestId, status, approverId, approveStatus);
//         res.json(updatedRequest);
//     } catch (error) {
//         res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
//     }

// }

// async function approveStatusInput(req: Request, res: Response) {
//     try {
//         const { requestId } = req.params;
//         const { approverId } = req.body;

//         const updatedRequest = await approveStatus(requestId, approverId, "APPROVED");
//         res.json(updatedRequest);
//     } catch (error) {
//         res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
//     }

// }

async function approveStatusInput(req: Request, res: Response) {
  try {
    const requestId = String(req.params.requestId);
    const userIdString = req.headers['user-id'];
    const approverId = Number(userIdString);
     
    const updated = await approveStatus(requestId, approverId);
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    if (message === "Request not found") return res.status(404).json({ error: message });
    if (message === "Not your turn") return res.status(403).json({ error: message });
    if (message === "Request is already closed") return res.status(400).json({ error: message });
    res.status(500).json({ error: message });
  }
}

async function rejectStatusInput(req: Request, res: Response) {
  try {

    const requestId = String(req.params.requestId);
    const userIdString = req.headers['user-id'];
    const approverId = Number(userIdString);
    if (Number.isNaN(approverId)) {
      return res.status(400).json({ error: "user-id header must be a number" });
    }

    const updated = await rejectStatus(requestId, approverId);
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    if (message === "Request not found") return res.status(404).json({ error: message });
    if (message === "Not your turn") return res.status(403).json({ error: message });
    if (message === "Request is already closed") return res.status(400).json({ error: message });
    res.status(500).json({ error: message });
  }
}


export { createRequestInput, getRequestsByUserIdInput, approveStatusInput, rejectStatusInput };