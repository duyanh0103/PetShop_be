const bcrypt = require("bcrypt");
const { Role } = require("@prisma/client");

const authRepository = require("./auth.repository");
const { signToken } = require("../../utils/jwt");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../../utils/errors");

class AuthService {
  async register(data) {
    const existedUser = await authRepository.findByUsername(data.username);

    if (existedUser) {
      throw new ConflictError("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await authRepository.createUser({
      username: data.username,
      password: hashedPassword,
      role: Role.CUSTOMER,
    });

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    };
  }

  async login(data) {
    const user = await authRepository.findByUsername(data.username);

    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    };
  }
  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AuthService();
