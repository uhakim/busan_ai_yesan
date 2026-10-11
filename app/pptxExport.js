// Fill the supplied OOXML template in place: masters, tables, merges and logo stay intact.
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { appendPdf } from "./hwpxExport.js";
import { renderMeetingHwpx } from "./hwpxPreview.js";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main",
  P = "http://schemas.openxmlformats.org/presentationml/2006/main",
  R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  REL = "http://schemas.openxmlformats.org/package/2006/relationships",
  CT = "http://schemas.openxmlformats.org/package/2006/content-types";
const categories = {
  research: "연구 활동비",
  training: "연수 운영비",
  direct: "직접성 경비",
  meeting: "업무 협의회비",
};
const els = (n, ns, tag) => Array.from(n.getElementsByTagNameNS(ns, tag));
const kids = (n) => Array.from(n.childNodes).filter((n) => n.nodeType === 1);
const parse = (s) => new DOMParser().parseFromString(s, "application/xml");
const serial = (n) => strToU8(new XMLSerializer().serializeToString(n));
const sum = (rows) => rows.reduce((s, e) => s + Number(e.amount || 0), 0);
const money = (n) => Number(n || 0).toLocaleString("ko-KR");
function setText(node, value, size) {
  const body = els(node, A, "txBody")[0] || els(node, P, "txBody")[0] || node;
  const oldP = els(body, A, "p")[0],
    oldR = els(body, A, "r")[0];
  const pPr = oldP && els(oldP, A, "pPr")[0],
    rPr = oldR && els(oldR, A, "rPr")[0];
  els(body, A, "p")
    .filter((p) => p.parentNode === body)
    .forEach((p) => body.removeChild(p));
  for (const line of String(value ?? "").split("\n")) {
    const doc = body.ownerDocument,
      p = doc.createElementNS(A, "a:p"),
      r = doc.createElementNS(A, "a:r");
    if (pPr) p.appendChild(pPr.cloneNode(true));
    const props = rPr ? rPr.cloneNode(true) : doc.createElementNS(A, "a:rPr");
    els(props, A, "solidFill").forEach((f) => props.removeChild(f));
    const fill = doc.createElementNS(A, "a:solidFill"),
      color = doc.createElementNS(A, "a:srgbClr");
    color.setAttribute("val", "000000");
    fill.appendChild(color);
    props.insertBefore(
      fill,
      Array.from(props.childNodes).find(
        (n) => n.nodeType === 1 && n.localName !== "ln",
      ) || null,
    );
    if (size) props.setAttribute("sz", size);
    r.appendChild(props);
    const t = doc.createElementNS(A, "a:t");
    t.textContent = line;
    r.appendChild(t);
    p.appendChild(r);
    body.appendChild(p);
  }
}
function shape(doc, id) {
  return els(doc, P, "cNvPr").find((n) => n.getAttribute("id") === String(id))
    ?.parentNode.parentNode;
}
function table(doc, id) {
  return els(shape(doc, id), A, "tbl")[0];
}
function cell(t, row, col) {
  return kids(els(t, A, "tr")[row]).filter((n) => n.localName === "tc")[col];
}
function put(t, r, c, text, size) {
  setText(cell(t, r, c), text, size);
}
function remove(node) {
  if (node) node.parentNode.removeChild(node);
}
async function read(file) {
  if (!file.dataUrl) throw Error(`${file.name}: 첨부 원본이 없습니다.`);
  const r = await fetch(file.dataUrl);
  if (!r.ok) throw Error(`${file.name}: 원본 다운로드 실패`);
  return new Uint8Array(await r.arrayBuffer());
}
async function dimensions(bytes, mime) {
  const u = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try {
    return await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve([i.naturalWidth, i.naturalHeight]);
      i.onerror = () => reject(Error("증빙 이미지 읽기 실패"));
      i.src = u;
    });
  } finally {
    URL.revokeObjectURL(u);
  }
}
const configs = [
  { page: 3, table: 13, title: 5, heading: 6, number: 3, guide: [9] },
  { page: 4, table: 18, title: 20, heading: 21, number: 6, guide: [2] },
  { page: 5, table: 12, title: 14, heading: 15, number: 6, guide: [2] },
  { page: 6, table: 3, title: 6, heading: 5, number: 2, guide: [7, 8] },
];
export async function buildSettlementPptx(
  state,
  progress = () => {},
  options = {},
) {
  const input =
    options.templateBytes ||
    (await read({
      name: "정산서 PPTX 양식",
      dataUrl: `${import.meta.env?.BASE_URL || "/"}templates/settlement.pptx`,
    }));
  const files = unzipSync(input),
    slides = [],
    p = state.project,
    entries = state.entries.filter((e) => e.status !== "rejected");
  if (entries.some((e) => !Object.hasOwn(categories, e.category)))
    throw Error("예산 구분이 없는 지출을 확인하세요.");
  const types = parse(strFromU8(files["[Content_Types].xml"]));
  const addType = (tag, attr, value, mime) => {
    if (!els(types, CT, tag).some((n) => n.getAttribute(attr) === value)) {
      const n = types.createElementNS(CT, tag);
      n.setAttribute(attr, value);
      n.setAttribute("ContentType", mime);
      types.documentElement.appendChild(n);
    }
  };
  function clone(page) {
    const doc = parse(strFromU8(files[`ppt/slides/slide${page}.xml`]));
    const rel = parse(
      strFromU8(files[`ppt/slides/_rels/slide${page}.xml.rels`]),
    );
    els(rel, REL, "Relationship")
      .filter((n) => n.getAttribute("Type").endsWith("/notesSlide"))
      .forEach(remove);
    return { doc, rel };
  }
  const cover = clone(1),
    t = table(cover.doc, 8);
  for (const [r, c, v] of [
    [0, 1, p.school],
    [0, 6, p.principalName],
    [1, 1, p.schoolAddress],
    [1, 6, p.schoolPhone],
    [2, 2, p.managerName],
    [2, 6, p.managerPhone],
    [3, 2, p.managerEmail],
    [5, 1, money(p.totalBudget)],
    [5, 3, money(sum(entries))],
    [5, 5, money(Number(p.totalBudget) - sum(entries))],
    [5, 7, money(p.interest)],
  ])
    put(t, r, c, v);
  // Keep the original report statement and date/signature blanks; principal name is editable above.
  slides.push({ ...cover, number: 9 });
  const total = clone(2),
    tt = table(total.doc, 14);
  setText(
    shape(total.doc, 9),
    `동아리명 : ${p.school || ""} ${p.clubName || ""}`,
    1400,
  );
  remove(shape(total.doc, 2));
  Object.keys(categories).forEach((cat, i) =>
    put(tt, i + 1, 2, money(sum(entries.filter((e) => e.category === cat)))),
  );
  put(tt, 5, 2, money(sum(entries)));
  slides.push({ ...total, number: 13 });
  let media = 0;
  function evidencePage(config, label) {
    const s = clone(config.page);
    config.guide.forEach((id) => remove(shape(s.doc, id)));
    remove(shape(s.doc, config.table));
    remove(shape(s.doc, config.title));
    const heading = shape(s.doc, config.heading);
    setText(heading, label, 1100);
    const off = els(heading, A, "off")[0];
    off.setAttribute("y", "1240083");
    els(heading, A, "ext")[0].setAttribute("cy", "650000");
    return { ...s, number: config.number };
  }
  async function addImage(s, bytes, mime, dim, full = false) {
    if (!dim) dim = await (options.imageDimensions || dimensions)(bytes, mime);
    const ext =
      mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : null;
    if (!ext) throw Error("PPTX에는 PNG/JPG 증빙을 사용하세요.");
    const name = `settlement-${++media}.${ext}`;
    files[`ppt/media/${name}`] = bytes;
    addType("Default", "Extension", ext, mime);
    const id = `rIdEvidence${media}`,
      rel = s.rel.createElementNS(REL, "Relationship");
    rel.setAttribute("Id", id);
    rel.setAttribute("Type", `${R}/image`);
    rel.setAttribute("Target", `../media/${name}`);
    s.rel.documentElement.appendChild(rel);
    const x = 465138,
      y = full ? 2100000 : s.compactY || 4400000,
      w = 5810043,
      h = (full ? 9400000 : 9400000) - y,
      scale = Math.min(w / dim[0], h / dim[1]),
      iw = Math.round(dim[0] * scale),
      ih = Math.round(dim[1] * scale);
    const pic = parse(
      `<p:pic xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:nvPicPr><p:cNvPr id="${1000 + media}" name="증빙 ${media}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x + Math.round((w - iw) / 2)}" y="${y}"/><a:ext cx="${iw}" cy="${ih}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`,
    );
    els(s.doc, P, "spTree")[0].appendChild(
      s.doc.importNode(pic.documentElement, true),
    );
  }
  for (const [ci, [cat, label]] of Object.entries(categories).entries()) {
    const cfg = configs[ci],
      rows = entries.filter((e) => e.category === cat);
    {
      const s = clone(cfg.page);
      cfg.guide.forEach((id) => remove(shape(s.doc, id)));
      const t = table(s.doc, cfg.table);
      // Extend the original editable table before its merged total row.
      const existingRows = els(t, A, "tr");
      const templateRowCount = existingRows.length - 2;
      const rowCount = Math.max(templateRowCount, rows.length);
      const templateRow = els(t, A, "tr")[1];
      const totalRow = existingRows.at(-1);
      for (let r = templateRowCount; r < rowCount; r++)
        t.insertBefore(templateRow.cloneNode(true), totalRow);
      for (let r = 0; r < rowCount; r++) {
        const e = rows[r];
        const values = e
          ? [
              r + 1,
              label,
              e.date || "",
              e.description || "",
              money(e.amount),
            ]
          : ["", "", "", "", ""];
        values.forEach((v, c) => put(t, r + 1, c, v, c === 3 ? 1000 : 1100));
      }
      put(t, rowCount + 1, 0, "합계", 1100);
      put(t, rowCount + 1, 4, money(sum(rows)));
      // Allow long descriptions to grow their row and move the evidence heading below it.
      const widths = els(t, A, "gridCol").map(
        (n) => Number(n.getAttribute("w")) / 12700 - 14,
      );
      for (let r = 1; r <= rowCount; r++) {
        const tr = els(t, A, "tr")[r];
        let height = Number(tr.getAttribute("h"));
        kids(tr)
          .filter((n) => n.localName === "tc")
          .forEach((tc, c) => {
            const font = c === 3 ? 10 : 11;
            const text = els(tc, A, "t")
              .map((n) => n.textContent)
              .join("\n");
            let lines = 0;
            for (const line of text.split("\n")) {
              let width = 0;
              for (const char of line)
                width += font * (/[\u3000-\uffff]/.test(char) ? 1 : 0.58);
              lines += Math.max(1, Math.ceil(width / widths[c]));
            }
            height = Math.max(
              height,
              Math.ceil((lines * font * 1.35 + 10) * 12700),
            );
          });
        tr.setAttribute("h", String(height));
      }
      const frame = shape(s.doc, cfg.table),
        off = els(frame, A, "off")[0],
        ext = els(frame, A, "ext")[0],
        tableHeight = els(t, A, "tr").reduce(
          (h, r) => h + Number(r.getAttribute("h")),
          0,
        );
      if (Number(off.getAttribute("y")) + tableHeight > 8200000)
        throw Error(
          "지출 세부내역 표가 한 페이지를 초과합니다. 항목 수 또는 설명 길이를 확인하세요.",
        );
      ext.setAttribute("cy", String(tableHeight));
      const headingY = Math.max(
        3652077,
        Number(off.getAttribute("y")) + tableHeight + 150000,
      );
      els(shape(s.doc, cfg.heading), A, "off")[0].setAttribute(
        "y",
        String(headingY),
      );
      s.compactY = Math.max(4400000, headingY + 650000);
      slides.push({ ...s, number: cfg.number });
    }
    let first = true;
    for (const e of rows) {
      if (cat === "meeting" && !e.attachments?.meetingMinutes?.length)
        throw Error(
          `${e.evidenceNo || e.date}: 협의록 원본(HWPX/PDF)을 등록하세요.`,
        );
      for (const [kind, list] of Object.entries(e.attachments || {}))
        for (const file of list || []) {
          progress(`${file.name} 처리 중…`);
          const bytes = await read(file);
          let caption = `${e.evidenceNo || e.date} · ${file.name.length > 65 ? file.name.slice(0, 62) + "…" : file.name}`;
          const add = async (b, m, d) => {
            // The first receipt uses the original category evidence space. Other evidence gets a full page.
            const compact =
              first &&
              (slides[slides.length - 1].compactY || 0) < 6500000 &&
              kind !== "meetingMinutes" &&
              !/\.pdf$/i.test(file.name);
            const s = compact
              ? slides[slides.length - 1]
              : evidencePage(cfg, caption);
            if (!compact) slides.push(s);
            if (compact) {
              setText(
                shape(s.doc, cfg.heading),
                `${label} 지출 항목별 증빙 자료\n${caption}`,
                1100,
              );
              els(shape(s.doc, cfg.heading), A, "ext")[0].setAttribute(
                "cy",
                "550000",
              );
            }
            await addImage(s, b, m, d, !compact);
            if (compact) {
              const full = evidencePage(cfg, caption);
              slides.push(full);
              await addImage(full, b, m, d, true);
            }
            first = false;
          };
          if (/\.hwpx$/i.test(file.name)) {
            const image = await (options.renderHwpx || renderMeetingHwpx)(
              bytes,
            );
            await add(image.bytes, "image/png", image.dimensions);
          } else if (
            file.type === "application/pdf" ||
            /\.pdf$/i.test(file.name)
          ) {
            await appendPdf(
              {
                p(text) {
                  caption = `${e.evidenceNo || e.date} · ${text}`;
                },
                image: add,
              },
              bytes,
              file.name,
              progress,
              options.pdfOptions || {},
            );
          } else if (
            ["image/jpeg", "image/png"].includes(file.type) ||
            /\.(jpe?g|png)$/i.test(file.name)
          ) {
            await add(
              bytes,
              file.type === "image/png" || /\.png$/i.test(file.name)
                ? "image/png"
                : "image/jpeg",
            );
          } else
            throw Error(
              `${file.name}: PPTX 증빙으로 지원하지 않는 파일입니다. PDF/PNG/JPG/HWPX를 등록하세요.`,
            );
        }
    }
  }
  // Rebuild the slide list and its relationships so cloned pages have unique parts/IDs.
  for (const path of Object.keys(files))
    if (path.startsWith("ppt/notesSlides/")) delete files[path];
  els(types, CT, "Override")
    .filter((n) => n.getAttribute("PartName").startsWith("/ppt/notesSlides/"))
    .forEach(remove);
  const pres = parse(strFromU8(files["ppt/presentation.xml"])),
    rels = parse(strFromU8(files["ppt/_rels/presentation.xml.rels"])),
    list = els(pres, P, "sldIdLst")[0];
  while (list.firstChild) list.removeChild(list.firstChild);
  els(rels, REL, "Relationship")
    .filter((n) => n.getAttribute("Type") === `${R}/slide`)
    .forEach(remove);
  els(types, CT, "Override")
    .filter((n) =>
      /^\/ppt\/slides\/slide\d+\.xml$/.test(n.getAttribute("PartName")),
    )
    .forEach(remove);
  for (const path of Object.keys(files))
    if (/^ppt\/slides\/(?:_rels\/)?slide\d+\.xml(?:\.rels)?$/.test(path))
      delete files[path];
  slides.forEach((s, i) => {
    setText(shape(s.doc, s.number), String(i + 1));
    files[`ppt/slides/slide${i + 1}.xml`] = serial(s.doc);
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = serial(s.rel);
    const id = `rIdSettlement${i + 1}`,
      r = rels.createElementNS(REL, "Relationship");
    r.setAttribute("Id", id);
    r.setAttribute("Type", `${R}/slide`);
    r.setAttribute("Target", `slides/slide${i + 1}.xml`);
    rels.documentElement.appendChild(r);
    const n = pres.createElementNS(P, "p:sldId");
    n.setAttribute("id", String(256 + i));
    n.setAttributeNS(R, "r:id", id);
    list.appendChild(n);
    addType(
      "Override",
      "PartName",
      `/ppt/slides/slide${i + 1}.xml`,
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
    );
  });
  files["ppt/presentation.xml"] = serial(pres);
  files["ppt/_rels/presentation.xml.rels"] = serial(rels);
  files["[Content_Types].xml"] = serial(types);
  // Remove stale template thumbnail; it would misleadingly show placeholder data.
  delete files["docProps/thumbnail.jpeg"];
  delete files["docProps/thumbnail.jpg"];
  const root = parse(strFromU8(files["_rels/.rels"]));
  els(root, REL, "Relationship")
    .filter((n) => n.getAttribute("Type").endsWith("/thumbnail"))
    .forEach(remove);
  files["_rels/.rels"] = serial(root);
  const app =
    files["docProps/app.xml"] && parse(strFromU8(files["docProps/app.xml"]));
  if (app) {
    const slideCount = app.getElementsByTagName("Slides")[0];
    if (slideCount) slideCount.textContent = String(slides.length);
    files["docProps/app.xml"] = serial(app);
  }
  progress(`PPTX ${slides.length}쪽 생성 완료`);
  return zipSync(files, { level: 6 });
}
