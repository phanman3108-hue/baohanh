const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "activated.json");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== ĐỌC / GHI DATA =====
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==========================
// LINK CÔNG TY – KÍCH HOẠT
// ==========================
app.get("/device/:serial", (req, res) => {
  const serial = req.params.serial;
  const list = readData();
  const found = list.find(i => i.serial === serial);

  // CHƯA KÍCH HOẠT → HIỆN FORM
  if (!found) {
    return res.send(`
      <h1>KÍCH HOẠT BẢO HÀNH</h1>
      <form method="POST" action="/activate">
        <input type="hidden" name="serial" value="${serial}">
        <p>Serial: <b>${serial}</b></p>

        <label>Khách hàng</label><br>
        <input name="company" required><br><br>

        <label>SĐT</label><br>
        <input name="phone" required><br><br>

        <button type="submit">XÁC NHẬN KÍCH HOẠT</button>
      </form>
    `);
  }

  // ĐÃ KÍCH HOẠT
  res.send(`
    <h1>THIẾT BỊ ĐÃ KÍCH HOẠT</h1>
    <p><b>Serial:</b> ${found.serial}</p>
    <p><b>Khách hàng:</b> ${found.company}</p>
    <p><b>Ngày kích hoạt:</b> ${found.activeDate}</p>
    <p><b>Ngày hết hạn:</b> ${found.expireDate}</p>
  `);
});

// ==========================
// POST KÍCH HOẠT
// ==========================
app.post("/activate", (req, res) => {
  const { serial, company, phone } = req.body;
  let list = readData();

  if (list.find(i => i.serial === serial)) {
    return res.send("Thiết bị đã được kích hoạt");
  }

  const activeDate = new Date();
  const expireDate = new Date();
  expireDate.setFullYear(expireDate.getFullYear() + 2);

  list.push({
    serial,
    company,
    phone,
    activeDate: activeDate.toLocaleDateString("vi-VN"),
    expireDate: expireDate.toLocaleDateString("vi-VN")
  });

  writeData(list);
  res.redirect(`/device/${serial}`);
});

// ==========================
// LINK KHÁCH HÀNG – CHECK
// ==========================
app.get("/check/:serial", (req, res) => {
  const serial = req.params.serial;
  const list = readData();
  const found = list.find(i => i.serial === serial);

  if (!found) {
    return res.send(`
      <h1>THÔNG TIN BẢO HÀNH</h1>
      <p><b>Serial:</b> ${serial}</p>
      <p style="color:red">❌ Thiết bị chưa được kích hoạt bảo hành</p>
      <p>Vui lòng liên hệ LIN KA</p>
    `);
  }

  res.send(`
    <h1>THÔNG TIN BẢO HÀNH</h1>
    <p><b>Serial:</b> ${found.serial}</p>
    <p><b>Khách hàng:</b> ${found.company}</p>
    <p><b>Ngày kích hoạt:</b> ${found.activeDate}</p>
    <p><b>Ngày hết hạn:</b> ${found.expireDate}</p>
    <p style="color:green">✅ Còn bảo hành</p>
  `);
});

// ==========================
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
