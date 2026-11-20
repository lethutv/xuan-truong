// Xuất file Word (.docx) với công thức là phương trình Word thật (OMML) – sửa được trong Word.
(function (G) {
  'use strict';
  const DT = G.DT;
  const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ----- LaTeX -> OMML -----
  const cache = new Map();
  function texToOmml(tex) {
    if (cache.has(tex)) return cache.get(tex);
    let out;
    try {
      const src = tex.replace(/\\[dt]frac(?![a-zA-Z])/g, '\\frac').replace(/\\displaystyle(?![a-zA-Z])/g, '');
      const html = G.katex.renderToString(src, { output: 'mathml', throwOnError: true });
      const mml = html.match(/<math[\s\S]*<\/math>/)[0]
        .replace(/<annotation[\s\S]*?<\/annotation>/g, '')
        .replace(/<\/?semantics>/g, '');
      // mml2omml không mã hóa lại <, >, & trong m:t -> tự mã hóa
      const raw = G.mml2omml(mml).replace(/(<m:t(?:\s[^>]*)?>)([\s\S]*?)(<\/m:t>)/g, (_, a, t, b) =>
        a + t.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + b);
      out = cleanOmml(raw);
      if (/parsererror|undefined/.test(out)) throw new Error('omml');
    } catch (e) {
      console.warn('Không chuyển được công thức sang Word:', tex, e.message);
      out = run(tex, { italic: true }); // dự phòng: để LaTeX dạng chữ
    }
    cache.set(tex, out);
    return out;
  }
  function cleanOmml(omml) {
    const doc = new DOMParser().parseFromString(
      `<root xmlns:m="${M_NS}" xmlns:w="${W_NS}">${omml}</root>`, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('omml parse');
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const p = ch.parentNode;
          if (p.localName !== 't' && ch.nodeValue.trim()) { // chữ nằm ngoài m:t -> bọc lại
            const r = doc.createElementNS(M_NS, 'm:r'), t = doc.createElementNS(M_NS, 'm:t');
            t.setAttribute('xml:space', 'preserve'); t.textContent = ch.nodeValue; r.appendChild(t); p.replaceChild(r, ch);
          } else if (p.localName !== 't') p.removeChild(ch);
        } else if (ch.nodeType === 1) {
          if (ch.localName === 'sty' && /undefined/.test(ch.getAttribute('m:val') || '')) { ch.parentNode.removeChild(ch); continue; }
          if (ch.localName === 'r' && ch.namespaceURI === M_NS) { // thứ tự: m:rPr, w:rPr, m:t
            const mr = [...ch.childNodes].find(x => x.localName === 'rPr' && x.namespaceURI === M_NS);
            const wr = [...ch.childNodes].find(x => x.localName === 'rPr' && x.namespaceURI === W_NS);
            if (wr) ch.removeChild(wr);
            if (mr) ch.insertBefore(mr, ch.firstChild);
            // m:t rỗng
            [...ch.childNodes].forEach(x => { if (x.localName === 't' && !x.textContent) ch.removeChild(x); });
            if (![...ch.childNodes].some(x => x.localName === 't')) { ch.parentNode.removeChild(ch); continue; }
          }
          walk(ch);
        }
      }
    };
    walk(doc.documentElement);
    let s = '';
    for (const ch of doc.documentElement.childNodes) s += new XMLSerializer().serializeToString(ch);
    return s.replace(/ xmlns:(m|w)="[^"]*"/g, '');
  }

  // ----- Khối dựng -----
  function run(text, o = {}) {
    if (text === '') return '';
    const pr = (o.bold ? '<w:b/>' : '') + (o.italic ? '<w:i/>' : '') + (o.underline ? '<w:u w:val="single"/>' : '') +
      (o.color ? `<w:color w:val="${o.color}"/>` : '') + (o.size ? `<w:sz w:val="${o.size * 2}"/><w:szCs w:val="${o.size * 2}"/>` : '');
    return `<w:r>${pr ? '<w:rPr>' + pr + '</w:rPr>' : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }
  const tab = '<w:r><w:tab/></w:r>';
  // Văn bản có $...$ -> runs
  function rich(text, o = {}) {
    let out = ''; const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g; let last = 0, m;
    text = String(text || '');
    while ((m = re.exec(text))) {
      out += run(text.slice(last, m.index), o);
      out += texToOmml((m[1] || m[2]).trim());
      last = re.lastIndex;
    }
    return out + run(text.slice(last), o);
  }
  function para(inner, o = {}) {
    let ppr = '';
    if (o.align) ppr += `<w:jc w:val="${o.align}"/>`;
    if (o.tabs) ppr += '<w:tabs>' + o.tabs.map(t => `<w:tab w:val="left" w:pos="${t}"/>`).join('') + '</w:tabs>';
    if (o.indent) ppr += `<w:ind w:left="${o.indent}"/>`;
    if (o.before != null || o.after != null) ppr += `<w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 60 : o.after}"/>`;
    if (o.keepNext) ppr += '<w:keepNext/>';
    return `<w:p>${ppr ? '<w:pPr>' + ppr + '</w:pPr>' : ''}${inner}</w:p>`;
  }
  // nhiều dòng (\n) -> nhiều đoạn; prefix chỉ ở đoạn đầu
  function richParas(text, prefix = '', o = {}) {
    return String(text || '').split('\n').map((line, i) => para((i === 0 ? prefix : '') + rich(line), o)).join('');
  }
  function table(rows, o = {}) {
    const borders = o.noBorder ? '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
      : '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:color="000000"/>`).join('') + '</w:tblBorders>';
    const widths = o.widths || rows[0].map(() => Math.floor(9600 / rows[0].length));
    return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${borders}<w:tblLayout w:type="fixed"/></w:tblPr>` +
      '<w:tblGrid>' + widths.map(w => `<w:gridCol w:w="${w}"/>`).join('') + '</w:tblGrid>' +
      rows.map((r, ri) => '<w:tr>' + r.map((c, ci) => `<w:tc><w:tcPr><w:tcW w:w="${widths[ci]}" w:type="dxa"/></w:tcPr>${typeof c === 'string' && !c.startsWith('<w:p') ? para(run(c, { bold: o.headerBold && ri === 0 }), { align: o.center ? 'center' : null, after: 0 }) : c}</w:tc>`).join('') + '</w:tr>').join('') +
      '</w:tbl>' + para('', { after: 0 });
  }

  // ----- Nội dung đề -----
  function headerBlock(exam, code) {
    const h = exam.header;
    const left = para(run(h.school || '', { bold: true }), { align: 'center', after: 0 }) +
      para(run('TỔ TOÁN', { bold: true }), { align: 'center', after: 0 }) +
      (code ? para(run('Mã đề: ' + code, { bold: true }), { align: 'center', after: 0 }) : '');
    const right = para(run(h.title || '', { bold: true }), { align: 'center', after: 0 }) +
      para(run('NĂM HỌC ' + (h.year || ''), { bold: true }), { align: 'center', after: 0 }) +
      para(run('Môn: TOÁN – Lớp ' + exam.config.grade, { bold: true }), { align: 'center', after: 0 }) +
      para(run('Thời gian làm bài: ' + exam.config.time + ' phút, không kể thời gian phát đề', { italic: true }), { align: 'center', after: 0 });
    let s = table([[left, right]], { noBorder: true, widths: [3900, 5900] });
    s += para(run('Họ và tên thí sinh: ……………………………………………  Số báo danh: ……………………'), {});
    return s;
  }
  function partIntro(type, n, exam) {
    const p = DT.fmtNum(exam.points[type] || 0);
    const range = n > 1 ? `từ câu 1 đến câu ${n}` : 'câu 1';
    switch (type) {
      case 'mcq': return `Thí sinh trả lời ${range}. Mỗi câu hỏi thí sinh chỉ chọn một phương án (${p} điểm/câu).`;
      case 'tf': return `Thí sinh trả lời ${range}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;
      case 'short': return `Thí sinh trả lời ${range} (${p} điểm/câu).`;
      default: return `Thí sinh trình bày lời giải ${range}.`;
    }
  }
  function examBody(exam, version) {
    let s = headerBlock(exam, version.code);
    const groups = DT.TYPE_ORDER.map(t => version.items.filter(i => i.q.type === t)).filter(g => g.length);
    const partNo = ['I', 'II', 'III', 'IV'];
    groups.forEach((items, gi) => {
      const t = items[0].q.type;
      const label = DT.TYPES[t].part.replace(/^PHẦN [IV]+\./, 'PHẦN ' + partNo[gi] + '.');
      s += para(run(label + '. ', { bold: true }) + run(partIntro(t, items.length, exam)), { before: 120, keepNext: true });
      items.forEach((it, i) => {
        const q = it.q; const pre = run('Câu ' + (i + 1) + '. ', { bold: true }) + (t === 'essay' ? run('(' + DT.fmtNum(exam.points.essay) + ' điểm) ', { italic: true }) : '');
        s += richParas(q.content, pre);
        if (q.figure) s += figurePara(q.figure);
        if (t === 'mcq') {
          const opts = DT.mcqOptions(it);
          const maxLen = Math.max(...opts.map(o => o.replace(/\$|\\[a-z]+|[{}]/g, '').length));
          const L = DT.LETTERS;
          if (maxLen <= 12) s += para(opts.map((o, k) => (k ? tab : '') + run(L[k] + '. ', { bold: true }) + rich(o)).join(''), { tabs: [2400, 4800, 7200], indent: 280 });
          else if (maxLen <= 30) s += para(run('A. ', { bold: true }) + rich(opts[0]) + tab + run('B. ', { bold: true }) + rich(opts[1]), { tabs: [4800], indent: 280 }) +
            para(run('C. ', { bold: true }) + rich(opts[2]) + tab + run('D. ', { bold: true }) + rich(opts[3]), { tabs: [4800], indent: 280 });
          else opts.forEach((o, k) => { s += para(run(L[k] + '. ', { bold: true }) + rich(o), { indent: 280 }); });
        } else if (t === 'tf') {
          q.statements.forEach((st, k) => { s += para(run('abcd'[k] + ') ', { bold: true }) + rich(st), { indent: 280 }); });
        }
      });
    });
    s += para(run('------------- HẾT -------------', { bold: true }), { align: 'center', before: 200 });
    s += para(run('Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.', { italic: true }), { align: 'center' });
    return s;
  }
  function keyBody(exam, detailVersion) {
    const h = exam.header;
    let s = para(run('ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM', { bold: true, size: 14 }), { align: 'center', after: 0 }) +
      para(run((h.title || '') + ' – MÔN TOÁN LỚP ' + exam.config.grade + ' – NĂM HỌC ' + (h.year || ''), { bold: true }), { align: 'center' });
    for (const v of exam.versions) {
      const k = DT.answerKey(v);
      s += para(run('Mã đề ' + v.code, { bold: true, underline: true }), { before: 160, keepNext: true });
      if (k.mcq.length) {
        s += para(run('Phần I (mỗi câu đúng ' + DT.fmtNum(exam.points.mcq) + ' điểm)', { bold: true }), { keepNext: true });
        for (let i = 0; i < k.mcq.length; i += 12) {
          const chunk = k.mcq.slice(i, i + 12);
          s += table([['Câu', ...chunk.map(x => String(x.no))], ['Đáp án', ...chunk.map(x => x.ans)]], { center: true, headerBold: true, widths: [1100, ...chunk.map(() => 700)] });
        }
      }
      if (k.tf.length) {
        s += para(run('Phần II', { bold: true }) + run(' (mỗi câu tối đa ' + DT.fmtNum(exam.points.tf) + ' điểm: đúng 1 ý được 10%, 2 ý 25%, 3 ý 50%, 4 ý 100% số điểm)', { italic: true }), { keepNext: true });
        s += table([['Câu', 'Đáp án'], ...k.tf.map(x => [String(x.no), x.ans])], { headerBold: true, widths: [1100, 5000] });
      }
      if (k.short.length) {
        s += para(run('Phần III (mỗi câu đúng ' + DT.fmtNum(exam.points.short) + ' điểm)', { bold: true }), { keepNext: true });
        s += table([['Câu', ...k.short.map(x => String(x.no))], ['Đáp án', ...k.short.map(x => x.ans)]], { center: true, headerBold: true, widths: [1100, ...k.short.map(() => 1000)] });
      }
      if (k.essay.length) {
        s += para(run('Phần tự luận: ', { bold: true }) + rich(k.essay.map(x => 'Câu ' + x.no + ': ' + x.ans.replace(/[.;\s]+$/, '')).join('; ') + '.'));
      }
    }
    if (detailVersion) {
      s += para(run('LỜI GIẢI CHI TIẾT – MÃ ĐỀ ' + detailVersion.code, { bold: true }), { before: 240, align: 'center' });
      const partNo = ['I', 'II', 'III', 'IV']; let gi = 0;
      for (const t of DT.TYPE_ORDER) {
        const items = detailVersion.items.filter(i => i.q.type === t); if (!items.length) continue;
        s += para(run('Phần ' + partNo[gi++] + '. ' + DT.TYPES[t].label, { bold: true }), { before: 120 });
        items.forEach((it, i) => {
          let ans = '';
          if (t === 'mcq') ans = 'Chọn ' + DT.mcqCorrectLetter(it) + '. ';
          else if (t === 'tf') ans = it.q.answer.map((b, k) => 'abcd'[k] + ') ' + (b ? 'Đúng' : 'Sai')).join('; ') + '. ';
          else ans = 'Đáp số: ' + it.q.answer + '. ';
          s += para(run('Câu ' + (i + 1) + '. ', { bold: true }) + rich(ans, { bold: true }));
          s += richParas(it.q.explanation || '(Chưa có lời giải)', '', { indent: 280 });
        });
      }
    }
    return s;
  }


  // ----- Hình vẽ -> ảnh PNG nhúng trong Word -----
  let IMG = { list: [], map: new Map() };
  const EMU = 9525; // 1px (96dpi)
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('không tải được hình')); im.src = src; });
  }
  async function rasterize(fig) {
    const r = G.Figures.render(fig);
    let src, w, h;
    if (r.svg) {
      w = +(r.svg.match(/width="([\d.]+)"/) || [])[1] || 300; h = +(r.svg.match(/height="([\d.]+)"/) || [])[1] || 200;
      src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
    } else src = r.img;
    const im = await loadImage(src);
    if (!r.svg) { w = im.naturalWidth; h = im.naturalHeight; }
    const scale = r.svg ? 3 : 1; const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // kích thước hiển thị
    let dw = fig.width ? +fig.width : (r.svg ? w : Math.min(w, 320)); dw = Math.min(dw, 600);
    const dh = dw * h / w;
    return { bytes, cx: Math.round(dw * EMU * 0.9), cy: Math.round(dh * EMU * 0.9) };
  }
  async function prepareFigures(versions) {
    IMG = { list: [], map: new Map() };
    const figs = [];
    versions.forEach(v => v.items.forEach(it => { if (it.q.figure) figs.push(it.q.figure); }));
    for (const fig of figs) {
      const key = JSON.stringify(fig); if (IMG.map.has(key)) continue;
      try {
        const r = await rasterize(fig); const n = IMG.list.length + 1;
        const im = Object.assign(r, { rid: 'rIdImg' + n, name: 'image' + n + '.png', id: 1000 + n });
        IMG.list.push(im); IMG.map.set(key, im);
      } catch (e) { console.warn('Không chèn được hình vào Word:', e); }
    }
  }
  function figurePara(fig) {
    const im = IMG.map.get(JSON.stringify(fig));
    if (!im) return para(run('[Hình vẽ]', { italic: true }), { align: 'center' });
    return `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${im.cx}" cy="${im.cy}"/><wp:docPr id="${im.id}" name="Hinh ${im.id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${im.id}" name="${im.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${im.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${im.cx}" cy="${im.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  // ----- Đóng gói docx -----
  function wrapDocument(body) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}" xmlns:m="${M_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  async function build(bodyXml, filename) {
    const zip = new G.JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' + IMG.list.map(im => `<Relationship Id="${im.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${im.name}"/>`).join('') + '</Relationships>');
    IMG.list.forEach(im => zip.file('word/media/' + im.name, im.bytes));
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
    zip.file('word/document.xml', wrapDocument(bodyXml));
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  G.DocxExport = {
    async exam(exam, versions) { await prepareFigures(versions); return build(versions.map(v => examBody(exam, v)).join(pageBreak), fileBase(exam) + (versions.length === 1 ? '_ma' + versions[0].code : '_tat-ca-ma') + '.docx'); },
    async key(exam, detailVersion) { await prepareFigures([]); return build(keyBody(exam, detailVersion), fileBase(exam) + '_dap-an.docx'); },
    _texToOmml: texToOmml
  };
  function fileBase(exam) {
    const s = (exam.name || exam.header.title || 'de').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 50) + '_lop' + exam.config.grade;
  }
})(window);
