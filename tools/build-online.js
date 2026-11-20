// Đóng gói bản TRỰC TUYẾN để đăng lên web (Netlify, Cloudflare Pages, GitHub Pages…):
//   node tools/build-online.js <SUPABASE_URL> <ANON_KEY> ["Tên trường"] [tên-miền, vd c3.louisapham.com]
// Kết quả: thư mục dist/ – KHÔNG chứa các file ngân hàng câu hỏi (câu hỏi nằm trên Supabase, có phân quyền).
const fs = require('fs'), path = require('path');
const [url, key, school, domain] = process.argv.slice(2);
if (!url || !key) { console.error('Cách dùng: node tools/build-online.js <SUPABASE_URL> <ANON_KEY> ["Tên trường"]'); process.exit(1); }
if (/service_role|sb_secret_/i.test(key) || (key.split('.')[1] && /service_role/.test(Buffer.from(key.split('.')[1], 'base64').toString()))) {
  console.error('Đây là khóa BÍ MẬT (service_role/secret). Hãy dùng khóa anon/publishable.'); process.exit(1);
}
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
const copy = (rel) => { const s = path.join(root, rel), d = path.join(dist, rel); fs.cpSync(s, d, { recursive: true }); };
['css', 'vendor'].forEach(copy);
fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'js'))) if (!/^bank-/.test(f) && f !== 'config.js') fs.copyFileSync(path.join(root, 'js', f), path.join(dist, 'js', f));
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script src="js\/bank-[^"]+"><\/script>\n?/g, '');
const ver = Date.now().toString(36); html = html.replace(/\?v=\w+"/g, `?v=${ver}"`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(dist, 'js', 'config.js'), `window.APP_CONFIG = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key, LOGIN_DOMAIN: 'taikhoan.detoan.app', SCHOOL_NAME: school || 'Trường THPT' }, null, 2)};\n`);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
if (domain) fs.writeFileSync(path.join(dist, 'CNAME'), domain.trim() + '\n');
// kiểm tra lần cuối: không còn dữ liệu ngân hàng
const leak = fs.readdirSync(path.join(dist, 'js')).filter(f => /^bank-/.test(f));
if (leak.length || /bank-1\d/.test(html)) { console.error('LỖI: còn file ngân hàng trong dist!'); process.exit(1); }
console.log('Đã tạo dist/ (' + fs.readdirSync(path.join(dist, 'js')).length + ' file js, không có ngân hàng câu hỏi). Kéo thả thư mục dist vào https://app.netlify.com/drop để đăng web.');
