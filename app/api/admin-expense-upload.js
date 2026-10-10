import { createClient } from "@supabase/supabase-js";
const FILE_TYPES = new Set([
  "cardReceipt",
  "transferConfirmation",
  "transactionStatement",
  "foreignReceipt",
  "krwCardSlip",
  "meetingMinutes",
  "photo",
]);
export default async function handler(request, response) {
  const send = (status, body) => response.status(status).json(body);
  if (request.method !== "POST")
    return send(405, { error: "POST만 지원합니다." });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret)
    return send(503, { error: "서버 업로드 설정이 필요합니다." });
  const token = /^Bearer (.+)$/.exec(request.headers.authorization || "")?.[1];
  if (!token) return send(401, { error: "로그인이 필요합니다." });
  try {
    const session = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await session.auth.getUser(token);
    if (error || !data.user) return send(401, { error: "세션을 확인하세요." });
    const profile = await session
      .from("profiles")
      .select("club_id, role, active")
      .eq("id", data.user.id)
      .single();
    if (
      profile.error ||
      profile.data.role !== "admin" ||
      profile.data.active === false
    )
      return send(403, { error: "관리자 권한이 필요합니다." });
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body || {};
    if (
      !FILE_TYPES.has(body.fileType) ||
      !/^[0-9a-f-]{36}$/i.test(body.expenseId || "")
    )
      return send(400, { error: "첨부 정보를 확인하세요." });
    const expense = await session
      .from("expenses")
      .select("id,club_id,user_id")
      .eq("id", body.expenseId)
      .eq("club_id", profile.data.club_id)
      .single();
    if (expense.error)
      return send(404, { error: "해당 동아리의 지출을 찾을 수 없습니다." });
    const name = String(body.name || "file")
      .replace(/[^\w.\-]/g, "_")
      .slice(-100);
    const path = `${expense.data.club_id}/${expense.data.user_id}/${expense.data.id}/${body.fileType}-${crypto.randomUUID()}-${name}`;
    const service = createClient(url, secret, {
      auth: { persistSession: false },
    });
    const signed = await service.storage
      .from("receipts")
      .createSignedUploadUrl(path);
    if (signed.error) throw signed.error;
    return send(200, { path, token: signed.data.token });
  } catch {
    return send(400, { error: "첨부 업로드 준비에 실패했습니다." });
  }
}
