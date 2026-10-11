import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { zipSync, strToU8 } from "fflate";
import { renderMeetingHwpx } from "../hwpxPreview.js";
Object.assign(globalThis, { DOMParser, XMLSerializer });
const hp = "http://www.hancom.co.kr/hwpml/2011/paragraph";
const p = (text) => `<hp:p><hp:run><hp:t>${text}</hp:t></hp:run></hp:p>`;
const cell = (text, w, h) =>
  `<hp:tc><hp:subList>${text}</hp:subList><hp:cellSz width="${w}" height="${h}"/></hp:tc>`;
const names = ["김유하", "박건태", "박지인", "변기중", "최낙현"];
const nested = `<hp:tbl rowCnt="1" colCnt="6"><hp:tr>${[...names, ""].map((n) => cell(p(n), 6800, 4400)).join("")}</hp:tr></hp:tbl>`;
const rows = Array.from(
  { length: 7 },
  (_, i) =>
    `<hp:tr>${cell(p("항목"), 7092, 4400)}${cell(i === 4 ? p("") + nested : p("내용"), 40803, 4400)}</hp:tr>`,
).join("");
const source = zipSync({
  "Contents/section0.xml": strToU8(
    `<hs:sec xmlns:hp="${hp}" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">${p("AI 동아리 협의록")}<hp:p><hp:run><hp:tbl rowCnt="7" colCnt="4">${rows}</hp:tbl></hp:run></hp:p></hs:sec>`,
  ),
});
test("HWPX preview includes the heading and nested attendee names exactly once", async () => {
  const drawn = [],
    ctx = {
      font: "",
      fillRect() {},
      strokeRect() {},
      measureText(t) {
        return { width: t.length * 12 };
      },
      fillText(t) {
        drawn.push(t);
      },
      drawImage() {},
    };
  const result = await renderMeetingHwpx(source, {
    createCanvas: () => ({
      getContext: () => ctx,
      toBlob: (cb) => cb(new Blob([new Uint8Array([1])])),
    }),
  });
  assert.deepEqual(result.dimensions, [1400, 1980]);
  assert(drawn.includes("AI 동아리 협의록"));
  for (const name of names)
    assert.equal(drawn.filter((s) => s.includes(name)).length, 1);
});
test("unsupported HWPX layout fails clearly instead of rendering only a partial document", async () => {
  await assert.rejects(
    renderMeetingHwpx(zipSync({ "Contents/section0.xml": strToU8("<sec/>") })),
    /기존 7행/,
  );
});
