import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

export { hasSupabaseConfig };

export async function getCurrentSession() {
  if (!hasSupabaseConfig) return { session: null, user: null, profile: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.user) return { session: null, user: null, profile: null };
  const profile = await getProfile(session.user.id);
  return { session, user: session.user, profile };
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = data.user ? await getProfile(data.user.id) : null;
  return { session: data.session, user: data.user, profile };
}

export async function signOut() {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!hasSupabaseConfig) return { unsubscribe() {} };
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const profile = session?.user ? await getProfile(session.user.id) : null;
    callback({ session, user: session?.user || null, profile });
  });
  return data.subscription;
}

export async function getProfile(userId) {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, club_id, email, name, role, active")
    .eq("id", userId)
    .single();
  if (error?.message?.includes("column") && (error.message.includes("active") || error.message.includes("email"))) {
    const fallback = await supabase
      .from("profiles")
      .select("id, club_id, name, role")
      .eq("id", userId)
      .single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) {
    throw new Error(`로그인은 되었지만 사용자 프로필을 찾지 못했습니다. Supabase profiles 설정을 확인하세요. (${error.message})`);
  }
  if (data.active === false) {
    throw new Error("비활성화된 계정입니다. 관리자에게 문의하세요.");
  }
  return data;
}

export async function fetchClubState(profile) {
  if (!profile?.club_id) throw new Error("프로필에 club_id가 없습니다.");

  const [settingsResult, expensesResult, budgetsResult, filesResult] = await Promise.all([
    supabase.from("project_settings").select("*").eq("club_id", profile.club_id).single(),
    profile.role === "admin"
      ? supabase.from("expenses").select("*").eq("club_id", profile.club_id).order("expense_date", { ascending: true })
      : supabase.from("expenses").select("*").eq("user_id", profile.id).order("expense_date", { ascending: true }),
    supabase.from("ai_member_budgets").select("*").eq("club_id", profile.club_id).order("member_name", { ascending: true }),
    profile.role === "admin"
      ? supabase.from("expense_files").select("*").eq("club_id", profile.club_id)
      : supabase.from("expense_files").select("*").eq("user_id", profile.id)
  ]);

  [settingsResult, expensesResult, budgetsResult, filesResult].forEach((result) => {
    if (result.error) throw result.error;
  });

  const files = await attachSignedFileUrls(filesResult.data || []);

  return mapSupabaseToAppState({
    settings: settingsResult.data,
    expenses: expensesResult.data || [],
    budgets: budgetsResult.data || [],
    files
  });
}

export async function updatePaid(expenseId, paid) {
  const { error } = await supabase
    .from("expenses")
    .update({ paid, paid_at: paid ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", expenseId);
  if (error) throw error;
}

export async function deleteExpense(profile, entry) {
  if (!profile?.club_id) throw new Error("프로필에 club_id가 없습니다.");
  if (profile.role !== "admin") throw new Error("관리자만 지출 내역을 삭제할 수 있습니다.");
  if (!entry?.id) throw new Error("삭제할 지출 내역을 찾지 못했습니다.");

  const storagePaths = Array.from(new Set(
    flattenAttachmentFiles(entry.attachments)
      .map((file) => file.storagePath)
      .filter(Boolean)
  ));

  for (let index = 0; index < storagePaths.length; index += 100) {
    const chunk = storagePaths.slice(index, index + 100);
    const { error } = await supabase.storage.from("receipts").remove(chunk);
    if (error) throw error;
  }

  const { error: filesError } = await supabase
    .from("expense_files")
    .delete()
    .eq("club_id", profile.club_id)
    .eq("expense_id", entry.id);
  if (filesError) throw filesError;

  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("club_id", profile.club_id)
    .eq("id", entry.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("삭제할 지출 내역을 찾지 못했거나 삭제 권한이 없습니다.");
}

export async function createMemberAiExpense(profile, entry) {
  const expensePayload = {
    club_id: profile.club_id,
    user_id: profile.id,
    submitter: entry.submitter,
    school: entry.school,
    club_name: entry.clubName,
    category: "direct",
    direct_type: "ai_subscription",
    status: "submitted",
    expense_date: entry.date || null,
    description: entry.description,
    amount: entry.amount,
    item_name: entry.itemName,
    vendor: entry.vendor,
    unit: entry.unit,
    quantity: entry.quantity,
    unit_price: entry.unitPrice,
    payment_method: entry.paymentMethod,
    evidence_no: entry.evidenceNo || "",
    notes: entry.notes || "",
    paid: false,
    paid_at: null
  };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert(expensePayload)
    .select("*")
    .single();
  if (error) throw error;

  const files = flattenAttachmentFiles(entry.attachments);
  const fileRows = [];
  for (const file of files) {
    if (!file.dataUrl) continue;
    const safeName = sanitizePathPart(file.name || "receipt");
    const storagePath = `${profile.club_id}/${profile.id}/${expense.id}/${file.fileType}-${Date.now()}-${safeName}`;
    const blob = dataUrlToBlob(file.dataUrl, file.type);
    const upload = await supabase.storage
      .from("receipts")
      .upload(storagePath, blob, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) throw upload.error;

    fileRows.push({
      expense_id: expense.id,
      club_id: profile.club_id,
      user_id: profile.id,
      file_type: file.fileType,
      file_name: file.name || "receipt",
      storage_path: storagePath,
      mime_type: file.type || "",
      file_size: file.size || 0
    });
  }

  if (fileRows.length) {
    const insertFiles = await supabase.from("expense_files").insert(fileRows);
    if (insertFiles.error) throw insertFiles.error;
  }

  return expense;
}

export async function saveMemberBudget(profile, budget) {
  const payload = {
    club_id: profile.club_id,
    member_name: budget.name,
    limit_amount: budget.limit,
    notes: budget.notes || ""
  };
  const { error } = await supabase
    .from("ai_member_budgets")
    .upsert(payload, { onConflict: "club_id,member_name" });
  if (error) throw error;
}

export async function deleteMemberBudget(profile, name) {
  const { error } = await supabase
    .from("ai_member_budgets")
    .delete()
    .eq("club_id", profile.club_id)
    .eq("member_name", name);
  if (error) throw error;
}

export async function fetchAdminMembers() {
  return requestAdminMembers("GET");
}

export async function saveAdminMember(member) {
  return requestAdminMembers(member.id ? "PATCH" : "POST", member);
}

export async function bulkSaveAdminMembers(members) {
  return requestAdminMembers("POST", { action: "bulkUpsert", members });
}

export async function removeAdminMember({ id, mode = "deactivate", force = false }) {
  return requestAdminMembers("DELETE", { id, mode, force });
}

async function requestAdminMembers(method, body) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch("/api/admin-members", {
      method,
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("회원 관리 API 응답이 지연되고 있습니다. Vercel 배포 환경에서 다시 확인하세요.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "회원 관리 API 호출에 실패했습니다.");
  return result;
}

async function attachSignedFileUrls(files) {
  const paths = files
    .map((file) => file.storage_path)
    .filter(Boolean);

  if (!paths.length) return files;

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    console.warn("Supabase Storage signed URL 생성 실패", error);
    return files;
  }

  const signedUrlByPath = new Map((data || []).map((item) => [item.path, item.signedUrl]));
  return files.map((file) => ({
    ...file,
    signed_url: signedUrlByPath.get(file.storage_path) || ""
  }));
}

function mapSupabaseToAppState({ settings, expenses, budgets, files }) {
  const filesByExpense = new Map();
  files.forEach((file) => {
    if (!filesByExpense.has(file.expense_id)) filesByExpense.set(file.expense_id, []);
    filesByExpense.get(file.expense_id).push(file);
  });

  return {
    project: {
      name: "2026 AI 디지털 교사 동아리",
      school: settings.school || "",
      clubName: settings.club_name || "",
      principalName: settings.principal_name || "",
      schoolAddress: settings.school_address || "",
      schoolPhone: settings.school_phone || "",
      managerName: settings.manager_name || "",
      managerPhone: settings.manager_phone || "",
      managerEmail: settings.manager_email || "",
      interest: settings.interest || 0,
      totalBudget: settings.total_budget || 0,
      researchBudget: settings.research_budget || 0,
      trainingBudget: settings.training_budget || 0,
      directBudget: settings.direct_budget || 0,
      meetingBudget: settings.meeting_budget || 0,
      aiSubscriptionBudget: settings.ai_subscription_budget || 0
    },
    aiSubscriptionMembers: budgets.map((budget) => ({
      name: budget.member_name,
      limit: budget.limit_amount,
      notes: budget.notes || ""
    })),
    entries: expenses.map((expense) => mapExpense(expense, filesByExpense.get(expense.id) || []))
  };
}

function mapExpense(expense, files) {
  const attachments = {
    cardReceipt: [],
    transferConfirmation: [],
    transactionStatement: [],
    foreignReceipt: [],
    krwCardSlip: [],
    meetingMinutes: [],
    photo: []
  };

  files.forEach((file) => {
    if (!attachments[file.file_type]) attachments[file.file_type] = [];
    attachments[file.file_type].push({
      name: file.file_name,
      type: file.mime_type,
      size: file.file_size,
      dataUrl: file.signed_url || "",
      storagePath: file.storage_path
    });
  });

  return {
    id: expense.id,
    submitter: expense.submitter,
    school: expense.school,
    clubName: expense.club_name,
    category: expense.category,
    directType: expense.direct_type,
    status: expense.status,
    date: expense.expense_date || "",
    description: expense.description,
    amount: expense.amount,
    itemName: expense.item_name,
    vendor: expense.vendor,
    unit: expense.unit,
    quantity: Number(expense.quantity || 0),
    unitPrice: expense.unit_price,
    paymentMethod: expense.payment_method,
    evidenceNo: expense.evidence_no,
    paid: expense.paid,
    paidDate: expense.paid_at || "",
    notes: expense.notes,
    attachments
  };
}

function flattenAttachmentFiles(attachments) {
  return Object.entries(attachments || {}).flatMap(([fileType, files]) => {
    return (files || []).map((file) => ({ ...file, fileType }));
  });
}

function dataUrlToBlob(dataUrl, fallbackType = "application/octet-stream") {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(header || "");
  const mimeType = mimeMatch?.[1] || fallbackType;
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function sanitizePathPart(value) {
  return String(value)
    .normalize("NFC")
    .replace(/[\\/#?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}
