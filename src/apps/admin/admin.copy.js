import { HTML_PAGE_UI_TEXT_AR } from "../../shared/constants/ui-text.ar.js";
import { applyPageCopy } from "../../shared/ui/apply-page-copy.js";

export function hydrateAdminPageCopy() {
  applyPageCopy(HTML_PAGE_UI_TEXT_AR.adminPage);
}

export function createAdminTableRenderers({
  ADMIN_RENDER_UI_TEXT,
  DEFAULT_CATEGORY_ICON,
  TEXT,
  escapeHtml,
  getCategoryUsageCount,
  getOrderProductImage,
  getOrderStatusTone,
  renderTableActionButton,
}) {
  function renderTableCell({ className, label = "", content = "", colspan = "", extraAttributes = "" }) {
    const colSpanAttribute = colspan ? ` colspan="${escapeHtml(String(colspan))}"` : "";
    const trailingAttributes = extraAttributes ? ` ${extraAttributes.trim()}` : "";
    const labelMarkup = label ? `<span class="admin-cell-label">${escapeHtml(label)}</span>` : "";
    return `<td class="${escapeHtml(className)}"${colSpanAttribute}${trailingAttributes}>${labelMarkup}${content}</td>`;
  }

  function renderCardDetail(label, value) {
    return `<div class="admin-card-detail"><span class="admin-card-detail-label">${escapeHtml(label)}</span><span class="admin-card-detail-value">${value}</span></div>`;
  }

  function renderCardTitle(title) {
    return `<div class="admin-card-copy"><strong class="admin-card-title">${escapeHtml(title)}</strong></div>`;
  }

  function renderEmptyTableRow(message, colspan = 7) {
    return `<tr class="admin-table-row admin-table-row--empty">${renderTableCell({
      className: "admin-table-cell admin-table-cell--empty empty-state",
      colspan,
      content: escapeHtml(message),
    })}</tr>`;
  }

  function renderProductRow(product) {
    const statusLabel = product.is_available ? TEXT.available : TEXT.unavailable;
    const statusTone = product.is_available ? "completed" : "cancelled";
    const imageMarkup = product.image_url
      ? `<div class="admin-card-media"><img class="admin-table-thumb" src="${escapeHtml(product.image_url)}" width="50" height="50"></div>`
      : `<div class="admin-card-media admin-card-media--placeholder"><span class="admin-image-placeholder">${ADMIN_RENDER_UI_TEXT.noImage}</span></div>`;
    const availabilityLabel = product.is_available ? TEXT.disable : TEXT.activate;
    return `<tr class="admin-table-row admin-table-row--product">${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--image product-image-cell",
        label: ADMIN_RENDER_UI_TEXT.image,
        content: imageMarkup,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--name",
        label: ADMIN_RENDER_UI_TEXT.name,
        content: renderCardTitle(product.name),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--price",
        label: ADMIN_RENDER_UI_TEXT.price,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.price, escapeHtml(product.price)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--category",
        label: ADMIN_RENDER_UI_TEXT.category,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.category, escapeHtml(product.category)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--clicks",
        label: ADMIN_RENDER_UI_TEXT.clicks,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.clicks, escapeHtml(Number(product.click_count) || 0)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--status",
        label: ADMIN_RENDER_UI_TEXT.status,
        content: `<div class="admin-card-status">${renderCardDetail(ADMIN_RENDER_UI_TEXT.status, `<span class="status-pill status-pill-${statusTone}">${escapeHtml(statusLabel)}</span>`)}</div>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--actions admin-table-actions action-btns product-action-btns",
        label: ADMIN_RENDER_UI_TEXT.actions,
        content: `${renderTableActionButton({ action: "toggle-product-availability", label: availabilityLabel, className: "btn-primary", id: product.id })}${renderTableActionButton({ action: "edit-product", label: TEXT.edit, className: "btn-secondary", id: product.id })}${renderTableActionButton({ action: "delete-product", label: TEXT.delete, className: "btn-danger", id: product.id })}`,
      })}</tr>`;
  }

  function renderCategoryCard(category) {
    const usageCount = getCategoryUsageCount(category.name);
    const orderIndex = escapeHtml(Number(category.order_index) || 0);
    return `<article class="category-card" data-category-id="${escapeHtml(category.id)}"><div class="category-card-main"><div class="category-card-icon">${escapeHtml(category.icon || DEFAULT_CATEGORY_ICON)}</div><div class="category-card-copy"><h5>${escapeHtml(category.name)}</h5></div></div><div class="category-card-meta"><div class="category-card-stat"><span>${ADMIN_RENDER_UI_TEXT.productCount}</span><strong>${usageCount}</strong></div><div class="category-card-stat"><span>${ADMIN_RENDER_UI_TEXT.displayOrder}</span><strong>${orderIndex}</strong></div></div><div class="action-btns category-card-actions">${renderTableActionButton({ action: "edit-category", label: TEXT.edit, className: "btn-secondary", id: category.id })}${renderTableActionButton({ action: "delete-category", label: TEXT.delete, className: "btn-danger", id: category.id })}</div></article>`;
  }

  function renderCategoryRow(category) {
    const usageCount = escapeHtml(Number(getCategoryUsageCount(category.name)) || 0);
    const orderIndex = escapeHtml(Number(category.order_index) || 0);
    return `<tr class="admin-table-row admin-table-row--category">${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--category-icon",
        label: ADMIN_RENDER_UI_TEXT.icon,
        content: `<div class="category-table-icon">${escapeHtml(category.icon || DEFAULT_CATEGORY_ICON)}</div>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--category-name",
        label: ADMIN_RENDER_UI_TEXT.name,
        content: `<div class="category-table-name"><strong>${escapeHtml(category.name)}</strong></div>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--category-count",
        label: ADMIN_RENDER_UI_TEXT.productCount,
        content: `<span class="category-table-metric">${usageCount}</span>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--category-order",
        label: ADMIN_RENDER_UI_TEXT.displayOrder,
        content: `<span class="category-table-metric">${orderIndex}</span>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--actions admin-table-actions action-btns",
        label: ADMIN_RENDER_UI_TEXT.actions,
        content: `${renderTableActionButton({ action: "edit-category", label: TEXT.edit, className: "btn-secondary", id: category.id })}${renderTableActionButton({ action: "delete-category", label: TEXT.delete, className: "btn-danger", id: category.id })}`,
      })}</tr>`;
  }

  function renderCategoryCollection(categories, emptyMessage) {
    const desktopRows = categories.length ? categories.map((category) => renderCategoryRow(category)).join("") : renderEmptyTableRow(emptyMessage, 5);
    const mobileContent = categories.length ? categories.map((category) => renderCategoryCard(category)).join("") : `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return `<div class="admin-table-responsive categories-desktop-table"><table class="admin-table admin-table--categories"><colgroup><col class="categories-col-icon"><col class="categories-col-name"><col class="categories-col-count"><col class="categories-col-order"><col class="categories-col-actions"></colgroup><thead class="admin-table-head"><tr><th class="admin-table-cell admin-table-cell--category-icon">${escapeHtml(ADMIN_RENDER_UI_TEXT.icon)}</th><th class="admin-table-cell admin-table-cell--category-name">${escapeHtml(ADMIN_RENDER_UI_TEXT.name)}</th><th class="admin-table-cell admin-table-cell--category-count">${escapeHtml(ADMIN_RENDER_UI_TEXT.productCount)}</th><th class="admin-table-cell admin-table-cell--category-order">${escapeHtml(ADMIN_RENDER_UI_TEXT.displayOrder)}</th><th class="admin-table-cell admin-table-cell--actions">${escapeHtml(ADMIN_RENDER_UI_TEXT.actions)}</th></tr></thead><tbody class="admin-table-body">${desktopRows}</tbody></table></div><div class="categories-mobile-list categories-list">${mobileContent}</div>`;
  }

  function renderOrderRow(order) {
    const primaryAction = order.status === "new"
      ? { label: TEXT.process, nextStatus: "processing", className: "btn-primary" }
      : order.status === "processing"
        ? { label: TEXT.complete, nextStatus: "completed", className: "btn-primary" }
        : null;
    const showCancel = order.status === "new" || order.status === "processing";
    const phoneLink = order.customer_phone ? `<a href="tel:${escapeHtml(order.customer_phone)}">${escapeHtml(order.customer_phone)}</a>` : TEXT.none;
    const productImageUrl = getOrderProductImage(order);
    const productImageMarkup = productImageUrl
      ? `<div class="admin-order-product-media"><img class="admin-table-thumb" src="${escapeHtml(productImageUrl)}" width="50" height="50"></div>`
      : `<div class="admin-order-product-media admin-card-media--placeholder"><span class="admin-image-placeholder">${ADMIN_RENDER_UI_TEXT.noImage}</span></div>`;
    const productMeta = `<div class="admin-order-product-meta"><div class="admin-order-product-meta-card">${renderCardDetail(ADMIN_RENDER_UI_TEXT.category, escapeHtml(order.product_category || TEXT.none))}</div><div class="admin-order-product-meta-card">${renderCardDetail(ADMIN_RENDER_UI_TEXT.price, escapeHtml(order.product_price || TEXT.none))}</div></div>`;
    return `<tr class="admin-table-row admin-table-row--order">${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--product order-product-cell",
        label: ADMIN_RENDER_UI_TEXT.product,
        content: `<div class="admin-order-product-card">${productImageMarkup}<div class="admin-order-product-copy"><strong class="admin-card-title">${escapeHtml(order.product_name)}</strong>${productMeta}</div></div>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--customer",
        label: ADMIN_RENDER_UI_TEXT.customer,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.customer, escapeHtml(order.customer_name)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--phone",
        label: ADMIN_RENDER_UI_TEXT.phone,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.phone, phoneLink),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--quantity",
        label: ADMIN_RENDER_UI_TEXT.quantity,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.quantity, escapeHtml(Number(order.quantity) || 1)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--status",
        label: ADMIN_RENDER_UI_TEXT.status,
        content: `<div class="admin-card-status">${renderCardDetail(ADMIN_RENDER_UI_TEXT.status, `<span class="status-pill status-pill-${getOrderStatusTone(order.status)}">${escapeHtml(TEXT.orderStatusLabel(order.status))}</span>`)}</div>`,
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--date",
        label: ADMIN_RENDER_UI_TEXT.date,
        content: renderCardDetail(ADMIN_RENDER_UI_TEXT.date, escapeHtml(order.created_at)),
      })}${
      renderTableCell({
        className: "admin-table-cell admin-table-cell--actions admin-table-actions action-btns",
        label: ADMIN_RENDER_UI_TEXT.actions,
        content: `${primaryAction ? renderTableActionButton({ action: "update-order-status", label: primaryAction.label, className: primaryAction.className, id: order.id, nextStatus: primaryAction.nextStatus }) : ""}${showCancel ? renderTableActionButton({ action: "update-order-status", label: TEXT.cancelOrder, className: "btn-danger", id: order.id, nextStatus: "cancelled" }) : ""}`,
      })}</tr>`;
  }

  return {
    renderCategoryCollection,
    renderCategoryCard,
    renderEmptyTableRow,
    renderOrderRow,
    renderProductRow,
  };
}
