const STORAGE_KEY = "aiClubSettlementPrototype.v1";
const TOTAL_BUDGET = 2000000;

const CATEGORIES = {
  research: { label: "연구활동비", limit: 1000000, prefix: "1" },
  direct: { label: "직접성 경비", limit: null, prefix: "3" },
  meeting: { label: "업무협의회비", limit: 200000, prefix: "4" }
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
    totalBudget: TOTAL_BUDGET
  },
  entries: [
    {
      id: "EXP-001",
      submitter: "김유하",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "direct",
      status: "submitted",
      date: "2026-07-01",
      description: "AI 서비스 구독료",
      amount: 30000,
      itemName: "ChatGPT 구독",
      vendor: "OpenAI",
      unit: "월",
      quantity: 1,
      unitPrice: 30000,
      paymentMethod: "card",
      evidenceNo: "3-01",
      notes: "해외 결제 예시. 외화 영수증과 국내 카드사 원화 전표를 첨부해야 합니다.",
      attachments: {
        cardReceipt: [],
        transferConfirmation: [],
        transactionStatement: [],
        foreignReceipt: [],
        krwCardSlip: [],
        meetingMinutes: [],
        photo: []
      }
    },
    {
      id: "EXP-002",
      submitter: "이서연",
      school: "부산AI초등학교",
      clubName: "AI 수업 연구 동아리",
      category: "meeting",
      status: "submitted",
      date: "2026-07-10",
      description: "1차 수업 설계 협의회 다과",
      amount: 48000,
      itemName: "다과",
      vendor: "학교앞카페",
      unit: "식",
      quantity: 1,
      unitPrice: 48000,
      paymentMethod: "card",
      evidenceNo: "4-01",
      notes: "협의록과 사진 첨부 필요",
      attachments: {
        cardReceipt: [],
        transferConfirmation: [],
        transactionStatement: [],
        foreignReceipt: [],
        krwCardSlip: [],
        meetingMinutes: [],
        photo: []
      }
    }
  ]
};

let state = loadInitialState();
let draftAttachments = emptyAttachments();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  buildAttachmentInputs();
  bindEvents();
  populateProjectForm();
  renderAll();
});

function bindElements() {
  els.summaryGrid = document.querySelector("#summaryGrid");
  els.budgetRows = document.querySelector("#budgetRows");
  els.warningList = document.querySelector("#warningList");
  els.projectForm = document.querySelector("#projectForm");
  els.expenseForm = document.querySelector("#expenseForm");
  els.attachmentInputs = document.querySelector("#attachmentInputs");
  els.currentPreview = document.querySelector("#currentPreview");
  els.expenseRows = document.querySelector("#expenseRows");
  els.printDocument = document.querySelector("#printDocument");
  els.submitterFilter = document.querySelector("#submitterFilter");
  els.categoryFilter = document.querySelector("#categoryFilter");
  els.missingFilter = document.querySelector("#missingFilter");
  els.submitExpenseButton = document.querySelector("#submitExpenseButton");
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
        state.project[key] = key === "interest" ? toNumber(data.get(key)) : data.get(key).trim();
      }
    });
    saveLocal({ silent: true });
    renderAll();
  });

  els.expenseForm.addEventListener("submit", handleExpenseSubmit);
  [els.submitterFilter, els.categoryFilter, els.missingFilter].forEach((el) => {
    el.addEventListener("input", renderExpenseRows);
    el.addEventListener("change", renderExpenseRows);
  });
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

function normalizeState(raw) {
  const normalized = {
    project: { ...sampleState.project, ...(raw.project || {}) },
    entries: Array.isArray(raw.entries) ? raw.entries : []
  };

  normalized.project.totalBudget = TOTAL_BUDGET;
  normalized.entries = normalized.entries.map((entry, index) => ({
    id: entry.id || nextId(index + 1),
    status: entry.status || "submitted",
    submitter: entry.submitter || "",
    school: entry.school || "",
    clubName: entry.clubName || "",
    category: CATEGORIES[entry.category] ? entry.category : "direct",
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
  }));

  return normalized;
}

function emptyAttachments() {
  return ATTACHMENTS.reduce((acc, attachment) => {
    acc[attachment.key] = [];
    return acc;
  }, {});
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

function getTotals() {
  const categoryTotals = Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0]));
  state.entries.forEach((entry) => {
    categoryTotals[entry.category] += toNumber(entry.amount);
  });

  const spent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const missingCount = state.entries.filter((entry) => getEntryWarnings(entry).length > 0).length;

  return {
    categoryTotals,
    spent,
    remaining: TOTAL_BUDGET - spent,
    useRate: TOTAL_BUDGET ? Math.round((spent / TOTAL_BUDGET) * 1000) / 10 : 0,
    missingCount
  };
}

function renderSummary() {
  const totals = getTotals();
  const metrics = [
    ["총 예산", formatWon(TOTAL_BUDGET)],
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
      const limit = category.limit;
      const remaining = limit === null ? null : limit - spent;
      const denominator = limit || TOTAL_BUDGET;
      const rate = denominator ? Math.round((spent / denominator) * 1000) / 10 : 0;
      const over = limit !== null && spent > limit;
      const totalOver = totals.spent > TOTAL_BUDGET;
      const barClass = over || totalOver ? "danger" : rate >= 90 ? "warn" : "";
      const status = over
        ? `<span class="status-pill danger">한도 초과</span>`
        : key === "direct"
          ? `<span class="status-pill warn">증빙 확인</span>`
          : `<span class="status-pill ok">정상</span>`;

      return `
        <tr>
          <td><strong>${category.label}</strong></td>
          <td class="num">${limit === null ? "-" : formatWon(limit)}</td>
          <td class="num">${formatWon(spent)}</td>
          <td class="num">${remaining === null ? "-" : formatWon(remaining)}</td>
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

function renderWarnings() {
  const totals = getTotals();
  const warnings = [];

  if (totals.spent > TOTAL_BUDGET) {
    warnings.push({
      title: "총 예산 초과",
      detail: `총 사용액이 ${formatWon(totals.spent)}으로 총 예산 ${formatWon(TOTAL_BUDGET)}을 초과했습니다.`
    });
  }

  Object.entries(CATEGORIES).forEach(([key, category]) => {
    const spent = totals.categoryTotals[key];
    if (category.limit !== null && spent > category.limit) {
      warnings.push({
        title: `${category.label} 한도 초과`,
        detail: `${category.label} 사용액이 ${formatWon(spent)}으로 한도 ${formatWon(category.limit)}을 초과했습니다.`
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
    const attachmentNames = ATTACHMENTS
      .flatMap((attachment) => (entry.attachments[attachment.key] || []).map((file) => file.name))
      .join(", ");
    return `
      <tr>
        <td>${escapeHtml(entry.evidenceNo || "-")}</td>
        <td>${escapeHtml(entry.date || "-")}</td>
        <td>${escapeHtml(entry.submitter || "-")}</td>
        <td>${CATEGORIES[entry.category].label}</td>
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
  const finalBalance = TOTAL_BUDGET - totals.spent + interest;

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
          <tr><th>운영비</th><td>${formatWon(TOTAL_BUDGET)}</td><th>집행액</th><td>${formatWon(totals.spent)}</td></tr>
          <tr><th>집행잔액</th><td>${formatWon(TOTAL_BUDGET - totals.spent)}</td><th>이자 포함 잔액</th><td>${formatWon(finalBalance)}</td></tr>
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
            const limit = category.limit;
            return `
              <tr>
                <td>${category.label}</td>
                <td class="num">${limit === null ? "-" : formatWon(limit)}</td>
                <td class="num">${formatWon(spent)}</td>
                <td class="num">${limit === null ? "-" : formatWon(limit - spent)}</td>
                <td>${limit !== null && spent > limit ? "한도 초과" : ""}</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <th>합계</th>
            <th class="num">${formatWon(TOTAL_BUDGET)}</th>
            <th class="num">${formatWon(totals.spent)}</th>
            <th class="num">${formatWon(TOTAL_BUDGET - totals.spent)}</th>
            <th></th>
          </tr>
        </tbody>
      </table>
    </section>

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
    if (!hasAttachment(entry, "transactionStatement")) {
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
  saveLocal({ silent: true });
  populateProjectForm();
  resetExpenseForm();
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
