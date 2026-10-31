const bcrypt = require("bcrypt");
const { Role } = require("@prisma/client");

const authRepository = require("./auth.repository");
const { signToken } = require("../../utils/jwt");
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require("../../utils/errors");

class AuthService {
  async register(data) {
    const existedUser = await authRepository.findByUsername(data.username);

    if (existedUser) {
      throw new ConflictError("Tên đăng nhập đã tồn tại");
    }

    const existedEmail = await authRepository.findByEmail(data.email);

    if (existedEmail) {
      throw new ConflictError("Email đã được sử dụng");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Public registration always creates a CUSTOMER, whatever the payload says.
    const user = await authRepository.createUser({
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone ?? null,
      password: hashedPassword,
      role: Role.CUSTOMER,
    });

    return this.issueSession(user);
  }

  async login(data) {
    const user = await authRepository.findByIdentifier(data.identifier);

    if (!user) {
      throw new UnauthorizedError("Tài khoản hoặc mật khẩu không đúng");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedError("Tài khoản hoặc mật khẩu không đúng");
    }

    // Checked after the password so a locked account is not revealed to
    // someone who does not know its password.
    if (user.isActive === false) {
      throw new ForbiddenError("Tài khoản đã bị khoá");
    }

    return this.issueSession(user);
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("Không tìm thấy người dùng");
    }

    return {
      ...this.toUserResponse(user),
      createdAt: user.createdAt,
    };
  }

  issueSession(user) {
    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  toUserResponse(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email ?? null,
      fullName: user.fullName ?? null,
      phone: user.phone ?? null,
      role: user.role,
    };
  }
}

module.exports = new AuthService();
