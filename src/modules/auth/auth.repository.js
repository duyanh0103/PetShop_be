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
}

module.exports = new AuthRepository();
