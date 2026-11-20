// Cấu hình kết nối Supabase.
// Để TRỐNG hai dòng đầu = chế độ ngoại tuyến (một giáo viên, dữ liệu lưu trên trình duyệt, không đăng nhập).
// Điền URL và khóa anon/publishable = chế độ trực tuyến có đăng nhập Admin / Giáo viên / Học sinh / Phụ huynh.
// Khóa anon được phép công khai. TUYỆT ĐỐI không dán khóa service_role/secret vào đây.
window.APP_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  LOGIN_DOMAIN: 'taikhoan.detoan.app',   // tên miền giả cho email nội bộ (tên đăng nhập + @ + tên miền)
  SCHOOL_NAME: 'Trường THPT Tiến Thịnh',
  BRAND: 'Tiến Thịnh EDU'
};
