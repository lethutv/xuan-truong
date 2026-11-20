// Ngân hàng bổ sung lớp 11 – Chương I đến V (có hình vẽ). Tự biên soạn.
// Dùng String.raw để viết LaTeX không phải nhân đôi dấu \.
window.QBANK = window.QBANK || [];
(function () {
  const R = String.raw;
  const DIFF = { NB: 1, TH: 2, VD: 3 };
  const Q = (id, topic, type, level, o) => Object.assign({ id, grade: 11, chapter: id.split('-').slice(0, 2).join('-'), topic, type, level, difficulty: DIFF[level], source: 'Tự biên soạn' }, o);

  // Hình cơ bản
  const PYR = () => ({ S: [1.8, 3.6], A: [0, 0], B: [1.2, -1.4], C: [4.6, -1.4], D: [3.4, 0] });
  const pyr = (extra = {}) => Object.assign({ type: 'geo', segs: ['SA', 'SB', 'SC', 'AB', 'BC'], dashed: ['SD', 'AD', 'DC'] }, extra, { points: Object.assign(PYR(), extra.points || {}), segs: ['SA', 'SB', 'SC', 'AB', 'BC'].concat(extra.segs || []), dashed: ['SD', 'AD', 'DC'].concat(extra.dashed || []) });
  const BOX = () => ({ A: [0, 0], B: [3, 0], C: [4.2, 1.2], D: [1.2, 1.2], "A'": [0, 2.5], "B'": [3, 2.5], "C'": [4.2, 3.7], "D'": [1.2, 3.7] });
  const box = (extra = {}) => ({ type: 'geo', points: Object.assign(BOX(), extra.points || {}),
    segs: ['AB', 'BC', "AA'", "BB'", "CC'", "A'B'", "B'C'", "C'D'", "D'A'"].concat(extra.segs || []), dashed: ['AD', 'DC', "DD'"].concat(extra.dashed || []),
    labelPos: Object.assign({ A: 'bl', B: 'br', C: 'r', D: 'tl', "A'": 'l', "B'": 'tr', "C'": 'tr', "D'": 't' }, extra.labelPos || {}), hide: extra.hide });
  const TET = () => ({ A: [2, 3.5], B: [0, 0], C: [2.6, -1], D: [4, 0.2] });
  const hist = (title, ticks, freqs, unit) => {
    // biểu đồ tần số dạng cột (tần số lớn nhất cao 140px)
    const mx = Math.max(...freqs), k = 140 / mx;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="215" viewBox="0 0 340 215" font-family="'Times New Roman', Times, serif" font-size="12">`;
    s += '<line x1="40" y1="180" x2="325" y2="180" stroke="#000"/><line x1="40" y1="180" x2="40" y2="20" stroke="#000"/>';
    freqs.forEach((f, i) => {
      const h = Math.round(f * k), x = 40 + 50 * i, y = 180 - h;
      s += `<rect x="${x}" y="${y}" width="50" height="${h}" fill="#dde6f3" stroke="#000"/><text x="${x + 25}" y="${y - 4}" text-anchor="middle">${f}</text>`;
    });
    ticks.forEach((t, i) => { s += `<text x="${40 + 50 * i}" y="194" text-anchor="middle">${t}</text>`; });
    s += `<text x="325" y="210" text-anchor="end" font-style="italic">${unit}</text><text x="44" y="14" font-style="italic">${title}</text>`;
    return { type: 'svg', svg: s + '</svg>' };
  };

  window.QBANK.push(
    // ===================== CHƯƠNG I =====================
    Q('11-1-21', 'Hàm số lượng giác', 'mcq', 'NB', {
      content: R`Đường cong ở hình bên là đồ thị của hàm số nào dưới đây?`,
      figure: { type: 'graph', fn: 'cos(x)', x: [-3.6, 7], y: [-1.6, 1.6], ticks: false,
        points: [[0, 1, '', { yl: '1' }], [3.1416, -1, '', { xl: 'π', yl: '-1' }], [1.5708, 0, '', { dash: false, xl: 'π/2' }], [6.2832, 1, '', { xl: '2π', yl: '' }]] },
      options: [R`$y=\sin x$`, R`$y=\cos x$`, R`$y=-\cos x$`, R`$y=\tan x$`], answer: 1,
      explanation: R`Đồ thị đi qua điểm $(0;1)$, đạt giá trị nhỏ nhất $-1$ tại $x=\pi$, cắt trục hoành tại $x=\dfrac{\pi}{2}$ và lặp lại sau mỗi $2\pi$. Đó là đồ thị hàm số $y=\cos x$.` }),
    Q('11-1-22', 'Giá trị lượng giác của góc lượng giác', 'mcq', 'NB', {
      content: R`Trên đường tròn lượng giác ở hình bên, điểm $M$ biểu diễn góc lượng giác $(OA, OM)$ có số đo $\dfrac{2\pi}{3}$. Tung độ của điểm $M$ là`,
      figure: { type: 'geo', points: { O: [0, 0], A: [1, 0], "A'": [-1, 0], B: [0, 1], "B'": [0, -1], M: [-0.5, 0.866] }, circles: [{ c: 'O', r: 1 }],
        segs: ["A'A", "B'B", 'OM'], arcs: ['AOM'], labelPos: { O: 'bl', A: 'r', "A'": 'l', B: 't', "B'": 'b', M: 'tl' } },
      options: [R`$-\dfrac{1}{2}$`, R`$\dfrac{1}{2}$`, R`$-\dfrac{\sqrt{3}}{2}$`, R`$\dfrac{\sqrt{3}}{2}$`], answer: 3,
      explanation: R`Tung độ của $M$ bằng $\sin\dfrac{2\pi}{3}=\dfrac{\sqrt{3}}{2}$.` }),
    Q('11-1-23', 'Hàm số lượng giác', 'mcq', 'TH', {
      content: R`Đường cong ở hình bên là đồ thị của hàm số $y=\sin(bx)$ với $b>0$. Chu kì tuần hoàn của hàm số đó là`,
      figure: { type: 'graph', fn: 'sin(2*x)', x: [-0.8, 7], y: [-1.5, 1.5], ticks: false,
        points: [[0.7854, 1, '', { xl: 'π/4', yl: '1' }], [2.3562, -1, '', { xl: '3π/4', yl: '-1' }], [3.1416, 0, '', { dash: false, xl: 'π' }]] },
      options: [R`$2\pi$`, R`$\dfrac{\pi}{2}$`, R`$\pi$`, R`$4\pi$`], answer: 2,
      explanation: R`Từ đồ thị: hàm số đạt giá trị lớn nhất tại $x=\dfrac{\pi}{4}$, nhỏ nhất tại $x=\dfrac{3\pi}{4}$ và trở về $0$ tại $x=\pi$, sau đó lặp lại. Vậy chu kì là $\pi$ (đồ thị của $y=\sin 2x$, chu kì $\dfrac{2\pi}{2}=\pi$).` }),
    Q('11-1-24', 'Công thức lượng giác', 'mcq', 'TH', {
      content: R`Biết $\sin a+\cos a=\dfrac{1}{2}$. Giá trị của $\sin 2a$ bằng`,
      options: [R`$-\dfrac{3}{4}$`, R`$\dfrac{3}{4}$`, R`$-\dfrac{1}{2}$`, R`$\dfrac{1}{4}$`], answer: 0,
      explanation: R`Bình phương hai vế: $1+2\sin a\cos a=\dfrac{1}{4}$, tức là $1+\sin 2a=\dfrac{1}{4}$, nên $\sin 2a=-\dfrac{3}{4}$.` }),
    Q('11-1-25', 'Phương trình lượng giác cơ bản', 'mcq', 'VD', {
      content: R`Hình bên là đồ thị hàm số $y=\sin x$ và đường thẳng $y=\dfrac{1}{2}$ trên đoạn $[0;4\pi]$. Số nghiệm của phương trình $\sin x=\dfrac{1}{2}$ trên đoạn $[0;4\pi]$ là`,
      figure: { type: 'graph', fn: ['sin(x)', '0.5'], domain: [[0, 12.566], [0, 12.566]], x: [-0.5, 13], y: [-1.5, 1.5], ticks: false,
        points: [[12.566, 0, '', { dash: false, xl: '4π' }], [0, 0.5, '', { dash: false, yl: '1/2' }]] },
      options: [R`$2$`, R`$3$`, R`$6$`, R`$4$`], answer: 3,
      explanation: R`Đường thẳng $y=\dfrac{1}{2}$ cắt mỗi "vòm" dương của đồ thị tại 2 điểm. Trên $[0;4\pi]$ có 2 vòm dương nên có 4 nghiệm: $\dfrac{\pi}{6};\ \dfrac{5\pi}{6};\ \dfrac{13\pi}{6};\ \dfrac{17\pi}{6}$.` }),
    Q('11-1-26', 'Hàm số lượng giác', 'mcq', 'VD', {
      content: R`Giá trị nhỏ nhất của hàm số $y=\sin^2 x-4\sin x+5$ là`,
      options: [R`$1$`, R`$10$`, R`$2$`, R`$5$`], answer: 2,
      explanation: R`Đặt $t=\sin x$, $t\in[-1;1]$. Hàm $g(t)=t^2-4t+5$ có đỉnh tại $t=2\notin[-1;1]$ nên nghịch biến trên $[-1;1]$. Giá trị nhỏ nhất là $g(1)=1-4+5=2$, đạt khi $\sin x=1$.` }),
    Q('11-1-27', 'Hàm số lượng giác', 'tf', 'TH', {
      content: R`Hình bên là đồ thị của hàm số $y=\tan x$ (các đường nét đứt là các đường thẳng $x=\pm\dfrac{\pi}{2}$, $x=\pm\dfrac{3\pi}{2}$). Xét tính đúng sai của các mệnh đề sau:`,
      figure: { type: 'graph', fn: ['tan(x)', 'tan(x)', 'tan(x)'], domain: [[-4.8, -1.5808], [-1.5608, 1.5608], [1.5808, 4.8]], x: [-4.8, 4.8], y: [-3, 3], ticks: false,
        asymptotes: { x: [-4.7124, -1.5708, 1.5708, 4.7124] },
        points: [[1.5708, 0, '', { dash: false, xl: 'π/2' }], [-1.5708, 0, '', { dash: false, xl: '-π/2' }], [0.7854, 1, '', { xl: 'π/4', yl: '1' }]] },
      statements: [R`Hàm số $y=\tan x$ tuần hoàn với chu kì $\pi$.`, R`Hàm số $y=\tan x$ đồng biến trên khoảng $\left(-\dfrac{\pi}{2};\dfrac{\pi}{2}\right)$.`,
        R`Phương trình $\tan x=1$ có đúng 2 nghiệm thuộc khoảng $\left(-\dfrac{3\pi}{2};\dfrac{3\pi}{2}\right)$.`, R`Đường thẳng $x=\pi$ là một tiệm cận đứng của đồ thị hàm số $y=\tan x$.`],
      answer: [true, true, false, false],
      explanation: R`a) Đúng: $\tan(x+\pi)=\tan x$ và $\pi$ là số dương nhỏ nhất có tính chất này.
b) Đúng: trên $\left(-\dfrac{\pi}{2};\dfrac{\pi}{2}\right)$ đồ thị đi lên liên tục.
c) Sai: $\tan x=1\Leftrightarrow x=\dfrac{\pi}{4}+k\pi$; trong khoảng đã cho có 3 nghiệm $-\dfrac{3\pi}{4};\ \dfrac{\pi}{4};\ \dfrac{5\pi}{4}$.
d) Sai: hàm số xác định tại $x=\pi$ ($\tan\pi=0$); các tiệm cận đứng là $x=\dfrac{\pi}{2}+k\pi$.` }),
    Q('11-1-28', 'Phương trình lượng giác cơ bản', 'tf', 'VD', {
      content: R`Cho phương trình $\cos 2x=\cos x$. Xét tính đúng sai của các mệnh đề sau:`,
      statements: [R`$x=0$ là một nghiệm của phương trình.`, R`Phương trình tương đương với $2x=x+k2\pi$ hoặc $2x=-x+k2\pi$ $(k\in\mathbb{Z})$.`,
        R`$x=\dfrac{\pi}{3}$ là một nghiệm của phương trình.`, R`Trên đoạn $[0;2\pi]$ phương trình có đúng 4 nghiệm.`],
      answer: [true, true, false, true],
      explanation: R`a) Đúng: $\cos 0=\cos 0$.
b) Đúng: $\cos u=\cos v\Leftrightarrow u=\pm v+k2\pi$.
c) Sai: $\cos\dfrac{2\pi}{3}=-\dfrac{1}{2}\ne\dfrac{1}{2}=\cos\dfrac{\pi}{3}$.
d) Đúng: nghiệm là $x=k2\pi$ hoặc $x=\dfrac{k2\pi}{3}$, gộp lại $x=\dfrac{k2\pi}{3}$. Trên $[0;2\pi]$: $0;\ \dfrac{2\pi}{3};\ \dfrac{4\pi}{3};\ 2\pi$ – có 4 nghiệm.` }),
    Q('11-1-29', 'Giá trị lượng giác của góc lượng giác', 'short', 'TH', {
      content: R`Cho $\tan\alpha=2$. Tính giá trị của biểu thức $P=\dfrac{\sin\alpha+\cos\alpha}{\sin\alpha-\cos\alpha}$.`,
      answer: '3', explanation: R`Vì $\tan\alpha=2$ nên $\cos\alpha\ne0$. Chia tử và mẫu cho $\cos\alpha$: $P=\dfrac{\tan\alpha+1}{\tan\alpha-1}=\dfrac{3}{1}=3$.` }),
    Q('11-1-30', 'Hàm số lượng giác', 'short', 'VD', {
      content: R`Hình bên là đồ thị của hàm số $y=a\sin x+b$ với $a>0$. Tính $a-b$.`,
      figure: { type: 'graph', fn: '3*sin(x)-1', x: [-0.6, 7], y: [-4.6, 2.6], ticks: false,
        points: [[1.5708, 2, '', { xl: 'π/2', yl: '2' }], [4.7124, -4, '', { xl: '3π/2', yl: '-4' }], [0, -1, '', { yl: '-1' }]] },
      answer: '4', explanation: R`Giá trị lớn nhất $a+b=2$, giá trị nhỏ nhất $-a+b=-4$ (vì $a>0$). Suy ra $a=3$, $b=-1$ (khớp với $y(0)=b=-1$). Vậy $a-b=4$.` }),
    Q('11-1-31', 'Phương trình lượng giác cơ bản', 'short', 'VD', {
      content: R`Số giờ có ánh sáng mặt trời của một thành phố vào ngày thứ $t$ trong năm (không nhuận) được mô hình hóa bởi $d(t)=4\sin\left[\dfrac{\pi}{182}(t-80)\right]+12$ với $0<t\le 365$. Hỏi vào ngày thứ bao nhiêu trong năm thì thành phố có nhiều giờ ánh sáng mặt trời nhất?`,
      answer: '171', explanation: R`$d(t)$ lớn nhất khi $\sin\left[\dfrac{\pi}{182}(t-80)\right]=1\Leftrightarrow \dfrac{\pi}{182}(t-80)=\dfrac{\pi}{2}+k2\pi\Leftrightarrow t=171+364k$. Với $0<t\le365$ chỉ có $t=171$.` }),
    Q('11-1-32', 'Công thức lượng giác', 'essay', 'VD', {
      content: R`a) Rút gọn biểu thức $A=\dfrac{\sin x+\sin 3x}{\cos x+\cos 3x}$ (với giả thiết biểu thức có nghĩa).
b) Giải phương trình $\sin x+\sin 3x=0$.`,
      answer: R`a) $A=\tan 2x$; b) $x=\dfrac{k\pi}{2}$, $k\in\mathbb{Z}$.`,
      explanation: R`a) Dùng công thức biến tổng thành tích: $\sin x+\sin 3x=2\sin 2x\cos x$, $\cos x+\cos 3x=2\cos 2x\cos x$. Do đó $A=\dfrac{2\sin 2x\cos x}{2\cos 2x\cos x}=\tan 2x$. (0,5 điểm)
b) $\sin x+\sin 3x=0\Leftrightarrow 2\sin 2x\cos x=0\Leftrightarrow \sin 2x=0$ hoặc $\cos x=0$. (0,25 điểm)
$\sin 2x=0\Leftrightarrow x=\dfrac{k\pi}{2}$; $\cos x=0\Leftrightarrow x=\dfrac{\pi}{2}+k\pi$ (đã nằm trong họ trên). Vậy $x=\dfrac{k\pi}{2}$, $k\in\mathbb{Z}$. (0,25 điểm)` }),

    // ===================== CHƯƠNG II =====================
    Q('11-2-21', 'Dãy số', 'mcq', 'NB', {
      content: R`Dãy số nào sau đây là dãy số tăng?`,
      options: [R`$u_n=\dfrac{1}{n}$`, R`$u_n=(-1)^n$`, R`$u_n=2n-1$`, R`$u_n=5-n$`], answer: 2,
      explanation: R`$u_{n+1}-u_n=2(n+1)-1-(2n-1)=2>0$ nên dãy $u_n=2n-1$ tăng. Dãy $\dfrac{1}{n}$ và $5-n$ giảm, dãy $(-1)^n$ không tăng không giảm.` }),
    Q('11-2-22', 'Cấp số nhân', 'mcq', 'NB', {
      content: R`Dãy số nào sau đây là một cấp số nhân?`,
      options: [R`$1;\ 3;\ 5;\ 7$`, R`$1;\ 2;\ 4;\ 8;\ 16$`, R`$1;\ 4;\ 9;\ 16$`, R`$2;\ 4;\ 6;\ 8$`], answer: 1,
      explanation: R`Dãy $1;2;4;8;16$ có mỗi số hạng (từ số hạng thứ hai) bằng số hạng đứng trước nhân với $2$, nên là cấp số nhân công bội $q=2$.` }),
    Q('11-2-23', 'Dãy số', 'mcq', 'TH', {
      content: R`Hình bên biểu diễn bốn số hạng đầu của dãy số $(u_n)$ (mỗi điểm có hoành độ $n$ và tung độ $u_n$). Công thức số hạng tổng quát nào sau đây phù hợp với hình?`,
      figure: { type: 'graph', x: [-0.5, 5], y: [-0.5, 8], ticks: false, points: [[1, 1], [2, 3], [3, 5], [4, 7]] },
      options: [R`$u_n=2n+1$`, R`$u_n=n+1$`, R`$u_n=n^2$`, R`$u_n=2n-1$`], answer: 3,
      explanation: R`Các điểm là $(1;1),(2;3),(3;5),(4;7)$. Chỉ có $u_n=2n-1$ cho $u_1=1,u_2=3,u_3=5,u_4=7$.` }),
    Q('11-2-24', 'Cấp số cộng', 'mcq', 'TH', {
      content: R`Cho cấp số cộng $(u_n)$ có $u_1=-3$ và $u_6=22$. Công sai của cấp số cộng là`,
      options: [R`$5$`, R`$4$`, R`$\dfrac{25}{6}$`, R`$6$`], answer: 0,
      explanation: R`$u_6=u_1+5d\Rightarrow 22=-3+5d\Rightarrow d=5$.` }),
    Q('11-2-25', 'Cấp số nhân', 'mcq', 'VD', {
      content: R`Cho hình vuông thứ nhất có cạnh bằng $4$. Nối trung điểm các cạnh của nó được hình vuông thứ hai; nối trung điểm các cạnh của hình vuông thứ hai được hình vuông thứ ba, cứ tiếp tục như vậy (hình bên minh họa ba hình vuông đầu tiên). Diện tích của hình vuông thứ năm là`,
      figure: { type: 'geo', dots: false, points: { A: [0, 0], B: [4, 0], C: [4, 4], D: [0, 4], M: [2, 0], N: [4, 2], P: [2, 4], Q: [0, 2], E: [3, 1], F: [3, 3], G: [1, 3], H: [1, 1] },
        segs: ['AB', 'BC', 'CD', 'DA', 'MN', 'NP', 'PQ', 'QM', 'EF', 'FG', 'GH', 'HE'], hide: ['M', 'N', 'P', 'Q', 'E', 'F', 'G', 'H'], width: 180 },
      options: [R`$2$`, R`$1$`, R`$\dfrac{1}{2}$`, R`$4$`], answer: 1,
      explanation: R`Mỗi hình vuông mới có diện tích bằng một nửa hình vuông trước. Diện tích các hình vuông lập thành cấp số nhân $u_1=16$, $q=\dfrac{1}{2}$: $16;8;4;2;1$. Vậy $u_5=16\cdot\left(\dfrac{1}{2}\right)^4=1$.` }),
    Q('11-2-26', 'Cấp số cộng', 'mcq', 'VD', {
      content: R`Bốn số lập thành một cấp số cộng có tổng bằng $22$ và tổng các bình phương của chúng bằng $166$. Số lớn nhất trong bốn số đó là`,
      options: [R`$9$`, R`$11$`, R`$10$`, R`$12$`], answer: 2,
      explanation: R`Gọi bốn số là $a-3d,\ a-d,\ a+d,\ a+3d$. Tổng: $4a=22\Rightarrow a=\dfrac{11}{2}$. Tổng bình phương: $4a^2+20d^2=166\Rightarrow 121+20d^2=166\Rightarrow d^2=\dfrac{9}{4}$. Bốn số là $1;4;7;10$, số lớn nhất là $10$.` }),
    Q('11-2-27', 'Cấp số cộng', 'tf', 'TH', {
      content: R`Cho cấp số cộng $(u_n)$ có $u_1=5$ và công sai $d=-2$. Xét tính đúng sai của các mệnh đề sau:`,
      statements: [R`$u_2=3$.`, R`$u_{10}=-15$.`, R`Tổng 10 số hạng đầu tiên $S_{10}=-40$.`, R`Số $-35$ là số hạng thứ 21 của cấp số cộng.`],
      answer: [true, false, true, true],
      explanation: R`a) Đúng: $u_2=5-2=3$.
b) Sai: $u_{10}=5+9\cdot(-2)=-13$.
c) Đúng: $S_{10}=\dfrac{10(u_1+u_{10})}{2}=5\cdot(5-13)=-40$.
d) Đúng: $u_n=5-2(n-1)=7-2n=-35\Leftrightarrow n=21$.` }),
    Q('11-2-28', 'Cấp số nhân', 'tf', 'VD', {
      content: R`Một quả bóng được thả rơi từ độ cao $10$ m. Mỗi lần chạm đất, quả bóng nảy lên một độ cao bằng $\dfrac{3}{4}$ độ cao lần rơi ngay trước đó. Xét tính đúng sai của các mệnh đề sau:`,
      statements: [R`Sau lần chạm đất thứ nhất, quả bóng nảy lên cao $7{,}5$ m.`, R`Độ cao quả bóng nảy lên sau lần chạm đất thứ ba là $5{,}625$ m.`,
        R`Độ cao các lần nảy lên lập thành một cấp số nhân có công bội $\dfrac{3}{4}$.`, R`Tổng quãng đường quả bóng di chuyển cho đến khi dừng hẳn là $80$ m.`],
      answer: [true, false, true, false],
      explanation: R`a) Đúng: $10\cdot\dfrac{3}{4}=7{,}5$ (m).
b) Sai: các độ cao nảy là $7{,}5;\ 5{,}625;\ 4{,}21875;\dots$ nên lần thứ ba là $4{,}21875$ m ($5{,}625$ m là lần thứ hai).
c) Đúng: mỗi độ cao bằng độ cao trước nhân $\dfrac{3}{4}$.
d) Sai: quãng đường $=10+2\cdot\dfrac{7{,}5}{1-\frac{3}{4}}=10+60=70$ (m).` }),
    Q('11-2-29', 'Cấp số nhân', 'short', 'TH', {
      content: R`Cho cấp số nhân $(u_n)$ có $u_2=6$ và $u_5=162$. Tìm $u_1$.`,
      answer: '2', explanation: R`$\dfrac{u_5}{u_2}=q^3=27\Rightarrow q=3$. Suy ra $u_1=\dfrac{u_2}{q}=2$.` }),
    Q('11-2-30', 'Cấp số cộng', 'short', 'VD', {
      content: R`Người ta xếp các ống nước hình trụ thành một khối có mặt cắt hình tam giác: hàng trên cùng có 1 ống, mỗi hàng phía dưới nhiều hơn hàng ngay trên nó 1 ống (hình bên minh họa 4 hàng đầu). Cần xếp bao nhiêu hàng để dùng vừa hết $210$ ống?`,
      figure: { type: 'geo', dots: false, hide: ['T'], width: 170, points: { T: [0, 6.196] },
        circles: [{ c: [0, 5.196], r: 1 }, { c: [-1, 3.464], r: 1 }, { c: [1, 3.464], r: 1 }, { c: [-2, 1.732], r: 1 }, { c: [0, 1.732], r: 1 }, { c: [2, 1.732], r: 1 },
          { c: [-3, 0], r: 1 }, { c: [-1, 0], r: 1 }, { c: [1, 0], r: 1 }, { c: [3, 0], r: 1 }] },
      answer: '20', explanation: R`Số ống ở các hàng lập thành cấp số cộng $1;2;3;\dots$ Với $n$ hàng, tổng số ống là $\dfrac{n(n+1)}{2}=210\Leftrightarrow n^2+n-420=0\Leftrightarrow n=20$ (loại $n=-21$).` }),
    Q('11-2-31', 'Cấp số nhân', 'short', 'VD', {
      content: R`Dân số của một xã năm 2025 là $20$ nghìn người. Giả sử dân số tăng đều $2\%$ mỗi năm. Dân số của xã vào năm 2030 là bao nhiêu nghìn người (làm tròn kết quả đến hàng phần mười)?`,
      answer: '22,1', explanation: R`Dân số các năm lập thành cấp số nhân công bội $1{,}02$. Năm 2030 (sau 5 năm): $20\cdot1{,}02^5\approx 20\cdot1{,}10408\approx22{,}08\approx22{,}1$ (nghìn người).` }),
    Q('11-2-32', 'Cấp số cộng', 'essay', 'VD', {
      content: R`Ba số $a,b,c$ theo thứ tự đó lập thành một cấp số cộng có tổng bằng $15$. Nếu cộng thêm lần lượt $1;4;19$ vào ba số đó thì được ba số lập thành một cấp số nhân. Tìm $a,b,c$.`,
      answer: R`$(a;b;c)=(2;5;8)$ hoặc $(26;5;-16)$.`,
      explanation: R`Vì $a,b,c$ là cấp số cộng nên $a+c=2b$, kết hợp $a+b+c=15$ được $b=5$. Đặt $a=5-d$, $c=5+d$. (0,25 điểm)
Ba số $6-d;\ 9;\ 24+d$ lập thành cấp số nhân nên $(6-d)(24+d)=81\Leftrightarrow d^2+18d-63=0\Leftrightarrow d=3$ hoặc $d=-21$. (0,5 điểm)
Với $d=3$: $2;5;8$ (khi đó $3;9;27$ là cấp số nhân). Với $d=-21$: $26;5;-16$ (khi đó $27;9;3$ là cấp số nhân). (0,25 điểm)` }),

    // ===================== CHƯƠNG III =====================
    Q('11-3-21', 'Mẫu số liệu ghép nhóm', 'mcq', 'NB', {
      content: R`Cho mẫu số liệu ghép nhóm gồm các nhóm $[0;10)$, $[10;20)$, $[20;30)$, $[30;40)$ với tần số tương ứng là $5;12;8;5$. Cỡ mẫu của mẫu số liệu là`,
      options: [R`$30$`, R`$4$`, R`$40$`, R`$25$`], answer: 0,
      explanation: R`Cỡ mẫu bằng tổng các tần số: $5+12+8+5=30$.` }),
    Q('11-3-22', 'Mẫu số liệu ghép nhóm', 'mcq', 'NB', {
      content: R`Biểu đồ ở hình bên biểu diễn chiều cao (cm) của 40 học sinh một lớp, được ghép thành các nhóm $[150;155)$, $[155;160)$, …, $[170;175)$. Nhóm có tần số lớn nhất là`,
      figure: hist('Số học sinh', [150, 155, 160, 165, 170, 175], [4, 9, 14, 8, 5], 'Chiều cao (cm)'),
      options: [R`$[155;160)$`, R`$[165;170)$`, R`$[160;165)$`, R`$[170;175)$`], answer: 2,
      explanation: R`Cột cao nhất ứng với nhóm $[160;165)$ có tần số $14$.` }),
    Q('11-3-23', 'Các số đặc trưng đo xu thế trung tâm', 'mcq', 'TH', {
      content: R`Cho mẫu số liệu ghép nhóm:
Nhóm: $[0;4)$, $[4;8)$, $[8;12)$, $[12;16)$
Tần số: $3;\ 7;\ 6;\ 4$
Số trung bình của mẫu số liệu là`,
      options: [R`$8$`, R`$7{,}5$`, R`$8{,}5$`, R`$8{,}2$`], answer: 3,
      explanation: R`Giá trị đại diện: $2;6;10;14$. $\bar{x}=\dfrac{3\cdot2+7\cdot6+6\cdot10+4\cdot14}{20}=\dfrac{164}{20}=8{,}2$.` }),
    Q('11-3-24', 'Các số đặc trưng đo xu thế trung tâm', 'mcq', 'TH', {
      content: R`Biểu đồ ở hình bên biểu diễn thời gian (phút) chạy hết một vòng sân của 30 vận động viên nghiệp dư. Trung vị của mẫu số liệu ghép nhóm này (làm tròn đến hàng phần trăm) là`,
      figure: hist('Số người', [20, 25, 30, 35, 40, 45], [3, 8, 12, 5, 2], 'Thời gian (phút)'),
      options: [R`$32{,}5$`, R`$31{,}67$`, R`$30{,}83$`, R`$31{,}25$`], answer: 1,
      explanation: R`Tần số: $3;8;12;5;2$, $n=30$, $\dfrac{n}{2}=15$. Tần số tích lũy: $3;11;23;\dots$ nên trung vị thuộc nhóm $[30;35)$.
$M_e=30+\dfrac{15-11}{12}\cdot5=30+\dfrac{5}{3}\approx31{,}67$.` }),
    Q('11-3-25', 'Các số đặc trưng đo xu thế trung tâm', 'mcq', 'VD', {
      content: R`Điểm kiểm tra của 50 học sinh được ghép nhóm như sau:
Nhóm: $[5;6)$, $[6;7)$, $[7;8)$, $[8;9)$, $[9;10)$
Tần số: $4;\ 10;\ 16;\ 12;\ 8$
Mốt của mẫu số liệu ghép nhóm này là`,
      options: [R`$7{,}6$`, R`$7{,}4$`, R`$7{,}5$`, R`$8$`], answer: 0,
      explanation: R`Nhóm có tần số lớn nhất là $[7;8)$. $M_o=7+\dfrac{16-10}{(16-10)+(16-12)}\cdot1=7+\dfrac{6}{10}=7{,}6$.` }),
    Q('11-3-26', 'Các số đặc trưng đo xu thế trung tâm', 'mcq', 'VD', {
      content: R`Khối lượng (kg) của 40 gói hàng được ghép nhóm như sau:
Nhóm: $[0;2)$, $[2;4)$, $[4;6)$, $[6;8)$, $[8;10)$
Tần số: $5;\ 9;\ 12;\ 10;\ 4$
Tứ phân vị thứ nhất $Q_1$ của mẫu số liệu (làm tròn đến hàng phần trăm) là`,
      options: [R`$2{,}5$`, R`$3{,}5$`, R`$3{,}11$`, R`$3{,}25$`], answer: 2,
      explanation: R`$\dfrac{n}{4}=10$. Tần số tích lũy: $5;14;\dots$ nên $Q_1$ thuộc nhóm $[2;4)$. $Q_1=2+\dfrac{10-5}{9}\cdot2=2+\dfrac{10}{9}\approx3{,}11$.` }),
    Q('11-3-27', 'Mẫu số liệu ghép nhóm', 'tf', 'TH', {
      content: R`Biểu đồ ở hình bên biểu diễn thời gian sử dụng điện thoại mỗi ngày (giờ) của một nhóm học sinh, với các nhóm $[0;1)$, $[1;2)$, …, $[4;5)$. Xét tính đúng sai của các mệnh đề sau:`,
      figure: hist('Số học sinh', [0, 1, 2, 3, 4, 5], [6, 10, 14, 7, 3], 'Thời gian (giờ)'),
      statements: [R`Cỡ mẫu là $40$.`, R`Trung vị của mẫu số liệu thuộc nhóm $[2;3)$.`, R`Số trung bình của mẫu số liệu bằng $2{,}5$.`, R`Mốt của mẫu số liệu lớn hơn số trung bình.`],
      answer: [true, true, false, true],
      explanation: R`a) Đúng: $6+10+14+7+3=40$.
b) Đúng: $\dfrac{n}{2}=20$; tần số tích lũy $6;16;30$ nên trung vị thuộc $[2;3)$.
c) Sai: $\bar{x}=\dfrac{6\cdot0{,}5+10\cdot1{,}5+14\cdot2{,}5+7\cdot3{,}5+3\cdot4{,}5}{40}=\dfrac{91}{40}=2{,}275$.
d) Đúng: $M_o=2+\dfrac{14-10}{(14-10)+(14-7)}\cdot1=2+\dfrac{4}{11}\approx2{,}36>2{,}275$.` }),
    Q('11-3-28', 'Các số đặc trưng đo xu thế trung tâm', 'tf', 'VD', {
      content: R`Doanh thu một ngày (triệu đồng) của 30 cửa hàng được ghép nhóm như sau:
Nhóm: $[10;20)$, $[20;30)$, $[30;40)$, $[40;50)$, $[50;60)$
Tần số: $4;\ 6;\ 10;\ 7;\ 3$
Xét tính đúng sai của các mệnh đề sau:`,
      statements: [R`Giá trị đại diện của nhóm $[30;40)$ là $35$.`, R`Số trung bình của mẫu số liệu bằng $35$.`, R`Tứ phân vị thứ ba $Q_3\approx45{,}71$.`, R`Trung vị của mẫu số liệu bằng $35$.`],
      answer: [true, false, false, true],
      explanation: R`a) Đúng: $\dfrac{30+40}{2}=35$.
b) Sai: $\bar{x}=\dfrac{4\cdot15+6\cdot25+10\cdot35+7\cdot45+3\cdot55}{30}=\dfrac{1040}{30}\approx34{,}67$.
c) Sai: $\dfrac{3n}{4}=22{,}5$; tần số tích lũy $4;10;20;27$ nên $Q_3$ thuộc $[40;50)$: $Q_3=40+\dfrac{22{,}5-20}{7}\cdot10\approx43{,}57$.
d) Đúng: $\dfrac{n}{2}=15$, trung vị thuộc $[30;40)$: $M_e=30+\dfrac{15-10}{10}\cdot10=35$.` }),
    Q('11-3-29', 'Các số đặc trưng đo xu thế trung tâm', 'short', 'TH', {
      content: R`Chiều cao (cm) của 30 cây giống được ghép nhóm như sau:
Nhóm: $[10;15)$, $[15;20)$, $[20;25)$, $[25;30)$
Tần số: $5;\ 11;\ 9;\ 5$
Tính chiều cao trung bình của các cây giống (đơn vị cm, làm tròn đến hàng phần mười).`,
      answer: '19,8', explanation: R`$\bar{x}=\dfrac{5\cdot12{,}5+11\cdot17{,}5+9\cdot22{,}5+5\cdot27{,}5}{30}=\dfrac{595}{30}\approx19{,}8$ (cm).` }),
    Q('11-3-30', 'Các số đặc trưng đo xu thế trung tâm', 'short', 'VD', {
      content: R`Quãng đường đi bộ mỗi tuần (km) của 40 người được ghép nhóm như sau:
Nhóm: $[0;5)$, $[5;10)$, $[10;15)$, $[15;20)$, $[20;25)$
Tần số: $8;\ 14;\ 10;\ 6;\ 2$
Tìm trung vị của mẫu số liệu (làm tròn đến hàng phần trăm).`,
      answer: '9,29', explanation: R`$\dfrac{n}{2}=20$; tần số tích lũy $8;22;\dots$ nên trung vị thuộc nhóm $[5;10)$. $M_e=5+\dfrac{20-8}{14}\cdot5=5+\dfrac{30}{7}\approx9{,}29$.` }),
    Q('11-3-31', 'Các số đặc trưng đo xu thế trung tâm', 'short', 'VD', {
      content: R`Tiền điện một tháng (trăm nghìn đồng) của 50 hộ gia đình được ghép nhóm như sau:
Nhóm: $[2;4)$, $[4;6)$, $[6;8)$, $[8;10)$
Tần số: $5;\ 15;\ 20;\ 10$
Tìm mốt của mẫu số liệu (làm tròn đến hàng phần trăm).`,
      answer: '6,67', explanation: R`Nhóm có tần số lớn nhất là $[6;8)$. $M_o=6+\dfrac{20-15}{(20-15)+(20-10)}\cdot2=6+\dfrac{10}{15}\approx6{,}67$.` }),
    Q('11-3-32', 'Các số đặc trưng đo xu thế trung tâm', 'essay', 'VD', {
      content: R`Điểm thi (thang điểm 10) của 40 học sinh được ghép nhóm như sau:
Nhóm: $[4;5)$, $[5;6)$, $[6;7)$, $[7;8)$, $[8;9)$, $[9;10)$
Tần số: $3;\ 7;\ 12;\ 10;\ 6;\ 2$
a) Tính điểm trung bình.
b) Tìm trung vị và mốt của mẫu số liệu (làm tròn đến hàng phần trăm).`,
      answer: R`a) $\bar{x}=6{,}875$; b) $M_e\approx6{,}83$; $M_o\approx6{,}71$.`,
      explanation: R`a) Giá trị đại diện: $4{,}5;5{,}5;\dots;9{,}5$. $\bar{x}=\dfrac{13{,}5+38{,}5+78+75+51+19}{40}=\dfrac{275}{40}=6{,}875$. (0,5 điểm)
b) $\dfrac{n}{2}=20$; tần số tích lũy $3;10;22;\dots$ nên trung vị thuộc $[6;7)$: $M_e=6+\dfrac{20-10}{12}\cdot1\approx6{,}83$. (0,25 điểm)
Nhóm có tần số lớn nhất là $[6;7)$: $M_o=6+\dfrac{12-7}{(12-7)+(12-10)}\cdot1=6+\dfrac{5}{7}\approx6{,}71$. (0,25 điểm)` }),

    // ===================== CHƯƠNG IV =====================
    Q('11-4-21', 'Đường thẳng và mặt phẳng trong không gian', 'mcq', 'NB', {
      content: R`Cho hình chóp $S.ABCD$ như hình bên. Hình chóp này có bao nhiêu mặt?`,
      figure: pyr(),
      options: [R`$4$`, R`$6$`, R`$8$`, R`$5$`], answer: 3,
      explanation: R`Hình chóp $S.ABCD$ có 4 mặt bên $(SAB),(SBC),(SCD),(SDA)$ và 1 mặt đáy $ABCD$, tổng cộng 5 mặt.` }),
    Q('11-4-22', 'Hai đường thẳng song song', 'mcq', 'NB', {
      content: R`Cho hình hộp $ABCD.A'B'C'D'$ như hình bên. Đường thẳng nào sau đây song song với đường thẳng $AB$?`,
      figure: box(),
      options: [R`$BC$`, R`$C'D'$`, R`$A'D'$`, R`$CC'$`], answer: 1,
      explanation: R`Các mặt của hình hộp là hình bình hành nên $AB\parallel CD$ và $CD\parallel C'D'$. Do đó $AB\parallel C'D'$.` }),
    Q('11-4-23', 'Đường thẳng và mặt phẳng song song', 'mcq', 'TH', {
      content: R`Cho tứ diện $ABCD$. Gọi $M,N$ lần lượt là trung điểm của $AB$ và $AC$ (hình bên). Đường thẳng $MN$ song song với mặt phẳng nào sau đây?`,
      figure: { type: 'geo', points: Object.assign(TET(), { M: [1, 1.75], N: [2.3, 1.25] }), segs: ['AB', 'AC', 'AD', 'BC', 'CD', 'MN'], dashed: ['BD'], labelPos: { M: 'l', N: 'r' } },
      options: [R`$(ABD)$`, R`$(ACD)$`, R`$(BCD)$`, R`$(ABC)$`], answer: 2,
      explanation: R`$MN$ là đường trung bình của tam giác $ABC$ nên $MN\parallel BC$. Mà $BC\subset(BCD)$ và $MN\not\subset(BCD)$ nên $MN\parallel(BCD)$. ($MN$ cắt $(ABD)$, $(ACD)$ và nằm trong $(ABC)$.)` }),
    Q('11-4-24', 'Hai mặt phẳng song song', 'mcq', 'TH', {
      content: R`Cho hình lăng trụ $ABC.A'B'C'$. Gọi $M,N,P$ lần lượt là trung điểm của $AA'$, $BB'$, $CC'$ (hình bên). Mặt phẳng $(MNP)$ song song với mặt phẳng nào sau đây?`,
      figure: { type: 'geo', points: { A: [0, 0], B: [1.6, -1], C: [3.6, 0], "A'": [0, 2.8], "B'": [1.6, 1.8], "C'": [3.6, 2.8], M: [0, 1.4], N: [1.6, 0.4], P: [3.6, 1.4] },
        segs: ['AB', 'BC', "AA'", "BB'", "CC'", "A'B'", "B'C'", "A'C'", 'MN', 'NP'], dashed: ['AC', 'MP'],
        labelPos: { A: 'l', B: 'b', C: 'r', "A'": 'l', "B'": 'bl', "C'": 'r', M: 'l', N: 'tr', P: 'r' } },
      options: [R`$(ABB'A')$`, R`$(A'BC)$`, R`$(AB'C)$`, R`$(ABC)$`], answer: 3,
      explanation: R`$MN\parallel AB$ (đường trung bình hình bình hành $ABB'A'$) và $NP\parallel BC$. Mặt phẳng $(MNP)$ chứa hai đường thẳng cắt nhau lần lượt song song với $(ABC)$ nên $(MNP)\parallel(ABC)$.` }),
    Q('11-4-25', 'Hai đường thẳng song song', 'mcq', 'VD', {
      content: R`Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành. Gọi $M,N$ lần lượt là trung điểm của $SA$ và $SD$ (hình bên). Tứ giác $MNCB$ là hình gì?`,
      figure: pyr({ points: { M: [0.9, 1.8], N: [2.6, 1.8] }, segs: ['MB', 'NC'], dashed: ['MN'] }),
      options: [R`Hình thang`, R`Hình bình hành`, R`Hình chữ nhật`, R`Hình thoi`], answer: 0,
      explanation: R`$MN$ là đường trung bình tam giác $SAD$ nên $MN\parallel AD$ và $MN=\dfrac{1}{2}AD$. Mà $AD\parallel BC$, $AD=BC$ nên $MN\parallel BC$ và $MN=\dfrac{1}{2}BC\ne BC$. Vậy $MNCB$ là hình thang (không phải hình bình hành).` }),
    Q('11-4-26', 'Phép chiếu song song', 'mcq', 'VD', {
      content: R`Hình chiếu song song của một hình vuông (lên một mặt phẳng, theo phương không song song với mặt phẳng chứa hình vuông) KHÔNG thể là hình nào sau đây?`,
      options: [R`Hình thang có hai cạnh bên không song song`, R`Hình thoi`, R`Hình chữ nhật`, R`Hình bình hành`], answer: 0,
      explanation: R`Phép chiếu song song giữ nguyên tính song song của hai đường thẳng. Hình vuông có hai cặp cạnh đối song song nên hình chiếu phải có hai cặp cạnh đối song song, tức là một hình bình hành (có thể là hình thoi, hình chữ nhật). Một hình thang có hai cạnh bên không song song không thể là hình chiếu.` }),
    Q('11-4-27', 'Đường thẳng và mặt phẳng song song', 'tf', 'TH', {
      content: R`Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành tâm $O$, $M$ là trung điểm của $SC$ (hình bên). Xét tính đúng sai của các mệnh đề sau:`,
      figure: pyr({ points: { O: [2.3, -0.7], M: [3.2, 1.1] }, dashed: ['AC', 'BD', 'OM'], labelPos: { O: 'b', M: 'r' } }),
      statements: [R`$OM\parallel SA$.`, R`$OM\parallel(SAB)$.`, R`$OM\parallel(SCD)$.`, R`Giao tuyến của hai mặt phẳng $(SAB)$ và $(SCD)$ song song với $AB$.`],
      answer: [true, true, false, true],
      explanation: R`a) Đúng: $OM$ là đường trung bình của tam giác $SAC$.
b) Đúng: $OM\parallel SA\subset(SAB)$ và $OM\not\subset(SAB)$.
c) Sai: $M\in SC\subset(SCD)$ nên $OM$ cắt $(SCD)$ tại $M$.
d) Đúng: $(SAB)$ và $(SCD)$ có điểm chung $S$, lần lượt chứa $AB\parallel CD$ nên giao tuyến là đường thẳng qua $S$ song song với $AB$.` }),
    Q('11-4-28', 'Hai mặt phẳng song song', 'tf', 'VD', {
      content: R`Cho hình hộp $ABCD.A'B'C'D'$ như hình bên. Xét tính đúng sai của các mệnh đề sau:`,
      figure: box(),
      statements: [R`$(ABB'A')\parallel(BCC'B')$.`, R`$(A'BD)\parallel(CB'D')$.`, R`Đường thẳng $AC'$ song song với mặt phẳng $(A'BD)$.`, R`Đường thẳng $B'D'$ song song với mặt phẳng $(A'BD)$.`],
      answer: [false, true, false, true],
      explanation: R`a) Sai: hai mặt phẳng này cắt nhau theo giao tuyến $BB'$.
b) Đúng: $BD\parallel B'D'$ và $A'B\parallel D'C$ (vì $A'BCD'$ là hình bình hành), nên $(A'BD)$ chứa hai đường thẳng cắt nhau song song với $(CB'D')$.
c) Sai: $AC'$ cắt $(A'BD)$ tại trọng tâm $G$ của tam giác $A'BD$ (với $AG=\dfrac{1}{3}AC'$).
d) Đúng: $B'D'\parallel BD\subset(A'BD)$ và $B'\notin(A'BD)$.` }),
    Q('11-4-29', 'Hai đường thẳng song song', 'short', 'TH', {
      content: R`Cho tứ diện $ABCD$ có $AC=10$, $BD=6$. Gọi $M,N,P,Q$ lần lượt là trung điểm của $AB$, $BC$, $CD$, $DA$ (hình bên). Tính chu vi tứ giác $MNPQ$.`,
      figure: { type: 'geo', points: Object.assign(TET(), { M: [1, 1.75], N: [1.3, -0.5], P: [3.3, -0.4], Q: [3, 1.85] }),
        segs: ['AB', 'AC', 'AD', 'BC', 'CD', 'MN', 'PQ'], dashed: ['BD', 'NP', 'QM'], labelPos: { M: 'l', N: 'b', P: 'br', Q: 'r' } },
      answer: '16', explanation: R`$MN,PQ$ là đường trung bình của các tam giác $ABC$, $ACD$ nên $MN=PQ=\dfrac{AC}{2}=5$; $NP,QM$ là đường trung bình của các tam giác $BCD$, $ABD$ nên $NP=QM=\dfrac{BD}{2}=3$. Chu vi $=2(5+3)=16$.` }),
    Q('11-4-30', 'Hai mặt phẳng song song', 'short', 'VD', {
      content: R`Cho hình chóp $S.ABCD$ có đáy là hình bình hành, $AD=12$. Gọi $M$ là điểm trên cạnh $SA$ sao cho $SM=2MA$. Mặt phẳng $(\alpha)$ đi qua $M$ và song song với mặt phẳng $(ABCD)$ cắt cạnh $SD$ tại $N$. Tính độ dài $MN$.`,
      answer: '8', explanation: R`$(\alpha)\parallel(ABCD)$ nên giao tuyến của $(SAD)$ với hai mặt phẳng này song song: $MN\parallel AD$. Theo định lí Thalès trong tam giác $SAD$: $\dfrac{MN}{AD}=\dfrac{SM}{SA}=\dfrac{2}{3}$, nên $MN=8$.` }),
    Q('11-4-31', 'Hai mặt phẳng song song', 'short', 'VD', {
      content: R`Cho hình hộp $ABCD.A'B'C'D'$. Đường chéo $AC'$ cắt mặt phẳng $(A'BD)$ tại điểm $G$. Tính tỉ số $\dfrac{AG}{AC'}$ (làm tròn kết quả đến hàng phần trăm).`,
      answer: '0,33', explanation: R`Gọi $O$ là tâm hình bình hành $ABCD$. Trong mặt phẳng $(ACC'A')$, $AC'$ cắt $A'O$ tại $G$. Vì $AO\parallel A'C'$ và $AO=\dfrac{1}{2}A'C'$ nên $\dfrac{AG}{GC'}=\dfrac{AO}{A'C'}=\dfrac{1}{2}$, suy ra $\dfrac{AG}{AC'}=\dfrac{1}{3}\approx0{,}33$.` }),
    Q('11-4-32', 'Hai mặt phẳng song song', 'essay', 'VD', {
      content: R`Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành. Gọi $M,N,P$ lần lượt là trung điểm của $SA$, $SB$, $SC$.
a) Chứng minh $MN\parallel(SCD)$.
b) Chứng minh $(MNP)\parallel(ABCD)$.
c) Tìm giao điểm $Q$ của đường thẳng $SD$ với mặt phẳng $(MNP)$. Tứ giác $MNPQ$ là hình gì?`,
      figure: pyr({ points: { M: [0.9, 1.8], N: [1.5, 1.1], P: [3.2, 1.1] }, segs: ['MN', 'NP'], dashed: ['MP'], labelPos: { M: 'l', N: 'l', P: 'r' } }),
      answer: R`c) $Q$ là trung điểm $SD$; $MNPQ$ là hình bình hành.`,
      explanation: R`a) $MN$ là đường trung bình tam giác $SAB$ nên $MN\parallel AB$; mà $AB\parallel CD\subset(SCD)$ và $MN\not\subset(SCD)$ nên $MN\parallel(SCD)$. (0,25 điểm)
b) $MN\parallel AB$, $NP\parallel BC$; $MN, NP$ cắt nhau và cùng nằm trong $(MNP)$ nên $(MNP)\parallel(ABCD)$. (0,25 điểm)
c) Gọi $Q$ là trung điểm $SD$ thì $PQ\parallel CD\parallel AB\parallel MN$, nên $Q\in(MNP)$; do đó $Q=SD\cap(MNP)$. (0,25 điểm)
$MN=\dfrac{1}{2}AB=\dfrac{1}{2}CD=PQ$ và $MN\parallel PQ$ nên $MNPQ$ là hình bình hành. (0,25 điểm)` }),

    // ===================== CHƯƠNG V =====================
    Q('11-5-21', 'Giới hạn của hàm số', 'mcq', 'NB', {
      content: R`Cho hàm số $y=f(x)$ có đồ thị như hình bên (các đường nét đứt là $x=-1$ và $y=2$). Giá trị của $\lim\limits_{x\to+\infty}f(x)$ là`,
      figure: { type: 'graph', fn: '(2*x-1)/(x+1)', x: [-5, 5], y: [-4, 6], ticks: false, asymptotes: { x: [-1], y: [2] },
        points: [[0, -1, '', { dash: false, yl: '-1' }]], labels: [[0.15, 2.25, '2'], [-1.6, -0.45, '-1']] },
      options: [R`$-1$`, R`$+\infty$`, R`$0$`, R`$2$`], answer: 3,
      explanation: R`Khi $x\to+\infty$, đồ thị tiến sát đường thẳng $y=2$ nên $\lim\limits_{x\to+\infty}f(x)=2$.` }),
    Q('11-5-22', 'Giới hạn của dãy số', 'mcq', 'NB', {
      content: R`Giá trị của $\lim\left(3-\dfrac{1}{n}\right)$ bằng`,
      options: [R`$0$`, R`$3$`, R`$2$`, R`$+\infty$`], answer: 1,
      explanation: R`$\lim\dfrac{1}{n}=0$ nên $\lim\left(3-\dfrac{1}{n}\right)=3$.` }),
    Q('11-5-23', 'Hàm số liên tục', 'mcq', 'TH', {
      content: R`Cho hàm số $y=f(x)$ có đồ thị như hình bên. Hàm số gián đoạn tại điểm nào sau đây?`,
      figure: { type: 'graph', fn: ['x+1', '4-x'], domain: [[-2, 1], [1, 4]], x: [-2.5, 4.5], y: [-1.5, 4.5], tickLabels: true,
        points: [[1, 3, '', { xl: '', yl: '' }], [1, 2, '', { dash: false, open: true }]] },
      options: [R`$x=0$`, R`$x=2$`, R`$x=1$`, R`$x=3$`], answer: 2,
      explanation: R`Tại $x=1$ đồ thị bị "đứt": giới hạn bên trái bằng $2$, còn giới hạn bên phải bằng $3$, nên không tồn tại $\lim\limits_{x\to1}f(x)$. Hàm số gián đoạn tại $x=1$.` }),
    Q('11-5-24', 'Giới hạn của hàm số', 'mcq', 'TH', {
      content: R`Giá trị của $\lim\limits_{x\to1}\dfrac{x^2-1}{x^2+x-2}$ bằng`,
      options: [R`$\dfrac{2}{3}$`, R`$\dfrac{1}{2}$`, R`$0$`, R`$1$`], answer: 0,
      explanation: R`$\dfrac{x^2-1}{x^2+x-2}=\dfrac{(x-1)(x+1)}{(x-1)(x+2)}=\dfrac{x+1}{x+2}$ với $x\ne1$. Giới hạn bằng $\dfrac{2}{3}$.` }),
    Q('11-5-25', 'Giới hạn của dãy số', 'mcq', 'VD', {
      content: R`Giá trị của $\lim\left(\sqrt{n^2+3n}-n\right)$ bằng`,
      options: [R`$3$`, R`$0$`, R`$+\infty$`, R`$\dfrac{3}{2}$`], answer: 3,
      explanation: R`$\sqrt{n^2+3n}-n=\dfrac{3n}{\sqrt{n^2+3n}+n}=\dfrac{3}{\sqrt{1+\frac{3}{n}}+1}\to\dfrac{3}{2}$.` }),
    Q('11-5-26', 'Hàm số liên tục', 'mcq', 'VD', {
      content: R`Cho hàm số $f(x)=\begin{cases}x^2+mx & \text{khi } x\le2\\ 3x-1 & \text{khi } x>2\end{cases}$. Giá trị của $m$ để hàm số liên tục trên $\mathbb{R}$ là`,
      options: [R`$1$`, R`$\dfrac{1}{2}$`, R`$-\dfrac{1}{2}$`, R`$2$`], answer: 1,
      explanation: R`Hàm số liên tục trên các khoảng $(-\infty;2)$, $(2;+\infty)$. Tại $x=2$: $f(2)=\lim\limits_{x\to2^-}f(x)=4+2m$, $\lim\limits_{x\to2^+}f(x)=5$. Cần $4+2m=5\Leftrightarrow m=\dfrac{1}{2}$.` }),
    Q('11-5-27', 'Giới hạn của hàm số', 'tf', 'TH', {
      content: R`Hình bên là đồ thị của hàm số $f(x)=\dfrac{x+1}{x-2}$ (các đường nét đứt là $x=2$ và $y=1$). Xét tính đúng sai của các mệnh đề sau:`,
      figure: { type: 'graph', fn: '(x+1)/(x-2)', x: [-4, 7], y: [-4, 6], ticks: false, asymptotes: { x: [2], y: [1] },
        points: [[-1, 0, '', { dash: false, xl: '-1' }], [0, -0.5, '', { dash: false, yl: '-1/2' }]], labels: [[2.15, -0.45, '2'], [-3.8, 1.25, '1']] },
      statements: [R`$\lim\limits_{x\to0}f(x)=-\dfrac{1}{2}$.`, R`$\lim\limits_{x\to2^-}f(x)=+\infty$.`, R`$\lim\limits_{x\to2^+}f(x)=+\infty$.`, R`$\lim\limits_{x\to-\infty}f(x)=-1$.`],
      answer: [true, false, true, false],
      explanation: R`a) Đúng: $f$ liên tục tại $0$, $f(0)=\dfrac{1}{-2}=-\dfrac{1}{2}$.
b) Sai: khi $x\to2^-$, tử $\to3>0$, mẫu $\to0^-$ nên $f(x)\to-\infty$.
c) Đúng: khi $x\to2^+$, mẫu $\to0^+$ nên $f(x)\to+\infty$.
d) Sai: $\lim\limits_{x\to-\infty}\dfrac{x+1}{x-2}=1$.` }),
    Q('11-5-28', 'Hàm số liên tục', 'tf', 'VD', {
      content: R`Cho hàm số $f(x)=\begin{cases}2-x & \text{khi } x<1\\ x^2 & \text{khi } 1\le x\le2\\ 5-x & \text{khi } x>2\end{cases}$ có đồ thị như hình bên. Xét tính đúng sai của các mệnh đề sau:`,
      figure: { type: 'graph', fn: ['2-x', 'x^2', '5-x'], domain: [[-1.5, 1], [1, 2], [2, 5.5]], x: [-1.5, 5.5], y: [-1, 5], ticks: false,
        points: [[1, 1, '', { xl: '1', yl: '1' }], [2, 4, '', { xl: '2', yl: '4' }], [2, 3, '', { dash: false, open: true }]] },
      statements: [R`$\lim\limits_{x\to1^-}f(x)=1$.`, R`Hàm số liên tục tại $x=1$.`, R`$\lim\limits_{x\to2^+}f(x)=4$.`, R`Hàm số liên tục trên $\mathbb{R}$.`],
      answer: [true, true, false, false],
      explanation: R`a) Đúng: $\lim\limits_{x\to1^-}(2-x)=1$.
b) Đúng: $\lim\limits_{x\to1^-}f(x)=1$, $\lim\limits_{x\to1^+}f(x)=1^2=1=f(1)$.
c) Sai: $\lim\limits_{x\to2^+}(5-x)=3$.
d) Sai: $\lim\limits_{x\to2^+}f(x)=3\ne4=f(2)$ nên hàm số gián đoạn tại $x=2$.` }),
    Q('11-5-29', 'Giới hạn của hàm số', 'short', 'TH', {
      content: R`Tính $\lim\limits_{x\to4}\dfrac{\sqrt{x}-2}{x-4}$.`,
      answer: '0,25', explanation: R`$\dfrac{\sqrt{x}-2}{x-4}=\dfrac{\sqrt{x}-2}{(\sqrt{x}-2)(\sqrt{x}+2)}=\dfrac{1}{\sqrt{x}+2}$ với $x\ne4$. Giới hạn bằng $\dfrac{1}{4}=0{,}25$.` }),
    Q('11-5-30', 'Giới hạn của dãy số', 'short', 'VD', {
      content: R`Cho tam giác đều cạnh $4$. Nối trung điểm các cạnh của nó được tam giác thứ hai; nối trung điểm các cạnh của tam giác thứ hai được tam giác thứ ba; cứ tiếp tục như vậy mãi (hình bên minh họa ba tam giác đầu). Tính tổng chu vi của tất cả các tam giác.`,
      figure: { type: 'geo', dots: false, width: 200, points: { A: [0, 0], B: [4, 0], C: [2, 3.464], M: [2, 0], N: [3, 1.732], P: [1, 1.732], E: [2.5, 0.866], F: [2, 1.732], G: [1.5, 0.866] },
        segs: ['AB', 'BC', 'CA', 'MN', 'NP', 'PM', 'EF', 'FG', 'GE'], hide: ['M', 'N', 'P', 'E', 'F', 'G'] },
      answer: '24', explanation: R`Chu vi các tam giác lập thành cấp số nhân lùi vô hạn $12;6;3;\dots$ với $u_1=12$, $q=\dfrac{1}{2}$. Tổng $S=\dfrac{12}{1-\frac{1}{2}}=24$.` }),
    Q('11-5-31', 'Giới hạn của hàm số', 'short', 'VD', {
      content: R`Chi phí trung bình để sản xuất $x$ sản phẩm của một xưởng là $C(x)=\dfrac{2000+50x}{x}$ (nghìn đồng/sản phẩm). Khi số sản phẩm tăng lên rất lớn, chi phí trung bình dần tiến tới bao nhiêu nghìn đồng?`,
      answer: '50', explanation: R`$\lim\limits_{x\to+\infty}C(x)=\lim\limits_{x\to+\infty}\left(\dfrac{2000}{x}+50\right)=50$ (nghìn đồng).` }),
    Q('11-5-32', 'Hàm số liên tục', 'essay', 'VD', {
      content: R`Chứng minh rằng phương trình $x^3-3x+1=0$ có ba nghiệm phân biệt thuộc khoảng $(-2;2)$.`,
      answer: R`Mỗi khoảng $(-2;0)$, $(0;1)$, $(1;2)$ chứa ít nhất một nghiệm; phương trình bậc ba có tối đa 3 nghiệm.`,
      explanation: R`Xét $f(x)=x^3-3x+1$ liên tục trên $\mathbb{R}$. (0,25 điểm)
$f(-2)=-1$, $f(0)=1$, $f(1)=-1$, $f(2)=3$. (0,25 điểm)
Vì $f(-2)f(0)<0$, $f(0)f(1)<0$, $f(1)f(2)<0$ nên phương trình có ít nhất một nghiệm trong mỗi khoảng $(-2;0)$, $(0;1)$, $(1;2)$; ba khoảng rời nhau nên có ít nhất 3 nghiệm phân biệt trong $(-2;2)$. (0,25 điểm)
Phương trình bậc ba có không quá 3 nghiệm, vậy có đúng ba nghiệm phân biệt thuộc $(-2;2)$. (0,25 điểm)` })
  );
})();
