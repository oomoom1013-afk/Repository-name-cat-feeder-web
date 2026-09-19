// ============================================
// SUPABASE
// ============================================

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json"
};

const api = p => SUPABASE_URL + "/rest/v1/" + p;


// ============================================
// GET
// ============================================

async function get(p) {

  const u =
    api(p) +
    (p.includes("?") ? "&" : "?") +
    "_ts=" +
    Date.now();

  const r = await fetch(u, {
    method: "GET",
    headers: headers,
    cache: "no-store"
  });

  if (!r.ok) {
    throw new Error("HTTP " + r.status);
  }

  return await r.json();
}


// ============================================
// PATCH
// ============================================

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
    throw new Error("HTTP " + r.status);
  }
}


// ============================================
// CONNECTION STATUS
// ============================================

function conn(ok) {

  const e =
    document.getElementById("connection");

  if (!e) return;

  e.textContent =
    ok ? "● ออนไลน์" : "● ออฟไลน์";

  e.className =
    "badge " + (ok ? "online" : "offline");
}


// ============================================
// CLOCK
// ============================================

function clock() {

  const n = new Date();

  const clockEl =
    document.getElementById("clock");

  const dateEl =
    document.getElementById("date");

  if (clockEl) {

    clockEl.textContent =
      n.toLocaleTimeString("th-TH", {
        timeZone: "Asia/Bangkok",
        hour12: false
      });

  }

  if (dateEl) {

    dateEl.textContent =
      n.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

  }
}

clock();

setInterval(clock, 1000);


// ============================================
// SENSOR
// อัปเดตทุก 1 วินาที
// ============================================

async function sensor() {

  try {

    const a = await get(
      "cat_feeder?select=cat_distance,food_level,food_percent,cat_detected,created_at&order=created_at.desc&limit=1"
    );

    if (!a || !a.length) {

      console.log("ยังไม่มีข้อมูล Sensor");

      return;
    }

    const d = a[0];

    // --------------------------
    // Cat Distance
    // --------------------------

    const catDistance =
      document.getElementById("catDistance");

    if (catDistance) {

      const distance =
        Number(d.cat_distance);

      catDistance.textContent =
        Number.isFinite(distance)
          ? distance.toFixed(1)
          : "-";

    }


    // --------------------------
    // Cat Status
    // --------------------------

    const catStatus =
      document.getElementById("catStatus");

    if (catStatus) {

      catStatus.textContent =
        d.cat_detected
          ? "🐱 พบแมว"
          : "ไม่มีแมว";

    }


    // --------------------------
    // Food Percent
    // --------------------------

    let p =
      Number(d.food_percent);

    if (!Number.isFinite(p)) {
      p = 0;
    }

    p =
      Math.max(
        0,
        Math.min(100, p)
      );


    const foodPercent =
      document.getElementById("foodPercent");

    if (foodPercent) {

      foodPercent.textContent =
        p + "%";

    }


    // --------------------------
    // Food Level
    // --------------------------

    const foodLevel =
      document.getElementById("foodLevel");

    if (foodLevel) {

      const level =
        Number(d.food_level);

      foodLevel.textContent =
        Number.isFinite(level)
          ? level.toFixed(1)
          : "-";

    }


    // --------------------------
    // Food Progress Bar
    // --------------------------

    const foodBar =
      document.getElementById("foodBar");

    if (foodBar) {

      foodBar.style.width =
        p + "%";

    }


    // --------------------------
    // Connection
    // --------------------------

    conn(true);


    // Debug
    console.log(
      "Sensor:",
      d
    );

  }

  catch (e) {

    console.error(
      "Sensor Error:",
      e
    );

    conn(false);

  }

}


// ============================================
// ตารางเวลา
// ============================================

async function schedule() {

  try {

    const a = await get(
      "feed_schedule?select=slot,hour,minute,enabled&order=slot.asc"
    );

    const box =
      document.getElementById("schedules");

    if (!box) {

      console.warn(
        "ไม่พบ element #schedules"
      );

      return;
    }

    box.innerHTML = "";


    for (
      let s = 1;
      s <= 3;
      s++
    ) {

      const d =
        a.find(
          x => Number(x.slot) === s
        ) ||
        {
          hour: 0,
          minute: 0,
          enabled: false
        };


      const v =
        String(d.hour)
          .padStart(2, "0") +
        ":" +
        String(d.minute)
          .padStart(2, "0");


      const r =
        document.createElement("div");

      r.className =
        "schedule-row";


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

        <button
          onclick="saveSchedule(${s})"
        >
          บันทึก
        </button>

      `;


      box.appendChild(r);

    }

  }

  catch (e) {

    console.error(
      "Schedule Error:",
      e
    );

    const box =
      document.getElementById("schedules");

    if (box) {

      box.textContent =
        "โหลดตารางเวลาไม่สำเร็จ";

    }

  }

}


// ============================================
// บันทึกตารางเวลา
// ============================================

async function saveSchedule(s) {

  const timeEl =
    document.getElementById(
      "time-" + s
    );

  const enableEl =
    document.getElementById(
      "enable-" + s
    );


  if (!timeEl || !enableEl) {

    alert(
      "ไม่พบช่องตั้งเวลา"
    );

    return;
  }


  const v =
    timeEl.value;

  const en =
    enableEl.checked;


  if (!v) {

    alert(
      "กรุณาเลือกเวลา"
    );

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


    await schedule();

  }

  catch (e) {

    console.error(
      "Save Schedule Error:",
      e
    );

    alert(
      "บันทึกไม่สำเร็จ: " +
      e.message
    );

  }

}


// ============================================
// ประวัติแมว
// ============================================

async function history() {

  try {

    const a = await get(
      "cat_history?select=created_at&order=created_at.desc&limit=20"
    );


    const b =
      document.getElementById(
        "history"
      );


    if (!b) {

      console.warn(
        "ไม่พบ element #history"
      );

      return;
    }


    if (!a || !a.length) {

      b.innerHTML =
        '<div class="empty">ยังไม่มีประวัติ</div>';

      return;
    }


    b.innerHTML =

      a.map(
        (x, i) => {

          const time =
            new Date(
              x.created_at
            ).toLocaleString(
              "th-TH",
              {
                timeZone:
                  "Asia/Bangkok"
              }
            );


          return `
            <div class="history-item">
              ${i + 1}. ${time}
            </div>
          `;

        }
      ).join("");

  }

  catch (e) {

    console.error(
      "History Error:",
      e
    );


    const b =
      document.getElementById(
        "history"
      );


    if (b) {

      b.textContent =
        "โหลดประวัติไม่สำเร็จ";

    }

  }

}


// ============================================
// ปุ่มให้อาหาร
// ============================================

function setupFeedButton() {

  const feedBtn =
    document.getElementById(
      "feedBtn"
    );


  if (!feedBtn) {

    console.warn(
      "ไม่พบ #feedBtn"
    );

    return;
  }


  feedBtn.onclick = function () {

    const msg =
      document.getElementById(
        "feedMessage"
      );


    if (msg) {

      msg.textContent =
        "ปุ่มนี้รอระบบ feed_command เพื่อสั่ง Servo ผ่านอินเทอร์เน็ต";

    }

  };

}


// ============================================
// เริ่มระบบ
// ============================================

async function startApp() {

  console.log(
    "🐱 CAT FEEDER WEB START"
  );


  setupFeedButton();


  // โหลดครั้งแรก
  await sensor();

  await schedule();

  await history();


  // Sensor ทุก 1 วินาที
  setInterval(
    sensor,
    1000
  );


  // ตารางเวลาทุก 10 วินาที
  setInterval(
    schedule,
    10000
  );


  // ประวัติทุก 3 วินาที
  setInterval(
    history,
    3000
  );

}


// ============================================
// รอ HTML โหลดเสร็จก่อน
// ============================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();

}
