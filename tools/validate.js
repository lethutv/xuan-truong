// Kiểm tra ngân hàng câu hỏi: node tools/validate.js
// Cần katex: chạy `npm i katex` một lần trong thư mục de-toan (hoặc thư mục cha).
const path = require('path');
global.window = {};
const root = path.join(__dirname, '..');
require(path.join(root, 'js/curriculum.js'));
const fs = require('fs');
for (const f of fs.readdirSync(path.join(root, 'js')).filter(f => /^bank-.*\.js$/.test(f)).sort()) require(path.join(root, 'js', f));
require(path.join(root, 'js/figures.js'));
let katex = null;
try { katex = require('katex'); } catch (e) { try { katex = require(path.join(root, 'vendor/katex/katex.min.js')); } catch (e2) {} }

const Q = window.QBANK, C = window.CURRICULUM;
const chapters = {};
for (const g of Object.keys(C)) for (const s of [1, 2]) for (const c of C[g][s]) chapters[c.id] = c;
const errs = []; const ids = new Set(); const stats = {};
const texts = (q) => [q.content, q.explanation, q.answer, ...(q.options || []), ...(q.statements || [])].filter(x => typeof x === 'string');
for (const q of Q) {
  const E = (m) => errs.push(`${q.id}: ${m}`);
  if (ids.has(q.id)) E('trùng id'); ids.add(q.id);
  const c = chapters[q.chapter]; if (!c) E('chương không tồn tại'); else if (!c.topics.includes(q.topic)) E('topic không khớp: ' + q.topic);
  if (!c || String(q.grade) !== q.chapter.split('-')[0]) E('lớp không khớp chương');
  if (!['mcq', 'tf', 'short', 'essay'].includes(q.type)) E('type');
  if (!['NB', 'TH', 'VD'].includes(q.level)) E('level');
  if (q.type === 'mcq') { if (q.options.length !== 4 || !(q.answer >= 0 && q.answer < 4)) E('mcq'); if (new Set(q.options).size !== 4) E('phương án trùng nhau'); }
  if (q.type === 'tf' && (q.statements.length !== 4 || q.answer.length !== 4 || q.answer.some(a => typeof a !== 'boolean'))) E('tf');
  if (q.type === 'short' && (typeof q.answer !== 'string' || q.answer.length > 4 || /\./.test(q.answer))) E('đáp án ngắn không đúng định dạng: ' + q.answer);
  for (const t of texts(q)) {
    if (/[\t\f\b\v\r]/.test(t)) E('ký tự điều khiển (thiếu \\\\?)');
    if (((t.match(/\$/g) || []).length) % 2) E('số dấu $ lẻ');
    if (katex) for (const m of t.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
      try { katex.renderToString(m[1] || m[2], { throwOnError: true, strict: 'error' }); } catch (e) { E('LaTeX: ' + e.message.slice(0, 120)); }
    }
  }
  if (q.figure) { try { const r = window.Figures.render(q.figure); if (!r || !(r.svg || r.img)) E('hình rỗng'); } catch (e) { E('Hình vẽ: ' + e.message); } }
  const k = `${q.grade} ${q.type} ${q.level}`; stats[k] = (stats[k] || 0) + 1;
}
const pos = [0, 0, 0, 0]; Q.filter(q => q.type === 'mcq').forEach(q => pos[q.answer]++);
console.log(`Tổng ${Q.length} câu. Vị trí đáp án đúng A/B/C/D: ${pos.join('/')}. ${katex ? 'Đã kiểm tra LaTeX bằng KaTeX.' : 'KHÔNG có KaTeX – bỏ qua kiểm tra LaTeX.'}`);
console.log('Số câu có hình: ' + Q.filter(q => q.figure).length);
console.log(Object.entries(stats).map(([k, v]) => k + ': ' + v).join(' | '));
if (errs.length) { console.log('\nLỖI (' + errs.length + '):\n' + errs.join('\n')); process.exitCode = 1; } else console.log('Không phát hiện lỗi.');
