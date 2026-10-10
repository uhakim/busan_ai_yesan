import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { unzipSync, strFromU8 } from "fflate";
import { HwpxDocument, buildSettlementHwpx, appendPdf } from "../hwpxExport.js";
Object.assign(globalThis, { DOMParser, XMLSerializer });
const ns = "http://www.hancom.co.kr/hwpml/2011/paragraph";
const state = {
  project: { school: "동성초", clubName: "바이브코딩", totalBudget: 2000000 },
  entries: [
    {
      category: "meeting",
      status: "submitted",
      date: "2026-10-07",
      description: "CBL 수업안 & 컨설팅 협의",
      amount: 150000,
      meeting: {
        startTime: "17:30",
        endTime: "19:30",
        topic: "CBL",
        location: "용원",
        content: "• 수업안 검토\n• 연수 방향 협의",
        attendees: "김유하,박건태,박지인,변기중,최낙현",
        absent: "이우진",
      },
      attachments: {},
    },
  ],
};
test("settlement ZIP is a genuine HWPX containing editable names, meeting time, totals and tables", async () => {
  const bytes = await buildSettlementHwpx(state);
  const files = unzipSync(bytes);
  assert.equal(strFromU8(files.mimetype), "application/hwp+zip");
  // Local ZIP first entry mimetype must be stored, not compressed.
  const data = new DataView(bytes.buffer, bytes.byteOffset);
  assert.equal(data.getUint16(8, true), 0);
  const section = strFromU8(files["Contents/section0.xml"]);
  assert(section.includes("17:30 ~ 19:30"));
  assert(section.includes("최낙현"));
  assert(section.includes("150,000원"));
  assert(section.includes("1,850,000원"));
  assert(section.includes("&amp;"));
  const parsed = new DOMParser().parseFromString(section, "application/xml");
  assert(parsed.getElementsByTagNameNS(ns, "tbl").length >= 7);
});
test("HWPX merge remaps styles and preserves embedded image bytes", async () => {
  const source = new HwpxDocument();
  source.p("원본 협의록");
  // Source section controls are stripped during import; empty controls crash Hancom.
  source.blocks.unshift(
    '<hp:p id="900" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl><hp:t>서식</hp:t></hp:run></hp:p>',
  );
  source.table(
    [
      ["참석자", "명단"],
      ["참석자", "최낙현"],
    ],
    [1, 2],
  );
  const image = new Uint8Array([1, 2, 3]);
  await source.image(image, "image/jpeg", [100, 100]);
  const target = new HwpxDocument();
  target.p("정산서");
  target.importHwpx(source.save());
  const files = unzipSync(target.save());
  const section = strFromU8(files["Contents/section0.xml"]);
  assert(section.includes("원본 협의록"));
  assert(!/<hp:ctrl\s*\/>/.test(section));
  assert(section.includes("최낙현"));
  assert.deepEqual(
    Object.values(files).find((value) => value.length === 3),
    image,
  );
  const doc = new DOMParser().parseFromString(section, "application/xml"),
    header = new DOMParser().parseFromString(
      strFromU8(files["Contents/header.xml"]),
      "application/xml",
    );
  const h = "http://www.hancom.co.kr/hwpml/2011/head";
  const ids = {
    charPrIDRef: new Set(
      Array.from(header.getElementsByTagNameNS(h, "charPr")).map((n) =>
        n.getAttribute("id"),
      ),
    ),
    paraPrIDRef: new Set(
      Array.from(header.getElementsByTagNameNS(h, "paraPr")).map((n) =>
        n.getAttribute("id"),
      ),
    ),
  };
  for (const el of Array.from(doc.getElementsByTagName("*")))
    for (const key of Object.keys(ids))
      if (el.hasAttribute(key))
        assert(
          ids[key].has(el.getAttribute(key)),
          `${key} ${el.getAttribute(key)}`,
        );
});
test("missing original evidence prevents incomplete output", async () => {
  const changed = structuredClone(state);
  changed.entries[0].attachments = {
    cardReceipt: [{ name: "missing.jpg", type: "image/jpeg" }],
  };
  await assert.rejects(buildSettlementHwpx(changed), /첨부 원본/);
});

test("two-page PDF renders both pages into the HWPX without dropping the second page", async () => {
  const canvasModule = await import("@napi-rs/canvas");
  Object.assign(globalThis, {DOMMatrix: canvasModule.DOMMatrix, Path2D: canvasModule.Path2D, ImageData: canvasModule.ImageData});
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = Uint8Array.from(Buffer.from("JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiA1IDAgUl0gL0NvdW50IDIgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgNDAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA3IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NSA+PgpzdHJlYW0KQlQgL0YxIDIwIFRmIDMwIDM1MCBUZCAoUmVjZWlwdCBwYWdlIDEpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDMwMCA0MDBdIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDcgMCBSID4+ID4+IC9Db250ZW50cyA2IDAgUiA+PgplbmRvYmoKNiAwIG9iago8PCAvTGVuZ3RoIDQ1ID4+CnN0cmVhbQpCVCAvRjEgMjAgVGYgMzAgMzUwIFRkIChSZWNlaXB0IHBhZ2UgMikgVGogRVQKZW5kc3RyZWFtCmVuZG9iago3IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAowMDAwMDAwMjQ3IDAwMDAwIG4gCjAwMDAwMDAzNDIgMDAwMDAgbiAKMDAwMDAwMDQ2OCAwMDAwMCBuIAowMDAwMDAwNTYzIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgOCAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNjMzCiUlRU9G", "base64"));
  const doc = new HwpxDocument();
  await appendPdf(doc, bytes, "receipt.pdf", () => {}, {
    pdfjs,
    pdfOptions: {standardFontDataUrl: new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).pathname},
    createCanvas() {const canvas = canvasModule.createCanvas(1, 1);canvas.toBlob = callback => callback(new Blob([canvas.toBuffer("image/png")]));return canvas;}
  });
  const files = unzipSync(doc.save());
  assert.equal(Object.keys(files).filter(path => path.startsWith("BinData/")).length, 2);
  const section = strFromU8(files["Contents/section0.xml"]);
  assert(section.includes("receipt.pdf (1/2)"));assert(section.includes("receipt.pdf (2/2)"));
});
