import test from "node:test";
import assert from "node:assert/strict";
import { packNotes, unpackNotes, validateMeeting } from "../meeting.js";
import { expensePayload, saveAdminExpense } from "../expenseStore.js";
const profile = { id: "admin", club_id: "club", role: "admin" };
const entry = {
  category: "meeting",
  amount: 150000,
  notes: "하나카드",
  meeting: {
    startTime: "17:30",
    endTime: "19:30",
    location: "용원",
    topic: "CBL",
    content: "수업안 검토",
    attendees: "김유하, 박건태, 박지인, 변기중, 최낙현",
    absent: "이우진",
  },
  attachments: {},
};
test("meeting metadata survives DB notes round trip while legacy notes remain plain", () => {
  assert.equal(unpackNotes("과거 비고").notes, "과거 비고");
  const saved = expensePayload(profile, entry);
  assert.equal(saved.category, "meeting");
  assert.deepEqual(unpackNotes(saved.notes).meeting, entry.meeting);
  assert.equal(unpackNotes(saved.notes).notes, "하나카드");
});
test("meal limit and time validation", () => {
  assert.deepEqual(validateMeeting(entry), []);
  assert.match(
    validateMeeting({ ...entry, amount: 150001 }).join(" "),
    /30,000/,
  );
  assert.match(
    validateMeeting({
      ...entry,
      meeting: { ...entry.meeting, endTime: "17:00" },
    }).join(" "),
    /시간/,
  );
});
function fakeClient({ failUpload = false, failUpdate = false } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      let op = "select",
        payload,
        filters = [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push([k, v]);
          return q;
        },
        in(k, v) {
          filters.push([k, v]);
          return q;
        },
        insert(v) {
          op = "insert";
          payload = v;
          return q;
        },
        update(v) {
          op = "update";
          payload = v;
          return q;
        },
        delete() {
          op = "delete";
          return q;
        },
        single() {
          return q;
        },
        then(resolve) {
          calls.push({ table, op, payload, filters });
          let data =
            table === "expenses"
              ? { id: "expense", user_id: op === "insert" ? "admin" : "member" }
              : [];
          if (table === "expense_files" && op === "select")
            data = [{ id: "old", storage_path: "original" }];
          resolve({
            data,
            error:
              op === "update" && failUpdate ? new Error("update failed") : null,
          });
        },
      };
      return q;
    },
    storage: {
      from() {
        return {
          async upload(path) {
            calls.push({ op: "upload", path });
            return { error: failUpload ? new Error("upload failed") : null };
          },
          async uploadToSignedUrl(path) {
            calls.push({ op: "signedUpload", path });
            return { error: null };
          },
          async remove(paths) {
            calls.push({ op: "remove", paths });
            return { error: null };
          },
        };
      },
    },
  };
  return client;
}
const file = {
  name: "영수증.jpg",
  type: "image/jpeg",
  size: 3,
  dataUrl: "data:image/jpeg;base64,YWJj",
};
test("new conference expense upload failure removes partial draft and does not succeed", async () => {
  const client = fakeClient({ failUpload: true });
  await assert.rejects(
    saveAdminExpense(
      client,
      profile,
      { ...entry, attachments: { cardReceipt: [file] } },
      "",
    ),
    /upload failed/,
  );
  assert(client.calls.some((c) => c.table === "expenses" && c.op === "delete"));
});
test("admin edits preserve original owner and use authorized upload path; failure retains original attachment", async () => {
  const client = fakeClient({ failUpdate: true });
  await assert.rejects(
    saveAdminExpense(
      client,
      profile,
      { ...entry, attachments: { cardReceipt: [file] } },
      "expense",
      async () => ({ path: "club/member/expense/new", token: "signed" }),
    ),
    /update failed/,
  );
  const update = client.calls.find((c) => c.op === "update");
  assert(!("user_id" in update.payload));
  assert(!("paid" in update.payload));
  assert(client.calls.some((c) => c.op === "signedUpload"));
  assert(
    !client.calls.some(
      (c) => c.op === "remove" && c.paths.includes("original"),
    ),
  );
  assert(
    !client.calls.some((c) => c.table === "expenses" && c.op === "delete"),
  );
});
test("successful edit keeps existing files without reupload or deletion", async () => {
  const client = fakeClient();
  const result = await saveAdminExpense(
    client,
    profile,
    {
      ...entry,
      attachments: { cardReceipt: [{ ...file, storagePath: "original" }] },
    },
    "expense",
  );
  assert.deepEqual(result.warnings, []);
  assert(!client.calls.some((c) => ["upload", "remove"].includes(c.op)));
});
