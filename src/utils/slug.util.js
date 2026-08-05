/**
 * Convert any string (including Vietnamese with diacritics) into a URL-safe slug.
 * e.g. "Thức ăn cho Chó" -> "thuc-an-cho-cho"
 */
function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/đ/gi, "d") // Vietnamese "đ" is not decomposed by NFD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = { slugify };
