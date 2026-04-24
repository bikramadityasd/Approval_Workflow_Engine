import { prisma } from "../prisma.js";

const createRequest = async function (
  description: string,
  amount: number,
  userId: number,
) {
  const manager = await prisma.user.findFirst({
    where: { designation: "MANAGER" },
  });
  const hr = await prisma.user.findFirst({ where: { designation: "HR" } });

  if (!manager || !hr) {
    throw new Error("Approval chain cannot be built");
  } else {
    const transactions = await prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          description,
          amount,
          userId,
        },
      });

      await tx.approval.createMany({
        data: [
          {
            requestId: request.id,
            approverId: manager.id,
            stepOrder: 1,
          },
          {
            requestId: request.id,
            approverId: hr.id,
            stepOrder: 2,
          },
        ],
      });
      const createdRequest =await tx.request.findUnique({
        where: { id: request.id },
        include: {
          approvals: {
              orderBy: { stepOrder: "asc" },
              include: {approver: true },
          },
        },
      });
      return createdRequest;
    });
    return transactions;
  }
};

const getRequestsByUserId = async function(userId: number) {
  const requests = await prisma.request.findMany({
    where: { userId },
    include: {
      approvals: {
          orderBy: { stepOrder: "asc" },
          include: {approver: true },
      },
    },
  });
  return requests;
};

// const updateRequestStatus = async function(requestId: string, approverId : number, status: "PENDING" | "APPROVED" | "REJECTED", approveStatus: "APPROVED" | "REJECTED") {
// const transactions = await prisma.$transaction(async (tx) => {
//   const request = await tx.request.findUnique({
//     where: { id: requestId }
//   })
//   if(!request) {
//     throw new Error("Request not found");
//   }
//   if (request.status != "PENDING") {
//   throw new Error("Request is already processed");
// };
// const currentApproval = await tx.approval.findFirst({
//   where: {
//     requestId,
//     approverId,
//     status: "PENDING",
//   },
//   orderBy: { stepOrder: "asc" },
// })
// if(!currentApproval) {
//   throw new Error("No pending approval found for this approver");
// }
// await tx.approval.update({
//   where: { id: currentApproval.id },
//   data: { status },
// });
// if (status === "REJECTED") {
//   await tx.request.update({
//     where: { id: requestId },
//     data: { status: "REJECTED" },
//   });
// } else {
//   const nextApproval = await tx.approval.findFirst({
//     where: {
//       requestId,
//       status: "PENDING",
//     },
//     orderBy: { stepOrder: "asc" },
//   });
//   if (!nextApproval) {
//     await tx.request.update({
//       where: { id: requestId },
//       data: { status: "APPROVED" },
//     });
//   }
// }
// const updatedRequest = await tx.request.findUnique({
//   where: { id: requestId },
//   include: {
//     approvals: {
//         orderBy: { stepOrder: "asc" },
//         include: {approver: true },
//     },
//   },
// });
// return updatedRequest;
// });
// return transactions;
// }

// const updateRequestStatus = async function(requestId: string, approverId : number, status: "PENDING" | "APPROVED" | "REJECTED", approveStatus: "APPROVED" | "REJECTED") {
//   try {
//     const transactions = await prisma.$transaction(async (tx) => {
//       const request = await tx.request.findUnique({
//         where: { id: requestId }
//       })
//       if(!request) {
//         throw new Error("Request not found");
//       }
//       if (request.status != "PENDING") {
//       throw new Error("Request is already processed");
//     };
//     const currentApproval = await tx.approval.findFirst({
//       where: {
//         requestId,
//         status: "PENDING",
//       },
//       orderBy: { stepOrder: "asc" },
//     })
//     if(!currentApproval) {
//       throw new Error("No pending approval found for this approver");
//     }
//     await tx.approval.update({
//       where: { id: currentApproval.id },          
//       data: { status },
//     });
//     if (approveStatus === "REJECTED") {
//       await tx.request.update({
//         where: { id: requestId },
//         data: { status: "REJECTED" },
//       });
//     } else {
//       const nextApproval = await tx.approval.findFirst({
//         where: {
//           requestId,
//           status: "PENDING",
//         },
//         orderBy: { stepOrder: "asc" },
//       });
//       if (!nextApproval) {
//         await tx.request.update({
//           where: { id: requestId },
//           data: { status: "APPROVED" },
//         });
//       }
//     }
//     const updatedRequest = await tx.request.findUnique({
//       where: { id: requestId },
//       include: {
//         approvals: {
//             orderBy: { stepOrder: "asc" },
//             include: {approver: true },
//         },
//       },
//     });
//     return updatedRequest;
//   });
//   return transactions;
//   } catch (error) {
//     throw error instanceof Error ? error : new Error("An unknown error occurred");
//   }
// }

const approveStatus = async function (requestId: string, approverId: number) {
  const transaction = await prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== "PENDING") throw new Error("Request is already closed");

    const currentStep = await tx.approval.findFirst({
      where: { requestId, status: "PENDING" },
      orderBy: { stepOrder: "asc" },
    });
    if (!currentStep) throw new Error("Request is already closed");
    if (currentStep.approverId !== approverId) throw new Error("Not your turn");

    await tx.approval.update({
      where: { id: currentStep.id },
      data: { status: "APPROVED" },
    });

    const remaining = await tx.approval.count({
      where: { requestId, status: "PENDING" },
    });
    if (remaining === 0) {
      await tx.request.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });
    }
    const updatedRequest = await tx.request.findUnique({
      where: { id: requestId },
      include: {
        approvals: {
          orderBy: { stepOrder: "asc" },
          include: { approver: true },
        },
      },
    });
    return updatedRequest;
  }

);
return transaction;
};


const rejectStatus = async function (requestId: string, approverId: number) {
  const transaction = await prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== "PENDING") throw new Error("Request is already closed");

    const currentStep = await tx.approval.findFirst({
      where: { requestId, status: "PENDING" },
      orderBy: { stepOrder: "asc" },
    });
    if (!currentStep) throw new Error("Request is already closed");
    if (currentStep.approverId !== approverId) throw new Error("Not your turn");

    await tx.approval.update({
      where: { id: currentStep.id },
      data: { status: "REJECTED" },
    });

    await tx.request.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    const updatedRequest = await tx.request.findUnique({
      where: { id: requestId },
      include: {
        approvals: {
          orderBy: { stepOrder: "asc" },
          include: { approver: true },
        },
      },
    });
    return updatedRequest;
  });
  return transaction;
};

export { createRequest, getRequestsByUserId, approveStatus, rejectStatus };
  
