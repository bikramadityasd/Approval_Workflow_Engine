import { PrismaClient } from "@prisma/client/extension";  

const prisma = new PrismaClient();

const createUser = async function(name: string, email: string, designation: string) {
  return await prisma.user.create({
    data: {
      name,
      email,
      designation,
    },
  });
};
const getAllUsers = async () => {
  return await prisma.user.findMany();
};

export { createUser,getAllUsers };
