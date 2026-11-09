const { Prisma } = require("@prisma/client");

const orderRepository = require("./order.repository");
const { ConflictError, ForbiddenError, NotFoundError } = require("../../utils/errors");

const { Decimal } = Prisma;

const LINE_STATUS = {
  OK: "OK",
  INSUFFICIENT: "INSUFFICIENT",
  UNAVAILABLE: "UNAVAILABLE",
};

const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  SHIPPING: "SHIPPING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const ALLOWED_TRANSITIONS = {
  PENDING: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  CONFIRMED: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  SHIPPING: [ORDER_STATUS.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

function getShippingConfig() {
  return {
    fee: new Decimal(process.env.SHIPPING_FEE ?? 30000),
    freeThreshold: new Decimal(process.env.FREE_SHIPPING_THRESHOLD ?? 500000),
  };
}

// The same product can be sent twice (e.g. two stale tabs); treat it as one line.
function mergeItems(items) {
  const quantities = new Map();

  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

function toLine({ productId, quantity }, product) {
  if (!product || product.quantity === 0) {
    return {
      productId,
      quantity,
      status: LINE_STATUS.UNAVAILABLE,
      available: 0,
      product: product ?? null,
      unitPrice: product ? new Decimal(product.price) : new Decimal(0),
      lineTotal: new Decimal(0),
    };
  }

  const unitPrice = new Decimal(product.price);

  return {
    productId,
    quantity,
    status: product.quantity < quantity ? LINE_STATUS.INSUFFICIENT : LINE_STATUS.OK,
    available: product.quantity,
    product,
    unitPrice,
    lineTotal: unitPrice.times(quantity),
  };
}

// Single source of pricing: the cart, checkout and order creation all use it.
function buildQuote(items, products) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = items.map((item) => toLine(item, productById.get(item.productId)));

  const subtotal = lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0));
  const { fee, freeThreshold } = getShippingConfig();
  const shippingFee = subtotal.isZero() || subtotal.gte(freeThreshold) ? new Decimal(0) : fee;

  return {
    lines,
    subtotal,
    shippingFee,
    total: subtotal.plus(shippingFee),
    freeShippingThreshold: freeThreshold,
    canCheckout: lines.length > 0 && lines.every((line) => line.status === LINE_STATUS.OK),
  };
}

class OrderService {
  async quote(items) {
    const merged = mergeItems(items);
    const products = await orderRepository.findSellableProducts(merged.map((item) => item.productId));

    return this.toQuoteResponse(buildQuote(merged, products));
  }

  async create(userId, { items, expectedTotal, ...shipping }) {
    // Sorted so two orders sharing products lock rows in the same order and cannot deadlock.
    const merged = mergeItems(items).sort((a, b) => a.productId.localeCompare(b.productId));

    // Checks run outside the transaction: nothing is locked yet, and the
    // conditional decrement below re-checks stock under the row lock anyway.
    const user = await orderRepository.findUserById(userId);

    if (!user || !user.isActive) {
      throw new ForbiddenError("Tài khoản đã bị khoá");
    }

    const products = await orderRepository.findSellableProducts(merged.map((item) => item.productId));
    const quote = buildQuote(merged, products);

    if (!quote.canCheckout) {
      const names = quote.lines
        .filter((line) => line.status !== LINE_STATUS.OK)
        .map((line) => line.product?.name)
        .filter(Boolean);

      throw new ConflictError(
        names.length
          ? `Sản phẩm không đủ hàng: ${names.join(", ")}`
          : "Có sản phẩm trong giỏ không còn được bán"
      );
    }

    if (!quote.total.equals(expectedTotal)) {
      throw new ConflictError("Giá sản phẩm đã thay đổi, vui lòng kiểm tra lại đơn hàng");
    }

    const code = await orderRepository.nextOrderCode();

    const order = await orderRepository.transaction(async (tx) => {
      const created = await orderRepository.createOrder(
        {
          code,
          userId,
          ...shipping,
          subtotal: quote.subtotal,
          shippingFee: quote.shippingFee,
          total: quote.total,
          items: quote.lines.map((line) => ({
            productId: line.productId,
            productName: line.product.name,
            sku: line.product.sku,
            imageUrl: line.product.imageUrl,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          })),
        },
        tx
      );

      // Last step on purpose: buyers of the same product wait on these row
      // locks until commit, so they must be held as briefly as possible.
      for (const line of quote.lines) {
        const decremented = await orderRepository.decrementStock(line.productId, line.quantity, tx);

        if (!decremented) {
          throw new ConflictError(`Sản phẩm không đủ hàng: ${line.product.name}`);
        }
      }

      return created;
    });

    return this.toOrderResponse(order);
  }

  async listMine(userId, { page, limit }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      orderRepository.findManyByUser({ userId, skip, take: limit }),
      orderRepository.countByUser(userId),
    ]);

    return {
      items: items.map((order) => this.toOrderResponse(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMine(userId, id) {
    const order = await orderRepository.findOwnedById(id, userId);

    if (!order) {
      throw new NotFoundError("Không tìm thấy đơn hàng");
    }

    return this.toOrderResponse(order);
  }

  async cancelMine(userId, id) {
    const existing = await orderRepository.findOwnedById(id, userId);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy đơn hàng");
    }

    if (existing.status !== ORDER_STATUS.PENDING) {
      throw new ConflictError("Chỉ huỷ được đơn hàng đang chờ xác nhận");
    }

    return this.toOrderResponse(await this.applyStatusChange(existing, ORDER_STATUS.CANCELLED));
  }

  async listAdmin({ page, limit, ...filters }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      orderRepository.findManyAdmin({ ...filters, skip, take: limit }),
      orderRepository.countAdmin(filters),
    ]);

    return {
      items: items.map((order) => this.toAdminOrderResponse(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAdmin(id) {
    const order = await orderRepository.findByIdAdmin(id);

    if (!order) {
      throw new NotFoundError("Không tìm thấy đơn hàng");
    }

    return this.toAdminOrderResponse(order);
  }

  async updateStatusAdmin(id, status) {
    const existing = await orderRepository.findByIdAdmin(id);

    if (!existing) {
      throw new NotFoundError("Không tìm thấy đơn hàng");
    }

    if (!ALLOWED_TRANSITIONS[existing.status].includes(status)) {
      throw new ConflictError("Không thể chuyển đơn hàng sang trạng thái này");
    }

    return this.toAdminOrderResponse(await this.applyStatusChange(existing, status));
  }

  // The single path for changing an order's status, so a cancel restocks
  // whether the customer or an admin did it.
  async applyStatusChange(order, status) {
    await orderRepository.transaction(async (tx) => {
      const changed = await orderRepository.transitionStatus(order.id, order.status, status, tx);

      if (!changed) {
        throw new ConflictError("Đơn hàng vừa được cập nhật, vui lòng tải lại");
      }

      if (status !== ORDER_STATUS.CANCELLED) return;

      // Items of a since-deleted product have no stock left to return.
      const restockable = order.items
        .filter((item) => item.productId)
        .sort((a, b) => a.productId.localeCompare(b.productId));

      for (const item of restockable) {
        await orderRepository.incrementStock(item.productId, item.quantity, tx);
      }
    });

    return { ...order, status, updatedAt: new Date() };
  }

  toQuoteResponse(quote) {
    return {
      items: quote.lines.map((line) => ({
        productId: line.productId,
        name: line.product?.name ?? null,
        imageUrl: line.product?.imageUrl ?? null,
        unitPrice: Number(line.unitPrice),
        quantity: line.quantity,
        available: line.available,
        lineTotal: Number(line.lineTotal),
        status: line.status,
      })),
      subtotal: Number(quote.subtotal),
      shippingFee: Number(quote.shippingFee),
      total: Number(quote.total),
      freeShippingThreshold: Number(quote.freeShippingThreshold),
      canCheckout: quote.canCheckout,
    };
  }

  toOrderResponse(order) {
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      paymentMethod: order.paymentMethod,
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      note: order.note,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        imageUrl: item.imageUrl,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  toAdminOrderResponse(order) {
    return {
      ...this.toOrderResponse(order),
      customer: order.user,
      allowedStatuses: ALLOWED_TRANSITIONS[order.status],
    };
  }
}

module.exports = new OrderService();
