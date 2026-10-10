import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import base from "./hwpxBase.json" with { type: "json" };
import { attendeeNames } from "./meeting.js";
const NS = base.namespaces,
  HP = NS.hp,
  HH = NS.hh,
  OPF = NS.opf,
  W = 48190;
const esc = (v) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const money = (v) => `${Number(v || 0).toLocaleString("ko-KR")}원`;
const els = (n, ns, name) => Array.from(n.getElementsByTagNameNS(ns, name));
const xml = (s) => {
  const d = new DOMParser().parseFromString(s, "application/xml");
  if (d.getElementsByTagName("parsererror").length)
    throw Error("HWPX XML 오류");
  return d;
};
const serialize = (n) => new XMLSerializer().serializeToString(n);
const children = (n) =>
  Array.from(n.childNodes).filter((n) => n.nodeType === 1);
const remove = (n) => n.parentNode.removeChild(n);
const categories = {
  research: "연구 활동비",
  training: "연수 운영비",
  direct: "직접성 경비",
  meeting: "업무 협의회비",
};
const labels = {
  cardReceipt: "카드 영수증",
  transferConfirmation: "계좌이체 확인증",
  transactionStatement: "거래명세서",
  foreignReceipt: "외화 영수증",
  krwCardSlip: "국내 카드사 원화전표",
  meetingMinutes: "협의록",
  photo: "활동 사진",
};
export class HwpxDocument {
  constructor() {
    this.header = xml(base.header);
    this.blocks = [];
    this.binaries = {};
    this.items = [];
    this.id = 500000;
    this.styles = {};
    const chars = els(this.header, HH, "charProperties")[0],
      paras = els(this.header, HH, "paraProperties")[0];
    for (const [key, size, bold] of [
      ["body", 1000, false],
      ["small", 900, false],
      ["heading", 1300, true],
      ["title", 1800, true],
    ]) {
      const item = children(chars)[0].cloneNode(true),
        id = this.next(chars);
      item.setAttribute("id", id);
      item.setAttribute("height", size);
      item.setAttribute("textColor", "#000000");
      els(item, HH, "bold").forEach(remove);
      if (bold) item.appendChild(this.header.createElementNS(HH, "hh:bold"));
      chars.appendChild(item);
      this.styles[key] = id;
    }
    this.paraId = this.next(paras);
    const item = children(paras)[0].cloneNode(true);
    item.setAttribute("id", this.paraId);
    els(item, HH, "align")[0].setAttribute("horizontal", "LEFT");
    els(item, HH, "lineSpacing")[0].setAttribute("value", "140");
    paras.appendChild(item);
    for (const c of [chars, paras])
      c.setAttribute("itemCnt", children(c).length);
  }
  next(c) {
    return (
      Math.max(-1, ...children(c).map((n) => Number(n.getAttribute("id")))) + 1
    );
  }
  paragraph(text, style = "body", pb = false) {
    return `<hp:p id="${++this.id}" paraPrIDRef="${this.paraId}" styleIDRef="0" pageBreak="${pb ? 1 : 0}" columnBreak="0" merged="0"><hp:run charPrIDRef="${this.styles[style]}"><hp:t>${esc(text)}</hp:t></hp:run></hp:p>`;
  }
  p(text, style = "body", pb = false) {
    this.blocks.push(this.paragraph(text, style, pb));
  }
  table(rows, widths) {
    const total = widths.reduce((a, b) => a + b, 0),
      sizes = widths.map((w) => Math.floor((W * w) / total));
    sizes[sizes.length - 1] += W - sizes.reduce((a, b) => a + b, 0);
    const fills = els(this.header, HH, "borderFill"),
      border =
        fills.find((n) =>
          ["leftBorder", "rightBorder", "topBorder", "bottomBorder"].every(
            (tag) => els(n, HH, tag)[0]?.getAttribute("type") === "SOLID",
          ),
        ) || fills[0],
      bf = border.getAttribute("id");
    const body = rows
      .map(
        (row, y) =>
          `<hp:tr>${row
            .map(
              (value, x) =>
                `<hp:tc name="" header="${y === 0 ? 1 : 0}" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="${bf}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${String(
                  value ?? "",
                )
                  .split("\n")
                  .map((t) => this.paragraph(t, "small"))
                  .join(
                    "",
                  )}</hp:subList><hp:cellAddr colAddr="${x}" rowAddr="${y}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${sizes[x]}" height="1800"/><hp:cellMargin left="250" right="250" top="250" bottom="250"/></hp:tc>`,
            )
            .join("")}</hp:tr>`,
      )
      .join("");
    this.blocks.push(
      `<hp:p id="${++this.id}" paraPrIDRef="${this.paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${this.styles.body}"><hp:tbl id="${++this.id}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="${bf}" noAdjust="0"><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${1800 * rows.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="140" bottom="140"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>${body}</hp:tbl></hp:run></hp:p>`,
    );
    this.p("");
  }
  binary(bytes, mime) {
    const id = `evidence${++this.id}`,
      ext = mime.includes("png")
        ? "png"
        : mime.includes("gif")
          ? "gif"
          : mime.includes("webp")
            ? "webp"
            : "jpg",
      path = `BinData/${id}.${ext}`;
    this.binaries[path] = bytes;
    this.items.push(
      `<opf:item id="${id}" href="${path}" media-type="${esc(mime)}" isEmbeded="1"/>`,
    );
    return id;
  }
  async image(bytes, mime, dimensions) {
    const [iw, ih] = dimensions || (await imageDimensions(bytes, mime)),
      scale = Math.min(W / iw, 59000 / ih),
      w = Math.round(iw * scale),
      h = Math.round(ih * scale),
      pic = xml(base.picture).documentElement;
    pic.setAttribute("id", ++this.id);
    for (const tag of ["orgSz", "curSz", "sz"]) {
      const n = els(pic, HP, tag)[0];
      n.setAttribute("width", w);
      n.setAttribute("height", h);
    }
    const rot = els(pic, HP, "rotationInfo")[0];
    rot.setAttribute("centerX", Math.round(w / 2));
    rot.setAttribute("centerY", Math.round(h / 2));
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ].forEach(([x, y], i) => {
      const n = els(pic, NS.hc, `pt${i}`)[0];
      n.setAttribute("x", x);
      n.setAttribute("y", y);
    });
    const clip = els(pic, HP, "imgClip")[0];
    for (const [k, v] of Object.entries({
      left: 0,
      top: 0,
      right: w,
      bottom: h,
    }))
      clip.setAttribute(k, v);
    const dim = els(pic, HP, "imgDim")[0];
    dim.setAttribute("dimwidth", w);
    dim.setAttribute("dimheight", h);
    const pos = els(pic, HP, "pos")[0];
    pos.setAttribute("treatAsChar", "1");
    pos.setAttribute("affectLSpacing", "1");
    els(pic, NS.hc, "img")[0].setAttribute(
      "binaryItemIDRef",
      this.binary(bytes, mime),
    );
    this.blocks.push(
      `<hp:p id="${++this.id}" paraPrIDRef="${this.paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${this.styles.body}">${serialize(pic)}</hp:run></hp:p>`,
    );
  }
  importHwpx(bytes) {
    const files = unzipSync(bytes, {
      filter: (f) => f.originalSize < 30 * 1024 * 1024,
    });
    if (!files["Contents/header.xml"] || !files["Contents/content.hpf"])
      throw Error("올바른 HWPX 협의록이 아닙니다.");
    const source = xml(strFromU8(files["Contents/header.xml"])),
      refs = els(this.header, HH, "refList")[0],
      importedRefs = els(source, HH, "refList")[0],
      maps = {},
      fonts = {},
      clones = [];
    for (const face of els(source, HH, "fontface")) {
      const lang = face.getAttribute("lang"),
        target = els(this.header, HH, "fontface").find(
          (n) => n.getAttribute("lang") === lang,
        );
      if (!target) throw Error("첨부 HWPX 글꼴 구성 오류");
      fonts[lang.toLowerCase()] = {};
      for (const font of children(face)) {
        const clone = font.cloneNode(true),
          id = this.next(target);
        fonts[lang.toLowerCase()][font.getAttribute("id")] = id;
        clone.setAttribute("id", id);
        target.appendChild(clone);
      }
      target.setAttribute("fontCnt", children(target).length);
    }
    for (const c of children(importedRefs).filter(
      (n) => n.localName !== "fontfaces",
    )) {
      let target = children(refs).find((n) => n.localName === c.localName);
      if (!target) {
        target = this.header.createElementNS(HH, `hh:${c.localName}`);
        refs.appendChild(target);
      }
      maps[c.localName] = {};
      let id = this.next(target);
      for (const item of children(c)) {
        const clone = item.cloneNode(true);
        maps[c.localName][item.getAttribute("id")] = id;
        clone.setAttribute("id", id++);
        target.appendChild(clone);
        clones.push(clone);
      }
      target.setAttribute("itemCnt", children(target).length);
    }
    const pkg = xml(strFromU8(files["Contents/content.hpf"])),
      binaries = {};
    for (const item of els(pkg, OPF, "item")) {
      const href = item.getAttribute("href")?.replace(/^\.\//, "");
      if (href?.startsWith("BinData/") && files[href])
        binaries[item.getAttribute("id")] = this.binary(
          files[href],
          item.getAttribute("media-type") || "image/jpeg",
        );
    }
    const attrs = {
      charPrIDRef: "charProperties",
      paraPrIDRef: "paraProperties",
      styleIDRef: "styles",
      nextStyleIDRef: "styles",
      borderFillIDRef: "borderFills",
      tabPrIDRef: "tabProperties",
      paraHeadIDRef: "numberings",
      numIDRef: "numberings",
      bulletIDRef: "bullets",
      memoShapeIDRef: "memoProperties",
    };
    const remap = (node) => {
      for (const el of [node, ...els(node, "*", "*")]) {
        for (const a of Array.from(el.attributes || [])) {
          const group = attrs[a.name];
          if (group && maps[group]?.[a.value] !== undefined)
            el.setAttribute(a.name, maps[group][a.value]);
          if (a.name === "binaryItemIDRef" && a.value) {
            if (!binaries[a.value])
              throw Error("HWPX 첨부의 그림 원본이 누락되었습니다.");
            el.setAttribute(a.name, binaries[a.value]);
          }
        }
        if (el.localName === "fontRef")
          for (const a of Array.from(el.attributes))
            if (fonts[a.name]?.[a.value] !== undefined)
              el.setAttribute(a.name, fonts[a.name][a.value]);
      }
    };
    clones.forEach(remap);
    let first = true;
    for (const item of els(pkg, OPF, "item").filter((n) =>
      /^section\d+$/.test(n.getAttribute("id")),
    )) {
      const path = item.getAttribute("href");
      if (!files[path]) throw Error("HWPX 첨부의 본문 누락");
      const section = xml(strFromU8(files[path]));
      for (const p of children(section.documentElement)) {
        for (const tag of ["secPr", "colPr", "linesegarray"])
          els(p, HP, tag).forEach(remove);
        for (const ctrl of els(p, HP, "ctrl"))
          if (!children(ctrl).length) remove(ctrl);
        remap(p);
        for (const el of [p, ...els(p, "*", "*")])
          if (el.namespaceURI === HP && el.hasAttribute("id"))
            el.setAttribute("id", ++this.id);
        if (first) {
          p.setAttribute("pageBreak", "1");
          first = false;
        }
        this.blocks.push(serialize(p));
      }
    }
  }
  save(preview = "") {
    const first = `<hp:p id="${++this.id}" paraPrIDRef="${this.paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${this.styles.body}">${base.sectionProperties}<hp:ctrl>${base.columnProperties}</hp:ctrl><hp:t/></hp:run></hp:p>`,
      ns = Object.entries(NS)
        .map(([k, v]) => `xmlns:${k}="${v}"`)
        .join(" ");
    const section = `<?xml version="1.0" encoding="UTF-8"?><hs:sec ${ns}>${first}${this.blocks.join("")}</hs:sec>`;
    xml(section);
    const pkg = `<?xml version="1.0" encoding="UTF-8"?><opf:package xmlns:opf="${OPF}" version="" unique-identifier="" id=""><opf:metadata><opf:title>2026 AI 디지털 교사 동아리 정산서</opf:title><opf:language>ko</opf:language></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/>${this.items.join("")}</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
    const previewBytes = new Uint8Array(preview.length * 2),
      view = new DataView(previewBytes.buffer);
    for (let i = 0; i < preview.length; i++)
      view.setUint16(i * 2, preview.charCodeAt(i), true);
    return zipSync(
      {
        mimetype: [strToU8("application/hwp+zip"), { level: 0 }],
        "version.xml": strToU8(base.version),
        "Contents/header.xml": strToU8(serialize(this.header)),
        "Contents/section0.xml": strToU8(section),
        "Contents/content.hpf": strToU8(pkg),
        "settings.xml": strToU8(base.settings),
        "META-INF/container.xml": strToU8(base.container),
        "META-INF/manifest.xml": strToU8(base.manifest),
        "META-INF/container.rdf": strToU8(base.rdf),
        "Preview/PrvText.txt": previewBytes,
        ...this.binaries,
      },
      { level: 6 },
    );
  }
}
async function imageDimensions(bytes, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
      image.onerror = () => reject(Error("첨부 이미지를 읽을 수 없습니다."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function readEvidence(file) {
  if (!file.dataUrl) throw Error(`${file.name}: 첨부 원본이 없습니다.`);
  const r = await fetch(file.dataUrl);
  if (!r.ok) throw Error(`${file.name}: 원본 다운로드 실패`);
  return new Uint8Array(await r.arrayBuffer());
}
export async function appendPdf(doc, bytes, name, progress, options = {}) {
  const pdfjs = options.pdfjs || await import("pdfjs-dist");
  if (!options.pdfjs) {
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  const loadingTask = pdfjs.getDocument({ data: bytes, ...options.pdfOptions });
  const pdf = await loadingTask.promise;
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      progress(`${name} ${n}/${pdf.numPages}쪽 처리 중…`);
      const page = await pdf.getPage(n),
        initial = page.getViewport({ scale: 1 }),
        viewport = page.getViewport({
          scale: Math.min(2, 2200 / initial.width),
        }),
        canvas = options.createCanvas ? options.createCanvas() : document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw Error("PDF 페이지 변환 실패");
      doc.p(`${name} (${n}/${pdf.numPages})`, "heading", true);
      await doc.image(new Uint8Array(await blob.arrayBuffer()), "image/png", [
        canvas.width,
        canvas.height,
      ]);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
}
export async function buildSettlementHwpx(state, progress = () => {}) {
  const doc = new HwpxDocument(),
    p = state.project,
    entries = state.entries.filter((e) => e.status !== "rejected"),
    sum = (rows) => rows.reduce((s, e) => s + Number(e.amount || 0), 0),
    spent = sum(entries),
    paid = sum(entries.filter((e) => e.paid));
  doc.p("2026 AI 디지털 교사 동아리", "title");
  doc.p("운영비 정산서 및 집행 내역", "title");
  doc.table(
    [
      ["항목", "내용"],
      ["학교명", p.school],
      ["동아리명", p.clubName],
      ["학교장 성명", p.principalName],
      ["학교 주소", p.schoolAddress],
      ["학교 대표 전화", p.schoolPhone],
      ["담당자 성명", p.managerName],
      ["휴대전화", p.managerPhone],
      ["이메일", p.managerEmail],
    ],
    [1, 3],
  );
  doc.table(
    [
      ["운영비", "집행액", "집행잔액", "이자"],
      [
        money(p.totalBudget),
        money(spent),
        money(Number(p.totalBudget) - spent),
        money(p.interest),
      ],
    ],
    [1, 1, 1, 1],
  );
  doc.p("위와 같이 2026년 동아리 운영비 정산 보고서를 제출합니다.");
  doc.p("붙임: 집행 내역 1부. 끝.");
  doc.p("2026년      월      일");
  doc.p("학교장:                      (직인)");
  doc.p("부산광역시교육감 귀하");
  doc.p("운영비 실적 총괄표", "heading", true);
  doc.table(
    [
      ["순번", "예산 구분", "총 소요 예산", "비고"],
      ...Object.entries(categories).map(([key, label], i) => [
        i + 1,
        label,
        money(sum(entries.filter((e) => e.category === key))),
        key === "research" ? "50% 이내" : key === "meeting" ? "10% 이내" : "",
      ]),
      ["", "합계", money(spent), ""],
    ],
    [1, 3, 2, 2],
  );
  doc.p(
    `지급완료액: ${money(paid)} / 미지급액: ${money(spent - paid)}`,
    "small",
  );
  for (const [category, label] of Object.entries(categories)) {
    doc.p(`${label} 지출 세부 내역`, "heading", true);
    const rows = entries.filter((e) => e.category === category);
    doc.table(
      [
        ["No", "예산 구분", "지출 일자", "세부 내역", "소요 예산", "증빙번호"],
        ...(rows.length
          ? rows.map((e, i) => [
              i + 1,
              label,
              e.date,
              e.description,
              money(e.amount),
              e.evidenceNo,
            ])
          : [["", label, "", "집행 내역 없음", money(0), ""]]),
        ["", "합계", "", "", money(sum(rows)), ""],
      ],
      [0.5, 1.2, 1.2, 3.5, 1.4, 1],
    );
    for (const e of rows) {
      if (category === "meeting" && !e.attachments?.meetingMinutes?.length) {
        const m = e.meeting || {},
          names = attendeeNames(m.attendees);
        if (!m.topic || !m.content || !names.length)
          throw Error(
            `${e.evidenceNo || e.date}: 협의회 기록 또는 협의록 원본을 등록하세요.`,
          );
        doc.p(`${e.clubName || p.clubName} 협의록`, "heading", true);
        doc.table(
          [
            ["항목", "내용"],
            [
              "협의 일시",
              `${e.date} ${m.startTime || ""} ~ ${m.endTime || ""}`,
            ],
            ["협의 장소", m.location],
            ["참석 인원", `${names.length}명`],
            ["협의 주제", m.topic],
            ["협의 내용", m.content],
            ["참석자 명단", names.join(", ")],
            ["불참자", m.absent],
            ["비고", e.notes],
          ],
          [1, 4],
        );
      }
      doc.p(
        `${e.evidenceNo || e.date} ${e.description} — 증빙 자료`,
        "heading",
        true,
      );
      doc.p(`${e.date} / ${e.vendor || ""} / ${money(e.amount)}`, "small");
      for (const [type, files] of Object.entries(e.attachments || {}))
        for (const file of files || []) {
          progress(`${file.name} 처리 중…`);
          const bytes = await readEvidence(file);
          if (/\.hwpx$/i.test(file.name)) {
            doc.p(`${labels[type] || type}: ${file.name}`, "small");
            doc.importHwpx(bytes);
          } else if (
            file.type === "application/pdf" ||
            /\.pdf$/i.test(file.name)
          )
            await appendPdf(doc, bytes, file.name, progress);
          else if (
            file.type?.startsWith("image/") ||
            /\.(jpe?g|png|webp)$/i.test(file.name)
          ) {
            doc.p(`${labels[type] || type}: ${file.name}`, "heading", true);
            await doc.image(
              bytes,
              file.type?.startsWith("image/")
                ? file.type
                : /\.png$/i.test(file.name)
                  ? "image/png"
                  : "image/jpeg",
            );
          } else throw Error(`${file.name}: 지원하지 않는 증빙 파일입니다.`);
        }
    }
  }
  progress("HWPX 파일 생성 중…");
  return doc.save(
    `${p.school || ""} ${p.clubName || ""} 정산서\n집행액 ${money(spent)}`,
  );
}
