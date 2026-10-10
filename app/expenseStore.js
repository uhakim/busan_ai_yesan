import { packNotes } from "./meeting.js";

export function expensePayload(profile, entry) {
  return {
    club_id: profile.club_id,
    user_id: profile.id,
    submitter: entry.submitter,
    school: entry.school,
    club_name: entry.clubName,
    category: entry.category,
    direct_type: entry.directType || "",
    status: entry.status || "submitted",
    expense_date: entry.date || null,
    description: entry.description,
    amount: entry.amount,
    item_name: entry.itemName || "",
    vendor: entry.vendor || "",
    unit: entry.unit || "",
    quantity: entry.quantity || 0,
    unit_price: entry.unitPrice || 0,
    payment_method: entry.paymentMethod || "card",
    evidence_no: entry.evidenceNo || "",
    notes: packNotes(entry),
  };
}
const checked = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
const flatten = (attachments) =>
  Object.entries(attachments || {}).flatMap(([type, files]) =>
    (files || []).map((file) => ({ ...file, fileType: type })),
  );
const blobFor = (file) => {
  const [header, data] = file.dataUrl.split(",");
  return new Blob([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], {
    type: /data:([^;]+)/.exec(header)?.[1] || file.type,
  });
};

// On failure retain the old expense and original attachments; new drafts are removed.
// Replacement objects are removed only after the new record has been saved.
export async function saveAdminExpense(
  client,
  profile,
  entry,
  editingId,
  signedUpload,
) {
  if (profile?.role !== "admin" || !profile.club_id)
    throw new Error("관리자만 지출을 저장할 수 있습니다.");
  const payload = expensePayload(profile, entry);
  let expense;
  if (editingId) {
    expense = checked(
      await client
        .from("expenses")
        .select("*")
        .eq("id", editingId)
        .eq("club_id", profile.club_id)
        .single(),
    );
    // Ownership and reimbursement state must survive edits by a different administrator.
    delete payload.user_id;
    delete payload.club_id;
  } else {
    expense = checked(
      await client.from("expenses").insert(payload).select("*").single(),
    );
  }
  const oldFiles = editingId
    ? checked(
        await client
          .from("expense_files")
          .select("*")
          .eq("expense_id", expense.id)
          .eq("club_id", profile.club_id),
      )
    : [];
  const files = flatten(entry.attachments);
  const stagedPaths = [];
  const rows = [];
  try {
    for (const file of files.filter((file) => !file.storagePath)) {
      if (!file.dataUrl?.startsWith("data:"))
        throw new Error(`${file.name}: 첨부 원본을 다시 선택하세요.`);
      const safeName = String(file.name)
        .replace(/[^\w.\-]/g, "_")
        .slice(-100);
      const path = `${profile.club_id}/${expense.user_id}/${expense.id}/${file.fileType}-${crypto.randomUUID()}-${safeName}`;
      if (expense.user_id !== profile.id) {
        const upload = await signedUpload(expense.id, file.fileType, safeName);
        checked(
          await client.storage
            .from("receipts")
            .uploadToSignedUrl(upload.path, upload.token, blobFor(file), {
              contentType: file.type,
            }),
        );
        stagedPaths.push(upload.path);
      } else {
        checked(
          await client.storage
            .from("receipts")
            .upload(path, blobFor(file), {
              contentType: file.type,
              upsert: false,
            }),
        );
        stagedPaths.push(path);
      }
      rows.push({
        expense_id: expense.id,
        club_id: profile.club_id,
        user_id: expense.user_id,
        file_type: file.fileType,
        file_name: file.name,
        storage_path: stagedPaths.at(-1),
        mime_type: file.type,
        file_size: file.size,
      });
    }
    if (rows.length) checked(await client.from("expense_files").insert(rows));
    if (editingId)
      checked(
        await client
          .from("expenses")
          .update(payload)
          .eq("id", expense.id)
          .eq("club_id", profile.club_id)
          .select("id")
          .single(),
      );
  } catch (error) {
    const cleanup = [];
    if (stagedPaths.length) {
      cleanup.push(
        await client
          .from("expense_files")
          .delete()
          .eq("expense_id", expense.id)
          .in("storage_path", stagedPaths),
      );
      cleanup.push(await client.storage.from("receipts").remove(stagedPaths));
    }
    if (!editingId)
      cleanup.push(
        await client
          .from("expenses")
          .delete()
          .eq("id", expense.id)
          .eq("club_id", profile.club_id),
      );
    if (cleanup.some((result) => result.error))
      throw new Error(
        `${error.message} 일부 임시 데이터 정리에 실패했습니다. 새 지출을 다시 만들기 전에 검토 목록을 확인하세요.`,
      );
    throw error;
  }
  const retained = new Set(
    files.map((file) => file.storagePath).filter(Boolean),
  );
  const replaced = oldFiles.filter((file) => !retained.has(file.storage_path));
  const warnings = [];
  if (replaced.length) {
    const deletion = await client
      .from("expense_files")
      .delete()
      .eq("expense_id", expense.id)
      .eq("club_id", profile.club_id)
      .in(
        "id",
        replaced.map((file) => file.id),
      );
    if (deletion.error)
      warnings.push("지출은 저장되었지만 이전 첨부 목록 정리에 실패했습니다.");
    else {
      const removal = await client.storage
        .from("receipts")
        .remove(replaced.map((file) => file.storage_path));
      if (removal.error)
        warnings.push(
          "지출은 저장되었지만 이전 첨부 원본 정리에 실패했습니다.",
        );
    }
  }
  return { id: expense.id, warnings };
}
