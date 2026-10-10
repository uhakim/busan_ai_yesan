const PREFIX = "__ai_club_notes_v1__:";
export const emptyMeeting = () => ({
  startTime: "",
  endTime: "",
  location: "",
  topic: "",
  content: "",
  attendees: "",
  absent: "",
});
export function packNotes(entry) {
  if (entry.category !== "meeting") return entry.notes || "";
  return (
    PREFIX +
    JSON.stringify({
      notes: entry.notes || "",
      meeting: { ...emptyMeeting(), ...entry.meeting },
    })
  );
}
export function unpackNotes(value) {
  if (String(value || "").startsWith(PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(PREFIX.length));
      return {
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        meeting: { ...emptyMeeting(), ...parsed.meeting },
      };
    } catch {
      /* Preserve legacy or malformed notes verbatim. */
    }
  }
  return { notes: value || "", meeting: emptyMeeting() };
}
export function attendeeNames(value) {
  return String(value || "")
    .split(/[,，、\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
export function validateMeeting(entry) {
  if (entry.category !== "meeting") return [];
  const m = entry.meeting || {};
  const errors = [];
  if (!m.startTime || !m.endTime || m.endTime <= m.startTime)
    errors.push("협의 시작·종료 시간을 확인하세요.");
  if (!m.location?.trim()) errors.push("협의 장소를 입력하세요.");
  if (!m.topic?.trim() || !m.content?.trim())
    errors.push("협의 주제와 내용을 입력하세요.");
  const names = attendeeNames(m.attendees);
  if (!names.length) errors.push("참석자 명단을 입력하세요.");
  if (new Set(names).size !== names.length)
    errors.push("참석자 명단에 중복된 이름이 있습니다.");
  if (names.length && Number(entry.amount) > names.length * 30000)
    errors.push("식비는 참석자 1인당 30,000원 이내로 입력하세요.");
  return errors;
}
