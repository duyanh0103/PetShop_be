const prisma = require("../../configs/prisma");

class AuthRepository {
  async findByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async createUser(data) {
    return prisma.user.create({
      data,
    });
  }
  async findById(id) {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }
}

module.exports = new AuthRepository();
