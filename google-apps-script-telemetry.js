/**
 * =========================================================================
 * SUCCEED IN A2 KEY LISTENING - REAL-TIME TELEMETRY & BIG DATA TRACKER
 * Target Google Sheet: KET - Live Telemetry
 * Doc ID: 1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U
 * Sheet URL: https://docs.google.com/spreadsheets/d/1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U/edit
 * Tác giả: Thầy Mike Pham & Antigravity AI
 * =========================================================================
 * 
 * HƯỚNG DẪN KÍCH HOẠT (CHỈ 1 PHÚT DUY NHẤT TRÊN GOOGLE DRIVE):
 * 1. Mở file Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U/edit
 * 2. Đổi tên trang tính đầu tiên thành: Live_Telemetry.
 * 3. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 4. Xóa toàn bộ nội dung trong file Code.gs, dán toàn bộ đoạn mã này vào.
 * 5. Bấm biểu tượng 💾 Lưu (Ctrl + S hoặc Cmd + S).
 * 6. Bấm nút "Triển khai" (Deploy) màu xanh ở góc trên bên phải -> "Quản lý bản triển khai mới" (New deployment).
 * 7. Chọn loại (biểu tượng bánh răng ⚙️): "Ứng dụng web" (Web app).
 *    - Mô tả: Succeed in A2 Key Live Telemetry v1
 *    - Thực thi dưới dạng (Execute as): "Tôi" (My account - mikepham358@gmail.com)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> RẤT QUAN TRỌNG ĐỂ GITHUB PAGES GỬI ĐƯỢC DỮ LIỆU
 * 8. Bấm "Triển khai", cấp quyền truy cập tài khoản Google khi được hỏi.
 * 9. Sao chép "URL Ứng dụng web" (dạng https://script.google.com/macros/s/AKfycb.../exec)
 *    và dán vào nút ⚙️ Webhook URL trên ứng dụng web, hoặc cập nhật hằng số DEFAULT_TELEMETRY_WEBHOOK_URL trong ket-tracker.js.
 */

var TARGET_DOC_ID = "1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U";
var SHEET_NAME = "Live_Telemetry";

function getTargetSpreadsheet(data) {
  var id = (data && data.sheet_id) ? data.sheet_id : TARGET_DOC_ID;
  try {
    if (id) {
      return SpreadsheetApp.openById(id);
    }
  } catch (err) {}
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Thời Gian (VN)",
      "Mã Phiên (Session ID)",
      "Họ Và Tên Học Sinh",
      "Email Học Sinh",
      "Mục Tiêu (Target)",
      "Bộ Đề (Test ID)",
      "Chế Độ (Mode)",
      "Phần / Câu",
      "Loại Tương Tác (Event)",
      "Kết Quả / Trạng Thái",
      "Chi Tiết Hành Động (Details)",
      "Thời Gian Làm (Giây)",
      "Thiết Bị / Trình Duyệt"
    ];
    sheet.appendRow(headers);
    
    // Định dạng Header Row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0284c7"); // Lego Blue
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setFontSize(10.5);
    
    // Cố định dòng tiêu đề
    sheet.setFrozenRows(1);
    
    // Độ rộng các cột
    sheet.setColumnWidth(1, 160); // Thời gian
    sheet.setColumnWidth(2, 160); // Session ID
    sheet.setColumnWidth(3, 190); // Họ và tên
    sheet.setColumnWidth(4, 220); // Email
    sheet.setColumnWidth(5, 140); // Mục tiêu
    sheet.setColumnWidth(6, 120); // Bộ đề
    sheet.setColumnWidth(7, 160); // Chế độ
    sheet.setColumnWidth(8, 120); // Câu số
    sheet.setColumnWidth(9, 160); // Event Type
    sheet.setColumnWidth(10, 180); // Kết Quả
    sheet.setColumnWidth(11, 380); // Details
    sheet.setColumnWidth(12, 130); // Giây
    sheet.setColumnWidth(13, 160); // Thiết bị
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Khóa 10s để đảm bảo an toàn đồng thời khi nhiều học sinh cùng gửi dữ liệu
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Server busy, lock timeout" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var ss = getTargetSpreadsheet(data);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    setupSheetHeaders(sheet);

    // Định dạng thời gian theo múi giờ Việt Nam (UTC+7)
    var timestampStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss");

    var detailsStr = "";
    if (typeof data.details === "object") {
      detailsStr = JSON.stringify(data.details);
    } else if (data.details !== undefined && data.details !== null) {
      detailsStr = String(data.details);
    }

    var resultStr = data.result || "";

    var rowData = [
      timestampStr,
      data.session_id || "KET_ANON",
      data.student_name || "Ẩn danh",
      data.student_email || "Chưa có email",
      data.target_score || "",
      data.test_id || "Practice Test 1",
      data.mode || "Mức 1: Chép Chính Tả",
      data.question_number || "",
      data.event_type || "INTERACTION",
      resultStr,
      detailsStr,
      data.duration_seconds || 0,
      data.device || ""
    ];

    sheet.appendRow(rowData);
    var newRow = sheet.getLastRow();

    // Định dạng màu nhẹ theo loại tương tác để Thầy Cô dễ theo dõi trực quan
    if (resultStr.indexOf("ĐÚNG") !== -1 && resultStr.indexOf("CHƯA ĐÚNG") === -1) {
      sheet.getRange(newRow, 10).setBackground("#e6f4ea").setFontColor("#137333").setFontWeight("bold"); // Xanh lá
    } else if (resultStr.indexOf("CHƯA ĐÚNG") !== -1) {
      sheet.getRange(newRow, 10).setBackground("#fce8e6").setFontColor("#c5221f").setFontWeight("bold"); // Đỏ
    } else if (data.event_type === "EXAM_SUBMIT" || resultStr.indexOf("NỘP BÀI") !== -1) {
      sheet.getRange(newRow, 10).setBackground("#f3e8fd").setFontColor("#7b1fa2").setFontWeight("bold"); // Tím nộp bài
      sheet.getRange(newRow, 9).setBackground("#f3e8fd").setFontColor("#7b1fa2").setFontWeight("bold");
    } else if (data.event_type === "HINT_USED" || resultStr.indexOf("GỢI Ý") !== -1) {
      sheet.getRange(newRow, 10).setBackground("#fef9c3").setFontColor("#854d0e").setFontWeight("bold"); // Vàng Lego Hint
    } else if (data.event_type === "VOCAB_SAVED" || resultStr.indexOf("LƯU TỪ") !== -1) {
      sheet.getRange(newRow, 10).setBackground("#e0f2fe").setFontColor("#0369a1").setFontWeight("bold"); // Xanh dương Từ vựng
      sheet.getRange(newRow, 9).setBackground("#e0f2fe").setFontColor("#0369a1").setFontWeight("bold");
    } else if (data.event_type === "TRAP_LOGGED" || resultStr.indexOf("BẪY") !== -1) {
      sheet.getRange(newRow, 10).setBackground("#ffedd5").setFontColor("#c2410c").setFontWeight("bold"); // Cam bẫy đề
    } else if (data.event_type === "SESSION_START") {
      sheet.getRange(newRow, 10).setBackground("#ecfdf5").setFontColor("#047857").setFontWeight("bold"); // Xanh ngọc Session
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      row: newRow,
      timestamp: timestampStr,
      sheet_id: ss.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  return ContentService.createTextOutput("✅ Succeed in A2 Key Listening Live Telemetry (Sheet: KET - Live Telemetry [1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U]) is ACTIVE! Total recorded events: " + count);
}
