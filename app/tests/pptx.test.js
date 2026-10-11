import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { unzipSync, strFromU8 } from "fflate";
import { buildSettlementPptx } from "../pptxExport.js";
Object.assign(globalThis, { DOMParser, XMLSerializer });
const templateBytes = new Uint8Array(
  await fs.readFile(
    new URL("../../references/정산서_이름_학교_동아리명.pptx", import.meta.url),
  ),
);
const original = unzipSync(templateBytes),
  A = "http://schemas.openxmlformats.org/drawingml/2006/main",
  P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const parse = (b) =>
  new DOMParser().parseFromString(strFromU8(b), "application/xml");
const texts = (doc) =>
  Array.from(doc.getElementsByTagNameNS(A, "t"))
    .map((t) => t.textContent)
    .join("|");
const state = {
  project: {
    school: "동성초",
    clubName: "바이브코딩",
    totalBudget: 2000000,
    interest: 100,
  },
  entries: Array.from({ length: 4 }, (_, i) => ({
    category: "direct",
    date: "2026-10-07",
    description: `ChatGPT ${i + 1}`,
    amount: 10000,
    status: "submitted",
    attachments: {},
  })),
};
test("PPTX retains original dimensions, masters, table geometry and merges; overflow includes all rows and totals", async () => {
  const files = unzipSync(
    await buildSettlementPptx(state, () => {}, { templateBytes }),
  );
  assert.deepEqual(
    files["ppt/slideMasters/slideMaster1.xml"],
    original["ppt/slideMasters/slideMaster1.xml"],
  );
  const pres = parse(files["ppt/presentation.xml"]);
  assert.equal(pres.getElementsByTagNameNS(P, "sldId").length, 7);
  assert.equal(
    pres.getElementsByTagNameNS(P, "sldSz")[0].getAttribute("cx"),
    "6858000",
  );
  const xml = Object.keys(files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .map((p) => texts(parse(files[p])))
    .join("\n");
  for (const v of ["ChatGPT 1", "ChatGPT 4", "40,000", "1,960,000", "동성초"])
    assert(xml.includes(v), v);
  for (const v of ["세부 내역 기입", "파란색 글씨", "사용 금액 기입"])
    assert(!xml.includes(v), v);
  const table = parse(files["ppt/slides/slide1.xml"]).getElementsByTagNameNS(
    A,
    "tbl",
  )[1];
  const old = parse(original["ppt/slides/slide1.xml"]).getElementsByTagNameNS(
    A,
    "tbl",
  )[1];
  assert.equal(
    new XMLSerializer().serializeToString(
      table.getElementsByTagNameNS(A, "tblGrid")[0],
    ),
    new XMLSerializer().serializeToString(
      old.getElementsByTagNameNS(A, "tblGrid")[0],
    ),
  );
  assert.equal(
    table.getElementsByTagNameNS(A, "tc")[1].getAttribute("gridSpan"),
    old.getElementsByTagNameNS(A, "tc")[1].getAttribute("gridSpan"),
  );
});
test("receipts and all rendered HWPX/PDF pages are embedded with valid unique slide relationships", async () => {
  const png = new Uint8Array([1, 2, 3]);
  const file = {
    name: "receipt.png",
    type: "image/png",
    dataUrl: "data:application/octet-stream;base64,AQID",
  };
  const entry = {
    category: "meeting",
    date: "2026-10-07",
    description: "협의회",
    amount: 150000,
    attachments: {
      cardReceipt: [file],
      meetingMinutes: [{ ...file, name: "minutes.hwpx" }],
    },
  };
  const files = unzipSync(
    await buildSettlementPptx({ ...state, entries: [entry] }, () => {}, {
      templateBytes,
      imageDimensions: async () => [100, 200],
      renderHwpx: async () => ({ bytes: png, dimensions: [100, 200] }),
    }),
  );
  assert.equal(
    Object.keys(files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .length,
    8,
  );
  const media = Object.keys(files).filter((p) => /settlement-/.test(p));
  assert.equal(media.length, 3);
  const rels = Object.keys(files)
    .filter((p) => /^ppt\/slides\/_rels/.test(p))
    .map((p) => strFromU8(files[p]))
    .join("");
  for (const p of media) assert(rels.includes(p.replace("ppt/", "../")));
});
test("missing evidence or meeting original aborts instead of silently dropping material", async () => {
  await assert.rejects(
    buildSettlementPptx(
      {
        ...state,
        entries: [
          {
            category: "direct",
            attachments: { cardReceipt: [{ name: "missing.png" }] },
          },
        ],
      },
      () => {},
      { templateBytes },
    ),
    /첨부 원본/,
  );
  await assert.rejects(
    buildSettlementPptx(
      {
        ...state,
        entries: [{ category: "meeting", date: "2026-10-07", attachments: {} }],
      },
      () => {},
      { templateBytes },
    ),
    /협의록 원본/,
  );
});
test("slide captions live inside p:txBody and cloned pages do not share notes backreferences", async () => {
  const files = unzipSync(
    await buildSettlementPptx(state, () => {}, { templateBytes }),
  );
  const slide = parse(files["ppt/slides/slide2.xml"]);
  const caption = Array.from(slide.getElementsByTagNameNS(P, "sp")).find((s) =>
    texts(s).includes("바이브코딩"),
  );
  assert(caption);
  assert.equal(caption.getElementsByTagNameNS(P, "txBody").length, 1);
  assert.equal(
    Array.from(caption.childNodes).filter((n) => n.localName === "p").length,
    0,
  );
  for (const [key, bytes] of Object.entries(files))
    if (key.endsWith(".rels"))
      assert(!strFromU8(bytes).includes('/notesSlide"'), key);
});
test("each PDF page becomes a separate PPTX evidence slide", async () => {
  const image = new Uint8Array([1, 2, 3]);
  let destroyed = false;
  const pdfjs = {
    getDocument() {
      return {
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: () => ({ width: 300, height: 400 }),
            render: () => ({ promise: Promise.resolve() }),
            cleanup() {},
          }),
        }),
        async destroy() {
          destroyed = true;
        },
      };
    },
  };
  const files = unzipSync(
    await buildSettlementPptx(
      {
        ...state,
        entries: [
          {
            category: "direct",
            date: "2026-10-07",
            amount: 10000,
            attachments: {
              cardReceipt: [
                {
                  name: "receipt.pdf",
                  type: "application/pdf",
                  dataUrl: "data:application/pdf;base64,AQID",
                },
              ],
            },
          },
        ],
      },
      () => {},
      {
        templateBytes,
        pdfOptions: {
          pdfjs,
          createCanvas: () => ({
            width: 0,
            height: 0,
            getContext: () => ({}),
            toBlob: (cb) => cb(new Blob([image])),
          }),
        },
      },
    ),
  );
  assert.equal(
    parse(files["ppt/presentation.xml"]).getElementsByTagNameNS(P, "sldId")
      .length,
    8,
  );
  assert(destroyed);
  const all = Object.entries(files)
    .filter(([key]) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
    .map(([, b]) => texts(parse(b)))
    .join("|");
  assert(all.includes("receipt.pdf (1/2)"));
  assert(all.includes("receipt.pdf (2/2)"));
});
