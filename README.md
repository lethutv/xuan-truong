# Tiến Thịnh EDU – Tạo đề & quản lý lớp THPT (Toán, Lí, Hóa, Tiếng Anh 10–12 – Kết nối tri thức)

Ứng dụng web chạy hoàn toàn trên trình duyệt (không cần máy chủ, không cần Internet, không cần cài đặt) để soạn đề kiểm tra Toán theo ma trận, sinh nhiều mã đề, chỉnh sửa, lưu và xuất PDF/Word kèm đáp án riêng.

## Chạy thử

**Cách 1 (đơn giản nhất):** mở file `index.html` bằng Chrome hoặc Edge (nhấp đúp).

**Cách 2 (khuyên dùng, dữ liệu lưu ổn định hơn):** nhấp đúp `chay-app.bat` (cần có Python), hoặc chạy:

```powershell
python -m http.server 8765
```

rồi mở http://localhost:8765.

> Đề đã lưu và câu hỏi tự thêm nằm trong bộ nhớ của trình duyệt (localStorage), gắn với từng địa chỉ. Mở bằng file và mở bằng localhost là **hai kho riêng**. Nên chọn một cách mở cố định và thường xuyên bấm **Đề đã lưu → Sao lưu tất cả** để giữ một bản JSON.

## Quy trình tạo đề

1. **Phạm vi:** chọn lớp, học kỳ (I, II hoặc cả năm) rồi tick các chương. Số bên cạnh mỗi chương là số câu hiện có trong ngân hàng.
2. **Hình thức:** chọn một mẫu, sau đó sửa tùy ý:

   | Mẫu | Cấu trúc |
   |---|---|
   | 15 phút | 10 câu trắc nghiệm, 1 điểm/câu |
   | Giữa kỳ | 12 trắc nghiệm (3đ) + 2 đúng/sai (2đ) + 4 trả lời ngắn (2đ) + 3 tự luận (3đ) |
   | Cuối kỳ | Cấu trúc 2025: 12 trắc nghiệm (3đ) + 4 đúng/sai (4đ) + 6 trả lời ngắn (3đ) |
   | Tùy chỉnh | Tự nhập số câu và điểm |

3. **Ma trận:** nhập số câu theo mức Nhận biết / Thông hiểu / Vận dụng và điểm cho từng dạng. Số nhỏ “/n” trong mỗi ô là số câu có sẵn trong ngân hàng (chữ đỏ nghĩa là thiếu). Bảng tự tính tổng điểm và cảnh báo khi tổng khác 10.
4. **Mã đề:** chọn số mã đề và mã bắt đầu, 4 chữ số theo phiếu 2025 (ví dụ 0101, 0102…), rồi chọn một trong hai cách trộn:
   - *Cùng bộ câu*: các mã đề dùng chung câu hỏi, chỉ đảo thứ tự câu trong từng phần và đảo phương án A–D (cách thường dùng).
   - *Mỗi mã khác câu*: mỗi mã đề chọn bộ câu riêng, nếu ngân hàng đủ câu.
   - Tick *Ưu tiên câu chưa dùng* để tránh lặp lại câu đã có trong các đề đã lưu.
5. Bấm **Sinh đề** để xem trước. Rê chuột vào một câu (trên điện thoại các nút luôn hiện) sẽ có ba nút:
   - **⇄ Đổi:** chọn câu thay thế cùng dạng, ưu tiên cùng chương và cùng mức độ.
   - **✎ Sửa:** sửa nội dung câu ngay trong đề, có xem trước công thức.
   - **✕:** xóa câu khỏi đề.

   Ba thao tác này áp dụng cho mọi mã đề. Tick **Hiện đáp án** để kiểm tra đáp án và lời giải ngay trên đề.
6. **Lưu đề**, rồi **Xuất file**:
   - **PDF:** mở hộp thoại in của trình duyệt, chọn *Lưu dưới dạng PDF*, khổ A4. Nên tắt mục “Đầu trang và chân trang”.
   - **Word (.docx):** công thức được chuyển thành phương trình Word thật, nên vẫn sửa được trong Word.
   - **Đáp án riêng:** bảng đáp án của tất cả mã đề, quy tắc chấm câu đúng/sai, và lời giải chi tiết của mã đề đang xem.

Thư mục `vi-du/` có file Word và PDF mẫu do app xuất ra.

## Ngân hàng câu hỏi

- Có sẵn **534 câu mẫu tự biên soạn** (không chép từ SGK), trong đó **143 câu có hình vẽ**:
  - Lớp 10 và lớp 11: mỗi chương 21 câu.
  - Lớp 12: mỗi chương 26 câu.
  - Câu nào cũng có đáp án, lời giải, mức độ, độ khó (1–3), chủ đề/bài và nguồn.
- Ở tab **Ngân hàng câu hỏi** có thể lọc, tìm, thêm, sửa, xóa câu. Câu mẫu khi sửa sẽ được lưu thành bản riêng; khi xóa thì chỉ bị ẩn đi.
- Viết công thức bằng LaTeX đặt trong `$...$`, ví dụ `$\dfrac{1}{2}$`, `$\sqrt{x^2+1}$`, `$\int_0^1 f(x)\,\mathrm{d}x$`. Ô xem trước hiển thị công thức ngay khi gõ.
- **Hình vẽ:** trong ô sửa câu có mục *Hình vẽ*. Có thể bấm **Tải ảnh lên** (ảnh chụp, ảnh vẽ bằng GeoGebra…; app tự thu nhỏ) hoặc **Chèn mẫu hình** rồi sửa số liệu. Hình hiện trong bản xem trước, khi in PDF và được chèn thành ảnh trong file Word. Ảnh tải lên chiếm nhiều bộ nhớ trình duyệt, nên dùng ảnh nhỏ gọn.
- **Nhập/Xuất JSON** để trao đổi ngân hàng giữa giáo viên. Mẫu một câu:

```json
{ "id": "gv-10-001", "grade": 10, "chapter": "10-6", "topic": "Hàm số bậc hai",
  "type": "mcq", "level": "TH", "difficulty": 2, "source": "GV Nguyễn A",
  "content": "Đỉnh của parabol $y=x^2-4x+1$ là", "options": ["$(2;-3)$","$(-2;13)$","$(2;3)$","$(4;1)$"],
  "answer": 0, "explanation": "$x=-\\dfrac{b}{2a}=2$, $y(2)=-3$." }
```

Các trường theo từng dạng:

- `type`: `mcq` (trắc nghiệm), `tf` (đúng/sai), `short` (trả lời ngắn), `essay` (tự luận).
- `tf` dùng `statements` (4 ý) và `answer: [true,false,…]`.
- `short` có `answer` là chuỗi tối đa 4 ký tự, dùng dấu phẩy thập phân, ví dụ `"2,5"`.
- `essay` có `answer` (đáp số, ý chính) và `explanation` (hướng dẫn chấm).
- Mã chương (`10-1` … `12-6`) xem trong `js/curriculum.js`.
- `figure` (không bắt buộc) là hình vẽ đi kèm câu hỏi:

  | Kiểu | Dùng cho | Ví dụ |
  |---|---|---|
  | `graph` | Đồ thị hàm số | `{"type":"graph","fn":"x^3-3*x+1","x":[-2.5,2.5],"y":[-2,4],"points":[[-1,3],[1,-1]]}` |
  | `bbt` | Bảng biến thiên | `{"type":"bbt","x":["-inf","-1","1","+inf"],"dy":["","+","0","-","0","+",""],"y":[["-inf","bottom"],["3","top"],["-1","bottom"],["+inf","top"]]}` |
  | `geo` | Hình học phẳng, không gian, sơ đồ cây, biểu đồ Ven | `{"type":"geo","points":{"S":[2,5],"A":[0,0],"B":[1.4,-1],"C":[4,0]},"segs":["SA","SB","SC","AB","BC"],"dashed":["AC"]}` |
  | `img` | Ảnh tải lên | `{"type":"img","src":"data:image/png;base64,…","width":320}` |
  | `svg` | Hình SVG tự vẽ | `{"type":"svg","svg":"<svg …>…</svg>"}` |

  Mô tả đầy đủ các tham số nằm ở đầu từng hàm trong `js/figures.js`. Ví dụ: `asymptotes` (đường tiệm cận), điểm rỗng `{open:true}`, ký hiệu góc vuông `right`, nét khuất `dashed`.
- `group` (không bắt buộc): các câu cùng `group` sẽ không bị chọn chung vào một đề. App cũng tự nhận các câu dùng chung bảng số liệu hoặc chung hình.

Kiểm tra dữ liệu (cấu trúc, công thức LaTeX, định dạng đáp án) bằng lệnh:

```powershell
node tools/validate.js
```

## Hai kho câu hỏi tách biệt

Mỗi câu thuộc đúng một trong hai kho, để câu học sinh đã luyện online không bao giờ xuất hiện trong bài kiểm tra:

| Kho | Dùng cho | Mặc định |
|---|---|---|
| **Kho đề kiểm tra** | Chỉ dùng để sinh đề và đổi câu. Không đưa cho học sinh. | 300 câu (số thứ tự 21 trở đi mỗi chương) và mọi câu giáo viên tự thêm |
| **Kho luyện tập** | Tab *Luyện tập (HS)* và trang luyện tập xuất cho học sinh. | 234 câu (số thứ tự 01–20 mỗi chương) |

Ở tab *Ngân hàng câu hỏi* có thể lọc theo kho và bấm **⇆** để chuyển một câu sang kho kia. Khi thêm hoặc sửa câu, chọn kho trong ô *Kho*.

**Trang luyện tập cho học sinh:** ở tab *Luyện tập (HS)*, bấm **Xuất trang luyện tập cho học sinh**. App tạo một file `luyen-tap-toan.html` (khoảng 130 KB) chỉ chứa kho luyện tập. Học sinh mở file là làm được, máy cần có Internet để hiển thị công thức. Bạn có thể gửi file qua Zalo hoặc đăng lên web. **Đừng gửi cả thư mục app cho học sinh**, vì trong đó có kho đề kiểm tra.

## Chấm bài bằng Phiếu trả lời trắc nghiệm 2025

App đọc đúng mẫu *Phiếu TLTN 2025, mã đề 4 số*: Số báo danh 8 chữ số, mã đề 4 chữ số, Phần I tối đa 40 câu, Phần II 8 câu, Phần III 6 câu.

1. **Tạo và lưu đề.** Mã đề có 4 chữ số (mặc định 0101, 0102…), trùng với ô *Mã đề thi* học sinh tô trên phiếu.
2. **Nhập danh sách học sinh.** Ở tab *Chấm bài*, bấm **Danh sách học sinh** rồi dán từ Excel 5 cột: *Họ và tên · SBD · Lớp · Khối · Khóa*. SBD trong danh sách phải trùng SBD học sinh tô trên phiếu. Khi hết khóa, nhập tên khóa (ví dụ `2023-2026`) rồi bấm **Xóa học sinh hết khóa**.
3. **Chấm.** Chọn đề, sau đó bấm **Tải ảnh / PDF phiếu** (chọn được nhiều ảnh hoặc file PDF scan nhiều trang cùng lúc) hoặc **Chụp phiếu** trên điện thoại. Mỗi phiếu được chấm trong khoảng 0,2–0,5 giây.
   - Khi chụp, cần thấy rõ **4 ô vuông đen ở 4 góc**, đủ sáng và không bị che. Chụp hơi nghiêng hoặc lộn ngược vẫn đọc được.
4. **Xem và sửa.** Bấm vào một bài trong danh sách để xem phiếu đã được tô màu:
   - 🟢 xanh: học sinh tô đúng;
   - 🟡 vàng: đáp án đúng mà học sinh không tô;
   - 🔴 đỏ: học sinh tô sai;
   - viền xanh dương: các số SBD và mã đề máy đã đọc.

   Nếu máy đọc nhầm, **bấm thẳng vào ô trên phiếu** để tô hoặc bỏ tô, điểm được tính lại ngay. Nếu SBD hay mã đề tô sai, chọn lại học sinh hoặc mã đề trong khung cam. Đề có tự luận thì nhập điểm tự luận vào ô **TL**.
5. **Xuất kết quả:**
   - **Xuất Excel**: file `.xlsx` gồm Khóa, Khối, Lớp, SBD, Họ tên, Mã đề, điểm từng phần, Tổng và Ghi chú.
   - **Ảnh đã chấm (ZIP)**: mỗi học sinh một ảnh phiếu đã tô màu, có tên và điểm ở đầu ảnh, để gửi cho học sinh hoặc phụ huynh.

**Cách tính điểm** (theo cấu trúc 2025, số điểm mỗi câu lấy từ đề đã lưu):

| Phần | Cách tính |
|---|---|
| Phần I | Đúng mỗi câu được trọn điểm câu đó. Tô 2 ô trở lên tính là sai. |
| Phần II | Đúng 1 ý được 10% điểm câu, 2 ý 25%, 3 ý 50%, 4 ý 100%. |
| Phần III | So theo giá trị số, nên "0,5" và "0,50" đều được tính đúng. |

App cảnh báo các trường hợp: tô nhiều ô, SBD không có trong danh sách, trùng SBD, không đọc được mã đề.

Kết quả chấm lưu trong trình duyệt (ảnh phiếu lưu trong IndexedDB). Nhớ **Xuất Excel** sau mỗi đợt chấm.

## Chế độ trực tuyến: đăng nhập Admin / Giáo viên / Học sinh / Phụ huynh (Supabase)

Khi `js/config.js` để trống, app chạy **ngoại tuyến**: một giáo viên dùng, dữ liệu lưu trên trình duyệt, không cần đăng nhập. Khi điền thông tin Supabase, app chạy **trực tuyến** với 4 vai trò.

**Giao diện cổng quản lý:** menu bên trái chia theo nhóm, trên điện thoại thu vào nút ☰. Góc trên có ô chọn **Môn** đang làm việc và menu tài khoản (đổi mật khẩu, đăng xuất).

| Vai trò | Menu |
|---|---|
| **Admin** | Tổng quan · *Người dùng*: Duyệt đăng ký, Tài khoản · *Tổ chức*: Khóa, lớp & học sinh, Phân công giảng dạy · *Đề kiểm tra*: Tạo đề, Đề đã lưu, Ngân hàng câu hỏi · *Chấm & điểm*: Chấm phiếu, Bảng điểm · *Học tập*: Bài tập về nhà, Luyện tập · *Lớp chủ nhiệm*: Xem theo lớp |
| **Giáo viên bộ môn** | Tổng quan · Lớp & học sinh · Đề kiểm tra (theo môn của mình) · Chấm & điểm · Bài tập về nhà |
| **GV chủ nhiệm** | Nhóm **Lớp chủ nhiệm** gồm 7 thẻ: Tổng quan (sĩ số, vắng/muộn hôm nay, HS cần chú ý, việc sắp tới) · Học sinh & PH · Điểm danh – Chuyên cần (sáng/chiều, 4 trạng thái, thống kê tháng, xuất Excel) · Nề nếp – Vi phạm · Thi đua – Khen thưởng (bảng xếp hạng, điểm rèn luyện = 100 + khen − vi phạm, xếp loại đề xuất Tốt/Khá/Đạt/Chưa đạt) · Kết quả học tập (điểm mọi môn, cảnh báo HS yếu, ai chưa nộp bài) · Công việc & lịch (việc cần làm, họp, sự kiện, lịch tháng) |
| **Học sinh** | Tổng quan (điểm TB, bài tập cần làm) · Bài tập về nhà · Luyện tập · Điểm của tôi · Giáo viên của lớp |
| **Phụ huynh** | Chọn con (nếu nhiều con) · Tổng quan · Điểm kiểm tra · Bài tập về nhà · Chuyên cần & nề nếp (chỉ xem) · Liên hệ giáo viên chủ nhiệm và giáo viên bộ môn |

**Nhiều môn học:**
- Đề kiểm tra, ngân hàng câu hỏi và bài tập đều tách riêng theo môn đang chọn.
- Môn Toán có sẵn chương trình KNTT và 534 câu.
- Các môn khác: giáo viên tự đặt tên **chương / bài** khi soạn câu (chọn *＋ Chương mới…*). Trang Tạo đề tự lấy danh sách chương từ ngân hàng của môn đó.
- Tiêu đề đề và file Word ghi đúng tên môn.

**Phân công:** Admin vào *Phân công giảng dạy* để giao cho mỗi giáo viên: dạy môn nào ở lớp nào, hoặc **chủ nhiệm** lớp nào. Giáo viên được phân công chủ nhiệm sẽ thấy nhóm menu *Lớp chủ nhiệm*. Học sinh và phụ huynh thấy tên cùng SĐT giáo viên của lớp.

**Đăng ký có duyệt:** Học sinh, giáo viên, phụ huynh bấm **Đăng ký** ở màn hình đăng nhập, rồi điền các thông tin theo vai trò:

| Vai trò | Thông tin cần điền |
|---|---|
| Mọi vai trò | Họ và tên, **số điện thoại** (dùng để đăng nhập), **mật khẩu mong muốn** |
| Giáo viên | Môn dạy, chủ nhiệm lớp nào (nếu có) |
| Phụ huynh | Họ tên con, lớp, khối, khóa của con |
| Học sinh | Lớp, khối, khóa |

Đơn đăng ký **chưa phải tài khoản**. Khi đơn chưa được duyệt, người dùng không đăng nhập được: màn hình báo *"Tài khoản chưa được xác thực thông tin"*.

Admin vào tab **Duyệt tài khoản**, kiểm tra và gắn đúng hồ sơ học sinh, lớp hoặc con, rồi bấm **Duyệt** hoặc **Từ chối** (kèm lý do; người đăng ký sẽ thấy lý do khi đăng nhập). Tài khoản được tạo **đúng vai trò đã đăng ký**. Người dùng đăng nhập bằng số điện thoại và mật khẩu họ đã chọn.

Admin vẫn tạo tài khoản trực tiếp được ở tab *Lớp & học sinh* (in phiếu tài khoản). Không cần email thật.

| Vai trò | Làm được gì |
|---|---|
| **Admin** | Mọi việc của giáo viên, cộng thêm: tạo và xóa **tài khoản** (giáo viên, học sinh, phụ huynh); thêm/sửa **khóa học** (ngày kết thúc); gắn phụ huynh với nhiều con; đặt lại mật khẩu mọi tài khoản; xóa ngay tài khoản hết khóa. |
| **Giáo viên** (theo môn) | Tạo đề, quản lý ngân hàng, chấm phiếu, giao **bài tập về nhà theo từng bài học**, tạo lớp, nhập danh sách học sinh, đặt lại mật khẩu học sinh/phụ huynh. **Không** tạo được tài khoản. |
| **Học sinh** (theo khóa, theo lớp) | Luyện tập (chỉ kho luyện tập), làm và nộp bài tập về nhà (chấm trên máy chủ), xem điểm và ảnh phiếu đã chấm của mình. |
| **Phụ huynh** | Gắn với một hoặc nhiều con (do admin gắn). Xem điểm, ảnh phiếu, tình trạng nộp bài tập của con. |

**Bảo mật:**
- Phân quyền nằm trong cơ sở dữ liệu (Row Level Security), không phụ thuộc giao diện.
- Gọi thẳng API đăng ký cũng bị máy chủ từ chối.
- Học sinh và phụ huynh **không đọc được kho đề kiểm tra**.
- Mỗi người chỉ xem điểm và ảnh phiếu của mình hoặc của con.
- Học sinh không sửa được điểm.
- Khi hết khóa, tài khoản học sinh và phụ huynh **tự xóa** lúc 2 giờ sáng mỗi ngày.

`tools/test-schema.mjs` có 73 phép kiểm tra cho các quy tắc trên, chạy trên Postgres giả lập.

### Cài đặt (làm một lần)

1. **Tạo dự án Supabase:** vào supabase.com → *New project*, chọn vùng Singapore.
2. **Tắt tự đăng ký của Supabase:** *Authentication → Sign In / Providers*, tắt **Allow new users to sign up**. App dùng đơn đăng ký riêng có duyệt, nên không cần chức năng này.
3. **Bật lịch tự xóa:** *Database → Extensions*, bật **pg_cron**.
4. **Tạo cơ sở dữ liệu:** *SQL Editor → New query*, dán toàn bộ `supabase/schema.sql` rồi bấm **Run**.
5. **Nạp ngân hàng câu hỏi:** tạo query mới, dán `supabase/seed.sql` (534 câu) rồi bấm **Run**.
6. **Tạo tài khoản admin đầu tiên:** tạo query mới, chạy lệnh dưới (đổi tên đăng nhập, mật khẩu, họ tên):

   ```sql
   select public.create_first_admin('admin', 'MatKhauManh123', 'Họ tên của bạn');
   ```

   Lệnh chỉ chạy được trong SQL Editor và chỉ khi chưa có admin nào.
7. **Đóng gói bản web:** lấy *Project URL* và khóa **anon / publishable** ở *Project Settings → API* (không dùng khóa secret), rồi chạy:

   ```powershell
   node tools/build-online.js https://xxxx.supabase.co <khoa-publishable> "Trường THPT ..."
   ```

   Lệnh tạo thư mục `dist/`, **không chứa file ngân hàng câu hỏi**.
8. **Đăng web:** xem mục *Đăng web và gắn tên miền* bên dưới.

### Vận hành hằng năm (Admin)

1. Ở tab *Lớp & học sinh*:
   - **Thêm khóa**, ví dụ `2025-2028`, kết thúc 30/06/2028.
   - **Thêm lớp**.
   - **Nhập danh sách** học sinh, dán từ Excel: Họ tên · SBD · Ngày sinh.
2. Bấm **Tạo tài khoản HS & PH còn thiếu**:
   - App tự đặt tên đăng nhập: `hs<SBD>` cho học sinh, `ph<SBD>` cho phụ huynh (ví dụ `hs10012345`, `ph10012345`). Mật khẩu ngẫu nhiên.
   - **Mật khẩu chỉ hiện một lần.** Hãy bấm **In phiếu tài khoản** hoặc **Tải Excel** ngay để phát cho từng người.
3. **Giáo viên:** bấm **Tạo tài khoản giáo viên** (họ tên, tên đăng nhập, môn dạy).
4. **Phụ huynh có nhiều con:** ở dòng của con thứ hai, bấm **＋PH** → *Gắn với tài khoản phụ huynh đã có*.
5. **Quên mật khẩu:** bấm 🔒 cạnh tên đăng nhập để đặt mật khẩu mới. Giáo viên cũng làm được việc này cho học sinh và phụ huynh.
6. Người dùng nên bấm **Đổi mật khẩu** sau lần đăng nhập đầu tiên.

### Đăng web và gắn tên miền

App được đăng lên **GitHub Pages** từ nhánh `gh-pages` của repo, tại tên miền `c3.louisapham.com`:

1. **Đóng gói và đẩy bản web:**

   ```powershell
   node tools/build-online.js <URL> <khoa-publishable> "Tên trường"
   ```

   Sau đó đẩy nội dung `dist/` lên nhánh `gh-pages`. Thư mục `dist/` đã có sẵn file `CNAME` chứa `c3.louisapham.com`.
2. **Bật GitHub Pages:** *GitHub → repo → Settings → Pages*, chọn *Source: Deploy from a branch → `gh-pages` / root*. *Custom domain* đặt là `c3.louisapham.com`, sau đó tick **Enforce HTTPS** khi nút này sáng.
3. **Thêm bản ghi DNS:** *Cloudflare → louisapham.com → DNS → Add record*:

   | Type | Name | Target | Proxy status |
   |---|---|---|---|
   | `CNAME` | `c3` | `lethutv.github.io` | **DNS only** (mây xám) |

## Cần bổ sung trước khi dùng thực tế

1. **Tiếp tục mở rộng ngân hàng.** Hiện mỗi chương có 21–26 câu, đủ cho khoảng 3–4 mã đề cuối kỳ khác câu hoàn toàn. Muốn nhiều mã đề khác nhau hơn nên có 40–60 câu mỗi chương. Khi thiếu câu ở một mức, app lấy câu ở mức gần nhất và có cảnh báo.
2. **Tổ chuyên môn thẩm định nội dung.** Đáp án đã được kiểm tra chéo tự động và tính lại từng câu, nhưng vẫn cần giáo viên duyệt về cách diễn đạt, mức độ và độ phù hợp với tiến độ dạy của trường.
3. **Hình vẽ:** hình do app vẽ được tạo bằng máy theo tọa độ. Đã xem lại toàn bộ, nhưng vài hình có nhãn hơi sát nét. Nếu cần hình đẹp hơn, có thể vẽ bằng GeoGebra rồi dùng *Tải ảnh lên* để thay. Trong file Word, hình được chèn dưới dạng ảnh, không sửa trực tiếp được như hình vẽ Word.
4. **Câu Đúng/Sai bị lệch đáp án:** ý a) gần như luôn là *Đúng* (93/96 câu), học sinh có thể đoán mẹo. Nên đảo lại thứ tự các ý trong ngân hàng.
5. **Phiếu chụp thật:** bộ đọc phiếu mới được thử với ảnh giả lập (chụp nghiêng, có bóng, lộn ngược). Nên chấm thử vài phiếu thật và đối chiếu trước khi dùng chính thức.
6. **Chế độ trực tuyến còn thiếu:**
   - Giáo viên chưa chấm được câu tự luận trong bài tập về nhà ngay trên app; hiện chỉ chấm tự động trắc nghiệm, đúng/sai và trả lời ngắn.
   - Chưa có chức năng phân công giáo viên theo lớp: mọi giáo viên thấy mọi lớp.
   - Mới có môn Toán. Cơ sở dữ liệu đã có sẵn bảng *subjects* để thêm môn khác.
7. **Đặc tả ma trận chính thức:** nếu Sở/Trường có bảng đặc tả riêng (số câu theo từng bài, từng mức), nên tạo thêm mẫu trong `PRESETS` ở `js/core.js`.

## Cấu trúc mã nguồn

```
index.html          Giao diện
css/style.css       Giao diện, responsive, CSS cho in ấn/PDF
js/curriculum.js    Danh mục chương/bài theo SGK Kết nối tri thức
js/bank-*.js        Ngân hàng câu hỏi mẫu (bank-10/11/12 và các phần bổ sung b, c)
js/figures.js       Vẽ hình: đồ thị, bảng biến thiên, hình học (SVG)
js/core.js          Lưu trữ, ngân hàng, thuật toán sinh đề, đáp án
js/docx.js          Xuất Word (.docx) với phương trình OMML
js/app.js           Điều khiển giao diện
js/omr-layout.js    Toạ độ 602 ô tô của Phiếu TLTN 2025 (đo từ file mẫu)
js/omr.js           Đọc phiếu: tìm ô vuông góc, nắn ảnh, đo độ đậm ô tô
js/grading.js       Danh sách học sinh, chấm điểm, tô màu, xuất Excel/ZIP
js/practice.js      Luyện tập cho học sinh (chỉ kho luyện tập) và xuất trang riêng
js/config.js        Cấu hình Supabase (để trống = ngoại tuyến)
js/cloud.js         Chế độ trực tuyến: đăng nhập/đăng ký, đồng bộ, menu theo vai trò, môn học, lớp & học sinh, duyệt tài khoản, bài tập, xem điểm
js/portal.js        Các trang cổng: Tổng quan, Tài khoản, Phân công, Bảng điểm, Liên hệ giáo viên
js/homeroom.js      Lớp chủ nhiệm (điểm danh, nề nếp, thi đua, kết quả học tập, công việc & lịch) + trang Chuyên cần cho HS/PH
js/curriculum-subjects.js  Chương trình Vật lí, Hóa học, Tiếng Anh (KNTT / Global Success)
js/bank-ly*, bank-hoa*, bank-anh*  Ngân hàng Lí, Hóa, Anh 10–12 (chỉ đưa lên Supabase qua seed.sql)
tools/portal-test.html  Xem thử giao diện từng vai trò bằng dữ liệu giả (?role=admin|teacher|homeroom|student|parent)
supabase/schema.sql Cơ sở dữ liệu, phân quyền (RLS), admin tạo tài khoản, tự xóa tài khoản hết khóa
supabase/seed.sql   Ngân hàng câu hỏi mẫu (534 câu) để nạp lên Supabase
tools/build-online.js  Đóng gói bản web trực tuyến (không kèm ngân hàng câu hỏi)
tools/make-seed.js  Sinh lại seed.sql từ các file bank-*.js
tools/test-schema.mjs  Kiểm thử phân quyền trên PGlite (npm i @electric-sql/pglite)
tools/omr-test/     Ảnh phiếu giả lập để kiểm tra bộ đọc phiếu (mở omr-test.html qua localhost)
vendor/             KaTeX 0.16.11 (MIT), JSZip 3.10.1 (MIT), mathml2omml 0.5.0 (LGPL-3.0), pdf.js 3.11.174 (Apache-2.0), supabase-js 2.45.4 (MIT), đóng gói sẵn để chạy offline
tools/validate.js   Kiểm tra ngân hàng câu hỏi
```

**Thuật toán sinh đề:**

- Với từng ô của ma trận (dạng × mức độ), app chọn câu theo điểm ưu tiên: câu chưa dùng trong các đề đã lưu, câu chưa dùng ở mã đề khác, rồi chia đều giữa các chương, cuối cùng chọn ngẫu nhiên.
- Thiếu câu ở một mức thì lấy sang mức lân cận và ghi cảnh báo.
- Câu được sắp xếp theo phần (I → IV), trong mỗi phần theo mức độ từ dễ đến khó. Từ mã đề thứ hai trở đi thì đảo thứ tự câu; phương án A–D được đảo bằng một hoán vị lưu kèm đề, nên đáp án luôn khớp.
