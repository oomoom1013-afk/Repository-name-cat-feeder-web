const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json"
};

const api = p => SUPABASE_URL + "/rest/v1/" + p;

async function get(p) {
  const u = api(p) +
    (p.includes("?") ? "&" : "?") +
    "_ts=" + Date.now();

  const r = await fetch(u, {
    headers,
    cache: "no-store"
  });

  if (!r.ok) {
    throw Error("HTTP " + r.status);
  }

  return r.json();
}

async function patch(p, body) {
  const r = await fetch(api(p), {
    method: "PATCH",
    headers: {
      ...headers,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    throw Error("HTTP " + r.status);
  }
}

function conn(ok) {
  const e = document.getElementById("connection");

  e.textContent = ok
    ? "● ออนไลน์"
    : "● ออฟไลน์";

  e.className = "badge " + (
    ok ? "online" : "offline"
  );
}

function clock() {
  const n = new Date();

  document.getElementById("clock").textContent =
    n.toLocaleTimeString("th-TH", {
      hour12: false
    });

  document.getElementById("date").textContent =
    n.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
}

setInterval(clock, 1000);
clock();


// ===============================
// SENSOR UPDATE ทุก 1 วินาที
// ===============================

async function sensor() {

  try {

    const a = await get(
      "cat_feeder?select=cat_distance,food_level,food_percent,cat_detected,created_at&order=created_at.desc&limit=1"
    );

    if (!a.length) return;

    const d = a[0];

    const p = Math.max(
      0,
      Math.min(
        100,
        Number(d.food_percent ?? 0)
      )
    );

    document.getElementById("catDistance").textContent =
      Number(d.cat_distance ?? 0).toFixed(1);

    document.getElementById("catStatus").textContent =
      d.cat_detected
        ? "🐱 พบแมว"
        : "ไม่มีแมว";

    document.getElementById("foodPercent").textContent =
      p + "%";

    document.getElementById("foodLevel").textContent =
      Number(d.food_level ?? 0).toFixed(1);

    document.getElementById("foodBar").style.width =
      p + "%";

    conn(true);

  } catch (e) {

    conn(false);

    console.error(e);

  }

}


// ===============================
// ตารางเวลา
// ===============================

async function schedule() {

  try {

    const a = await get(
      "feed_schedule?select=slot,hour,minute,enabled&order=slot.asc"
    );

    const box =
      document.getElementById("schedules");

    box.innerHTML = "";

    for (let s = 1; s <= 3; s++) {

      const d =
        a.find(x => Number(x.slot) === s) ||
        {
          hour: 0,
          minute: 0,
          enabled: false
        };

      const v =
        String(d.hour).padStart(2, "0") +
        ":" +
        String(d.minute).padStart(2, "0");

      const r =
        document.createElement("div");

      r.className = "schedule-row";

      r.innerHTML = `
        <b>เวลา ${s}</b>

        <input
          type="time"
          id="time-${s}"
          value="${v}"
        >

        <label>
          <input
            type="checkbox"
            id="enable-${s}"
            ${d.enabled ? "checked" : ""}
          >
          เปิด
        </label>

        <button onclick="saveSchedule(${s})">
          บันทึก
        </button>
      `;

      box.appendChild(r);
    }

  } catch (e) {

    document.getElementById("schedules").textContent =
      "โหลดตารางเวลาไม่สำเร็จ";

    console.error(e);

  }

}


// ===============================
// บันทึกเวลา
// ===============================

async function saveSchedule(s) {

  const v =
    document.getElementById(
      "time-" + s
    ).value;

  const en =
    document.getElementById(
      "enable-" + s
    ).checked;

  if (!v) {

    alert("กรุณาเลือกเวลา");

    return;
  }

  const [hour, minute] =
    v.split(":").map(Number);

  try {

    await patch(
      "feed_schedule?slot=eq." + s,
      {
        hour: hour,
        minute: minute,
        enabled: en
      }
    );

    alert(
      "บันทึกเวลา " +
      s +
      " เรียบร้อย"
    );

    schedule();

  } catch (e) {

    alert(
      "บันทึกไม่สำเร็จ: " +
      e.message
    );

  }

}


// ===============================
// ประวัติแมว
// ===============================

async function history() {

  try {

    const a = await get(
      "cat_history?select=created_at&order=created_at.desc&limit=20"
    );

    const b =
      document.getElementById("history");

    b.innerHTML =
      a.length

        ? a.map(
            (x, i) =>
              `<div class="history-item">
                ${i + 1}.
                ${new Date(
                  x.created_at
                ).toLocaleString("th-TH")}
              </div>`
          ).join("")

        : '<div class="empty">ยังไม่มีประวัติ</div>';

  } catch (e) {

    document.getElementById("history").textContent =
      "โหลดประวัติไม่สำเร็จ";

    console.error(e);

  }

}


// ===============================
// ปุ่มให้อาหาร
// ===============================

document.getElementById("feedBtn").onclick =
  () => {

    document.getElementById(
      "feedMessage"
    ).textContent =
      "ปุ่มนี้รอระบบ feed_command เพื่อสั่ง Servo ผ่านอินเทอร์เน็ต";

  };


// ===============================
// เริ่มทำงาน
// ===============================

sensor();
schedule();
history();


// Sensor ทุก 1 วินาที
setInterval(sensor, 1000);

// ตารางเวลาทุก 10 วินาที
setInterval(schedule, 10000);

// ประวัติทุก 3 วินาที
setInterval(history, 3000);
