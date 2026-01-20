const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ===== FILE LƯU DỮ LIỆU =====
const DATA_FILE = path.join(__dirname, "activated.json");

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===== FAKE SMS =====
function sendSMS(phone, message) {
    console.log("=================================");
    console.log("📩 FAKE SMS ĐÃ GỬI");
    console.log("📞 SĐT:", phone);
    console.log("💬 Nội dung:");
    console.log(message);
    console.log("=================================");
}

// ===== HÀM ĐỌC / GHI FILE =====
function readData() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


// ===== TRANG THIẾT BỊ (DEVICE) =====
app.get("/device/:serial", (req, res) => {
    const serial = req.params.serial.trim();
    const list = readData();

    const found = list.find(i => i.serial === serial);

    // ===============================
    // CHƯA KÍCH HOẠT → HIỆN FORM
    // ===============================
    if (!found) {
        return res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Kích hoạt bảo hành</title>
</head>
<body>

<h1>KÍCH HOẠT BẢO HÀNH</h1>

<form method="POST" action="/activate">

  <label>Serial thiết bị</label><br>
  <input name="serial" value="${serial}" readonly><br><br>

  <label>Tên công ty khách hàng</label><br>
  <input name="company" required><br><br>

  <label>Số điện thoại</label><br>
  <input name="phone" required><br><br>

  <label>Người nhận</label><br>
  <input name="receiver" required><br><br>

  <label>Ngày nhận</label><br>
  <input type="date" name="date" required><br><br>

  <button type="submit">XÁC NHẬN KÍCH HOẠT</button>
</form>

</body>
</html>
        `);
    }

    // ===============================
    // ĐÃ KÍCH HOẠT → HIỆN THÔNG TIN
    // ===============================
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Thông tin bảo hành</title>
</head>
<body>

<h1>THÔNG TIN BẢO HÀNH</h1>

<p><b>Serial:</b> ${found.serial}</p>
<p><b>Công ty khách hàng:</b> ${found.company}</p>
<p><b>SĐT:</b> ${found.phone}</p>
<p><b>Người nhận:</b> ${found.receiver}</p>
<p><b>Ngày kích hoạt:</b> ${found.activeDate}</p>
<p><b>Ngày hết hạn:</b> ${found.expireDate}</p>
<p><b>Trạng thái:</b> ✅ Còn bảo hành</p>

<hr>
<p>Liên hệ LIN KA: (028) 6682 8478 – info@linka.com.vn</p>

</body>
</html>
    `);
});
// ===== KÍCH HOẠT BẢO HÀNH =====
app.post("/activate", (req, res) => {
    const { serial, company, phone, receiver, date } = req.body;

    let list = readData();

    // Không cho kích hoạt lại
    if (list.find(i => i.serial === serial)) {
        return res.send("<h2>Thiết bị đã được kích hoạt trước đó</h2>");
    }

    const activeDate = new Date(date);
    const expireDate = new Date(activeDate);
    expireDate.setFullYear(expireDate.getFullYear() + 2);

    const newItem = {
        serial,
        company,
        phone,
        receiver,
        activeDate: activeDate.toLocaleDateString("vi-VN"),
        expireDate: expireDate.toLocaleDateString("vi-VN")
    };

    list.push(newItem);
    writeData(list);

    // ===== GỬI SMS GIẢ =====
    const smsContent = `
LIN KA thong bao:
Thiet bi ${serial} da duoc kich hoat bao hanh.
Ngay kich hoat: ${newItem.activeDate}
Ngay het han: ${newItem.expireDate}
Hotline: 028 6682 8478
`;
    sendSMS(phone, smsContent);

    res.redirect(`/device/${serial}`);
});

// ===== TRANG ADMIN =====
app.get("/admin", (req, res) => {
    const list = readData();

    let rows = list.map(i => `
        <tr>
            <td>${i.serial}</td>
            <td>${i.company}</td>
            <td>${i.phone}</td>
            <td>${i.receiver}</td>
            <td>${i.activeDate}</td>
            <td>${i.expireDate}</td>
        </tr>
    `).join("");

    const html = `
    <h1>TRANG QUẢN LÝ BẢO HÀNH (ADMIN)</h1>
    <table border="1" cellpadding="8">
        <tr>
            <th>Serial</th>
            <th>Công ty</th>
            <th>SĐT</th>
            <th>Người nhận</th>
            <th>Ngày kích hoạt</th>
            <th>Ngày hết hạn</th>
        </tr>
        ${rows}
    </table>
    `;
    res.send(html);
});
// ===== KIỂM TRA & GỬI SMS NHẮC TRƯỚC 7 NGÀY =====
function checkWarrantyReminder() {
    let list = readData();
    let today = new Date();

    let changed = false;

    list.forEach(item => {
        if (item.remindSent) return;

        // Chuyển ngày hết hạn về Date
        let [d, m, y] = item.expireDate.split("/");
        let expireDate = new Date(`${y}-${m}-${d}`);

        let diffDays = Math.ceil(
            (expireDate - today) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 7) {
            // GỬI SMS
            sendSMS(item.phone, `
LIN KA thong bao:
Thiet bi ${item.serial} se het han bao hanh sau 7 ngay.
Ngay het han: ${item.expireDate}
Vui long lien he 028 6682 8478 neu can ho tro.
            `);

            item.remindSent = true;
            changed = true;
        }
    });

    if (changed) writeData(list);
}
// Kiểm tra mỗi 24 giờ
setInterval(checkWarrantyReminder, 24 * 60 * 60 * 1000);

// Chạy ngay khi server bật
checkWarrantyReminder();

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
