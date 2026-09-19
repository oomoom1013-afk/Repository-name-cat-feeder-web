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


// =========================
// GET
// =========================
async function get(path) {
  const r = await fetch(api(path), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!r.ok) {
    throw new Error("HTTP " + r.status);
  }

  return await r.json();
}


// =========================
// POST
// =========================
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
    const text = await r.text();
    throw new Error(
      "HTTP " + r.status + " " + text
    );
  }

  return true;
}


// =========================
// เวลา
// =========================
function updateClock() {

  const now = new Date();

  const time =
    now.toLocaleTimeString("th-TH");

  const date =
    now.toLocaleDateString("th-TH");

  const clock =
    document.getElementById("clock");

  const dateEl =
    document.getElementById("date");

  if (clock) {
    clock.textContent = time;
  }

  if (dateEl) {
    dateEl.textContent = date;
  }
}


// =========================
// SENSOR
// =========================
async function sensor() {

  try {

    const rows = await get(
      "cat_feeder?select=cat_distance,food_level,food_percent,cat_detected,created_at&order=id.desc&limit=1"
    );

    if (!rows.length) return;

    const d = rows[0];


    // ระยะห่างแมว
    const distance =
      document.getElementById("catDistance");

    if (distance) {

      distance.textContent =
        d.cat_distance != null
          ? Number(d.cat_distance).toFixed(1)
          : "--";
    }


    // สถานะแมว
    const catStatus =
      document.getElementById("catStatus");

    if (catStatus) {

      if (d.cat_detected) {
        catStatus.textContent = "🐱 พบแมว";
        catStatus.className =
          "status detected";
      } else {
        catStatus.textContent =
          "ไม่พบแมว";

        catStatus.className =
          "status";
      }
    }


    // เปอร์เซ็นต์อาหาร
    const foodPercent =
      document.getElementById(
        "foodPercent"
      );

    if (foodPercent) {

      foodPercent.textContent =
        d.food_percent != null
          ? d.food_percent + "%"
          : "--%";
    }


    // ระดับอาหาร
    const foodLevel =
      document.getElementById(
        "foodLevel"
      );

    if (foodLevel) {

      foodLevel.textContent =
        d.food_level != null
          ? Number(d.food_level).toFixed(1)
          : "--";
    }


    // แถบอาหาร
    const foodBar =
      document.getElementById(
        "foodBar"
      );

    if (foodBar) {

      let percent =
        Number(d.food_percent);

      if (isNaN(percent)) {
        percent = 0;
      }

      percent =
        Math.max(
          0,
          Math.min(100, percent)
        );

      foodBar.style.width =
        percent + "%";
    }


    // สถานะการเชื่อมต่อ
    const connection =
      document.getElementById(
        "connection"
      );

    if (connection) {

      connection.textContent =
        "ออนไลน์";

      connection.className =
        "badge online";
    }

  } catch (e) {

    console.error(
      "Sensor Error:",
      e
    );

    const connection =
      document.getElementById(
        "connection"
      );

    if (connection) {

      connection.textContent =
        "ออฟไลน์";

      connection.className =
        "badge offline";
    }
  }
}


// =========================
// SCHEDULE
// =========================
async function schedule() {

  try {

    const rows = await get(
      "feed_schedule?select=slot,hour,minute,enabled&order=slot.asc"
    );

    const box =
      document.getElementById(
        "schedules"
      );

    if (!box) return;

    box.innerHTML = "";

    rows.forEach(s => {

      const h =
        String(s.hour).padStart(2, "0");

      const m =
        String(s.minute).padStart(2, "0");

      const div =
        document.createElement("div");

      div.className = "schedule-item";

      div.innerHTML = `
        <b>มื้อที่ ${s.slot}</b>
        <span>${h}:${m}</span>
        <span>
          ${s.enabled ? "เปิดใช้งาน" : "ปิด"}
        </span>
      `;

      box.appendChild(div);
    });

  } catch (e) {

    console.error(
      "Schedule Error:",
      e
    );
  }
}


// =========================
// HISTORY
// =========================
async function history() {

  try {

    const rows = await get(
      "cat_history?select=id,created_at&order=id.desc&limit=20"
    );

    const box =
      document.getElementById(
        "history"
      );

    if (!box) return;

    box.innerHTML = "";

    if (!rows.length) {

      box.textContent =
        "ยังไม่มีประวัติ";

      return;
    }

    rows.forEach(r => {

      const div =
        document.createElement("div");

      div.textContent =
        new Date(
          r.created_at
        ).toLocaleString("th-TH");

      box.appendChild(div);
    });

  } catch (e) {

    console.error(
      "History Error:",
      e
    );
  }
}


// =========================
// FEED NOW
// =========================
async function feedNow() {

  const btn =
    document.getElementById(
      "feedBtn"
    );

  const msg =
    document.getElementById(
      "feedMessage"
    );

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


// =========================
// ปุ่มให้อาหาร
// =========================
function setupFeedButton() {

  const btn =
    document.getElementById(
      "feedBtn"
    );

  if (btn) {

    btn.addEventListener(
      "click",
      feedNow
    );
  }
}


// =========================
// START
// =========================
async function startApp() {

  setupFeedButton();

  updateClock();

  await sensor();
  await schedule();
  await history();


  // เวลา
  setInterval(
    updateClock,
    1000
  );


  // Sensor ทุก 1 วินาที
  setInterval(
    sensor,
    1000
  );


  // ตารางเวลา
  setInterval(
    schedule,
    5000
  );


  // ประวัติ
  setInterval(
    history,
    5000
  );
}


document.addEventListener(
  "DOMContentLoaded",
  startApp
);
