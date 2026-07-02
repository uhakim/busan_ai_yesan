import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8"
};

const ROLE_SET = new Set(["admin", "member"]);

export const config = {
  maxDuration: 60
};

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
    response.setHeader("access-control-allow-headers", "authorization,content-type");
    response.end();
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(response, 500, { error: "Vercel 환경변수 SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 확인하세요." });
    return;
  }

  const authHeader = request.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    sendJson(response, 401, { error: "로그인이 필요합니다." });
    return;
  }

  const sessionClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const authResult = await sessionClient.auth.getUser(token);
  if (authResult.error || !authResult.data.user) {
    sendJson(response, 401, { error: "로그인 세션을 확인하지 못했습니다." });
    return;
  }

  const adminProfile = await getAdminProfile(sessionClient, authResult.data.user);
  if (!adminProfile) {
    sendJson(response, 403, {
      error: "관리자 권한이 필요합니다.",
      detail: "profiles에서 로그인 사용자와 연결된 활성 관리자 프로필을 찾지 못했습니다."
    });
    return;
  }

  try {
    if (request.method === "GET") {
      const members = await listMembers(sessionClient, adminProfile.club_id);
      sendJson(response, 200, { members });
      return;
    }

    if (!serviceRoleKey) {
      sendJson(response, 500, { error: "Vercel 환경변수 SUPABASE_SERVICE_ROLE_KEY를 확인하세요." });
      return;
    }
    const serviceKeyRole = getJwtRole(serviceRoleKey);
    if (serviceKeyRole && serviceKeyRole !== "service_role") {
      sendJson(response, 500, {
        error: "SUPABASE_SERVICE_ROLE_KEY가 service_role 키가 아닙니다.",
        detail: `현재 Vercel에 들어간 키 역할은 ${serviceKeyRole}입니다. Supabase Project API keys의 legacy service_role 키를 넣고 재배포하세요.`
      });
      return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await readBody(request);

    if (request.method === "POST") {
      if (body.action === "bulkUpsert") {
        const result = await bulkUpsertMembers(sessionClient, adminClient, adminProfile, body.members || []);
        sendJson(response, 200, result);
        return;
      }
      const member = await upsertMember(sessionClient, adminClient, adminProfile, body);
      sendJson(response, 200, { member });
      return;
    }

    if (request.method === "PATCH") {
      const member = await updateMember(sessionClient, adminClient, adminProfile, body);
      sendJson(response, 200, { member });
      return;
    }

    if (request.method === "DELETE") {
      const result = await deleteMember(sessionClient, adminClient, adminProfile, body);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 405, { error: "지원하지 않는 메서드입니다." });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message || "회원 관리 처리 중 오류가 발생했습니다." });
  }
}

async function getAdminProfile(client, user) {
  const { data, error } = await client
    .from("profiles")
    .select("id, club_id, email, name, role, active")
    .eq("id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!error && data?.club_id && data.active !== false) return data;

  const email = user.email || "";
  if (!email) return null;
  const fallback = await client
    .from("profiles")
    .select("id, club_id, email, name, role, active")
    .eq("email", email)
    .eq("role", "admin")
    .maybeSingle();
  if (fallback.error || !fallback.data?.club_id || fallback.data.active === false) return null;
  return fallback.data;
}

async function listMembers(client, clubId) {
  const [{ data: profiles, error: profilesError }, { data: budgets, error: budgetsError }, { data: expenseRows, error: expensesError }] = await Promise.all([
    client.from("profiles").select("id, club_id, email, name, role, active, disabled_at, updated_at, created_at").eq("club_id", clubId).order("name", { ascending: true }),
    client.from("ai_member_budgets").select("user_id, member_name, limit_amount, notes").eq("club_id", clubId),
    client.from("expenses").select("user_id, amount").eq("club_id", clubId)
  ]);

  if (profilesError) throw profilesError;
  if (budgetsError) throw budgetsError;
  if (expensesError) throw expensesError;

  const budgetByUserId = new Map();
  const budgetByName = new Map();
  (budgets || []).forEach((budget) => {
    if (budget.user_id) budgetByUserId.set(budget.user_id, budget);
    budgetByName.set(normalizeName(budget.member_name), budget);
  });

  const totalsByUserId = new Map();
  (expenseRows || []).forEach((expense) => {
    totalsByUserId.set(expense.user_id, (totalsByUserId.get(expense.user_id) || 0) + Number(expense.amount || 0));
  });

  return (profiles || []).map((profile) => {
    const budget = budgetByUserId.get(profile.id) || budgetByName.get(normalizeName(profile.name));
    const used = totalsByUserId.get(profile.id) || 0;
    return {
      id: profile.id,
      email: profile.email || "",
      name: profile.name || "",
      role: profile.role,
      active: profile.active !== false,
      disabledAt: profile.disabled_at || "",
      aiLimit: Number(budget?.limit_amount || 0),
      notes: budget?.notes || "",
      used,
      canHardDelete: used === 0
    };
  });
}

async function upsertMember(dataClient, authClient, adminProfile, input, options = {}) {
  const member = normalizeMemberInput(input);

  let userId = member.id || "";
  if (!userId) {
    const existing = options.authUsersByEmail?.get(member.email) || await findUserByEmail(authClient, member.email);
    if (existing) {
      userId = existing.id;
      await updateAuthUser(authClient, userId, member);
    } else {
      if (!member.password) {
        throw makeError("신규 회원은 임시 비밀번호가 필요합니다.", 400);
      }
      const createResult = await authClient.auth.admin.createUser({
        email: member.email,
        password: member.password,
        email_confirm: true,
        user_metadata: { name: member.name }
      });
      if (createResult.error) throw createResult.error;
      userId = createResult.data.user.id;
      options.authUsersByEmail?.set(member.email, createResult.data.user);
    }
  } else {
    await updateAuthUser(authClient, userId, member);
  }

  await syncMemberRows(dataClient, adminProfile.club_id, userId, member);
  if (options.returnMember === false) {
    return { id: userId, name: member.name, email: member.email };
  }
  const members = await listMembers(dataClient, adminProfile.club_id);
  return members.find((row) => row.id === userId);
}

async function updateMember(dataClient, authClient, adminProfile, input) {
  const userId = cleanText(input.id);
  if (!userId) throw makeError("회원 id가 없습니다.", 400);

  const current = await getClubProfile(dataClient, adminProfile.club_id, userId);
  if (!current) throw makeError("해당 회원을 찾지 못했습니다.", 404);

  const member = normalizeMemberInput({
    ...input,
    email: input.email || current.email,
    name: input.name || current.name,
    role: input.role || current.role,
    active: input.active === undefined ? current.active : input.active
  });

  await updateAuthUser(authClient, userId, member);
  await syncMemberRows(dataClient, adminProfile.club_id, userId, member, current.name);

  const members = await listMembers(dataClient, adminProfile.club_id);
  return members.find((row) => row.id === userId);
}

async function bulkUpsertMembers(dataClient, authClient, adminProfile, rows) {
  if (!Array.isArray(rows) || !rows.length) throw makeError("업로드할 회원 행이 없습니다.", 400);
  if (rows.length > 100) throw makeError("한 번에 최대 100명까지 업로드할 수 있습니다.", 400);

  const results = [];
  const authUsersByEmail = await listAuthUsersByEmail(authClient);
  for (const row of rows) {
    try {
      const member = await upsertMember(dataClient, authClient, adminProfile, row, {
        authUsersByEmail,
        returnMember: false
      });
      results.push({ ok: true, email: row.email, id: member?.id || "", name: member?.name || "" });
    } catch (error) {
      results.push({ ok: false, email: row.email || "", name: row.name || "", error: error.message || "실패" });
    }
  }

  return {
    results,
    members: await listMembers(dataClient, adminProfile.club_id)
  };
}

async function deleteMember(dataClient, authClient, adminProfile, input) {
  const userId = cleanText(input.id);
  const mode = input.mode === "hard" ? "hard" : "deactivate";
  const force = input.force === true;
  if (!userId) throw makeError("회원 id가 없습니다.", 400);
  if (userId === adminProfile.id) throw makeError("현재 로그인한 관리자는 삭제할 수 없습니다.", 400);

  const current = await getClubProfile(dataClient, adminProfile.club_id, userId);
  if (!current) throw makeError("해당 회원을 찾지 못했습니다.", 404);

  const { data: expenses, error: expensesError } = await dataClient
    .from("expenses")
    .select("id")
    .eq("club_id", adminProfile.club_id)
    .eq("user_id", userId);
  if (expensesError) throw expensesError;
  const hasExpenses = Boolean(expenses?.length);

  if (mode === "hard") {
    if (hasExpenses && !force) {
      throw makeError("지출 기록이 있는 회원입니다. 먼저 비활성화하거나 강제 삭제를 다시 선택하세요.", 409);
    }

    await deleteStorageObjectsForUser(dataClient, adminProfile.club_id, userId);
    await dataClient.from("ai_member_budgets").delete().eq("club_id", adminProfile.club_id).eq("user_id", userId);
    await dataClient.from("ai_member_budgets").delete().eq("club_id", adminProfile.club_id).eq("member_name", current.name);
    await dataClient.from("expense_files").delete().eq("club_id", adminProfile.club_id).eq("user_id", userId);
    await dataClient.from("expenses").delete().eq("club_id", adminProfile.club_id).eq("user_id", userId);
    await dataClient.from("profiles").delete().eq("club_id", adminProfile.club_id).eq("id", userId);
    const deleteResult = await authClient.auth.admin.deleteUser(userId);
    if (deleteResult.error) throw deleteResult.error;
    return { deleted: true, mode, members: await listMembers(dataClient, adminProfile.club_id) };
  }

  const { error: updateError } = await dataClient
    .from("profiles")
    .update({ active: false, disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("club_id", adminProfile.club_id)
    .eq("id", userId);
  if (updateError) throw updateError;

  return { deleted: false, mode, members: await listMembers(dataClient, adminProfile.club_id) };
}

async function getClubProfile(client, clubId, userId) {
  const { data, error } = await client
    .from("profiles")
    .select("id, club_id, email, name, role, active")
    .eq("club_id", clubId)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findUserByEmail(client, email) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = (data.users || []).find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (found) return found;
    if (!data.users?.length || data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

async function listAuthUsersByEmail(client) {
  const usersByEmail = new Map();
  let page = 1;
  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    (data.users || []).forEach((user) => {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
    });
    if (!data.users?.length || data.users.length < 1000) break;
    page += 1;
  }
  return usersByEmail;
}

async function updateAuthUser(client, userId, member) {
  const updates = {
    email: member.email,
    user_metadata: { name: member.name }
  };
  if (member.password) updates.password = member.password;
  const { error } = await client.auth.admin.updateUserById(userId, updates);
  if (error) throw error;
}

async function syncMemberRows(client, clubId, userId, member, previousName = "") {
  const now = new Date().toISOString();
  const { error: profileError } = await client
    .from("profiles")
    .upsert({
      id: userId,
      club_id: clubId,
      email: member.email,
      name: member.name,
      role: member.role,
      active: member.active,
      disabled_at: member.active ? null : now,
      updated_at: now
    }, { onConflict: "id" });
  if (profileError) throw profileError;

  if (previousName && normalizeName(previousName) !== normalizeName(member.name)) {
    await client.from("ai_member_budgets").update({ member_name: member.name, updated_at: now }).eq("club_id", clubId).eq("member_name", previousName);
    await client.from("expenses").update({ submitter: member.name, updated_at: now }).eq("club_id", clubId).eq("user_id", userId);
  }

  await syncMemberBudget(client, clubId, userId, member, now);
}

async function syncMemberBudget(client, clubId, userId, member, now) {
  const { data: existingRows, error: existingError } = await client
    .from("ai_member_budgets")
    .select("id")
    .eq("club_id", clubId)
    .or(`user_id.eq.${userId},member_name.eq.${escapePostgrestValue(member.name)}`);
  if (existingError) throw existingError;

  const existingId = existingRows?.[0]?.id;
  const payload = {
    user_id: userId,
    member_name: member.name,
    limit_amount: member.aiLimit,
    notes: member.notes || "",
    updated_at: now
  };

  if (existingId) {
    const { error } = await client
      .from("ai_member_budgets")
      .update(payload)
      .eq("id", existingId);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("ai_member_budgets")
    .insert({ ...payload, club_id: clubId });
  if (error) throw error;
}

async function deleteStorageObjectsForUser(client, clubId, userId) {
  const prefix = `${clubId}/${userId}/`;
  const paths = await listStoragePaths(client, "receipts", prefix);
  if (paths.length) {
    const { error } = await client.storage.from("receipts").remove(paths);
    if (error) throw error;
  }
}

async function listStoragePaths(client, bucket, prefix) {
  const parts = prefix.split("/").filter(Boolean);
  let paths = [];
  async function walk(path) {
    const { data, error } = await client.storage.from(bucket).list(path, { limit: 1000 });
    if (error) throw error;
    for (const item of data || []) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.id) paths.push(itemPath);
      else paths = paths.concat(await walk(itemPath));
    }
    return [];
  }
  await walk(parts.join("/"));
  return paths;
}

function normalizeMemberInput(input) {
  const email = cleanText(input.email).toLowerCase();
  const name = cleanText(input.name);
  const role = cleanText(input.role || "member");
  if (!email || !email.includes("@")) throw makeError("이메일을 확인하세요.", 400);
  if (!name) throw makeError("이름을 입력하세요.", 400);
  if (!ROLE_SET.has(role)) throw makeError("역할은 admin 또는 member만 가능합니다.", 400);
  return {
    id: cleanText(input.id),
    email,
    name,
    role,
    aiLimit: Math.max(0, Number.parseInt(input.aiLimit ?? input.ai_limit ?? input.limit ?? 0, 10) || 0),
    password: cleanText(input.password),
    notes: cleanText(input.notes),
    active: input.active === undefined ? true : input.active !== false && input.active !== "false"
  };
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return cleanText(value).replace(/\s+/g, "");
}

function escapePostgrestValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(")", "\\)");
}

async function readBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === "string") return request.body ? JSON.parse(request.body) : {};
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(JSON.stringify(payload));
}

function makeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getJwtRole(key) {
  const parts = String(key || "").split(".");
  if (parts.length < 2) return "";
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload.role || "";
  } catch {
    return "";
  }
}
