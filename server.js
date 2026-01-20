const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== FILE DATA =====
const DATA_FILE = path.join(__dirname, "activated.json");

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== READ / WRITE =====
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =======================================================
// 👀 LINK KHÁCH HÀNG – CHỈ XEM
// https://domain/check/:serial
// =======================================================
app.get("/check/:serial", (req, res) => {
  const serial = req.params.serial.trim();
  const list = readData();
  const found = list.find(i => i.serial === serial);

  if (!found) {
    return res.send(`
      <h1>THÔNG TIN BẢO HÀNH</h1>
      <p><b>Serial:</b> ${serial}</p>
      <p style="color:red">❌ Thiết bị CHƯA được kích hoạt bảo hành</p>
      <hr>
      <p>Vui lòng liên hệ LIN KA</p>
      <p>Hotline: (028) 6682 8478</p>
    `);
  }

  res.send(`
    <h1>THÔNG TIN BẢO HÀNH</h1>
    <p><b>Serial:</b> ${found.serial}</p>
    <p><b>Khách hàng:</b> ${found.company}</p>
    <p><b>Người nhận:</b> ${found.receiver}</p>
    <p><b>Ngày kích hoạt:</b> ${found.activeDate}</p>
    <p><b>Ngày hết hạn:</b> ${found.expireDate}</p>
    <p style="color:green">✅ Còn bảo hành</p>
    <hr>
    <p>LIN KA – (028) 6682 8478</p>
  `);
});

// =======================================================
// 🏭 LINK CÔNG TY – KÍCH HOẠT
// http://localhost:3000/activate/:serial
// =======================================================
app.get("/activate/:serial", (req, res) => {
  const serial = req.params.serial.trim();
  const list = readData();

  if (list.find(i => i.serial === serial)) {
    return res.send(`
      <h2>Thiết bị ${serial} đã được kích hoạt trước đó</h2>
      <a href="/check/${serial}">Xem thông tin bảo hành</a>
    `);
  }

  res.send(`
    <h1>KÍCH HOẠT BẢO HÀNH</h1>
    <form method="POST">
      <p><b>Serial:</b> ${serial}</p>
      <input type="hidden" name="serial" value="${serial}">

      <label>Công ty khách hàng</label><br>
      <input name="company" required><br><br>

      <label>Người nhận</label><br>
      <input name="receiver" required><br><br>

      <label>Số điện thoại</label><br>
      <input name="phone" required><br><br>

      <label>Ngày kích hoạt</label><br>
      <input type="date" name="date" required><br><br>

      <button type="submit">XÁC NHẬN KÍCH HOẠT</button>
    </form>
  `);
});

// =======================================================
// 📩 POST KÍCH HOẠT
// =======================================================
app.post("/activate/:serial", (req, res) => {
  const serial = req.params.serial.trim();
  const { company, receiver, phone, date } = req.body;

  let list = readData();
  if (list.find(i => i.serial === serial)) {
    return res.send("Thiết bị đã kích hoạt rồi");
  }

  const activeDate = new Date(date);
  const expireDate = new Date(activeDate);
  expireDate.setFullYear(expireDate.getFullYear() + 2);

  list.push({
    serial,
    company,
    receiver,
    phone,
    activeDate: activeDate.toLocaleDateString("vi-VN"),
    expireDate: expireDate.toLocaleDateString("vi-VN")
  });

  writeData(list);
  res.redirect(`/check/${serial}`);
});

// =======================================================
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
