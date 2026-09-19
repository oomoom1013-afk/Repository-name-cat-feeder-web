// app.js - CAT FEEDER Remote Feed + 1 second update

const SUPABASE_URL =
  "https://hjvrsnbcmgkviquzjjdd.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_AzEhl3KzH9YWsuyzzkGZPg_Cog4g9Fz";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json"
};

function api(path) {
  return SUPABASE_URL + "/rest/v1/" + path;
}

async function get(path) {
  const r = await fetch(api(path), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

async function post(path, data) {
  const r = await fetch(api(path), {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(data)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error("HTTP " + r.status + " " + t);
  }

  return true;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}


// =============================
// อ่านข้อมูลเซนเซอร์
// =============================
async function sensor() {
  try {
    const rows = await get(
      "cat_feeder?select=cat_distance,food_level,food_percent,cat_detected,created_at&order=id.desc&limit=1"
    );

    if (!rows.length) return;

    const d = rows[0];

    setText(
      "catDistance",
      d.cat_distance != null
        ? Number(d.cat_distance).toFixed(1) + " cm"
        : "-"
    );

    setText(
      "foodLevel",
      d.food_level != null
        ? Number(d.food_level).toFixed(1) + " cm"
        : "-"
    );

    setText(
      "foodPercent",
      d.food_percent != null
        ? d.food_percent + "%"
        : "-"
    );

    const cat = document.getElementById("catDetected");

    if (cat) {
      cat.textContent = d.cat_detected
        ? "พบแมว"
        : "ไม่พบแมว";
    }

    const time = document.getElementById("lastUpdate");

    if (time && d.created_at) {
      time.textContent =
        new Date(d.created_at).toLocaleTimeString("th-TH");
    }

  } catch (e) {
    console.error("Sensor Error:", e);
  }
}


// =============================
// ตารางเวลาให้อาหาร
// =============================
async function schedule() {
  try {
    const rows = await get(
      "feed_schedule?select=slot,hour,minute,enabled&order=slot.asc"
    );

    rows.forEach(s => {
      const h = String(s.hour).padStart(2, "0");
      const m = String(s.minute).padStart(2, "0");

      setText(
        "time" + s.slot,
        h + ":" + m
      );

      const enabled =
        document.getElementById(
          "enabled" + s.slot
        );

      if (enabled) {
        enabled.checked = !!s.enabled;
      }
    });

  } catch (e) {
    console.error("Schedule Error:", e);
  }
}


// =============================
// ประวัติการตรวจพบแมว
// =============================
async function history() {
  try {
    const rows = await get(
      "cat_history?select=id,created_at&order=id.desc&limit=20"
    );

    const list =
      document.getElementById("historyList");

    if (!list) return;

    list.innerHTML = "";

    rows.forEach(r => {
      const li = document.createElement("li");

      li.textContent =
        new Date(r.created_at)
          .toLocaleString("th-TH");

      list.appendChild(li);
    });

  } catch (e) {
    console.error("History Error:", e);
  }
}


// =============================
// ให้อาหารทันที
// =============================
async function feedNow() {

  const btn =
    document.getElementById("feedBtn");

  const msg =
    document.getElementById("feedMessage");

  if (btn) {
    btn.disabled = true;
  }

  if (msg) {
    msg.textContent =
      "กำลังส่งคำสั่งให้อาหาร...";
  }

  try {

    await post(
      "feed_commands",
      {
        executed: false
      }
    );

    if (msg) {
      msg.textContent =
        "ส่งคำสั่งแล้ว รอ ESP32 สั่ง Servo...";
    }

  } catch (e) {

    console.error(
      "Feed Command Error:",
      e
    );

    if (msg) {
      msg.textContent =
        "ส่งคำสั่งไม่สำเร็จ: " +
        e.message;
    }

  } finally {

    setTimeout(() => {

      if (btn) {
        btn.disabled = false;
      }

    }, 1500);
  }
}


// =============================
// เชื่อมปุ่มให้อาหาร
// =============================
function setupFeedButton() {

  const btn =
    document.getElementById("feedBtn");

  if (btn) {
    btn.onclick = feedNow;
  }
}


// =============================
// เริ่มระบบ
// =============================
async function startApp() {

  setupFeedButton();

  await sensor();
  await schedule();
  await history();

  // เซนเซอร์อัปเดตทุก 1 วินาที
  setInterval(sensor, 1000);

  // ตารางเวลาอัปเดตทุก 5 วินาที
  setInterval(schedule, 5000);

  // ประวัติอัปเดตทุก 5 วินาที
  setInterval(history, 5000);
}


document.addEventListener(
  "DOMContentLoaded",
  startApp
);
