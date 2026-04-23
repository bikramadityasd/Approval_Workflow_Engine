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
      return tx.request.findUnique({
        where: { id: request.id },
        include: {
          approvals: {
            include: {
              orderBy: { stepOrder: "asc" },
              approver: true,
            },
          },
        },
      });
    });
    return transactions;
  }
};

export { createRequest };