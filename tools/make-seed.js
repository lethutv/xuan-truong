// Sinh supabase/seed.sql từ các file ngân hàng câu hỏi: node tools/make-seed.js
const fs = require('fs'), path = require('path');
global.window = {};
const root = path.join(__dirname, '..');
for (const f of fs.readdirSync(path.join(root, 'js')).filter(f => /^bank-.*\.js$/.test(f)).sort()) require(path.join(root, 'js', f));
const poolOf = (q) => { if (q.pool) return q.pool; const m = /-(\d+)$/.exec(q.id); return m && +m[1] >= 21 ? 'exam' : 'practice'; };
const lit = (s) => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const rows = window.QBANK.map(q => {
  const data = Object.assign({}, q, { pool: poolOf(q) });
  const json = JSON.stringify(data);
  let tag = 'q'; while (json.includes('$' + tag + '$')) tag += 'x';
  return `(${lit(q.id)}, 'toan', ${+q.grade}, ${lit(q.chapter)}, ${lit(q.topic)}, ${lit(q.type)}, ${lit(q.level)}, ${lit(poolOf(q))}, $${tag}$${json}$${tag}$::jsonb, null)`;
});
const sql = `-- Ngân hàng câu hỏi mẫu (${rows.length} câu). Chạy SAU schema.sql trong SQL Editor.
-- Câu đã có (cùng id) sẽ được giữ nguyên, không ghi đè chỉnh sửa của giáo viên.
insert into public.questions (id, subject, grade, chapter, topic, type, level, pool, data, owner_id) values
${rows.join(',\n')}
on conflict (id) do nothing;
select pool, count(*) from public.questions group by pool;
`;
fs.writeFileSync(path.join(root, 'supabase', 'seed.sql'), sql);
console.log('seed.sql:', rows.length, 'câu,', Math.round(sql.length / 1024), 'KB');
