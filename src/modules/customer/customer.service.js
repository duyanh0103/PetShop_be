const customerRepository = require("./customer.repository");
const orderService = require("../order/order.service");
const { NotFoundError } = require("../../utils/errors");

class CustomerService {
  async list({ page, limit, search, isActive }) {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      customerRepository.findMany({ search, isActive, skip, take: limit }),
      customerRepository.count({ search, isActive }),
    ]);

    const spent = await customerRepository.sumCompletedByUsers(customers.map((customer) => customer.id));

    return {
      items: customers.map((customer) => this.toResponse(customer, spent.get(customer.id) ?? 0)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(id) {
    const customer = await this.findOrThrow(id);

    const [orders, spent] = await Promise.all([
      customerRepository.findRecentOrders(id),
      customerRepository.sumCompletedByUsers([id]),
    ]);

    return {
      ...this.toResponse(customer, spent.get(id) ?? 0),
      orders: orders.map((order) => orderService.toOrderResponse(order)),
    };
  }

  async setActiveStatus(id, isActive) {
    await this.findOrThrow(id);

    const [customer, spent] = await Promise.all([
      customerRepository.setActive(id, isActive),
      customerRepository.sumCompletedByUsers([id]),
    ]);

    return this.toResponse(customer, spent.get(id) ?? 0);
  }

  async findOrThrow(id) {
    const customer = await customerRepository.findById(id);

    if (!customer) {
      throw new NotFoundError("Không tìm thấy khách hàng");
    }

    return customer;
  }

  // Built field by field so the password hash can never leak into a response.
  toResponse(customer, totalSpent) {
    return {
      id: customer.id,
      username: customer.username,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone,
      isActive: customer.isActive,
      orderCount: customer._count.orders,
      totalSpent,
      createdAt: customer.createdAt,
    };
  }
}

module.exports = new CustomerService();
