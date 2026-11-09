const dashboardRepository = require("./dashboard.repository");
const {
  toVietnamDate,
  startOfVietnamDay,
  startOfVietnamMonth,
} = require("../../utils/vietnamTime");

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];

class DashboardService {
  async getSummary(now = new Date()) {
    const startOfToday = startOfVietnamDay(toVietnamDate(now));

    const [
      revenueToday,
      revenueThisMonth,
      statusRows,
      ordersToday,
      newCustomersToday,
      lowStockProducts,
      lowStockCount,
      recentOrders,
    ] = await Promise.all([
      dashboardRepository.sumRevenueSince(startOfToday),
      dashboardRepository.sumRevenueSince(startOfVietnamMonth(now)),
      dashboardRepository.countOrdersByStatus(),
      dashboardRepository.countOrdersSince(startOfToday),
      dashboardRepository.countCustomersSince(startOfToday),
      dashboardRepository.findLowStockProducts(),
      dashboardRepository.countLowStockProducts(),
      dashboardRepository.findRecentOrders(),
    ]);

    const counts = new Map(statusRows.map((row) => [row.status, row._count._all]));

    return {
      revenueToday,
      revenueThisMonth,
      ordersToday,
      newCustomersToday,
      // Every status is present, so the screen can show zeros without guessing.
      ordersByStatus: Object.fromEntries(
        ORDER_STATUSES.map((status) => [status, counts.get(status) ?? 0])
      ),
      lowStockCount,
      lowStockProducts,
      recentOrders: recentOrders.map((order) => ({ ...order, total: Number(order.total) })),
    };
  }
}

module.exports = new DashboardService();
