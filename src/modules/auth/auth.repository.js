const prisma = require("../../configs/prisma");

class AuthRepository {
  async findByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // Login accepts either the username or the email in a single field.
  async findByIdentifier(identifier) {
    return prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
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
