// Cấu trúc chương trình Toán THPT – bộ sách Kết nối tri thức với cuộc sống.
// Tên chương/bài dùng để phân loại câu hỏi. Có thể chỉnh sửa/bổ sung tại đây.
window.CURRICULUM = {
  10: {
    1: [
      { id: '10-1', name: 'Chương I. Mệnh đề và tập hợp', topics: ['Mệnh đề', 'Tập hợp và các phép toán trên tập hợp'] },
      { id: '10-2', name: 'Chương II. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', topics: ['Bất phương trình bậc nhất hai ẩn', 'Hệ bất phương trình bậc nhất hai ẩn'] },
      { id: '10-3', name: 'Chương III. Hệ thức lượng trong tam giác', topics: ['Giá trị lượng giác của một góc từ 0° đến 180°', 'Hệ thức lượng trong tam giác'] },
      { id: '10-4', name: 'Chương IV. Vectơ', topics: ['Các khái niệm mở đầu', 'Tổng và hiệu của hai vectơ', 'Tích của một vectơ với một số', 'Vectơ trong mặt phẳng tọa độ', 'Tích vô hướng của hai vectơ'] },
      { id: '10-5', name: 'Chương V. Các số đặc trưng của mẫu số liệu không ghép nhóm', topics: ['Số gần đúng và sai số', 'Các số đặc trưng đo xu thế trung tâm', 'Các số đặc trưng đo độ phân tán'] }
    ],
    2: [
      { id: '10-6', name: 'Chương VI. Hàm số, đồ thị và ứng dụng', topics: ['Hàm số', 'Hàm số bậc hai', 'Dấu của tam thức bậc hai', 'Phương trình quy về phương trình bậc hai'] },
      { id: '10-7', name: 'Chương VII. Phương pháp tọa độ trong mặt phẳng', topics: ['Phương trình đường thẳng', 'Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách', 'Đường tròn trong mặt phẳng tọa độ', 'Ba đường conic'] },
      { id: '10-8', name: 'Chương VIII. Đại số tổ hợp', topics: ['Quy tắc cộng và quy tắc nhân', 'Hoán vị, chỉnh hợp và tổ hợp', 'Nhị thức Newton'] },
      { id: '10-9', name: 'Chương IX. Tính xác suất theo định nghĩa cổ điển', topics: ['Biến cố và định nghĩa cổ điển của xác suất', 'Thực hành tính xác suất theo định nghĩa cổ điển'] }
    ]
  },
  11: {
    1: [
      { id: '11-1', name: 'Chương I. Hàm số lượng giác và phương trình lượng giác', topics: ['Giá trị lượng giác của góc lượng giác', 'Công thức lượng giác', 'Hàm số lượng giác', 'Phương trình lượng giác cơ bản'] },
      { id: '11-2', name: 'Chương II. Dãy số. Cấp số cộng và cấp số nhân', topics: ['Dãy số', 'Cấp số cộng', 'Cấp số nhân'] },
      { id: '11-3', name: 'Chương III. Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm', topics: ['Mẫu số liệu ghép nhóm', 'Các số đặc trưng đo xu thế trung tâm'] },
      { id: '11-4', name: 'Chương IV. Quan hệ song song trong không gian', topics: ['Đường thẳng và mặt phẳng trong không gian', 'Hai đường thẳng song song', 'Đường thẳng và mặt phẳng song song', 'Hai mặt phẳng song song', 'Phép chiếu song song'] },
      { id: '11-5', name: 'Chương V. Giới hạn. Hàm số liên tục', topics: ['Giới hạn của dãy số', 'Giới hạn của hàm số', 'Hàm số liên tục'] }
    ],
    2: [
      { id: '11-6', name: 'Chương VI. Hàm số mũ và hàm số lôgarit', topics: ['Lũy thừa với số mũ thực', 'Lôgarit', 'Hàm số mũ và hàm số lôgarit', 'Phương trình, bất phương trình mũ và lôgarit'] },
      { id: '11-7', name: 'Chương VII. Quan hệ vuông góc trong không gian', topics: ['Hai đường thẳng vuông góc', 'Đường thẳng vuông góc với mặt phẳng', 'Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng', 'Hai mặt phẳng vuông góc', 'Khoảng cách', 'Góc giữa đường thẳng và mặt phẳng. Góc nhị diện', 'Thể tích'] },
      { id: '11-8', name: 'Chương VIII. Các quy tắc tính xác suất', topics: ['Biến cố giao và quy tắc nhân xác suất', 'Biến cố hợp và quy tắc cộng xác suất'] },
      { id: '11-9', name: 'Chương IX. Đạo hàm', topics: ['Định nghĩa và ý nghĩa của đạo hàm', 'Các quy tắc tính đạo hàm', 'Đạo hàm cấp hai'] }
    ]
  },
  12: {
    1: [
      { id: '12-1', name: 'Chương I. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số', topics: ['Tính đơn điệu và cực trị của hàm số', 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', 'Đường tiệm cận của đồ thị hàm số', 'Khảo sát sự biến thiên và vẽ đồ thị của hàm số', 'Ứng dụng đạo hàm để giải quyết một số vấn đề thực tiễn'] },
      { id: '12-2', name: 'Chương II. Vectơ và hệ trục tọa độ trong không gian', topics: ['Vectơ trong không gian', 'Hệ trục tọa độ trong không gian', 'Biểu thức tọa độ của các phép toán vectơ'] },
      { id: '12-3', name: 'Chương III. Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm', topics: ['Khoảng biến thiên và khoảng tứ phân vị', 'Phương sai và độ lệch chuẩn'] }
    ],
    2: [
      { id: '12-4', name: 'Chương IV. Nguyên hàm và tích phân', topics: ['Nguyên hàm', 'Tích phân', 'Ứng dụng hình học của tích phân'] },
      { id: '12-5', name: 'Chương V. Phương pháp tọa độ trong không gian', topics: ['Phương trình mặt phẳng', 'Phương trình đường thẳng trong không gian', 'Phương trình mặt cầu'] },
      { id: '12-6', name: 'Chương VI. Xác suất có điều kiện', topics: ['Xác suất có điều kiện', 'Công thức xác suất toàn phần và công thức Bayes'] }
    ]
  }
};
