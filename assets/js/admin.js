import { requireAdminSession, logout } from "./auth.js";
import { ApiError, fetchPhrases, patchPhrase } from "./api.js";

const session = requireAdminSession();

const state = {
  items: [],
  next: null,
  prev: null,
  limit: 20,
  offset: 0,
  pageNumber: 1,
  totalCount: 0,
  totalPages: 1,
  hasMore: false,
  loading: false,
  editingId: null,
  savingId: null,
  rowMessage: {},
};

const knownColumns = [
  "id",
  "category",
  "english_text",
  "kannada_text",
  "transliteration",
  "usage_examples",
  "cultural_context",
  "is_active",
];

const editableColumns = new Set([
  "english_text",
  "kannada_text",
  "transliteration",
  "usage_examples",
  "cultural_context",
  "is_active",
]);

const phrasesRoot = document.getElementById("phrases-root");
const adminMessage = document.getElementById("admin-message");
const pageLabel = document.getElementById("page-label");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const refreshButton = document.getElementById("refresh-button");
const pageSizeSelect = document.getElementById("page-size");
const adminUser = document.getElementById("admin-user");
const logoutButton = document.getElementById("logout-button");
const pageNumbers = document.getElementById("page-numbers");

if (session) {
  adminUser.textContent = session.user.name || session.user.email || "Admin";
}

logoutButton.addEventListener("click", () => logout());
refreshButton.addEventListener("click", () => loadPage(state.offset));
pageSizeSelect.addEventListener("change", () => {
  state.limit = Number(pageSizeSelect.value);
  state.pageNumber = 1;
  loadPage(0);
});
prevButton.addEventListener("click", () => {
  if (state.pageNumber > 1) {
    loadPage((state.pageNumber - 2) * state.limit);
  }
});
nextButton.addEventListener("click", () => {
  if (state.pageNumber < state.totalPages) {
    loadPage(state.pageNumber * state.limit);
  }
});

function setAdminMessage(text, tone) {
  adminMessage.textContent = text;
  adminMessage.className = `status-message${tone ? ` ${tone}` : ""}`;
}

function setRowMessage(id, text, tone) {
  state.rowMessage[id] = text ? { text, tone } : null;
}

function normalizePhrase(raw) {
  const category = raw.category || {};
  return {
    ...raw,
    id: raw.id,
    category,
    category_id: raw.category_id || category.id || null,
    english_text: raw.english_text || "",
    kannada_text: raw.kannada_text || "",
    transliteration: raw.transliteration ?? "",
    usage_examples: raw.usage_examples ?? "",
    cultural_context: raw.cultural_context ?? "",
    is_active: normalizeActive(raw.is_active),
  };
}

function normalizeActive(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "active";
  }

  return value === 1 || value === true;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePaginatedResponse(payload) {
  const responseData = payload && typeof payload === "object" && "data" in payload
    ? payload.data
    : payload;
  const items = Array.isArray(responseData)
    ? responseData
    : responseData.items || responseData.results || responseData.data || responseData.phrases || [];
  const headerLimit = parseOptionalNumber(payload?.headers?.limit);
  const headerOffset = parseOptionalNumber(payload?.headers?.offset);
  const headerTotalCount = parseOptionalNumber(payload?.headers?.totalCount);
  const hasMoreHeader = payload?.headers?.hasMore;
  const hasMore =
    typeof hasMoreHeader === "string"
      ? hasMoreHeader.trim().toLowerCase() === "true"
      : false;
  const limit = headerLimit !== null && headerLimit > 0 ? headerLimit : state.limit;
  const offset = headerOffset !== null && headerOffset >= 0 ? headerOffset : state.offset;
  const derivedTotalCount =
    headerTotalCount !== null && headerTotalCount >= 0
      ? headerTotalCount
      : hasMore
        ? offset + items.length + limit
        : offset + items.length;

  return {
    items: Array.isArray(items) ? items.map(normalizePhrase) : [],
    totalCount: derivedTotalCount,
    limit,
    offset,
    hasMore,
    next: hasMore ? offset + limit : null,
    prev: offset > 0 ? Math.max(0, offset - limit) : null,
  };
}

function groupByCategory(items) {
  return items.reduce((groups, item) => {
    const categoryName = item.category && item.category.name ? item.category.name : "Uncategorized";
    const categoryId = item.category && item.category.id ? item.category.id : "unknown";
    const key = `${categoryId}:${categoryName}`;
    if (!groups[key]) {
      groups[key] = {
        title: categoryName,
        items: [],
      };
    }
    groups[key].items.push(item);
    return groups;
  }, {});
}

function collectColumns(items) {
  return knownColumns.filter((column) => {
    if (column === "category") return true;
    return items.some((item) => column in item);
  });
}

function formatCellValue(item, key) {
  if (key === "category") {
    const category = item.category || {};
    const name = category.name || "Uncategorized";
    const id = category.id !== undefined ? ` (#${category.id})` : "";
    return `${name}${id}`;
  }

  if (key === "is_active") {
    return item.is_active ? "Active" : "Inactive";
  }

  const value = item[key];
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildEditor(key, value) {
  if (key === "is_active") {
    const select = document.createElement("select");
    select.name = key;
    [
      { label: "Active", value: "1" },
      { label: "Inactive", value: "0" },
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      if (String(value ? 1 : 0) === optionData.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    return select;
  }

  if (key === "usage_examples" || key === "cultural_context") {
    const textarea = document.createElement("textarea");
    textarea.name = key;
    textarea.rows = 3;
    textarea.value = value || "";
    return textarea;
  }

  const input = document.createElement("input");
  input.name = key;
  input.type = "text";
  input.value = value || "";
  return input;
}

function renderTable(columns, items) {
  const shell = document.createElement("div");
  shell.className = "table-shell";

  const hint = document.createElement("p");
  hint.className = "table-hint";
  hint.textContent = "Scroll sideways to see more columns. Use the top scrollbar here.";
  shell.appendChild(hint);

  const topScroll = document.createElement("div");
  topScroll.className = "table-top-scroll";
  const topScrollInner = document.createElement("div");
  topScrollInner.className = "table-top-scroll-inner";
  topScroll.appendChild(topScrollInner);
  shell.appendChild(topScroll);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrap table-responsive";

  const table = document.createElement("table");
  table.className = "phrase-table table table-striped table-hover align-middle mb-0";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column.replaceAll("_", " ");
    headerRow.appendChild(th);
  });
  const actionHeader = document.createElement("th");
  actionHeader.className = "action-header";
  actionHeader.textContent = "Action";
  headerRow.appendChild(actionHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  items.forEach((item) => {
    const row = document.createElement("tr");
    const isEditing = state.editingId === item.id;

    columns.forEach((column) => {
      const cell = document.createElement("td");
      cell.dataset.column = column;
      if (isEditing && editableColumns.has(column)) {
        cell.appendChild(buildEditor(column, item[column]));
      } else {
        cell.textContent = formatCellValue(item, column);
      }
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    actionCell.className = "action-cell";

    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.className = isEditing ? "button" : "button button-alt";
    actionButton.textContent = isEditing
      ? (state.savingId === item.id ? "Saving..." : "Done")
      : "Edit";
    actionButton.disabled = state.savingId === item.id;
    actionButton.addEventListener("click", () => {
      if (isEditing) {
        handleSave(item.id, row);
      } else {
        state.editingId = item.id;
        render();
      }
    });
    actionCell.appendChild(actionButton);

    if (isEditing) {
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "text-button";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => {
        state.editingId = null;
        setRowMessage(item.id, "", "");
        render();
      });
      actionCell.appendChild(cancelButton);
    }

    const message = state.rowMessage[item.id];
    if (message && message.text) {
      const note = document.createElement("p");
      note.className = `row-message ${message.tone || ""}`.trim();
      note.textContent = message.text;
      actionCell.appendChild(note);
    }

    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  shell.appendChild(wrapper);

  setupScrollSync(topScroll, topScrollInner, wrapper, table);
  return shell;
}

function setupScrollSync(topScroll, topScrollInner, wrapper, table) {
  let syncingTop = false;
  let syncingBottom = false;

  const syncWidths = () => {
    topScrollInner.style.width = `${table.scrollWidth}px`;
    topScroll.style.display = table.scrollWidth > wrapper.clientWidth ? "block" : "none";
  };

  topScroll.addEventListener("scroll", () => {
    if (syncingBottom) return;
    syncingTop = true;
    wrapper.scrollLeft = topScroll.scrollLeft;
    syncingTop = false;
  });

  wrapper.addEventListener("scroll", () => {
    if (syncingTop) return;
    syncingBottom = true;
    topScroll.scrollLeft = wrapper.scrollLeft;
    syncingBottom = false;
  });

  requestAnimationFrame(syncWidths);
  window.addEventListener("resize", syncWidths, { passive: true });
}

function render() {
  phrasesRoot.innerHTML = "";
  pageLabel.textContent = `Page ${state.pageNumber} of ${state.totalPages}`;
  prevButton.disabled = state.loading || state.pageNumber <= 1;
  nextButton.disabled = state.loading || state.pageNumber >= state.totalPages;
  refreshButton.disabled = state.loading;
  pageSizeSelect.disabled = state.loading;
  renderPageNumbers();

  if (state.loading) {
    const loadingCard = document.createElement("section");
    loadingCard.className = "card";
    loadingCard.innerHTML = "<p>Loading phrases...</p>";
    phrasesRoot.appendChild(loadingCard);
    return;
  }

  if (!state.items.length) {
    const emptyCard = document.createElement("section");
    emptyCard.className = "card";
    emptyCard.innerHTML = "<p>No phrases found for this page.</p>";
    phrasesRoot.appendChild(emptyCard);
    return;
  }

  const columns = collectColumns(state.items);
  const groups = Object.values(groupByCategory(state.items));
  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "card category-section";

    const title = document.createElement("h2");
    title.textContent = group.title;
    section.appendChild(title);

    section.appendChild(renderTable(columns, group.items));
    phrasesRoot.appendChild(section);
  });
}

function renderPageNumbers() {
  pageNumbers.innerHTML = "";

  if (state.totalPages <= 1) {
    return;
  }

  const visibleCount = 7;
  const start = Math.max(1, Math.min(state.pageNumber - 3, state.totalPages - visibleCount + 1));
  const end = Math.min(state.totalPages, start + visibleCount - 1);

  for (let page = start; page <= end; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = page === state.pageNumber ? "page-number active" : "page-number";
    button.textContent = String(page);
    button.disabled = state.loading || page === state.pageNumber;
    button.addEventListener("click", () => loadPage((page - 1) * state.limit));
    pageNumbers.appendChild(button);
  }
}

async function loadPage(offset) {
  state.loading = true;
  state.offset = offset;
  state.editingId = null;
  setAdminMessage("", "");
  render();

  try {
    const payload = await fetchPhrases({ limit: state.limit, offset });
    const page = normalizePaginatedResponse(payload);
    state.items = page.items;
    state.limit = page.limit;
    state.offset = page.offset;
    state.totalCount = page.totalCount;
    state.hasMore = page.hasMore;
    state.next = page.next;
    state.prev = page.prev;
    state.pageNumber = Math.floor(state.offset / state.limit) + 1;
    state.totalPages = Math.max(1, Math.ceil(state.totalCount / state.limit));
  } catch (error) {
    if (error instanceof ApiError && error.code === "AUTH_EXPIRED") {
      window.location.href = "login.html";
      return;
    }
    state.items = [];
    state.totalCount = 0;
    state.totalPages = 1;
    state.hasMore = false;
    state.next = null;
    state.prev = null;
    setAdminMessage(
      error instanceof ApiError ? error.message : "Unable to load phrases.",
      "error"
    );
  } finally {
    state.loading = false;
    render();
  }
}

function toNullableString(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

function readRowPayload(id, row) {
  const current = state.items.find((item) => item.id === id);
  const fields = {};
  row.querySelectorAll("input, textarea, select").forEach((field) => {
    fields[field.name] = field.value;
  });

  return {
    category_id: current.category_id,
    english_text: String(fields.english_text || "").trim(),
    kannada_text: String(fields.kannada_text || "").trim(),
    transliteration: toNullableString(fields.transliteration),
    usage_examples: toNullableString(fields.usage_examples),
    cultural_context: toNullableString(fields.cultural_context),
    is_active: fields.is_active === "1" ? 1 : 0,
  };
}

async function handleSave(id, row) {
  const payload = readRowPayload(id, row);
  if (!payload.english_text || !payload.kannada_text) {
    setRowMessage(id, "English and Kannada text are required.", "error");
    render();
    return;
  }

  state.savingId = id;
  setRowMessage(id, "", "");
  render();

  try {
    const response = await patchPhrase(id, payload);
    const success =
      response &&
      (response.success === true ||
        response.success === "true" ||
        response["success: true"] === true ||
        response["success: true"] === "true");
    if (!success) {
      throw new ApiError("Phrase update was not acknowledged by the server.", 500, "UPDATE_FAILED");
    }

    state.items = state.items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        ...payload,
        is_active: payload.is_active === 1,
      };
    });
    state.editingId = null;
    setRowMessage(id, "Saved.", "success");
    setAdminMessage("Phrase updated successfully.", "success");
  } catch (error) {
    if (error instanceof ApiError && error.code === "AUTH_EXPIRED") {
      window.location.href = "login.html";
      return;
    }
    setRowMessage(
      id,
      error instanceof ApiError ? error.message : "Unable to update the phrase.",
      "error"
    );
  } finally {
    state.savingId = null;
    render();
  }
}

loadPage(0);
