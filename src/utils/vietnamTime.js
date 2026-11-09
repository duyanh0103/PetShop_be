// Vietnam has a fixed +07:00 offset (no DST), so day boundaries are plain arithmetic.
const DAY_MS = 24 * 60 * 60 * 1000;

const VIETNAM_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// -> "2026-11-05"
const toVietnamDate = (date = new Date()) => VIETNAM_DATE.format(date);

// "2026-11-05" -> the instant that day starts in Vietnam.
const startOfVietnamDay = (dateString) => new Date(`${dateString}T00:00:00+07:00`);

const startOfNextVietnamDay = (dateString) =>
  new Date(startOfVietnamDay(dateString).getTime() + DAY_MS);

const startOfVietnamMonth = (date = new Date()) =>
  startOfVietnamDay(`${toVietnamDate(date).slice(0, 7)}-01`);

module.exports = {
  toVietnamDate,
  startOfVietnamDay,
  startOfNextVietnamDay,
  startOfVietnamMonth,
};
