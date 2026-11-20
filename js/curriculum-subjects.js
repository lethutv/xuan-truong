// Chương trình các môn khác Toán – bộ sách Kết nối tri thức với cuộc sống (Tiếng Anh: Global Success).
// Cấu trúc: CURRICULUM_SUBJECTS[mã môn][lớp][học kỳ] = [{ id, name, topics }]
window.CURRICULUM_SUBJECTS = {
  ly: {
    10: {
      1: [
        { id: 'ly10-0', name: 'Mở đầu', topics: ['Làm quen với Vật lí', 'Các quy tắc an toàn trong phòng thực hành Vật lí', 'Thực hành tính sai số trong phép đo. Ghi kết quả đo'] },
        { id: 'ly10-1', name: 'Chương I. Mô tả chuyển động', topics: ['Độ dịch chuyển và quãng đường đi được', 'Tốc độ và vận tốc', 'Đồ thị độ dịch chuyển – thời gian'] },
        { id: 'ly10-2', name: 'Chương II. Chuyển động biến đổi', topics: ['Chuyển động biến đổi. Gia tốc', 'Chuyển động thẳng biến đổi đều', 'Chuyển động ném'] },
        { id: 'ly10-3', name: 'Chương III. Động lực học', topics: ['Tổng hợp và phân tích lực. Cân bằng lực', 'Định luật 1 Newton', 'Định luật 2 Newton', 'Định luật 3 Newton', 'Trọng lực và lực căng', 'Lực ma sát', 'Lực cản và lực nâng', 'Moment lực. Cân bằng của vật rắn'] }
      ],
      2: [
        { id: 'ly10-4', name: 'Chương IV. Năng lượng, công, công suất', topics: ['Năng lượng. Công cơ học', 'Công suất', 'Động năng. Thế năng', 'Cơ năng và định luật bảo toàn cơ năng', 'Hiệu suất'] },
        { id: 'ly10-5', name: 'Chương V. Động lượng', topics: ['Động lượng', 'Định luật bảo toàn động lượng'] },
        { id: 'ly10-6', name: 'Chương VI. Chuyển động tròn', topics: ['Động học của chuyển động tròn đều', 'Động lực học của chuyển động tròn đều. Lực hướng tâm'] },
        { id: 'ly10-7', name: 'Chương VII. Biến dạng của vật rắn. Áp suất chất lỏng', topics: ['Biến dạng của vật rắn', 'Khối lượng riêng. Áp suất chất lỏng'] }
      ]
    },
    11: {
      1: [
        { id: 'ly11-1', name: 'Chương I. Dao động', topics: ['Dao động điều hòa', 'Mô tả dao động điều hòa', 'Vận tốc, gia tốc trong dao động điều hòa', 'Động năng. Thế năng. Sự chuyển hóa năng lượng trong dao động điều hòa', 'Dao động tắt dần. Dao động cưỡng bức. Hiện tượng cộng hưởng'] },
        { id: 'ly11-2', name: 'Chương II. Sóng', topics: ['Mô tả sóng', 'Sóng dọc và sóng ngang', 'Sóng điện từ', 'Giao thoa sóng kết hợp', 'Sóng dừng'] }
      ],
      2: [
        { id: 'ly11-3', name: 'Chương III. Điện trường', topics: ['Lực tương tác giữa các điện tích', 'Điện trường', 'Điện trường đều', 'Điện thế', 'Tụ điện', 'Năng lượng của tụ điện'] },
        { id: 'ly11-4', name: 'Chương IV. Dòng điện, mạch điện', topics: ['Cường độ dòng điện', 'Điện trở. Định luật Ohm', 'Nguồn điện', 'Năng lượng điện. Công suất điện'] }
      ]
    },
    12: {
      1: [
        { id: 'ly12-1', name: 'Chương I. Vật lí nhiệt', topics: ['Cấu trúc của chất. Sự chuyển thể', 'Nội năng. Định luật I của nhiệt động lực học', 'Thang nhiệt độ. Nhiệt kế', 'Nhiệt dung riêng', 'Nhiệt nóng chảy riêng', 'Nhiệt hóa hơi riêng'] },
        { id: 'ly12-2', name: 'Chương II. Khí lí tưởng', topics: ['Mô hình động học phân tử chất khí', 'Định luật Boyle', 'Định luật Charles', 'Phương trình trạng thái của khí lí tưởng', 'Áp suất khí theo mô hình động học phân tử. Quan hệ giữa động năng phân tử và nhiệt độ'] }
      ],
      2: [
        { id: 'ly12-3', name: 'Chương III. Từ trường', topics: ['Từ trường', 'Lực từ tác dụng lên đoạn dây dẫn mang dòng điện. Cảm ứng từ', 'Từ thông. Hiện tượng cảm ứng điện từ', 'Máy phát điện xoay chiều', 'Ứng dụng hiện tượng cảm ứng điện từ', 'Điện từ trường. Mô hình sóng điện từ'] },
        { id: 'ly12-4', name: 'Chương IV. Vật lí hạt nhân', topics: ['Cấu trúc hạt nhân', 'Phản ứng hạt nhân và năng lượng liên kết', 'Hiện tượng phóng xạ', 'Ứng dụng của hạt nhân trong đời sống'] }
      ]
    }
  },
  hoa: {
    10: {
      1: [
        { id: 'hoa10-1', name: 'Chương 1. Cấu tạo nguyên tử', topics: ['Thành phần của nguyên tử', 'Nguyên tố hóa học', 'Cấu trúc lớp vỏ electron nguyên tử'] },
        { id: 'hoa10-2', name: 'Chương 2. Bảng tuần hoàn các nguyên tố hóa học', topics: ['Cấu tạo của bảng tuần hoàn các nguyên tố hóa học', 'Xu hướng biến đổi một số tính chất của nguyên tử các nguyên tố', 'Xu hướng biến đổi thành phần và một số tính chất của hợp chất', 'Định luật tuần hoàn. Ý nghĩa của bảng tuần hoàn'] },
        { id: 'hoa10-3', name: 'Chương 3. Liên kết hóa học', topics: ['Quy tắc octet', 'Liên kết ion', 'Liên kết cộng hóa trị', 'Liên kết hydrogen và tương tác van der Waals'] },
        { id: 'hoa10-4', name: 'Chương 4. Phản ứng oxi hóa – khử', topics: ['Số oxi hóa', 'Phản ứng oxi hóa – khử và cân bằng phản ứng'] }
      ],
      2: [
        { id: 'hoa10-5', name: 'Chương 5. Năng lượng hóa học', topics: ['Enthalpy tạo thành và biến thiên enthalpy của phản ứng hóa học'] },
        { id: 'hoa10-6', name: 'Chương 6. Tốc độ phản ứng hóa học', topics: ['Tốc độ phản ứng', 'Các yếu tố ảnh hưởng đến tốc độ phản ứng'] },
        { id: 'hoa10-7', name: 'Chương 7. Nguyên tố nhóm VIIA (halogen)', topics: ['Tính chất vật lí và hóa học các đơn chất nhóm VIIA', 'Hydrogen halide. Muối halide'] }
      ]
    },
    11: {
      1: [
        { id: 'hoa11-1', name: 'Chương 1. Cân bằng hóa học', topics: ['Khái niệm về cân bằng hóa học', 'Cân bằng trong dung dịch nước'] },
        { id: 'hoa11-2', name: 'Chương 2. Nitrogen và sulfur', topics: ['Nitrogen', 'Ammonia và một số hợp chất ammonium', 'Một số hợp chất với oxygen của nitrogen', 'Sulfur và sulfur dioxide', 'Sulfuric acid và muối sulfate'] },
        { id: 'hoa11-3', name: 'Chương 3. Đại cương về hóa học hữu cơ', topics: ['Hợp chất hữu cơ và hóa học hữu cơ', 'Phương pháp tách biệt và tinh chế hợp chất hữu cơ', 'Công thức phân tử hợp chất hữu cơ', 'Cấu tạo hóa học hợp chất hữu cơ'] }
      ],
      2: [
        { id: 'hoa11-4', name: 'Chương 4. Hydrocarbon', topics: ['Alkane', 'Hydrocarbon không no', 'Arene (hydrocarbon thơm)'] },
        { id: 'hoa11-5', name: 'Chương 5. Dẫn xuất halogen – Alcohol – Phenol', topics: ['Dẫn xuất halogen', 'Alcohol', 'Phenol'] },
        { id: 'hoa11-6', name: 'Chương 6. Hợp chất carbonyl – Carboxylic acid', topics: ['Hợp chất carbonyl', 'Carboxylic acid'] }
      ]
    },
    12: {
      1: [
        { id: 'hoa12-1', name: 'Chương 1. Ester – Lipid', topics: ['Ester – Lipid', 'Xà phòng và chất giặt rửa'] },
        { id: 'hoa12-2', name: 'Chương 2. Carbohydrate', topics: ['Giới thiệu về carbohydrate. Glucose và fructose', 'Saccharose và maltose', 'Tinh bột và cellulose'] },
        { id: 'hoa12-3', name: 'Chương 3. Hợp chất chứa nitrogen', topics: ['Amine', 'Amino acid và peptide', 'Protein và enzyme'] },
        { id: 'hoa12-4', name: 'Chương 4. Polymer', topics: ['Đại cương về polymer', 'Vật liệu polymer'] }
      ],
      2: [
        { id: 'hoa12-5', name: 'Chương 5. Pin điện và điện phân', topics: ['Thế điện cực và nguồn điện hóa học', 'Điện phân'] },
        { id: 'hoa12-6', name: 'Chương 6. Đại cương về kim loại', topics: ['Cấu tạo và liên kết trong tinh thể kim loại', 'Tính chất của kim loại', 'Kim loại trong tự nhiên và phương pháp tách kim loại', 'Hợp kim – Sự ăn mòn kim loại'] },
        { id: 'hoa12-7', name: 'Chương 7. Nguyên tố nhóm IA và nhóm IIA', topics: ['Nguyên tố nhóm IA', 'Nguyên tố nhóm IIA'] },
        { id: 'hoa12-8', name: 'Chương 8. Sơ lược về kim loại chuyển tiếp dãy thứ nhất và phức chất', topics: ['Kim loại chuyển tiếp dãy thứ nhất', 'Sơ lược về phức chất'] }
      ]
    }
  },
  anh: (function () {
    const SECT = ['Pronunciation', 'Vocabulary', 'Grammar', 'Reading', 'Speaking & Communication', 'Writing'];
    const U = {
      10: ['Family life', 'Humans and the environment', 'Music', 'For a better community', 'Inventions', 'Gender equality', 'Viet Nam and international organisations', 'New ways to learn', 'Protecting the environment', 'Ecotourism'],
      11: ['A long and healthy life', 'The generation gap', 'Cities of the future', 'ASEAN and Viet Nam', 'Global warming', 'Preserving our heritage', 'Education options for school-leavers', 'Becoming independent', 'Social issues', 'The ecosystem'],
      12: ['Life stories we admire', 'A multicultural world', 'Green living', 'Urbanisation', 'The world of work', 'Artificial intelligence', 'The world of mass media', 'Wildlife conservation', 'Career paths', 'Lifelong learning']
    };
    const out = {};
    for (const g of [10, 11, 12]) {
      const units = U[g].map((n, i) => ({ id: `anh${g}-${i + 1}`, name: `Unit ${i + 1}. ${n}`, topics: SECT.slice() }));
      out[g] = { 1: units.slice(0, 5), 2: units.slice(5) };
    }
    return out;
  })()
};
