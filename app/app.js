import {
  bulkSaveAdminMembers,
  createMemberAiExpense,
  deleteMemberBudget as deleteRemoteMemberBudget,
  fetchAdminMembers,
  fetchClubState,
  getCurrentSession,
  hasSupabaseConfig,
  onAuthStateChange,
  removeAdminMember,
  saveAdminMember,
  saveMemberBudget as saveRemoteMemberBudget,
  signInWithPassword,
  signOut,
  updatePaid as updateRemotePaid
} from "./supabaseStore.js";

const STORAGE_KEY = "aiClubSettlementPrototype.v1";
const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENT_TOTAL_SIZE = 20 * 1024 * 1024;
const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
const IMAGE_ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const DEFAULT_BUDGETS = {
  totalBudget: 2000000,
  researchBudget: 1000000,
  trainingBudget: 0,
  directBudget: 800000,
  meetingBudget: 200000,
  aiSubscriptionBudget: 800000
};

const NUMERIC_PROJECT_FIELDS = new Set([
  "interest",
  "totalBudget",
  "researchBudget",
  "trainingBudget",
  "directBudget",
  "meetingBudget",
  "aiSubscriptionBudget"
]);

const CATEGORIES = {
  research: { label: "연구활동비", pptLabel: "연구 활동비", budgetKey: "researchBudget", prefix: "1" },
  training: { label: "연수 운영비", pptLabel: "연수 운영비", budgetKey: "trainingBudget", prefix: "2" },
  direct: { label: "직접성 경비", pptLabel: "직접성 경비", budgetKey: "directBudget", prefix: "3" },
  meeting: { label: "업무협의회비", pptLabel: "업무 협의회비", budgetKey: "meetingBudget", prefix: "4" }
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
  { key: "receiptBundle", label: "AI 서비스 영수증 (외화영수증)" },
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
    trainingBudget: DEFAULT_BUDGETS.trainingBudget,
    directBudget: DEFAULT_BUDGETS.directBudget,
    meetingBudget: DEFAULT_BUDGETS.meetingBudget,
    aiSubscriptionBudget: DEFAULT_BUDGETS.aiSubscriptionBudget
  },
  aiSubscriptionMembers: [
    { name: "김유하", limit: 140000, notes: "7-10월 ChatGPT 구독 예상" },
    { name: "이서연", limit: 90000, notes: "Claude Pro 격월 사용" },
    { name: "박민준", limit: 90000, notes: "Gemini Advanced 사용" },
    { name: "최하늘", limit: 60000, notes: "Canva Pro 사용" }
  ],
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
      paid: true,
      paidDate: "2026-07-15",
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
      paid: true,
      paidDate: "2026-08-15",
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
      paid: false,
      paidDate: "",
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
      paid: false,
      paidDate: "",
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
      paid: true,
      paidDate: "2026-07-20",
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
      paid: false,
      paidDate: "",
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
      paid: true,
      paidDate: "2026-08-28",
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
      paid: false,
      paidDate: "",
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
      paid: false,
      paidDate: "",
      notes: "9월 구독료 샘플",
      attachments: sampleAiAttachments("canva-2026-09")
    }
  ]
};

let state = loadInitialState();
let draftAttachments = emptyAttachments();
let draftMemberAttachments = emptyMemberAttachments();
let selectedEvidenceEntryId = "";
let authState = { session: null, user: null, profile: null };
let isRemoteMode = false;
let adminMembers = [];
let pendingMemberCsvRows = [];
let memberAdminMessage = "";

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  buildAttachmentInputs();
  bindEvents();
  populateProjectForm();
  syncDirectTypeField();
  renderAll();
  initializeAuth();
});

function bindElements() {
  els.summaryGrid = document.querySelector("#summaryGrid");
  els.authPanel = document.querySelector("#authPanel");
  els.loginForm = document.querySelector("#loginForm");
  els.authMessage = document.querySelector("#authMessage");
  els.sessionBar = document.querySelector("#sessionBar");
  els.sessionName = document.querySelector("#sessionName");
  els.sessionRole = document.querySelector("#sessionRole");
  els.headerActions = document.querySelector(".header-actions");
  els.budgetRows = document.querySelector("#budgetRows");
  els.warningList = document.querySelector("#warningList");
  els.projectForm = document.querySelector("#projectForm");
  els.expenseForm = document.querySelector("#expenseForm");
  els.memberSubmitForm = document.querySelector("#memberSubmitForm");
  els.memberBudgetForm = document.querySelector("#memberBudgetForm");
  els.memberBudgetRows = document.querySelector("#memberBudgetRows");
  els.memberBudgetSummary = document.querySelector("#memberBudgetSummary");
  els.adminMemberForm = document.querySelector("#adminMemberForm");
  els.adminMemberRows = document.querySelector("#adminMemberRows");
  els.adminMemberSubmitButton = document.querySelector("#adminMemberSubmitButton");
  els.memberCsvInput = document.querySelector("#memberCsvInput");
  els.memberCsvStatus = document.querySelector("#memberCsvStatus");
  els.memberCsvPreviewWrap = document.querySelector("#memberCsvPreviewWrap");
  els.memberCsvPreviewRows = document.querySelector("#memberCsvPreviewRows");
  els.memberBulkResult = document.querySelector("#memberBulkResult");
  els.uploadMemberCsvButton = document.querySelector("#uploadMemberCsvButton");
  els.memberBudgetHint = document.querySelector("#memberBudgetHint");
  els.myBudgetSummary = document.querySelector("#myBudgetSummary");
  els.myExpenseRows = document.querySelector("#myExpenseRows");
  els.directTypeField = document.querySelector("#directTypeField");
  els.attachmentInputs = document.querySelector("#attachmentInputs");
  els.currentPreview = document.querySelector("#currentPreview");
  els.memberPreview = document.querySelector("#memberPreview");
  els.expenseRows = document.querySelector("#expenseRows");
  els.evidencePanel = document.querySelector("#evidencePanel");
  els.aiBudgetSummary = document.querySelector("#aiBudgetSummary");
  els.aiMonthlyHead = document.querySelector("#aiMonthlyHead");
  els.aiMonthlyRows = document.querySelector("#aiMonthlyRows");
  els.aiMonthlyFoot = document.querySelector("#aiMonthlyFoot");
  els.printDocument = document.querySelector("#printDocument");
  els.pptxCopyText = document.querySelector("#pptxCopyText");
  els.submitterFilter = document.querySelector("#submitterFilter");
  els.categoryFilter = document.querySelector("#categoryFilter");
  els.missingFilter = document.querySelector("#missingFilter");
  els.submitExpenseButton = document.querySelector("#submitExpenseButton");
  els.memberSubmitButton = document.querySelector("#memberSubmitButton");
  els.memberBudgetSubmitButton = document.querySelector("#memberBudgetSubmitButton");
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  document.querySelector("#saveLocalButton").addEventListener("click", () => {
    saveLocal();
    flashButton(document.querySelector("#saveLocalButton"), "저장됨");
  });
  els.loginForm.addEventListener("submit", handleLogin);
  document.querySelector("#logoutButton").addEventListener("click", handleLogout);

  document.querySelector("#exportButton").addEventListener("click", exportJson);
  document.querySelector("#importInput").addEventListener("change", importJson);
  document.querySelector("#printButton").addEventListener("click", printDocument);
  document.querySelector("#printButtonSecondary").addEventListener("click", printDocument);
  document.querySelector("#copyPptxButton").addEventListener("click", copyPptxText);
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
  els.memberSubmitForm.elements.submitter.addEventListener("input", renderMemberBudgetHint);
  els.memberSubmitForm.elements.amount.addEventListener("input", renderMemberBudgetHint);
  document.querySelector("#clearMemberFormButton").addEventListener("click", resetMemberForm);
  els.memberBudgetForm.addEventListener("submit", handleMemberBudgetSubmit);
  document.querySelector("#clearMemberBudgetButton").addEventListener("click", resetMemberBudgetForm);
  els.adminMemberForm.addEventListener("submit", handleAdminMemberSubmit);
  document.querySelector("#clearAdminMemberButton").addEventListener("click", resetAdminMemberForm);
  document.querySelector("#refreshMembersButton").addEventListener("click", refreshAdminMembers);
  document.querySelector("#downloadMemberCsvButton").addEventListener("click", downloadMemberCsvTemplate);
  els.memberCsvInput.addEventListener("change", handleMemberCsvChange);
  els.uploadMemberCsvButton.addEventListener("click", uploadMemberCsv);
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
    input.accept = attachment.key === "photo" ? IMAGE_ATTACHMENT_ACCEPT : ATTACHMENT_ACCEPT;
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
    aiSubscriptionMembers: normalizeAiSubscriptionMembers(raw.aiSubscriptionMembers || raw.memberBudgets || []),
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
      paid: Boolean(entry.paid),
      paidDate: entry.paidDate || "",
      notes: entry.notes || "",
      attachments: { ...emptyAttachments(), ...(entry.attachments || {}) }
    };
  });

  return normalized;
}

function normalizeAiSubscriptionMembers(members) {
  if (!Array.isArray(members)) return [];
  const map = new Map();

  members.forEach((member) => {
    const name = normalizeSubmitterName(member.name || member.submitter);
    if (!name || name === "미입력") return;
    map.set(name, {
      name,
      limit: Math.max(0, toNumber(member.limit ?? member.aiSubscriptionLimit)),
      notes: String(member.notes || "").trim()
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
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
  renderAuthUi();
  syncMemberIdentityFields();
  renderSummary();
  renderBudgetRows();
  renderAiSubscriptionSummary();
  renderMemberBudgetManager();
  renderMemberBudgetHint();
  renderWarnings();
  renderExpenseRows();
  renderEvidencePanel();
  renderPptxCopyText();
  renderPrintDocument();
  renderMyStatus();
  renderMemberAdmin();
}

function syncMemberIdentityFields() {
  if (!els.memberSubmitForm?.elements.submitter) return;

  const submitterField = els.memberSubmitForm.elements.submitter;
  const isLoggedInMember = Boolean(isRemoteMode && authState.profile?.role === "member");
  submitterField.readOnly = isLoggedInMember;

  if (isLoggedInMember) {
    submitterField.value = authState.profile.name || "";
  }
}

async function initializeAuth() {
  if (!hasSupabaseConfig) {
    isRemoteMode = false;
    renderAll();
    return;
  }

  try {
    authState = await getCurrentSession();
    isRemoteMode = Boolean(authState.session);
    if (authState.profile) {
      await loadRemoteState();
    }
    onAuthStateChange(async (nextAuthState) => {
      authState = nextAuthState;
      isRemoteMode = Boolean(authState.session);
      if (authState.profile) {
        await loadRemoteState();
      }
      renderAll();
      activateDefaultTabForRole();
    });
  } catch (error) {
    console.error(error);
    els.authMessage.textContent = formatAuthError(error, "Supabase 로그인 상태를 확인하지 못했습니다.");
  }

  renderAll();
  activateDefaultTabForRole();
}

async function loadRemoteState() {
  state = normalizeState(await fetchClubState(authState.profile));
  populateProjectForm();
  resetExpenseForm();
  resetMemberForm();
}

async function handleLogin(event) {
  event.preventDefault();
  els.authMessage.textContent = "";
  const data = new FormData(event.currentTarget);

  try {
    authState = await signInWithPassword(data.get("email"), data.get("password"));
    isRemoteMode = true;
    await loadRemoteState();
    renderAll();
    activateDefaultTabForRole();
  } catch (error) {
    console.error(error);
    els.authMessage.textContent = formatAuthError(error, "로그인에 실패했습니다.");
  }
}

function formatAuthError(error, fallback) {
  const message = error?.message || "";
  if (!message) return fallback;
  if (message.includes("Email not confirmed")) {
    return `${fallback} Supabase Auth에서 해당 사용자의 이메일 확인 상태를 확인하세요. (${message})`;
  }
  if (message.includes("Invalid login credentials")) {
    return `${fallback} 이메일 또는 비밀번호가 맞지 않습니다. (${message})`;
  }
  if (message.includes("profiles")) {
    return message;
  }
  return `${fallback} (${message})`;
}

async function handleLogout() {
  await signOut();
  authState = { session: null, user: null, profile: null };
  isRemoteMode = false;
  renderAll();
}

function renderAuthUi() {
  const configured = hasSupabaseConfig;
  const loggedIn = Boolean(authState.session && authState.profile);
  const isMember = Boolean(configured && loggedIn && authState.profile.role === "member");

  document.body.classList.toggle("member-mode", isMember);
  if (els.headerActions) {
    els.headerActions.hidden = isMember;
  }

  els.authPanel.hidden = !configured || loggedIn;
  els.sessionBar.hidden = !configured || !loggedIn;

  if (loggedIn) {
    els.sessionName.textContent = authState.profile.name || authState.user.email || "";
    els.sessionRole.textContent = authState.profile.role === "admin" ? "관리자" : "선생님";
  }

  document.querySelectorAll("[data-role]").forEach((el) => {
    const role = el.dataset.role;
    const show = !configured
      || role === "all"
      || (loggedIn && role === authState.profile.role);
    el.hidden = !show;
  });

  if (configured && !loggedIn) {
    document.querySelector(".tabs").hidden = true;
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  } else {
    document.querySelector(".tabs").hidden = false;
  }
}

function activateDefaultTabForRole() {
  if (hasSupabaseConfig && !authState.session) return;
  const defaultTab = authState.profile?.role === "member" ? "memberSubmit" : "dashboard";
  const current = document.querySelector(".tab-button.active");
  const activePanel = document.querySelector(".tab-panel.active");
  if (!current || current.hidden || !activePanel) activateTab(defaultTab);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });

  if (tabName === "memberAdmin" && isRemoteMode && authState.profile?.role === "admin" && !adminMembers.length) {
    refreshAdminMembers();
  }
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
  const categoryPaidTotals = Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0]));
  state.entries.forEach((entry) => {
    categoryTotals[entry.category] += toNumber(entry.amount);
    if (entry.paid) {
      categoryPaidTotals[entry.category] += toNumber(entry.amount);
    }
  });

  const totalBudget = getProjectBudget("totalBudget");
  const spent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const paid = Object.values(categoryPaidTotals).reduce((sum, amount) => sum + amount, 0);
  const unpaid = spent - paid;
  const missingCount = state.entries.filter((entry) => getEntryWarnings(entry).length > 0).length;

  return {
    categoryTotals,
    categoryPaidTotals,
    totalBudget,
    spent,
    paid,
    unpaid,
    remaining: totalBudget - spent,
    cashRemaining: totalBudget - paid,
    useRate: totalBudget ? Math.round((spent / totalBudget) * 1000) / 10 : 0,
    missingCount
  };
}

function renderSummary() {
  const totals = getTotals();
  const groups = [
    {
      title: "정산 기준",
      className: "settlement-group",
      metrics: [
        ["총 예산", formatWon(totals.totalBudget)],
        ["사용액", formatWon(totals.spent)],
        ["정산 잔액", formatWon(totals.remaining)]
      ]
    },
    {
      title: "지급 기준",
      className: "payment-group",
      metrics: [
        ["지급완료", formatWon(totals.paid)],
        ["미지급", formatWon(totals.unpaid), totals.unpaid ? "warning" : ""],
        ["실지급 잔액", formatWon(totals.cashRemaining)]
      ]
    },
    {
      title: "점검",
      className: "check-group",
      metrics: [
        ["사용률", `${totals.useRate}%`],
        ["경고 건수", `${totals.missingCount}건`, totals.missingCount ? "warning" : ""]
      ]
    }
  ];

  els.summaryGrid.innerHTML = groups
    .map((group) => `
      <section class="metric-group ${group.className}">
        <h3>${group.title}</h3>
        <div class="metric-group-grid">
          ${group.metrics.map(([label, value, className = ""]) => `
            <div class="metric ${className}">
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `)
    .join("");
}

function renderBudgetRows() {
  const totals = getTotals();
  els.budgetRows.innerHTML = Object.entries(CATEGORIES)
    .map(([key, category]) => {
      const spent = totals.categoryTotals[key];
      const paid = totals.categoryPaidTotals[key];
      const unpaid = spent - paid;
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
          <td class="num">${formatWon(paid)}</td>
          <td class="num">${formatWon(unpaid)}</td>
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
  const paid = entries
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const unpaid = total - paid;
  const budget = getProjectBudget("aiSubscriptionBudget");
  const memberRows = getAiMemberBudgetRows(submitters);
  const memberAllocated = getAiMemberAllocatedTotal();

  return { entries, submitters, months, monthTotals, total, paid, unpaid, budget, remaining: budget - total, memberRows, memberAllocated };
}

function renderAiSubscriptionSummary() {
  const summary = getAiSubscriptionSummary();
  renderAiBudgetSummary(summary);

  if (!summary.entries.length) {
    els.aiMonthlyHead.innerHTML = `
      <tr>
        <th>제출자</th>
        <th class="num">가능금액</th>
        <th class="num">합계</th>
        <th class="num">잔액</th>
        <th>상태</th>
      </tr>
    `;
    els.aiMonthlyRows.innerHTML = `
      <tr>
        <td colspan="5" class="muted">월별로 표시할 AI 구독료가 없습니다.</td>
      </tr>
    `;
    els.aiMonthlyFoot.innerHTML = renderAiMonthlyFoot(summary);
    return;
  }

  els.aiMonthlyHead.innerHTML = `
    <tr>
      <th>제출자</th>
      <th class="num">가능금액</th>
      ${summary.months.map((month) => `<th class="num">${escapeHtml(formatMonthLabel(month))}</th>`).join("")}
      <th class="num">합계</th>
      <th class="num">잔액</th>
      <th>상태</th>
    </tr>
  `;

  els.aiMonthlyRows.innerHTML = summary.memberRows
    .filter((row) => row.used > 0)
    .map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td class="num">${row.hasLimit ? formatWon(row.limit) : "-"}</td>
      ${summary.months.map((month) => `<td class="num">${formatWon(row.monthlyTotals[month] || 0)}</td>`).join("")}
      <td class="num"><strong>${formatWon(row.used)}</strong></td>
      <td class="num ${row.over ? "danger-text" : ""}">${row.hasLimit ? formatWon(row.remaining) : "-"}</td>
      <td>${renderBudgetStatus(row)}</td>
    </tr>
  `).join("");
  els.aiMonthlyFoot.innerHTML = renderAiMonthlyFoot(summary);
}

function renderAiBudgetSummary(summary) {
  const remainingClass = summary.remaining < 0 ? "danger" : "";
  const metrics = [
    ["AI 구독료 배정액", formatWon(summary.budget)],
    ["AI 구독료 사용액", formatWon(summary.total)],
    ["사용가능 잔액", formatWon(summary.remaining), remainingClass],
    ["지급완료", formatWon(summary.paid)],
    ["미지급", formatWon(summary.unpaid), summary.unpaid ? "warning" : ""]
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
  const remainingSpacer = `<td colspan="${summary.months.length + 2}"></td>`;
  const remainingClass = summary.remaining < 0 ? "danger-text" : "";

  return `
    <tr class="total-row">
      <th>전체 합계</th>
      <td class="num">${formatWon(summary.memberAllocated)}</td>
      ${monthTotalCells}
      <td class="num"><strong>${formatWon(summary.total)}</strong></td>
      <td class="num ${remainingClass}">${formatWon(summary.budget - summary.total)}</td>
      <td></td>
    </tr>
    <tr class="balance-row">
      <th>사용가능 잔액</th>
      ${remainingSpacer}
      <td class="num ${remainingClass}"><strong>${formatWon(summary.remaining)}</strong></td>
      <td></td>
    </tr>
  `;
}

function getAiMemberBudgetRows(submitterRows = []) {
  const memberMap = new Map();

  state.aiSubscriptionMembers.forEach((member) => {
    const name = normalizeSubmitterName(member.name);
    memberMap.set(name, {
      name,
      limit: toNumber(member.limit),
      notes: member.notes || "",
      hasLimit: true,
      used: 0,
      monthlyTotals: {},
      vendors: new Set()
    });
  });

  submitterRows.forEach((row) => {
    const name = normalizeSubmitterName(row.submitter);
    if (!memberMap.has(name)) {
      memberMap.set(name, {
        name,
        limit: 0,
        notes: "",
        hasLimit: false,
        used: 0,
        monthlyTotals: {},
        vendors: new Set()
      });
    }

    const member = memberMap.get(name);
    member.used = row.amount;
    member.monthlyTotals = row.monthlyTotals;
    member.vendors = row.vendors;
  });

  return Array.from(memberMap.values())
    .map((row) => {
      const remaining = row.limit - row.used;
      return {
        ...row,
        remaining,
        over: row.hasLimit && remaining < 0
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}

function getAiMemberAllocatedTotal() {
  return state.aiSubscriptionMembers.reduce((sum, member) => sum + toNumber(member.limit), 0);
}

function getMemberBudget(name) {
  const normalized = normalizeSubmitterName(name);
  return state.aiSubscriptionMembers.find((member) => normalizeSubmitterName(member.name) === normalized);
}

function getMemberAiUsage(name) {
  const normalized = normalizeSubmitterName(name);
  return state.entries
    .filter((entry) => isAiSubscriptionEntry(entry) && normalizeSubmitterName(entry.submitter) === normalized)
    .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
}

function getMemberBudgetStatus(name, pendingAmount = 0) {
  const member = getMemberBudget(name);
  const used = getMemberAiUsage(name);
  const hasLimit = Boolean(member);
  const limit = member ? toNumber(member.limit) : 0;
  const remaining = limit - used;
  const projectedRemaining = limit - used - toNumber(pendingAmount);

  return {
    name: normalizeSubmitterName(name),
    hasLimit,
    limit,
    used,
    remaining,
    over: hasLimit && remaining < 0,
    projectedRemaining,
    projectedOver: hasLimit && projectedRemaining < 0
  };
}

function renderBudgetStatus(row) {
  if (!row.hasLimit) return `<span class="status-pill warn">배정 미설정</span>`;
  if (row.over) return `<span class="status-pill danger">초과</span>`;
  if (row.remaining === 0) return `<span class="status-pill warn">잔액 0원</span>`;
  return `<span class="status-pill ok">정상</span>`;
}

async function handleMemberBudgetSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = normalizeSubmitterName(data.get("name"));
  const originalName = normalizeSubmitterName(data.get("originalName"));
  const limit = Math.max(0, toNumber(data.get("limit")));
  const notes = String(data.get("notes") || "").trim();

  if (!name || name === "미입력") {
    alert("회원 이름을 입력하세요.");
    return;
  }

  const otherAllocated = state.aiSubscriptionMembers
    .filter((member) => normalizeSubmitterName(member.name) !== originalName && normalizeSubmitterName(member.name) !== name)
    .reduce((sum, member) => sum + toNumber(member.limit), 0);
  const aiBudget = getProjectBudget("aiSubscriptionBudget");
  if (otherAllocated + limit > aiBudget) {
    alert(`회원별 가능금액 합계가 AI 구독료 배정액 ${formatWon(aiBudget)}을 넘을 수 없습니다.`);
    return;
  }

  state.aiSubscriptionMembers = state.aiSubscriptionMembers
    .filter((member) => normalizeSubmitterName(member.name) !== originalName && normalizeSubmitterName(member.name) !== name);
  state.aiSubscriptionMembers.push({ name, limit, notes });
  state.aiSubscriptionMembers = normalizeAiSubscriptionMembers(state.aiSubscriptionMembers);

  if (isRemoteMode) {
    await saveRemoteMemberBudget(authState.profile, { name, limit, notes });
    await loadRemoteState();
  }
  saveLocal({ silent: true });
  resetMemberBudgetForm();
  renderAll();
}

function resetMemberBudgetForm() {
  els.memberBudgetForm.reset();
  els.memberBudgetForm.elements.originalName.value = "";
  els.memberBudgetSubmitButton.textContent = "배정 저장";
}

window.startMemberBudget = function startMemberBudget(name) {
  resetMemberBudgetForm();
  els.memberBudgetForm.elements.name.value = name;
  els.memberBudgetForm.elements.limit.focus();
};

window.editMemberBudget = function editMemberBudget(name) {
  const member = getMemberBudget(name);
  if (!member) return;

  els.memberBudgetForm.elements.originalName.value = member.name;
  els.memberBudgetForm.elements.name.value = member.name;
  els.memberBudgetForm.elements.limit.value = member.limit;
  els.memberBudgetForm.elements.notes.value = member.notes || "";
  els.memberBudgetSubmitButton.textContent = "배정 수정";
  els.memberBudgetForm.elements.limit.focus();
};

window.deleteMemberBudget = async function deleteMemberBudget(name) {
  const ok = confirm(`${name} 선생님의 AI 구독료 가능금액 배정을 삭제할까요?`);
  if (!ok) return;

  if (isRemoteMode) {
    await deleteRemoteMemberBudget(authState.profile, name);
    await loadRemoteState();
  } else {
    state.aiSubscriptionMembers = state.aiSubscriptionMembers
      .filter((member) => normalizeSubmitterName(member.name) !== normalizeSubmitterName(name));
  }
  saveLocal({ silent: true });
  resetMemberBudgetForm();
  renderAll();
};

function renderMemberAdmin() {
  if (!els.adminMemberRows) return;

  if (!hasSupabaseConfig) {
    els.adminMemberRows.innerHTML = `<tr><td colspan="8" class="muted">Supabase 연결 후 사용할 수 있습니다.</td></tr>`;
    return;
  }

  if (memberAdminMessage) {
    els.memberBulkResult.innerHTML = `<div class="empty-state">${escapeHtml(memberAdminMessage)}</div>`;
  }

  if (!adminMembers.length) {
    els.adminMemberRows.innerHTML = `<tr><td colspan="8" class="muted">회원 관리 탭을 열면 목록을 불러옵니다.</td></tr>`;
    return;
  }

  els.adminMemberRows.innerHTML = adminMembers.map((member) => {
    const isCurrentUser = member.id === authState.user?.id;
    const status = member.active
      ? `<span class="status-pill ok">활성</span>`
      : `<span class="status-pill warn">비활성</span>`;
    const deleteButton = member.canHardDelete
      ? `<button type="button" class="small-button" onclick="hardDeleteAdminMember('${escapeJsArg(member.id)}', false)">완전 삭제</button>`
      : `<button type="button" class="small-button" onclick="hardDeleteAdminMember('${escapeJsArg(member.id)}', true)">강제 삭제</button>`;
    return `
      <tr>
        <td><strong>${escapeHtml(member.name || "-")}</strong></td>
        <td>${escapeHtml(member.email || "-")}</td>
        <td>${member.role === "admin" ? "관리자" : "회원"}</td>
        <td>${status}</td>
        <td class="num">${formatWon(member.aiLimit)}</td>
        <td class="num">${formatWon(member.used)}</td>
        <td>${escapeHtml(member.notes || "")}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="small-button" onclick="editAdminMember('${escapeJsArg(member.id)}')">수정</button>
            ${isCurrentUser ? "" : `<button type="button" class="small-button" onclick="toggleAdminMemberActive('${escapeJsArg(member.id)}')">${member.active ? "비활성화" : "활성화"}</button>`}
            ${isCurrentUser ? "" : deleteButton}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function refreshAdminMembers() {
  if (!isRemoteMode || authState.profile?.role !== "admin") return;

  try {
    memberAdminMessage = "회원 목록을 불러오는 중입니다.";
    renderMemberAdmin();
    const result = await fetchAdminMembers();
    adminMembers = normalizeAdminMembers(result.members || []);
    memberAdminMessage = "";
    renderMemberAdmin();
  } catch (error) {
    console.error(error);
    memberAdminMessage = `회원 목록을 불러오지 못했습니다. ${error.message || ""}`;
    renderMemberAdmin();
  }
}

async function handleAdminMemberSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const member = {
    id: String(formData.get("id") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    role: formData.get("role") || "member",
    aiLimit: toNumber(formData.get("aiLimit")),
    password: String(formData.get("password") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    active: formData.get("active") !== "false"
  };

  if (!member.name || !member.email) {
    alert("이름과 이메일을 입력하세요.");
    return;
  }
  if (!member.id && !member.password) {
    alert("신규 회원은 임시 비밀번호가 필요합니다.");
    return;
  }
  if (!canApplyMemberLimits([member], member.id ? [member.id] : [])) return;

  try {
    els.adminMemberSubmitButton.disabled = true;
    await saveAdminMember(member);
    await loadRemoteState();
    await refreshAdminMembers();
    resetAdminMemberForm();
  } catch (error) {
    console.error(error);
    alert(error.message || "회원 저장에 실패했습니다.");
  } finally {
    els.adminMemberSubmitButton.disabled = false;
  }
}

function resetAdminMemberForm() {
  els.adminMemberForm.reset();
  els.adminMemberForm.elements.id.value = "";
  els.adminMemberForm.elements.role.value = "member";
  els.adminMemberForm.elements.active.value = "true";
  els.adminMemberForm.elements.aiLimit.value = "0";
  els.adminMemberSubmitButton.textContent = "회원 저장";
}

window.editAdminMember = function editAdminMember(id) {
  const member = adminMembers.find((item) => item.id === id);
  if (!member) return;

  els.adminMemberForm.elements.id.value = member.id;
  els.adminMemberForm.elements.name.value = member.name || "";
  els.adminMemberForm.elements.email.value = member.email || "";
  els.adminMemberForm.elements.role.value = member.role || "member";
  els.adminMemberForm.elements.aiLimit.value = member.aiLimit || 0;
  els.adminMemberForm.elements.password.value = "";
  els.adminMemberForm.elements.notes.value = member.notes || "";
  els.adminMemberForm.elements.active.value = member.active ? "true" : "false";
  els.adminMemberSubmitButton.textContent = "회원 수정";
  els.adminMemberForm.elements.name.focus();
};

window.toggleAdminMemberActive = async function toggleAdminMemberActive(id) {
  const member = adminMembers.find((item) => item.id === id);
  if (!member) return;
  const nextActive = !member.active;
  const ok = confirm(`${member.name} 선생님을 ${nextActive ? "활성화" : "비활성화"}할까요?`);
  if (!ok) return;

  try {
    await saveAdminMember({ ...member, active: nextActive, password: "" });
    await refreshAdminMembers();
  } catch (error) {
    console.error(error);
    alert(error.message || "상태 변경에 실패했습니다.");
  }
};

window.hardDeleteAdminMember = async function hardDeleteAdminMember(id, force) {
  const member = adminMembers.find((item) => item.id === id);
  if (!member) return;
  const message = force
    ? `${member.name} 선생님은 지출 기록이 있습니다. 강제 삭제하면 제출 내역과 영수증 파일도 삭제됩니다. 정말 삭제할까요?`
    : `${member.name} 선생님 계정을 완전 삭제할까요?`;
  const ok = confirm(message);
  if (!ok) return;
  if (force) {
    const secondOk = confirm("되돌릴 수 없습니다. 강제 삭제를 계속할까요?");
    if (!secondOk) return;
  }

  try {
    await removeAdminMember({ id, mode: "hard", force });
    await loadRemoteState();
    await refreshAdminMembers();
  } catch (error) {
    console.error(error);
    alert(error.message || "회원 삭제에 실패했습니다.");
  }
};

function handleMemberCsvChange(event) {
  const file = event.target.files?.[0];
  pendingMemberCsvRows = [];
  els.uploadMemberCsvButton.disabled = true;
  els.memberCsvPreviewWrap.hidden = true;
  els.memberCsvPreviewRows.innerHTML = "";
  els.memberCsvStatus.textContent = "CSV를 읽는 중입니다.";

  if (!file) {
    els.memberCsvStatus.textContent = "선택된 CSV가 없습니다.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      pendingMemberCsvRows = parseMemberCsv(String(reader.result || ""));
      renderMemberCsvPreview();
    } catch (error) {
      console.error(error);
      els.memberCsvStatus.textContent = error.message || "CSV를 읽지 못했습니다.";
    }
  };
  reader.onerror = () => {
    els.memberCsvStatus.textContent = "CSV 파일을 읽지 못했습니다.";
  };
  reader.readAsText(file, "utf-8");
}

function renderMemberCsvPreview() {
  if (!pendingMemberCsvRows.length) {
    els.memberCsvStatus.textContent = "업로드할 행이 없습니다.";
    return;
  }

  els.memberCsvStatus.textContent = `${pendingMemberCsvRows.length}명 미리보기`;
  els.uploadMemberCsvButton.disabled = false;
  els.memberCsvPreviewWrap.hidden = false;
  els.memberCsvPreviewRows.innerHTML = pendingMemberCsvRows.slice(0, 20).map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${row.role === "admin" ? "관리자" : "회원"}</td>
      <td class="num">${formatWon(row.aiLimit)}</td>
      <td>${row.password ? "입력됨" : `<span class="warning-pill">없음</span>`}</td>
      <td>${escapeHtml(row.notes || "")}</td>
    </tr>
  `).join("");
}

async function uploadMemberCsv() {
  if (!pendingMemberCsvRows.length) return;
  if (!canApplyMemberLimits(pendingMemberCsvRows, [])) return;

  const ok = confirm(`${pendingMemberCsvRows.length}명의 회원 정보를 일괄 저장할까요? 같은 이메일이 있으면 수정됩니다.`);
  if (!ok) return;

  try {
    els.uploadMemberCsvButton.disabled = true;
    memberAdminMessage = "CSV 일괄 저장 중입니다.";
    renderMemberAdmin();
    const result = await bulkSaveAdminMembers(pendingMemberCsvRows);
    adminMembers = normalizeAdminMembers(result.members || []);
    const successCount = (result.results || []).filter((row) => row.ok).length;
    const failRows = (result.results || []).filter((row) => !row.ok);
    memberAdminMessage = `일괄 저장 완료: 성공 ${successCount}명, 실패 ${failRows.length}명`;
    els.memberBulkResult.innerHTML = failRows.length
      ? failRows.map((row) => `<div class="warning-item"><strong>${escapeHtml(row.email || row.name || "행")}</strong><span>${escapeHtml(row.error)}</span></div>`).join("")
      : `<div class="empty-state">${escapeHtml(memberAdminMessage)}</div>`;
    pendingMemberCsvRows = [];
    els.memberCsvInput.value = "";
    els.memberCsvStatus.textContent = "선택된 CSV가 없습니다.";
    els.memberCsvPreviewWrap.hidden = true;
    await loadRemoteState();
    renderAll();
  } catch (error) {
    console.error(error);
    alert(error.message || "CSV 일괄 저장에 실패했습니다.");
  } finally {
    els.uploadMemberCsvButton.disabled = !pendingMemberCsvRows.length;
  }
}

function downloadMemberCsvTemplate() {
  const csv = [
    "name,email,role,aiLimit,password,notes",
    "홍길동,user02@example.com,member,100000,123456,ChatGPT Plus",
    "관리자,admin2@example.com,admin,0,123456,보조 관리자"
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "member-upload-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseMemberCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows.slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(row[index] || "").trim();
      });
      return {
        name: record.name,
        email: record.email,
        role: record.role || "member",
        aiLimit: toNumber(record.aiLimit),
        password: record.password,
        notes: record.notes,
        active: record.active === "" ? true : record.active !== "false"
      };
    });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeCsvHeader(header) {
  const key = String(header || "").trim().replace(/^\ufeff/, "").toLowerCase();
  const map = {
    "이름": "name",
    "성명": "name",
    "name": "name",
    "이메일": "email",
    "email": "email",
    "역할": "role",
    "role": "role",
    "ai구독료한도": "aiLimit",
    "ai 구독료 한도": "aiLimit",
    "ai_limit": "aiLimit",
    "ailimit": "aiLimit",
    "limit": "aiLimit",
    "임시비밀번호": "password",
    "비밀번호": "password",
    "password": "password",
    "비고": "notes",
    "메모": "notes",
    "notes": "notes",
    "상태": "active",
    "active": "active"
  };
  return map[key] || key;
}

function normalizeAdminMembers(members) {
  return (members || []).map((member) => ({
    id: member.id,
    email: member.email || "",
    name: member.name || "",
    role: member.role || "member",
    active: member.active !== false,
    aiLimit: toNumber(member.aiLimit),
    notes: member.notes || "",
    used: toNumber(member.used),
    canHardDelete: Boolean(member.canHardDelete)
  }));
}

function canApplyMemberLimits(nextMembers, replaceIds = []) {
  const replaceIdSet = new Set(replaceIds.filter(Boolean));
  const merged = adminMembers
    .filter((member) => !replaceIdSet.has(member.id))
    .map((member) => ({ ...member }));

  nextMembers.forEach((member) => {
    const email = String(member.email || "").toLowerCase();
    const existingIndex = merged.findIndex((item) => {
      if (member.id && item.id === member.id) return true;
      return item.email.toLowerCase() === email;
    });
    const mergedMember = {
      ...(existingIndex >= 0 ? merged[existingIndex] : {}),
      ...member,
      id: member.id || (existingIndex >= 0 ? merged[existingIndex].id : ""),
      email,
      aiLimit: toNumber(member.aiLimit)
    };
    if (existingIndex >= 0) merged.splice(existingIndex, 1, mergedMember);
    else merged.push(mergedMember);
  });

  const totalLimit = merged
    .reduce((sum, member) => sum + toNumber(member.aiLimit), 0);
  const aiBudget = getProjectBudget("aiSubscriptionBudget");
  if (totalLimit > aiBudget) {
    alert(`회원별 AI 구독료 한도 합계 ${formatWon(totalLimit)}이 AI 구독료 배정액 ${formatWon(aiBudget)}을 초과합니다.`);
    return false;
  }
  return true;
}

function renderMemberBudgetManager() {
  const summary = getAiSubscriptionSummary();
  const overAllocated = summary.memberAllocated > summary.budget;
  const remaining = summary.budget - summary.memberAllocated;

  els.memberBudgetSummary.innerHTML = `
    <div class="${overAllocated ? "warning-item" : "empty-state"}">
      <strong>회원별 배정 합계 ${formatWon(summary.memberAllocated)} / AI 구독료 배정액 ${formatWon(summary.budget)}</strong>
      <span class="${overAllocated ? "danger-text" : "muted"}">배정 가능 잔액 ${formatWon(remaining)}</span>
    </div>
  `;

  if (!summary.memberRows.length) {
    els.memberBudgetRows.innerHTML = `
      <tr>
        <td colspan="7" class="muted">아직 설정된 회원별 가능금액이 없습니다.</td>
      </tr>
    `;
    return;
  }

  els.memberBudgetRows.innerHTML = summary.memberRows.map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td class="num">${row.hasLimit ? formatWon(row.limit) : `<span class="warning-pill">미설정</span>`}</td>
      <td class="num">${formatWon(row.used)}</td>
      <td class="num ${row.over ? "danger-text" : ""}">${row.hasLimit ? formatWon(row.remaining) : "-"}</td>
      <td>${renderBudgetStatus(row)}</td>
      <td>${escapeHtml(row.notes || "")}</td>
      <td>
        <div class="row-actions">
          ${row.hasLimit ? `<button type="button" class="small-button" onclick="editMemberBudget('${escapeJsArg(row.name)}')">수정</button>` : `<button type="button" class="small-button" onclick="startMemberBudget('${escapeJsArg(row.name)}')">배정</button>`}
          ${row.hasLimit ? `<button type="button" class="small-button" onclick="deleteMemberBudget('${escapeJsArg(row.name)}')">삭제</button>` : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

function renderMemberBudgetHint() {
  if (!els.memberBudgetHint || !els.memberSubmitForm) return;

  const name = normalizeSubmitterName(els.memberSubmitForm.elements.submitter.value);
  const pendingAmount = toNumber(els.memberSubmitForm.elements.amount.value);
  if (!name || name === "미입력") {
    els.memberBudgetHint.innerHTML = `<div class="empty-state">이름을 입력하면 AI 구독료 가능금액과 남은 금액을 확인할 수 있습니다.</div>`;
    return;
  }

  const status = getMemberBudgetStatus(name, pendingAmount);
  const overText = status.projectedOver
    ? `<span class="danger-text">이번 결제까지 포함하면 ${formatWon(Math.abs(status.projectedRemaining))} 초과합니다. 저장은 가능하지만 관리자 확인이 필요합니다.</span>`
    : `<span class="muted">이번 결제 후 예상 잔액 ${status.hasLimit ? formatWon(status.projectedRemaining) : "-"}</span>`;

  els.memberBudgetHint.innerHTML = `
    <div class="${status.projectedOver || !status.hasLimit ? "warning-item" : "empty-state"}">
      <strong>${escapeHtml(name)} 선생님 AI 구독료 현황</strong>
      <span>
        가능금액 ${status.hasLimit ? formatWon(status.limit) : "미설정"} ·
        기존 사용액 ${formatWon(status.used)} ·
        현재 잔액 ${status.hasLimit ? formatWon(status.remaining) : "-"}
      </span>
      <br>${overText}
    </div>
  `;
}

function renderMyStatus() {
  if (!els.myBudgetSummary || !els.myExpenseRows) return;

  const name = authState.profile?.name || els.memberSubmitForm?.elements.submitter?.value || "";
  const normalizedName = normalizeSubmitterName(name);
  const rows = isRemoteMode
    ? state.entries
    : state.entries.filter((entry) => !name || normalizeSubmitterName(entry.submitter) === normalizedName);
  const aiRows = rows.filter(isAiSubscriptionEntry);
  const used = aiRows.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const paid = rows.filter((entry) => entry.paid).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const total = rows.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const unpaid = total - paid;
  const budget = getMemberBudget(name);
  const limit = budget ? toNumber(budget.limit) : 0;
  const remaining = budget ? limit - used : 0;

  els.myBudgetSummary.innerHTML = [
    ["AI 구독료 가능금액", budget ? formatWon(limit) : "미설정", budget ? "" : "warning"],
    ["AI 구독료 사용액", formatWon(used)],
    ["AI 구독료 잔액", budget ? formatWon(remaining) : "-", remaining < 0 ? "danger" : ""],
    ["지급완료", formatWon(paid)],
    ["미지급", formatWon(unpaid), unpaid ? "warning" : ""]
  ].map(([label, value, className = ""]) => `
    <div class="metric ${className}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");

  if (!rows.length) {
    els.myExpenseRows.innerHTML = `<tr><td colspan="5" class="muted">아직 제출한 내역이 없습니다.</td></tr>`;
    return;
  }

  els.myExpenseRows.innerHTML = rows.map((entry) => {
    const fileNames = ATTACHMENTS
      .flatMap((attachment) => (entry.attachments[attachment.key] || []).map((file) => file.name))
      .join(", ");
    return `
      <tr>
        <td>${escapeHtml(entry.date || "-")}</td>
        <td>
          <strong>${escapeHtml(entry.vendor || entry.description || "-")}</strong>
          <div class="muted">${CATEGORIES[entry.category]?.label || ""}</div>
        </td>
        <td class="num">${formatWon(entry.amount)}</td>
        <td>${fileNames ? escapeHtml(fileNames) : `<span class="warning-pill">첨부 없음</span>`}</td>
        <td>${entry.paid ? `<span class="status-pill ok">지급완료</span><div class="muted">${escapeHtml(entry.paidDate || "")}</div>` : `<span class="status-pill warn">미지급</span>`}</td>
      </tr>
    `;
  }).join("");
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
  const memberAllocated = getAiMemberAllocatedTotal();
  if (aiSubscriptionBudget > directBudget) {
    warnings.push({
      title: "AI 구독료 배정액 확인",
      detail: `AI 구독료 배정액 ${formatWon(aiSubscriptionBudget)}이 직접성 경비 예산 ${formatWon(directBudget)}보다 큽니다.`
    });
  }
  if (memberAllocated > aiSubscriptionBudget) {
    warnings.push({
      title: "회원별 AI 구독료 가능금액 초과 배정",
      detail: `회원별 가능금액 합계 ${formatWon(memberAllocated)}이 AI 구독료 배정액 ${formatWon(aiSubscriptionBudget)}을 초과했습니다.`
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

  getAiMemberBudgetRows(getAiSubscriptionSummary().submitters).forEach((row) => {
    if (!row.hasLimit && row.used > 0) {
      warnings.push({
        title: `${row.name} AI 구독료 가능금액 미설정`,
        detail: `${row.name} 선생님의 AI 구독료 사용액 ${formatWon(row.used)}이 있지만 회원별 가능금액이 설정되지 않았습니다.`
      });
    }
    if (row.over) {
      warnings.push({
        title: `${row.name} AI 구독료 가능금액 초과`,
        detail: `${row.name} 선생님의 사용액 ${formatWon(row.used)}이 가능금액 ${formatWon(row.limit)}을 ${formatWon(Math.abs(row.remaining))} 초과했습니다.`
      });
    }
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
        <td colspan="10" class="muted">표시할 지출 내역이 없습니다.</td>
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
          ${entry.paid
            ? `<span class="status-pill ok">지급완료</span><div class="muted">${escapeHtml(entry.paidDate || "")}</div>`
            : `<span class="status-pill warn">미지급</span>`}
          <div class="row-actions payment-actions">
            <button type="button" class="small-button" onclick="togglePaid('${entry.id}')">${entry.paid ? "지급 취소" : "지급 완료"}</button>
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="small-button" onclick="viewEvidence('${entry.id}')">증빙 보기</button>
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
          <tr><th>지급완료액</th><td>${formatWon(totals.paid)}</td><th>미지급액</th><td>${formatWon(totals.unpaid)}</td></tr>
          <tr><th>정산잔액</th><td>${formatWon(totals.remaining)}</td><th>실지급 잔액</th><td>${formatWon(totals.cashRemaining)}</td></tr>
          <tr><th>이자 포함 정산잔액</th><td colspan="3">${formatWon(finalBalance)}</td></tr>
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
            <th>지급완료액</th>
            <th>미지급액</th>
            <th>잔액</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(CATEGORIES).map(([key, category]) => {
            const spent = totals.categoryTotals[key];
            const paid = totals.categoryPaidTotals[key];
            const unpaid = spent - paid;
            const limit = getCategoryBudget(key);
            return `
              <tr>
                <td>${category.label}</td>
                <td class="num">${formatWon(limit)}</td>
                <td class="num">${formatWon(spent)}</td>
                <td class="num">${formatWon(paid)}</td>
                <td class="num">${formatWon(unpaid)}</td>
                <td class="num">${formatWon(limit - spent)}</td>
                <td>${spent > limit ? "한도 초과" : ""}</td>
              </tr>
            `;
          }).join("")}
          <tr>
            <th>합계</th>
            <th class="num">${formatWon(totals.totalBudget)}</th>
            <th class="num">${formatWon(totals.spent)}</th>
            <th class="num">${formatWon(totals.paid)}</th>
            <th class="num">${formatWon(totals.unpaid)}</th>
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
            <th>지급</th>
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
                <td>${entry.paid ? `지급완료 ${escapeHtml(entry.paidDate || "")}` : "미지급"}</td>
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
          <tr><th>지급완료액</th><td class="num">${formatWon(summary.paid)}</td><th>미지급액</th><td class="num">${formatWon(summary.unpaid)}</td></tr>
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

function renderPptxCopyText() {
  if (!els.pptxCopyText) return;
  els.pptxCopyText.textContent = buildPptxCopyText();
}

function buildPptxCopyText() {
  const totals = getTotals();
  const project = state.project;
  const today = new Date();
  const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const lines = [];

  lines.push("[1쪽 표지]");
  lines.push(`학교명\t${project.school || ""}`);
  lines.push(`학교장 성명\t${project.principalName || ""}`);
  lines.push(`학교 주소\t${project.schoolAddress || ""}`);
  lines.push(`학교 대표 전화 번호\t${project.schoolPhone || ""}`);
  lines.push(`담당자 성명\t${project.managerName || ""}`);
  lines.push(`휴대전화\t${project.managerPhone || ""}`);
  lines.push(`이메일 주소\t${project.managerEmail || ""}`);
  lines.push(`운영비\t${totals.totalBudget}`);
  lines.push(`집행액\t${totals.spent}`);
  lines.push(`집행잔액\t${totals.remaining}`);
  lines.push(`이자\t${toNumber(project.interest)}`);
  lines.push(`제출일\t${dateLabel}`);
  lines.push("");

  lines.push("[2쪽 운영비 실적 총괄표]");
  lines.push(["순번", "예산 구분", "총 소요 예산", "비고"].join("\t"));
  Object.entries(CATEGORIES).forEach(([key, category], index) => {
    lines.push([
      index + 1,
      category.pptLabel,
      totals.categoryTotals[key] || 0,
      getCategoryNote(key)
    ].join("\t"));
  });
  lines.push(["합계", "", totals.spent, ""].join("\t"));
  lines.push("");

  Object.entries(CATEGORIES).forEach(([key, category]) => {
    lines.push(`[${category.pptLabel} 지출 세부 내역]`);
    lines.push(["No", "예산 구분", "지출 일자", "세부 내역", "소요 예산(원)"].join("\t"));
    const rows = state.entries.filter((entry) => entry.category === key);
    if (rows.length) {
      rows.forEach((entry, index) => {
        lines.push([
          index + 1,
          category.pptLabel,
          formatPptDate(entry.date),
          entry.description || entry.itemName || "",
          toNumber(entry.amount)
        ].join("\t"));
      });
    } else {
      lines.push([1, category.pptLabel, "", "", 0].join("\t"));
    }
    lines.push(["합계", "", "", "", rows.reduce((sum, entry) => sum + toNumber(entry.amount), 0)].join("\t"));
    lines.push("");

    lines.push(`[${category.pptLabel} 증빙자료 목록]`);
    lines.push(["증빙번호", "지급처", "품명", "첨부 파일", "지급 상태"].join("\t"));
    rows.forEach((entry) => {
      const fileNames = ATTACHMENTS.flatMap((attachment) => {
        return (entry.attachments[attachment.key] || []).map((file) => `${attachment.label}: ${file.name}`);
      });
      lines.push([
        entry.evidenceNo || entry.id,
        entry.vendor || "",
        entry.itemName || "",
        fileNames.join(", "),
        entry.paid ? `지급완료 ${entry.paidDate || ""}` : "미지급"
      ].join("\t"));
    });
    lines.push("");
  });

  lines.push("[메모]");
  lines.push("원본 PPTX 양식의 파란색 안내 문구는 최종 제출 전 삭제합니다.");
  lines.push("영수증 이미지는 검토 탭의 증빙 보기에서 원본을 확인한 뒤 PPTX 해당 증빙자료 영역에 붙여넣습니다.");
  return lines.join("\n");
}

function getCategoryNote(categoryKey) {
  if (categoryKey === "research") return "50% 이내";
  if (categoryKey === "meeting") return "10% 이내";
  if (categoryKey === "training") return "";
  if (categoryKey === "direct") return "AI 구독료 포함";
  return "";
}

function formatPptDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!match) return date || "";
  return `${match[1].slice(2)}.${match[2]}.${match[3]}`;
}

async function copyPptxText() {
  const text = buildPptxCopyText();
  try {
    await navigator.clipboard.writeText(text);
    flashButton(document.querySelector("#copyPptxButton"), "복사됨");
  } catch {
    els.pptxCopyText.textContent = text;
    alert("자동 복사가 막혔습니다. 아래 붙여넣기용 데이터를 직접 선택해서 복사하세요.");
  }
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
            <th>지급 상태</th>
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
              <td>${entry.paid ? `지급완료 ${escapeHtml(entry.paidDate || "")}` : "미지급"}</td>
              <td class="num">${formatWon(entry.amount)}</td>
            </tr>
          `).join("") : `<tr><td colspan="9">해당 항목 지출 내역 없음</td></tr>`}
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
  if (categoryKey === "training") {
    return ["상세 품목·단가가 적힌 지출 내역서", "신용카드 매출전표 또는 세금계산서"];
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
  const imageOnly = key === "photo";
  if (!validateAttachmentSelection(files, draftAttachments, key, { imageOnly })) {
    input.value = "";
    draftAttachments[key] = [];
    renderDraftPreview();
    return;
  }
  draftAttachments[key] = await Promise.all(files.map(readFileAsDataUrl));
  renderDraftPreview();
}

async function handleMemberAttachmentChange(event) {
  const input = event.target;
  const key = input.dataset.memberAttachmentKey;
  const files = Array.from(input.files || []);
  if (!validateAttachmentSelection(files, draftMemberAttachments, key)) {
    input.value = "";
    draftMemberAttachments[key] = [];
    renderMemberPreview();
    return;
  }
  draftMemberAttachments[key] = await Promise.all(files.map(readFileAsDataUrl));
  renderMemberPreview();
}

function validateAttachmentSelection(files, draft, currentKey, options = {}) {
  const imageOnly = Boolean(options.imageOnly);
  const invalidFile = files.find((file) => !isAllowedAttachmentFile(file, imageOnly));
  if (invalidFile) {
    alert(`${invalidFile.name} 파일 형식을 확인하세요.\n${imageOnly ? "사진 첨부는 JPG, PNG, WebP만 가능합니다." : "첨부 파일은 JPG, PNG, WebP, PDF만 가능합니다."}`);
    return false;
  }

  const oversizedFile = files.find((file) => toNumber(file.size) > MAX_ATTACHMENT_FILE_SIZE);
  if (oversizedFile) {
    alert(`${oversizedFile.name} 파일이 ${formatBytes(MAX_ATTACHMENT_FILE_SIZE)}를 초과합니다.\n파일 1개당 최대 ${formatBytes(MAX_ATTACHMENT_FILE_SIZE)}까지 첨부할 수 있습니다.`);
    return false;
  }

  const otherTotal = Object.entries(draft).reduce((sum, [key, draftFiles]) => {
    return key === currentKey ? sum : sum + getFilesSize(draftFiles);
  }, 0);
  const selectedTotal = getFilesSize(files);
  const nextTotal = otherTotal + selectedTotal;
  if (nextTotal > MAX_ATTACHMENT_TOTAL_SIZE) {
    alert(`첨부 파일 전체 용량이 ${formatBytes(MAX_ATTACHMENT_TOTAL_SIZE)}를 초과합니다.\n현재 선택 후 총 용량은 ${formatBytes(nextTotal)}입니다.`);
    return false;
  }

  return true;
}

function isAllowedAttachmentFile(file, imageOnly = false) {
  const type = String(file.type || "").toLowerCase();
  const extension = getFileExtension(file.name);
  const allowedTypes = imageOnly ? ALLOWED_IMAGE_TYPES : ALLOWED_ATTACHMENT_TYPES;
  const allowedExtensions = imageOnly ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_ATTACHMENT_EXTENSIONS;
  return allowedTypes.has(type) || allowedExtensions.has(extension);
}

function getFileExtension(name) {
  const normalized = String(name || "").toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index === -1 ? "" : normalized.slice(index + 1);
}

function getFilesSize(files) {
  return (files || []).reduce((sum, file) => sum + toNumber(file.size), 0);
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

async function handleMemberSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const receiptFiles = draftMemberAttachments.receiptBundle || [];
  const krwCardSlipFiles = draftMemberAttachments.krwCardSlip || [];

  if (!receiptFiles.length) {
    alert("AI 서비스 영수증(외화영수증)을 첨부하세요.");
    return;
  }

  if (!krwCardSlipFiles.length) {
    alert("카드사 원화전표를 첨부하세요.");
    return;
  }

  const vendor = data.get("vendor").trim();
  const amount = toNumber(data.get("amount"));
  const budgetStatus = getMemberBudgetStatus(data.get("submitter"), amount);
  const attachments = emptyAttachments();
  attachments.cardReceipt = receiptFiles;
  attachments.foreignReceipt = draftMemberAttachments.foreignReceipt || [];
  attachments.krwCardSlip = krwCardSlipFiles;

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
    paid: false,
    paidDate: "",
    notes: data.get("notes").trim(),
    attachments
  };

  try {
    if (isRemoteMode) {
      await createMemberAiExpense(authState.profile, entry);
      await loadRemoteState();
    } else {
      state.entries.push(entry);
    }
  } catch (error) {
    console.error(error);
    alert("제출 저장 또는 영수증 업로드에 실패했습니다. 파일 크기와 로그인 상태를 확인하세요.");
    return;
  }
  saveLocal({ silent: true });
  resetMemberForm();
  renderAll();
  activateTab(authState.profile?.role === "member" ? "memberStatus" : "aiUsage");

  if (!budgetStatus.hasLimit) {
    alert("해당 회원의 AI 구독료 가능금액이 아직 설정되지 않았습니다. 제출은 저장되었고 관리자 확인이 필요합니다.");
  } else if (budgetStatus.projectedOver) {
    alert(`제출은 저장되었습니다. 다만 회원별 가능금액을 ${formatWon(Math.abs(budgetStatus.projectedRemaining))} 초과합니다.`);
  }
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
    paid: editingId ? Boolean(state.entries.find((item) => item.id === editingId)?.paid) : false,
    paidDate: editingId ? state.entries.find((item) => item.id === editingId)?.paidDate || "" : "",
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
  syncMemberIdentityFields();
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

window.togglePaid = async function togglePaid(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  let nextPaid;
  if (entry.paid) {
    const ok = confirm(`${entry.evidenceNo || entry.id} 지급 완료 표시를 취소할까요?`);
    if (!ok) return;
    nextPaid = false;
  } else {
    nextPaid = true;
  }

  if (isRemoteMode) {
    await updateRemotePaid(id, nextPaid);
    await loadRemoteState();
  } else {
    entry.paid = nextPaid;
    entry.paidDate = nextPaid ? new Date().toISOString().slice(0, 10) : "";
  }
  saveLocal({ silent: true });
  renderAll();
};

window.viewEvidence = function viewEvidence(id) {
  selectedEvidenceEntryId = id;
  renderEvidencePanel();
  els.evidencePanel.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.closeEvidence = function closeEvidence() {
  selectedEvidenceEntryId = "";
  renderEvidencePanel();
};

function renderEvidencePanel() {
  if (!els.evidencePanel) return;

  if (!selectedEvidenceEntryId) {
    els.evidencePanel.innerHTML = `
      <div class="empty-state">검토 표에서 증빙 보기를 누르면 첨부 원본 미리보기가 여기에 표시됩니다.</div>
    `;
    return;
  }

  const entry = state.entries.find((item) => item.id === selectedEvidenceEntryId);
  if (!entry) {
    selectedEvidenceEntryId = "";
    renderEvidencePanel();
    return;
  }

  const grouped = ATTACHMENTS.map((attachment) => ({
    ...attachment,
    files: entry.attachments?.[attachment.key] || []
  })).filter((attachment) => attachment.files.length);

  els.evidencePanel.innerHTML = `
    <section class="evidence-viewer">
      <div class="section-heading compact-heading">
        <div>
          <h3 class="section-subtitle">${escapeHtml(entry.evidenceNo || entry.id)} 증빙 원본</h3>
          <p>${escapeHtml(entry.submitter || "-")} · ${escapeHtml(entry.description || "-")} · ${formatWon(entry.amount)}</p>
        </div>
        <button type="button" class="ghost-button" onclick="closeEvidence()">닫기</button>
      </div>
      ${grouped.length ? grouped.map(renderEvidenceGroup).join("") : `<div class="empty-state">첨부된 증빙 파일이 없습니다.</div>`}
    </section>
  `;
}

function renderEvidenceGroup(group) {
  return `
    <div class="evidence-group">
      <h4>${escapeHtml(group.label)}</h4>
      <div class="evidence-grid">
        ${group.files.map((file) => renderEvidenceFile(file, group.label)).join("")}
      </div>
    </div>
  `;
}

function renderEvidenceFile(file, label) {
  const name = escapeHtml(file.name || "첨부 파일");
  const hasData = Boolean(file.dataUrl);
  const media = hasData && file.type?.startsWith("image/")
    ? `<img src="${file.dataUrl}" alt="">`
    : hasData && file.type === "application/pdf"
      ? `<iframe src="${file.dataUrl}" title="${name}"></iframe>`
      : `<div class="file-placeholder">미리보기 데이터 없음</div>`;
  const download = hasData
    ? `<a class="small-button evidence-download" href="${file.dataUrl}" download="${name}">다운로드</a>`
    : "";

  return `
    <article class="evidence-file">
      ${media}
      <div class="evidence-file-meta">
        <strong>${escapeHtml(label)}</strong>
        <span>${name}</span>
        <span>${formatBytes(file.size)}</span>
        ${download}
      </div>
    </article>
  `;
}

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
      const hasOfficialServiceReceipt = entry.directType === "ai_subscription" && hasAttachment(entry, "cardReceipt");
      const hasForeignReceipt = hasAttachment(entry, "foreignReceipt");
      const hasKrwCardSlip = hasAttachment(entry, "krwCardSlip");
      if (!hasForeignReceipt && !hasOfficialServiceReceipt) {
        warnings.push("해외 AI 툴 결제는 외화영수증 또는 서비스 공식 영수증 첨부를 확인하세요.");
      }
      if (!hasKrwCardSlip) warnings.push("해외 AI 툴 결제는 국내카드사원화전표가 필요합니다.");
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

function formatBytes(value) {
  const bytes = toNumber(value);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJsArg(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}
