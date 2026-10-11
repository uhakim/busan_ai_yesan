// A constrained preview for the single-page 협의록 form. Unsupported layouts abort export.
// The original HWPX remains attached; this is a readable page image for PowerPoint.
import { unzipSync, strFromU8 } from "fflate";
const HP = "http://www.hancom.co.kr/hwpml/2011/paragraph",
  HC = "http://www.hancom.co.kr/hwpml/2011/core";
const els = (n, ns, tag) => Array.from(n.getElementsByTagNameNS(ns, tag));
const children = (n) =>
  Array.from(n.childNodes).filter((n) => n.nodeType === 1);
const parse = (s) => new DOMParser().parseFromString(s, "application/xml");
function directTables(node) {
  return els(node, HP, "tbl").filter((t) => {
    let p = t.parentNode;
    while (p && p !== node) {
      if (p.localName === "tbl") return false;
      p = p.parentNode;
    }
    return true;
  });
}
export async function renderMeetingHwpx(bytes, options = {}) {
  const files = unzipSync(bytes),
    sections = Object.keys(files).filter((p) =>
      /^Contents\/section\d+\.xml$/.test(p),
    );
  if (sections.length !== 1)
    throw Error("여러 구역의 HWPX는 협의록을 PDF로 변환하여 함께 등록하세요.");
  const doc = parse(strFromU8(files[sections[0]])),
    tables = directTables(doc),
    tbl = tables[0];
  if (
    tables.length !== 1 ||
    Number(tbl.getAttribute("rowCnt")) !== 7 ||
    Number(tbl.getAttribute("colCnt")) !== 4
  )
    throw Error(
      "PPTX 협의록 미리보기는 기존 7행 협의록 양식을 지원합니다. 다른 양식은 PDF로 등록하세요.",
    );
  const canvas = options.createCanvas
    ? options.createCanvas()
    : document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1980;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1400, 1980);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  const font = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
    margin = 120,
    width = 1160;
  function lines(text, x, y, w, size = 22, center = false) {
    ctx.font = `${size}px ${font}`;
    let yy = y;
    for (const para of String(text).split("\n")) {
      let line = "";
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > w && line) {
          ctx.fillText(
            line,
            center ? x + (w - ctx.measureText(line).width) / 2 : x,
            yy,
          );
          yy += size * 1.35;
          line = "";
        }
        line += ch;
      }
      ctx.fillText(
        line,
        center ? x + (w - ctx.measureText(line).width) / 2 : x,
        yy,
      );
      yy += size * 1.35;
    }
    return yy;
  }
  function ownText(node) {
    return (node.localName === "p" ? [node] : els(node, HP, "p"))
      .filter((p) => {
        let n = p.parentNode;
        while (n && n !== node) {
          if (n.localName === "tbl") return false;
          n = n.parentNode;
        }
        return true;
      })
      .map((p) =>
        els(p, HP, "t")
          .filter((t) => {
            let n = t.parentNode;
            while (n && n !== p) {
              if (n.localName === "tbl") return false;
              n = n.parentNode;
            }
            return true;
          })
          .map((t) => t.textContent)
          .join(""),
      )
      .filter(Boolean)
      .join("\n");
  }
  const headings = children(doc.documentElement)
    .filter((p) => p.localName === "p" && !els(p, HP, "tbl").length)
    .map(ownText)
    .filter(Boolean);
  let top = 100;
  for (const h of headings)
    top = lines(h, margin, top, width, h.includes("협의") ? 30 : 22, true) + 20;
  const rows = children(tbl).filter((n) => n.localName === "tr"),
    total = children(rows[0])
      .filter((n) => n.localName === "tc")
      .reduce(
        (v, c) =>
          v +
          Number(
            children(c)
              .find((n) => n.localName === "cellSz")
              .getAttribute("width"),
          ),
        0,
      ),
    scale = width / total;
  async function drawTable(table, x, y, w, maxHeight = Infinity) {
    const rows = children(table).filter((n) => n.localName === "tr");
    const total = children(rows[0])
        .filter((n) => n.localName === "tc")
        .reduce(
          (v, c) =>
            v +
            Number(
              children(c)
                .find((n) => n.localName === "cellSz")
                .getAttribute("width"),
            ),
          0,
        ),
      s = w / total;
    const rawHeight = rows.reduce(
        (h, r) =>
          h +
          Math.max(
            ...children(r)
              .filter((n) => n.localName === "tc")
              .map((c) =>
                Number(
                  children(c)
                    .find((n) => n.localName === "cellSz")
                    .getAttribute("height"),
                ),
              ),
          ) *
            s,
        0,
      ),
      heightScale = Math.min(1, maxHeight / rawHeight);
    let yy = y;
    for (const row of rows) {
      let xx = x;
      const cells = children(row).filter((n) => n.localName === "tc"),
        height =
          Math.max(
            ...cells.map((c) =>
              Number(
                children(c)
                  .find((n) => n.localName === "cellSz")
                  .getAttribute("height"),
              ),
            ),
          ) *
          s *
          heightScale;
      for (const c of cells) {
        const sz = children(c).find((n) => n.localName === "cellSz"),
          cw = Number(sz.getAttribute("width")) * s;
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1.3;
        ctx.strokeRect(xx, yy, cw, height);
        const sub = els(c, HP, "subList")[0],
          nested = directTables(sub),
          pictures = els(sub, HP, "pic"),
          text = ownText(sub);
        if (text) {
          const size = 22,
            needed =
              text
                .split("\n")
                .reduce(
                  (n, line) =>
                    n +
                    Math.max(
                      1,
                      Math.ceil(ctx.measureText(line).width / (cw - 20)),
                    ),
                  0,
                ) *
              size *
              1.35;
          if (needed > height - 14)
            throw Error(
              "협의록 내용이 미리보기 칸을 초과합니다. PDF 협의록을 등록하세요.",
            );
          lines(
            text,
            xx + 10,
            yy + Math.max(9, (height - needed) / 2),
            cw - 20,
            size,
            cw < 300,
          );
        }
        for (const n of nested)
          await drawTable(n, xx + 8, yy + 8, cw - 16, height - 16);
        for (const pic of pictures) {
          const ref = els(pic, HC, "img")[0]?.getAttribute("binaryItemIDRef");
          const path = Object.keys(files).find(
            (p) =>
              p.startsWith("BinData/") &&
              p.split("/").pop().split(".")[0] === ref,
          );
          if (!path) throw Error("협의록 사진을 찾을 수 없습니다.");
          const image = options.loadImage
            ? await options.loadImage(files[path])
            : await new Promise((resolve, reject) => {
                const url = URL.createObjectURL(new Blob([files[path]]));
                const im = new Image();
                im.onload = () => {
                  URL.revokeObjectURL(url);
                  resolve(im);
                };
                im.onerror = () => {
                  URL.revokeObjectURL(url);
                  reject(Error("협의록 사진 읽기 실패"));
                };
                im.src = url;
              });
          const iw = image.naturalWidth || image.width,
            ih = image.naturalHeight || image.height,
            ratio = Math.min((cw - 20) / iw, (height - 20) / ih);
          ctx.drawImage(
            image,
            xx + (cw - iw * ratio) / 2,
            yy + (height - ih * ratio) / 2,
            iw * ratio,
            ih * ratio,
          );
        }
        xx += cw;
      }
      yy += height;
    }
    return yy;
  }
  const height =
    rows.reduce(
      (s, r) =>
        s +
        Math.max(
          ...children(r)
            .filter((n) => n.localName === "tc")
            .map((c) =>
              Number(
                children(c)
                  .find((n) => n.localName === "cellSz")
                  .getAttribute("height"),
              ),
            ),
        ),
      0,
    ) * scale;
  if (top + height > 1880)
    throw Error("협의록이 한 페이지를 초과합니다. PDF 협의록을 등록하세요.");
  await drawTable(tbl, margin, top, width);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw Error("협의록 이미지 변환 실패");
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    dimensions: [1400, 1980],
  };
}
