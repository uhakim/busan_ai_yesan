const STORAGE_KEY = "aiClubSettlementPrototype.v1";

const DEFAULT_BUDGETS = {
  totalBudget: 2000000,
  researchBudget: 1000000,
  directBudget: 800000,
  meetingBudget: 200000,
  aiSubscriptionBudget: 800000
};

const NUMERIC_PROJECT_FIELDS = new Set([
  "interest",
  "totalBudget",
  "researchBudget",
  "directBudget",
  "meetingBudget",
  "aiSubscriptionBudget"
]);

const CATEGORIES = {
  research: { label: "연구활동비", budgetKey: "researchBudget", prefix: "1" },
  direct: { label: "직접성 경비", budgetKey: "directBudget", prefix: "3" },
  meeting: { label: "업무협의회비", budgetKey: "meetingBudget", prefix: "4" }
};

const DIRECT_TYPES = {
  ai_subscription: { label: "AI 구독료" },
  book: { label: "도서" },
  printing: { label: "인쇄비" },
  other: { label: "기타 직접성 경비" }
};

const ATTACHMENTS = [
  { key: "cardReceipt", label: "카드영수증" },
  { key: "transferConfirmation", label: "계좌이체확인증" },
  { key: "transactionStatement", label: "거래명세서" },
  { key: "foreignReceipt", label: "외화영수증" },
  { key: "krwCardSlip", label: "국내카드사원화전표" },
  { key: "meetingMinutes", label: "협의록" },
  { key: "photo", label: "사진" }
];

const MEMBER_ATTACHMENTS = [
  { key: "receiptBundle", label: "영수증/구매내역서" },
  { key: "foreignReceipt", label: "외화영수증" },
  { key: "krwCardSlip", label: "국내카드사원화전표" }
];

function makeSampleFile(name) {
  return {
    name,
    type: "application/pdf",
    size: 12000,
    dataUrl: ""
  };
}

function sampleAiAttachments(label) {
  const attachments = emptyAttachments();
  attachments.cardReceipt = [makeSampleFile(`${label}-receipt.pdf`)];
  attachments.foreignReceipt = [makeSampleFile(`${label}-foreign-receipt.pdf`)];
  attachments.krwCardSlip = [makeSampleFile(`${label}-krw-card-slip.pdf`)];
  return attachments;
}

const sampleState = {
  project: {
    name: "2026 AI 디지털 교사 동아리",
    school: "부산AI초등학교",
    clubName: "AI 수업 연구 동아리",
    principalName: "",
    schoolAddress: "",
    schoolPhone: "",
    managerName: "김유하",
    managerPhone: "",
    managerEmail: "",
    interest: 0,
    totalBudget: DEFAULT_BUDGETS.totalBudget,
    researchBudget: DEFAULT_BUDGETS.researchBudget,
    directBudget: DEFAULT_BUDGETS.directBudget,
    meetingBudget: DEFAULT_BUDGETS.meetingBudget,
    aiSubscriptionBudget: DEFAULT_BUDGETS.aiSubscriptionBudget
  },
  entries: [
    {
      id: "EXP-001",
      submitter: "김유하",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-07-05",
      description: "OpenAI AI 구독료",
      amount: 30000,
      itemName: "ChatGPT 구독",
      vendor: "OpenAI",
      unit: "월",
      quantity: 1,
      unitPrice: 30000,
      paymentMethod: "card",
      evidenceNo: "3-01",
      notes: "7월 구독료 샘플",
      attachments: sampleAiAttachments("openai-2026-07")
    },
    {
      id: "EXP-002",
      submitter: "김유하",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-08-05",
      description: "OpenAI AI 구독료",
      amount: 30000,
      itemName: "ChatGPT 구독",
      vendor: "OpenAI",
      unit: "월",
      quantity: 1,
      unitPrice: 30000,
      paymentMethod: "card",
      evidenceNo: "3-02",
      notes: "8월 구독료 샘플",
      attachments: sampleAiAttachments("openai-2026-08")
    },
    {
      id: "EXP-003",
      submitter: "김유하",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-09-05",
      description: "OpenAI AI 구독료",
      amount: 30000,
      itemName: "ChatGPT 구독",
      vendor: "OpenAI",
      unit: "월",
      quantity: 1,
      unitPrice: 30000,
      paymentMethod: "card",
      evidenceNo: "3-03",
      notes: "9월 구독료 샘플",
      attachments: sampleAiAttachments("openai-2026-09")
    },
    {
      id: "EXP-004",
      submitter: "김유하",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-10-05",
      description: "OpenAI AI 구독료",
      amount: 30000,
      itemName: "ChatGPT 구독",
      vendor: "OpenAI",
      unit: "월",
      quantity: 1,
      unitPrice: 30000,
      paymentMethod: "card",
      evidenceNo: "3-04",
      notes: "10월 구독료 샘플",
      attachments: sampleAiAttachments("openai-2026-10")
    },
    {
      id: "EXP-005",
      submitter: "이서연",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-07-12",
      description: "Claude AI 구독료",
      amount: 22000,
      itemName: "Claude Pro 구독",
      vendor: "Claude",
      unit: "월",
      quantity: 1,
      unitPrice: 22000,
      paymentMethod: "card",
      evidenceNo: "3-05",
      notes: "7월 구독료 샘플",
      attachments: sampleAiAttachments("claude-2026-07")
    },
    {
      id: "EXP-006",
      submitter: "이서연",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-09-12",
      description: "Claude AI 구독료",
      amount: 22000,
      itemName: "Claude Pro 구독",
      vendor: "Claude",
      unit: "월",
      quantity: 1,
      unitPrice: 22000,
      paymentMethod: "card",
      evidenceNo: "3-06",
      notes: "9월 구독료 샘플",
      attachments: sampleAiAttachments("claude-2026-09")
    },
    {
      id: "EXP-007",
      submitter: "박민준",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-08-20",
      description: "Gemini AI 구독료",
      amount: 29000,
      itemName: "Gemini Advanced 구독",
      vendor: "Gemini",
      unit: "월",
      quantity: 1,
      unitPrice: 29000,
      paymentMethod: "card",
      evidenceNo: "3-07",
      notes: "8월 구독료 샘플",
      attachments: sampleAiAttachments("gemini-2026-08")
    },
    {
      id: "EXP-008",
      submitter: "박민준",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-10-20",
      description: "Gemini AI 구독료",
      amount: 29000,
      itemName: "Gemini Advanced 구독",
      vendor: "Gemini",
      unit: "월",
      quantity: 1,
      unitPrice: 29000,
      paymentMethod: "card",
      evidenceNo: "3-08",
      notes: "10월 구독료 샘플",
      attachments: sampleAiAttachments("gemini-2026-10")
    },
    {
      id: "EXP-009",
      submitter: "최하늘",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      directType: "ai_subscription",
      status: "submitted",
      date: "2026-09-24",
      description: "Canva AI 구독료",
      amount: 18000,
      itemName: "Canva Pro 구독",
      vendor: "Canva",
      unit: "월",
      quantity: 1,
      unitPrice: 18000,
      paymentMethod: "card",
      evidenceNo: "3-09",
      notes: "9월 구독료 샘플",
      attachments: sampleAiAttachments("canva-2026-09")
    }
  ]
};

let state = loadInitialState();
let draftAttachments = emptyAttachments();
let draftMemberAttachments = emptyMemberAttachments();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  buildAttachmentInputs();
  bindEvents();
  populateProjectForm();
  syncDirectTypeField();
  renderAll();
});

function bindElements() {
  els.summaryGrid = document.querySelector("#summaryGrid");
  els.budgetRows = document.querySelector("#budgetRows");
  els.warningList = document.querySelector("#warningList");
  els.projectForm = document.querySelector("#projectForm");
  els.expenseForm = document.querySelector("#expenseForm");
  els.memberSubmitForm = document.querySelector("#memberSubmitForm");
  els.directTypeField = document.querySelector("#directTypeField");
  els.attachmentInputs = document.querySelector("#attachmentInputs");
  els.currentPreview = document.querySelector("#currentPreview");
  els.memberPreview = document.querySelector("#memberPreview");
  els.expenseRows = document.querySelector("#expenseRows");
  els.aiBudgetSummary = document.querySelector("#aiBudgetSummary");
  els.aiMonthlyHead = document.querySelector("#aiMonthlyHead");
  els.aiMonthlyRows = document.querySelector("#aiMonthlyRows");
  els.aiMonthlyFoot = document.querySelector("#aiMonthlyFoot");
  els.printDocument = document.querySelector("#printDocument");
  els.submitterFilter = document.querySelector("#submitterFilter");
  els.categoryFilter = document.querySelector("#categoryFilter");
  els.missingFilter = document.querySelector("#missingFilter");
  els.submitExpenseButton = document.querySelector("#submitExpenseButton");
  els.memberSubmitButton = document.querySelector("#memberSubmitButton");
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  document.querySelector("#saveLocalButton").addEventListener("click", () => {
    saveLocal();
    flashButton(document.querySelector("#saveLocalButton"), "저장됨");
  });

  document.querySelector("#exportButton").addEventListener("click", exportJson);
  document.querySelector("#importInput").addEventListener("change", importJson);
  document.querySelector("#printButton").addEventListener("click", printDocument);
  document.querySelector("#printButtonSecondary").addEventListener("click", printDocument);
  document.querySelector("#clearFormButton").addEventListener("click", resetExpenseForm);
  document.querySelector("#sampleButton").addEventListener("click", restoreSampleData);

  els.projectForm.addEventListener("input", () => {
    const data = new FormData(els.projectForm);
    Object.keys(state.project).forEach((key) => {
      if (data.has(key)) {
        state.project[key] = NUMERIC_PROJECT_FIELDS.has(key) ? toNumber(data.get(key)) : data.get(key).trim();
      }
    });
    saveLocal({ silent: true });
    renderAll();
  });

  els.expenseForm.addEventListener("submit", handleExpenseSubmit);
  els.expenseForm.elements.category.addEventListener("change", syncDirectTypeField);
  els.memberSubmitForm.addEventListener("submit", handleMemberSubmit);
  document.querySelector("#clearMemberFormButton").addEventListener("click", resetMemberForm);
  document.querySelectorAll("[data-member-attachment-key]").forEach((input) => {
    input.addEventListener("change", handleMemberAttachmentChange);
  });
  [els.submitterFilter, els.categoryFilter, els.missingFilter].forEach((el) => {
    el.addEventListener("input", renderExpenseRows);
    el.addEventListener("change", renderExpenseRows);
  });
}

function syncDirectTypeField() {
  const categoryField = els.expenseForm?.elements.category;
  const directTypeSelect = els.expenseForm?.elements.directType;
  if (!categoryField || !directTypeSelect || !els.directTypeField) return;

  const isDirect = categoryField.value === "direct";
  els.directTypeField.hidden = !isDirect;
  directTypeSelect.disabled = !isDirect;

  if (isDirect && !directTypeSelect.value) {
    directTypeSelect.value = "ai_subscription";
  }
  if (!isDirect) {
    directTypeSelect.value = "";
  }
}

function buildAttachmentInputs() {
  const template = document.querySelector("#attachmentInputTemplate");
  els.attachmentInputs.innerHTML = "";

  ATTACHMENTS.forEach((attachment) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector("span").textContent = attachment.label;
    const input = node.querySelector("input");
    input.dataset.attachmentKey = attachment.key;
    input.accept = attachment.key === "photo" ? "image/*" : "image/*,application/pdf";
    input.addEventListener("change", handleAttachmentChange);
    els.attachmentInputs.appendChild(node);
  });
}

function loadInitialState() {
  if (shouldLoadSampleFromUrl()) {
    const restored = structuredClone(sampleState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    return restored;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return structuredClone(sampleState);
  }

  try {
    const parsed = JSON.parse(stored);
    return normalizeState(parsed);
  } catch {
    return structuredClone(sampleState);
  }
}

function shouldLoadSampleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("sample") === "1";
}

function normalizeState(raw) {
  const normalized = {
    project: { ...sampleState.project, ...(raw.project || {}) },
    entries: Array.isArray(raw.entries) ? raw.entries : []
  };

  normalizeProjectBudgets(normalized.project);
  normalized.entries = normalized.entries.map((entry, index) => {
    const category = CATEGORIES[entry.category] ? entry.category : "direct";
    return {
      id: entry.id || nextId(index + 1),
      status: entry.status || "submitted",
      submitter: entry.submitter || "",
      school: entry.school || "",
      clubName: entry.clubName || "",
      category,
      directType: normalizeDirectType({ ...entry, category }),
      date: entry.date || "",
      description: entry.description || "",
      amount: toNumber(entry.amount),
      itemName: entry.itemName || "",
      vendor: entry.vendor || "",
      unit: entry.unit || "",
      quantity: toNumber(entry.quantity),
      unitPrice: toNumber(entry.unitPrice),
      paymentMethod: entry.paymentMethod || "card",
      evidenceNo: entry.evidenceNo || "",
      notes: entry.notes || "",
      attachments: { ...emptyAttachments(), ...(entry.attachments || {}) }
    };
  });

  return normalized;
}

function emptyAttachments() {
  return ATTACHMENTS.reduce((acc, attachment) => {
    acc[attachment.key] = [];
    return acc;
  }, {});
}

function emptyMemberAttachments() {
  return MEMBER_ATTACHMENTS.reduce((acc, attachment) => {
    acc[attachment.key] = [];
    return acc;
  }, {});
}

function normalizeProjectBudgets(project) {
  Object.entries(DEFAULT_BUDGETS).forEach(([key, fallback]) => {
    project[key] = normalizeBudgetValue(project[key], fallback);
  });
  project.interest = normalizeBudgetValue(project.interest, 0);
}

function normalizeBudgetValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeDirectType(entry) {
  if (entry.category !== "direct") return "";
  if (DIRECT_TYPES[entry.directType]) return entry.directType;
  return looksAiSubscription(entry) ? "ai_subscription" : "other";
}

function populateProjectForm() {
  Object.entries(state.project).forEach(([key, value]) => {
    const field = els.projectForm.elements[key];
    if (field) {
      field.value = value ?? "";
    }
  });
}

function renderAll() {
  renderSummary();
  renderBudgetRows();
  renderAiSubscriptionSummary();
  renderWarnings();
  renderExpenseRows();
  renderPrintDocument();
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

function getProjectBudget(key) {
  return normalizeBudgetValue(state.project[key], DEFAULT_BUDGETS[key] ?? 0);
}

function getCategoryBudget(categoryKey) {
  const category = CATEGORIES[categoryKey];
  return category ? getProjectBudget(category.budgetKey) : 0;
}

function getTotals() {
  const categoryTotals = Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0]));
  state.entries.forEach((entry) => {
    categoryTotals[entry.category] += toNumber(entry.amount);
  });

  const totalBudget = getProjectBudget("totalBudget");
  const spent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const missingCount = state.entries.filter((entry) => getEntryWarnings(entry).length > 0).length;

  return {
    categoryTotals,
    totalBudget,
    spent,
    remaining: totalBudget - spent,
    useRate: totalBudget ? Math.round((spent / totalBudget) * 1000) / 10 : 0,
    missingCount
  };
}

function renderSummary() {
  const totals = getTotals();
  const metrics = [
    ["총 예산", formatWon(totals.totalBudget)],
    ["사용액", formatWon(totals.spent)],
    ["잔액", formatWon(totals.remaining)],
    ["사용률", `${totals.useRate}%`],
    ["경고 건수", `${totals.missingCount}건`, totals.missingCount ? "warning" : ""]
  ];

  els.summaryGrid.innerHTML = metrics
    .map(([label, value, className = ""]) => `
      <div class="metric ${className}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function renderBudgetRows() {
  const totals = getTotals();
  els.budgetRows.innerHTML = Object.entries(CATEGORIES)
    .map(([key, category]) => {
      const spent = totals.categoryTotals[key];
      const limit = getCategoryBudget(key);
      const remaining = limit - spent;
      const denominator = limit || totals.totalBudget;
      const rate = denominator ? Math.round((spent / denominator) * 1000) / 10 : 0;
      const over = spent > limit;
      const totalOver = totals.spent > totals.totalBudget;
      const barClass = over || totalOver ? "danger" : rate >= 90 ? "warn" : "";
      const status = over
        ? `<span class="status-pill danger">한도 초과</span>`
        : key === "direct"
          ? `<span class="status-pill warn">증빙 확인</span>`
          : `<span class="status-pill ok">정상</span>`;

      return `
        <tr>
          <td><strong>${category.label}</strong></td>
          <td class="num">${formatWon(limit)}</td>
          <td class="num">${formatWon(spent)}</td>
          <td class="num">${formatWon(remaining)}</td>
          <td>
            <div class="progress-track"><div class="progress-bar ${barClass}" style="width:${Math.min(rate, 100)}%"></div></div>
            <span class="progress-text">${rate}%</span>
          </td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join("");
}

function getAiSubscriptionSummary() {
  const entries = state.entries.filter(isAiSubscriptionEntry);
  const submitterMap = new Map();
  const monthSet = new Set();
  const monthTotals = {};

  entries.forEach((entry) => {
    const submitter = normalizeSubmitterName(entry.submitter);
    const month = getEntryMonth(entry.date);
    monthSet.add(month);

    if (!submitterMap.has(submitter)) {
      submitterMap.set(submitter, {
        submitter,
        amount: 0,
        count: 0,
        vendors: new Set(),
        warningCount: 0,
        monthlyTotals: {}
      });
    }

    const row = submitterMap.get(submitter);
    const amount = toNumber(entry.amount);
    row.amount += amount;
    row.count += 1;
    row.monthlyTotals[month] = (row.monthlyTotals[month] || 0) + amount;
    monthTotals[month] = (monthTotals[month] || 0) + amount;
    row.warningCount += getEntryWarnings(entry).length ? 1 : 0;
    if (entry.vendor) row.vendors.add(entry.vendor);
  });

  const submitters = Array.from(submitterMap.values())
    .sort((a, b) => a.submitter.localeCompare(b.submitter, "ko-KR"));
  const months = Array.from(monthSet).sort();
  const total = entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const budget = getProjectBudget("aiSubscriptionBudget");

  return { entries, submitters, months, monthTotals, total, budget, remaining: budget - total };
}

function renderAiSubscriptionSummary() {
  const summary = getAiSubscriptionSummary();
  renderAiBudgetSummary(summary);

  if (!summary.entries.length) {
    els.aiMonthlyHead.innerHTML = `
      <tr>
        <th>제출자</th>
        <th class="num">합계</th>
      </tr>
    `;
    els.aiMonthlyRows.innerHTML = `
      <tr>
        <td colspan="2" class="muted">월별로 표시할 AI 구독료가 없습니다.</td>
      </tr>
    `;
    els.aiMonthlyFoot.innerHTML = renderAiMonthlyFoot(summary);
    return;
  }

  els.aiMonthlyHead.innerHTML = `
    <tr>
      <th>제출자</th>
      ${summary.months.map((month) => `<th class="num">${escapeHtml(formatMonthLabel(month))}</th>`).join("")}
      <th class="num">합계</th>
    </tr>
  `;

  els.aiMonthlyRows.innerHTML = summary.submitters.map((row) => `
    <tr>
      <td>${escapeHtml(row.submitter)}</td>
      ${summary.months.map((month) => `<td class="num">${formatWon(row.monthlyTotals[month] || 0)}</td>`).join("")}
      <td class="num"><strong>${formatWon(row.amount)}</strong></td>
    </tr>
  `).join("");
  els.aiMonthlyFoot.innerHTML = renderAiMonthlyFoot(summary);
}

function renderAiBudgetSummary(summary) {
  const remainingClass = summary.remaining < 0 ? "danger" : "";
  const metrics = [
    ["AI 구독료 배정액", formatWon(summary.budget)],
    ["AI 구독료 사용액", formatWon(summary.total)],
    ["사용가능 잔액", formatWon(summary.remaining), remainingClass]
  ];

  els.aiBudgetSummary.innerHTML = metrics
    .map(([label, value, className = ""]) => `
      <div class="metric ${className}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function renderAiMonthlyFoot(summary) {
  const monthTotalCells = summary.months
    .map((month) => `<td class="num">${formatWon(summary.monthTotals[month] || 0)}</td>`)
    .join("");
  const remainingSpacer = summary.months.length ? `<td colspan="${summary.months.length}"></td>` : "";
  const remainingClass = summary.remaining < 0 ? "danger-text" : "";

  return `
    <tr class="total-row">
      <th>전체 합계</th>
      ${monthTotalCells}
      <td class="num"><strong>${formatWon(summary.total)}</strong></td>
    </tr>
    <tr class="balance-row">
      <th>사용가능 잔액</th>
      ${remainingSpacer}
      <td class="num ${remainingClass}"><strong>${formatWon(summary.remaining)}</strong></td>
    </tr>
  `;
}

function renderWarnings() {
  const totals = getTotals();
  const warnings = [];

  if (totals.spent > totals.totalBudget) {
    warnings.push({
      title: "총 예산 초과",
      detail: `총 사용액이 ${formatWon(totals.spent)}으로 총 예산 ${formatWon(totals.totalBudget)}을 초과했습니다.`
    });
  }

  const allocatedTotal = Object.keys(CATEGORIES).reduce((sum, key) => sum + getCategoryBudget(key), 0);
  if (allocatedTotal !== totals.totalBudget) {
    warnings.push({
      title: "예산 배정 합계 확인",
      detail: `항목별 예산 합계가 ${formatWon(allocatedTotal)}으로 총 예산 ${formatWon(totals.totalBudget)}과 다릅니다.`
    });
  }

  const directBudget = getCategoryBudget("direct");
  const aiSubscriptionBudget = getProjectBudget("aiSubscriptionBudget");
  if (aiSubscriptionBudget > directBudget) {
    warnings.push({
      title: "AI 구독료 배정액 확인",
      detail: `AI 구독료 배정액 ${formatWon(aiSubscriptionBudget)}이 직접성 경비 예산 ${formatWon(directBudget)}보다 큽니다.`
    });
  }

  Object.entries(CATEGORIES).forEach(([key, category]) => {
    const spent = totals.categoryTotals[key];
    const limit = getCategoryBudget(key);
    if (spent > limit) {
      warnings.push({
        title: `${category.label} 한도 초과`,
        detail: `${category.label} 사용액이 ${formatWon(spent)}으로 예산 ${formatWon(limit)}을 초과했습니다.`
      });
    }
  });

  state.entries.forEach((entry) => {
    getEntryWarnings(entry).forEach((message) => {
      warnings.push({
        title: `${entry.evidenceNo || entry.id} ${entry.description || "지출 건"}`,
        detail: message
      });
    });
  });

  if (!warnings.length) {
    els.warningList.innerHTML = `<div class="empty-state">현재 표시할 경고가 없습니다.</div>`;
    return;
  }

  els.warningList.innerHTML = warnings
    .map((warning) => `
      <div class="warning-item">
        <strong>${escapeHtml(warning.title)}</strong>
        <span>${escapeHtml(warning.detail)}</span>
      </div>
    `)
    .join("");
}

function renderExpenseRows() {
  const submitterKeyword = els.submitterFilter.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const onlyMissing = els.missingFilter.checked;

  const rows = state.entries.filter((entry) => {
    const warnings = getEntryWarnings(entry);
    return (!submitterKeyword || entry.submitter.toLowerCase().includes(submitterKeyword))
      && (category === "all" || entry.category === category)
      && (!onlyMissing || warnings.length > 0);
  });

  if (!rows.length) {
    els.expenseRows.innerHTML = `
      <tr>
        <td colspan="9" class="muted">표시할 지출 내역이 없습니다.</td>
      </tr>
    `;
    return;
  }

  els.expenseRows.innerHTML = rows.map((entry) => {
    const warnings = getEntryWarnings(entry);
    const directTypeLabel = entry.category === "direct" && DIRECT_TYPES[entry.directType]
      ? DIRECT_TYPES[entry.directType].label
      : "";
    const attachmentNames = ATTACHMENTS
      .flatMap((attachment) => (entry.attachments[attachment.key] || []).map((file) => file.name))
      .join(", ");
    return `
      <tr>
        <td>${escapeHtml(entry.evidenceNo || "-")}</td>
        <td>${escapeHtml(entry.date || "-")}</td>
        <td>${escapeHtml(entry.submitter || "-")}</td>
        <td>
          ${CATEGORIES[entry.category].label}
          ${directTypeLabel ? `<div class="muted">${escapeHtml(directTypeLabel)}</div>` : ""}
        </td>
        <td>
          <strong>${escapeHtml(entry.description || "-")}</strong>
          <div class="muted">${escapeHtml(entry.vendor || "")}</div>
        </td>
        <td class="num">${formatWon(entry.amount)}</td>
        <td>
          ${attachmentNames ? escapeHtml(attachmentNames) : `<span class="warning-pill">파일 없음</span>`}
          ${warnings.length ? `<div class="muted">${warnings.map(escapeHtml).join("<br>")}</div>` : ""}
        </td>
        <td>${warnings.length ? `<span class="status-pill warn">확인 필요</span>` : `<span class="status-pill ok">정상</span>`}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="small-button" onclick="editEntry('${entry.id}')">수정</button>
            <button type="button" class="small-button" onclick="deleteEntry('${entry.id}')">삭제</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPrintDocument() {
  const totals = getTotals();
  const project = state.project;
  const interest = toNumber(project.interest);
  const finalBalance = totals.totalBudget - totals.spent + interest;

  els.printDocument.innerHTML = `
    <section class="print-page">
      <h2 class="print-title">2026 AI 디지털 교사 동아리 운영비 정산서</h2>
      <table class="print-info">
        <tbody>
          <tr><th>학교명</th><td>${escapeHtml(project.school || "")}</td><th>동아리명</th><td>${escapeHtml(project.clubName || "")}</td></tr>
          <tr><th>학교장 성명</th><td>${escapeHtml(project.principalName || "")}</td><th>담당자 성명</th><td>${escapeHtml(project.managerName || "")}</td></tr>
          <tr><th>학교 주소</th><td colspan="3">${escapeHtml(project.schoolAddress || "")}</td></tr>
          <tr><th>학교 대표 전화 번호</th><td>${escapeHtml(project.schoolPhone || "")}</td><th>휴대전화</th><td>${escapeHtml(project.managerPhone || "")}</td></tr>
          <tr><th>이메일 주소</th><td colspan="3">${escapeHtml(project.managerEmail || "")}</td></tr>
          <tr><th>운영비</th><td>${formatWon(totals.totalBudget)}</td><th>집행액</th><td>${formatWon(totals.spent)}</td></tr>
          <tr><th>집행잔액</th><td>${formatWon(totals.remaining)}</td><th>이자 포함 잔액</th><td>${formatWon(finalBalance)}</td></tr>
        </tbody>
      </table>
      <p>위와 같이 2026 AI 디지털 교사 동아리 운영비 집행 내역을 정산합니다.</p>
      <p class="todo-box">TODO: 2차 이후 원본 PPTX 양식 자동 채우기, XLSX 생성, Google Drive/Form 연동을 검토합니다. 1차 프로토타입에는 외부 서버 연동을 포함하지 않습니다.</p>
    </section>

    <section class="print-page">
      <h2 class="print-title">운영비 실적 총괄표</h2>
      <table class="print-info">
        <thead>
          <tr>
            <th>예산 항목</th>
            <th>예산 또는 한도</th>
            <th>집행액</th>
            <th>잔액</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(CATEGORIES).map(([key, category]) => {
            const spent = totals.categoryTotals[key];
            const limit = getCategoryBudget(key);
            return `
              <tr>
                <td>${category.label}</td>
                <td class="num">${formatWon(limit)}</td>
                <td class="num">${formatWon(spent)}</td>
                <td class="num">${formatWon(limit - spent)}</td>
                <td>${spent > limit ? "한도 초과" : ""}</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <th>합계</th>
            <th class="num">${formatWon(totals.totalBudget)}</th>
            <th class="num">${formatWon(totals.spent)}</th>
            <th class="num">${formatWon(totals.remaining)}</th>
            <th></th>
          </tr>
        </tbody>
      </table>
    </section>

    ${renderAiSubscriptionPrintPage()}

    ${Object.entries(CATEGORIES).map(([key, category]) => renderCategoryPrintPage(key, category)).join("")}

    <section class="print-page">
      <h2 class="print-title">증빙자료 목록</h2>
      <table class="print-info">
        <thead>
          <tr>
            <th>증빙번호</th>
            <th>예산 항목</th>
            <th>사용 내용</th>
            <th>첨부 파일</th>
            <th>점검</th>
          </tr>
        </thead>
        <tbody>
          ${state.entries.map((entry) => {
            const fileNames = ATTACHMENTS.flatMap((attachment) => {
              return (entry.attachments[attachment.key] || []).map((file) => `${attachment.label}: ${file.name}`);
            });
            const warnings = getEntryWarnings(entry);
            return `
              <tr>
                <td>${escapeHtml(entry.evidenceNo || entry.id)}</td>
                <td>${CATEGORIES[entry.category].label}</td>
                <td>${escapeHtml(entry.description || "")}</td>
                <td>${fileNames.length ? escapeHtml(fileNames.join(", ")) : "첨부 없음"}</td>
                <td>${warnings.length ? escapeHtml(warnings.join(" / ")) : "정상"}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
      <h3 class="print-subtitle">첨부 미리보기</h3>
      <div class="preview-panel">
        ${renderAllPrintPreviews()}
      </div>
    </section>
  `;
}

function renderAiSubscriptionPrintPage() {
  const summary = getAiSubscriptionSummary();
  const monthTotalCells = summary.months
    .map((month) => `<td class="num">${formatWon(summary.monthTotals[month] || 0)}</td>`)
    .join("");
  const remainingSpacer = summary.months.length ? `<td colspan="${summary.months.length}"></td>` : "";

  return `
    <section class="print-page">
      <h2 class="print-title">AI 구독료 회원별·월별 현황</h2>
      <table class="print-info">
        <tbody>
          <tr><th>AI 구독료 배정액</th><td class="num">${formatWon(summary.budget)}</td><th>사용액</th><td class="num">${formatWon(summary.total)}</td></tr>
          <tr><th>사용가능 잔액</th><td class="num">${formatWon(summary.remaining)}</td><th>집계 기준</th><td>지출일자 결제월</td></tr>
        </tbody>
      </table>

      <h3 class="print-subtitle">회원별 월별 사용액</h3>
      <table class="print-info">
        <thead>
          <tr>
            <th>제출자</th>
            ${summary.months.map((month) => `<th>${escapeHtml(formatMonthLabel(month))}</th>`).join("")}
            <th>합계</th>
          </tr>
        </thead>
        <tbody>
          ${summary.submitters.length ? summary.submitters.map((row) => `
            <tr>
              <td>${escapeHtml(row.submitter)}</td>
              ${summary.months.map((month) => `<td class="num">${formatWon(row.monthlyTotals[month] || 0)}</td>`).join("")}
              <td class="num">${formatWon(row.amount)}</td>
            </tr>
          `).join("") : `<tr><td colspan="2">월별로 표시할 AI 구독료 없음</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <th>전체 합계</th>
            ${monthTotalCells}
            <td class="num">${formatWon(summary.total)}</td>
          </tr>
          <tr>
            <th>사용가능 잔액</th>
            ${remainingSpacer}
            <td class="num">${formatWon(summary.remaining)}</td>
          </tr>
        </tfoot>
      </table>
      <p class="todo-box">집계 기준: 예산 항목이 직접성 경비이고 세부 유형이 AI 구독료인 건을 지출일자의 결제월 기준으로 합산합니다.</p>
    </section>
  `;
}

function renderCategoryPrintPage(categoryKey, category) {
  const entries = state.entries.filter((entry) => entry.category === categoryKey);
  return `
    <section class="print-page">
      <h2 class="print-title">${category.label} 지출 세부내역</h2>
      <table class="print-info">
        <thead>
          <tr>
            <th>순번</th>
            <th>예산 구분</th>
            <th>지출 일자</th>
            <th>세부 내역</th>
            <th>품명</th>
            <th>지급처</th>
            <th>증빙번호</th>
            <th>소요 예산</th>
          </tr>
        </thead>
        <tbody>
          ${entries.length ? entries.map((entry, index) => `
            <tr>
              <td class="num">${index + 1}</td>
              <td>${category.label}</td>
              <td>${escapeHtml(entry.date || "")}</td>
              <td>${escapeHtml(entry.description || "")}</td>
              <td>${escapeHtml(entry.itemName || "")}</td>
              <td>${escapeHtml(entry.vendor || "")}</td>
              <td>${escapeHtml(entry.evidenceNo || "")}</td>
              <td class="num">${formatWon(entry.amount)}</td>
            </tr>
          `).join("") : `<tr><td colspan="8">해당 항목 지출 내역 없음</td></tr>`}
        </tbody>
      </table>
      <h3 class="print-subtitle">필요 증빙</h3>
      <ul class="print-note-list">
        ${getRequiredEvidenceLabels(categoryKey).map((label) => `<li>${label}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderAllPrintPreviews() {
  const previewItems = [];
  state.entries.forEach((entry) => {
    ATTACHMENTS.forEach((attachment) => {
      (entry.attachments[attachment.key] || []).forEach((file) => {
        if (file.dataUrl && file.type.startsWith("image/")) {
          previewItems.push(`
            <div class="preview-item">
              <img src="${file.dataUrl}" alt="">
              <div>${escapeHtml(entry.evidenceNo || entry.id)} ${attachment.label}<br>${escapeHtml(file.name)}</div>
            </div>
          `);
        } else if (file.dataUrl && file.type === "application/pdf") {
          previewItems.push(`
            <div class="preview-item">
              <iframe src="${file.dataUrl}" title="${escapeHtml(file.name)}"></iframe>
              <div>${escapeHtml(entry.evidenceNo || entry.id)} ${attachment.label}<br>${escapeHtml(file.name)}</div>
            </div>
          `);
        }
      });
    });
  });
  return previewItems.length ? previewItems.join("") : `<div class="empty-state">첨부 미리보기 파일이 없습니다.</div>`;
}

function getRequiredEvidenceLabels(categoryKey) {
  if (categoryKey === "research") {
    return ["확인서", "결과물", "계좌이체 확인증", "수당 지급 기준"];
  }
  if (categoryKey === "meeting") {
    return ["신용카드 영수증", "협의록", "일시/장소/주제/내용", "참석자 명단", "사진"];
  }
  return ["구매내역서 또는 거래명세서", "카드 영수증 또는 계좌이체 확인증", "해외 결제 시 외화 영수증", "해외 결제 시 국내 카드사 원화 이용 전표"];
}

async function handleAttachmentChange(event) {
  const input = event.target;
  const key = input.dataset.attachmentKey;
  const files = Array.from(input.files || []);
  draftAttachments[key] = await Promise.all(files.map(readFileAsDataUrl));
  renderDraftPreview();
}

async function handleMemberAttachmentChange(event) {
  const input = event.target;
  const key = input.dataset.memberAttachmentKey;
  const files = Array.from(input.files || []);
  draftMemberAttachments[key] = await Promise.all(files.map(readFileAsDataUrl));
  renderMemberPreview();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderDraftPreview() {
  const items = ATTACHMENTS.flatMap((attachment) => {
    return (draftAttachments[attachment.key] || []).map((file) => ({ ...file, label: attachment.label }));
  });

  if (!items.length) {
    els.currentPreview.innerHTML = "";
    return;
  }

  els.currentPreview.innerHTML = items.map((file) => {
    const media = file.type.startsWith("image/")
      ? `<img src="${file.dataUrl}" alt="">`
      : file.type === "application/pdf"
        ? `<iframe src="${file.dataUrl}" title="${escapeHtml(file.name)}"></iframe>`
        : "";
    return `
      <div class="preview-item">
        ${media || `<div>미리보기 없음</div>`}
        <div>${escapeHtml(file.label)}<br>${escapeHtml(file.name)}</div>
      </div>
    `;
  }).join("");
}

function renderMemberPreview() {
  const items = MEMBER_ATTACHMENTS.flatMap((attachment) => {
    return (draftMemberAttachments[attachment.key] || []).map((file) => ({ ...file, label: attachment.label }));
  });

  if (!items.length) {
    els.memberPreview.innerHTML = "";
    return;
  }

  els.memberPreview.innerHTML = items.map((file) => {
    const media = file.type.startsWith("image/")
      ? `<img src="${file.dataUrl}" alt="">`
      : file.type === "application/pdf"
        ? `<iframe src="${file.dataUrl}" title="${escapeHtml(file.name)}"></iframe>`
        : "";
    return `
      <div class="preview-item">
        ${media || `<div>미리보기 없음</div>`}
        <div>${escapeHtml(file.label)}<br>${escapeHtml(file.name)}</div>
      </div>
    `;
  }).join("");
}

function handleMemberSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const receiptFiles = draftMemberAttachments.receiptBundle || [];

  if (!receiptFiles.length) {
    alert("영수증/구매내역서를 첨부하세요.");
    return;
  }

  const vendor = data.get("vendor").trim();
  const amount = toNumber(data.get("amount"));
  const attachments = emptyAttachments();
  attachments.cardReceipt = receiptFiles;
  attachments.foreignReceipt = draftMemberAttachments.foreignReceipt || [];
  attachments.krwCardSlip = draftMemberAttachments.krwCardSlip || [];

  const entry = {
    id: nextId(),
    submitter: data.get("submitter").trim(),
    school: state.project.school || "",
    clubName: state.project.clubName || "",
    category: "direct",
    directType: "ai_subscription",
    status: "submitted",
    date: data.get("date"),
    description: `${vendor} AI 구독료`,
    amount,
    itemName: "AI 구독료",
    vendor,
    unit: "월",
    quantity: 1,
    unitPrice: amount,
    paymentMethod: "card",
    evidenceNo: makeEvidenceNo("direct"),
    notes: data.get("notes").trim(),
    attachments
  };

  state.entries.push(entry);
  saveLocal({ silent: true });
  resetMemberForm();
  renderAll();
  activateTab("aiUsage");
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const editingId = data.get("id");
  const entry = {
    id: editingId || nextId(),
    submitter: data.get("submitter").trim(),
    school: data.get("school").trim(),
    clubName: data.get("clubName").trim(),
    category: data.get("category"),
    directType: data.get("category") === "direct" ? data.get("directType") || "ai_subscription" : "",
    status: "submitted",
    date: data.get("date"),
    description: data.get("description").trim(),
    amount: toNumber(data.get("amount")),
    itemName: data.get("itemName").trim(),
    vendor: data.get("vendor").trim(),
    unit: data.get("unit").trim(),
    quantity: toNumber(data.get("quantity")),
    unitPrice: toNumber(data.get("unitPrice")),
    paymentMethod: data.get("paymentMethod"),
    evidenceNo: data.get("evidenceNo").trim(),
    notes: data.get("notes").trim(),
    attachments: mergeAttachmentsForSubmit(editingId)
  };

  if (!entry.evidenceNo) {
    entry.evidenceNo = makeEvidenceNo(entry.category, editingId);
  }

  if (editingId) {
    const index = state.entries.findIndex((item) => item.id === editingId);
    state.entries[index] = entry;
  } else {
    state.entries.push(entry);
  }

  if (!state.project.school && entry.school) state.project.school = entry.school;
  if (!state.project.clubName && entry.clubName) state.project.clubName = entry.clubName;

  saveLocal({ silent: true });
  populateProjectForm();
  resetExpenseForm();
  renderAll();
  activateTab("review");
}

function mergeAttachmentsForSubmit(editingId) {
  const existing = editingId
    ? state.entries.find((entry) => entry.id === editingId)?.attachments || emptyAttachments()
    : emptyAttachments();

  const merged = emptyAttachments();
  ATTACHMENTS.forEach((attachment) => {
    merged[attachment.key] = draftAttachments[attachment.key]?.length
      ? draftAttachments[attachment.key]
      : existing[attachment.key] || [];
  });
  return merged;
}

function resetExpenseForm() {
  els.expenseForm.reset();
  els.expenseForm.elements.id.value = "";
  els.submitExpenseButton.textContent = "지출 추가";
  draftAttachments = emptyAttachments();
  buildAttachmentInputs();
  renderDraftPreview();

  if (state.project.school) {
    els.expenseForm.elements.school.value = state.project.school;
  }
  if (state.project.clubName) {
    els.expenseForm.elements.clubName.value = state.project.clubName;
  }

  syncDirectTypeField();
}

function resetMemberForm() {
  els.memberSubmitForm.reset();
  draftMemberAttachments = emptyMemberAttachments();
  document.querySelectorAll("[data-member-attachment-key]").forEach((input) => {
    input.value = "";
  });
  renderMemberPreview();
}

window.editEntry = function editEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  Object.entries(entry).forEach(([key, value]) => {
    const field = els.expenseForm.elements[key];
    if (field && key !== "attachments") {
      field.value = value ?? "";
    }
  });

  draftAttachments = structuredClone(entry.attachments || emptyAttachments());
  els.submitExpenseButton.textContent = "수정 저장";
  syncDirectTypeField();
  renderDraftPreview();
  activateTab("entry");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteEntry = function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  const ok = confirm(`${entry.evidenceNo || entry.id} 지출 내역을 삭제할까요?`);
  if (!ok) return;

  state.entries = state.entries.filter((item) => item.id !== id);
  saveLocal({ silent: true });
  renderAll();
};

function makeEvidenceNo(category, editingId) {
  if (editingId) {
    const existing = state.entries.find((entry) => entry.id === editingId);
    if (existing?.evidenceNo) return existing.evidenceNo;
  }

  const prefix = CATEGORIES[category].prefix;
  const used = state.entries
    .filter((entry) => entry.category === category)
    .map((entry) => entry.evidenceNo)
    .filter(Boolean);
  return `${prefix}-${String(used.length + 1).padStart(2, "0")}`;
}

function nextId(fallbackNumber) {
  const number = fallbackNumber || state.entries.length + 1;
  return `EXP-${String(number).padStart(3, "0")}`;
}

function getEntryWarnings(entry) {
  const warnings = [];

  if (toNumber(entry.amount) <= 0) warnings.push("지출금액은 0보다 커야 합니다.");
  if (!entry.date) warnings.push("지출일자가 없습니다.");
  if (!entry.description) warnings.push("사용 내용이 없습니다.");
  if (!entry.vendor) warnings.push("지급처가 없습니다.");

  if (entry.paymentMethod === "card" && !hasAttachment(entry, "cardReceipt")) {
    warnings.push("카드결제는 카드영수증 첨부가 필요합니다.");
  }

  if (entry.paymentMethod === "transfer" && !hasAttachment(entry, "transferConfirmation")) {
    warnings.push("계좌이체는 계좌이체확인증 첨부가 필요합니다.");
  }

  if (entry.paymentMethod === "other") {
    warnings.push("기타 결제방법은 정산 가능 여부 확인이 필요합니다.");
  }

  if (entry.category === "direct") {
    if (!entry.directType || !DIRECT_TYPES[entry.directType]) {
      warnings.push("직접성 경비 세부 유형을 확인하세요.");
    }
    if (entry.directType !== "ai_subscription" && looksAiSubscription(entry)) {
      warnings.push("AI 구독료로 보이는 직접성 경비입니다. 세부 유형을 AI 구독료로 확인하세요.");
    }
    const hasDirectEvidence = hasAttachment(entry, "transactionStatement")
      || (entry.directType === "ai_subscription" && hasAttachment(entry, "cardReceipt"));
    if (!hasDirectEvidence) {
      warnings.push("직접성 경비는 거래명세서 또는 구매내역서 첨부를 확인하세요.");
    }
    if (looksForeignPayment(entry)) {
      if (!hasAttachment(entry, "foreignReceipt")) warnings.push("해외 AI 툴 결제는 외화영수증이 필요합니다.");
      if (!hasAttachment(entry, "krwCardSlip")) warnings.push("해외 AI 툴 결제는 국내카드사원화전표가 필요합니다.");
    }
  }

  if (entry.category === "meeting") {
    if (!hasAttachment(entry, "meetingMinutes")) warnings.push("업무협의회비는 협의록 첨부가 필요합니다.");
    if (!hasAttachment(entry, "photo")) warnings.push("업무협의회비는 사진 첨부를 확인하세요.");
  }

  const memo = `${entry.description} ${entry.itemName} ${entry.notes}`;
  if (/간이영수증|간이 영수증/.test(memo)) warnings.push("간이영수증은 불인정 가능성이 높습니다.");
  if (/자산|기자재|태블릿|노트북|프린터|카메라/.test(memo)) warnings.push("자산취득성 물품은 정산 가능 여부를 확인하세요.");

  return warnings;
}

function isAiSubscriptionEntry(entry) {
  return entry.category === "direct" && entry.directType === "ai_subscription";
}

function normalizeSubmitterName(name) {
  return String(name || "").trim().replace(/\s+/g, " ") || "미입력";
}

function getEntryMonth(date) {
  const value = String(date || "");
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "날짜 미입력";
}

function formatMonthLabel(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${match[1]}.${match[2]}`;
}

function looksAiSubscription(entry) {
  const text = `${entry.description} ${entry.itemName} ${entry.vendor} ${entry.notes}`.toLowerCase();
  return /구독|subscription|openai|chatgpt|claude|gemini|canva|notion|perplexity|copilot|midjourney|wrtn|뤼튼|gamma|cursor/.test(text);
}

function looksForeignPayment(entry) {
  const text = `${entry.description} ${entry.itemName} ${entry.vendor} ${entry.notes}`.toLowerCase();
  return /해외|외화|달러|usd|openai|chatgpt|claude|gemini|canva|notion|perplexity/.test(text);
}

function hasAttachment(entry, key) {
  return Boolean(entry.attachments?.[key]?.length);
}

function saveLocal(options = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!options.silent) {
      console.info("saved");
    }
  } catch (error) {
    alert("localStorage 저장에 실패했습니다. 첨부 파일 용량을 줄이거나 JSON으로 내보내 보관하세요.");
    console.error(error);
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-club-settlement-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      saveLocal({ silent: true });
      populateProjectForm();
      resetExpenseForm();
      resetMemberForm();
      renderAll();
      activateTab("dashboard");
    } catch {
      alert("JSON 파일을 읽을 수 없습니다.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function restoreSampleData() {
  const ok = confirm("현재 입력된 데이터를 샘플 데이터로 바꿀까요?");
  if (!ok) return;

  state = structuredClone(sampleState);
  draftAttachments = emptyAttachments();
  draftMemberAttachments = emptyMemberAttachments();
  saveLocal({ silent: true });
  populateProjectForm();
  resetExpenseForm();
  resetMemberForm();
  renderAll();
  activateTab("dashboard");
}

function printDocument() {
  activateTab("print");
  renderPrintDocument();
  window.print();
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function formatWon(value) {
  return `${toNumber(value).toLocaleString("ko-KR")}원`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
