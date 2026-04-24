import type { Designation } from "@prisma/client";
import { prisma } from "../prisma.js";

const createUser = async function(name: string, email: string, designation: Designation) {
  return await prisma.user.create({
    data: {
      name,
      email,
      designation,
    },
  });
};
const getAllUsers = async function(){
  return await prisma.user.findMany();
};
const deleteUser = async function(email: string){
  return await prisma.user.delete({
    where: {
      email,
    },
  });
};

export { createUser,getAllUsers,deleteUser };

