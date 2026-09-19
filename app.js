// =====================================================
// SUPABASE
// =====================================================

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json"
};


// =====================================================
// API
// =====================================================

function api(path) {
  return SUPABASE_URL + "/rest/v1/" + path;
}


// =====================================================
// GET
// =====================================================

async function get(path) {

  const r = await fetch(
    api(path),
    {
      method: "GET",
      headers,
      cache: "no-store"
    }
  );

  if (!r.ok) {

    throw new Error(
      "HTTP " + r.status
    );
  }

  return await r.json();
}


// =====================================================
// POST
// =====================================================

async function post(path, data) {

  const r = await fetch(
    api(path),
    {
      method: "POST",

      headers: {
        ...headers,
        Prefer: "return=minimal"
      },

      body: JSON.stringify(data)
    }
  );

  if (!r.ok) {

    const text =
      await r.text();

    throw new Error(
      "HTTP " +
      r.status +
      " " +
      text
    );
  }

  return true;
}


// =====================================================
// CLOCK
// =====================================================

function updateClock() {

  const now =
    new Date();

  const time =
    now.toLocaleTimeString(
      "th-TH"
    );

  const date =
    now.toLocaleDateString(
      "th-TH"
    );

  const clock =
    document.getElementById(
      "clock"
    );

  const dateEl =
    document.getElementById(
      "date"
    );

  if (clock) {
    clock.textContent =
      time;
  }

  if (dateEl) {
    dateEl.textContent =
      date;
  }
}


// =====================================================
// SENSOR
// =====================================================

async function sensor() {

  try {

    const rows =
      await get(
        "cat_feeder?select=cat_distance,food_level,food_percent,cat_detected,created_at&order=id.desc&limit=1"
      );

    if (!rows.length) {
      return;
    }

    const d =
      rows[0];


    // -----------------------------
    // Cat Distance
    // -----------------------------

    const distance =
      document.getElementById(
        "catDistance"
      );

    if (distance) {

      distance.textContent =
        d.cat_distance != null
          ? Number(
              d.cat_distance
            ).toFixed(1)
          : "--";
    }


    // -----------------------------
    // Cat Status
    // -----------------------------

    const catStatus =
      document.getElementById(
        "catStatus"
      );

    if (catStatus) {

      if (d.cat_detected) {

        catStatus.textContent =
          "🐱 พบแมว";

        catStatus.className =
          "status detected";

      } else {

        catStatus.textContent =
          "ไม่พบแมว";

        catStatus.className =
          "status";
      }
    }


    // -----------------------------
    // Food Percent
    // -----------------------------

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


    // -----------------------------
    // Food Level
    // -----------------------------

    const foodLevel =
      document.getElementById(
        "foodLevel"
      );

    if (foodLevel) {

      foodLevel.textContent =
        d.food_level != null
          ? Number(
              d.food_level
            ).toFixed(1)
          : "--";
    }


    // -----------------------------
    // Food Bar
    // -----------------------------

    const foodBar =
      document.getElementById(
        "foodBar"
      );

    if (foodBar) {

      let percent =
        Number(
          d.food_percent
        );

      if (isNaN(percent)) {
        percent = 0;
      }

      percent =
        Math.max(
          0,
          Math.min(
            100,
            percent
          )
        );

      foodBar.style.width =
        percent + "%";
    }


    // -----------------------------
    // Connection
    // -----------------------------

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


// =====================================================
// SCHEDULE
// =====================================================

async function schedule() {

  try {

    const rows =
      await get(
        "feed_schedule?select=slot,hour,minute,enabled&order=slot.asc"
      );

    const box =
      document.getElementById(
        "schedules"
      );

    if (!box) {
      return;
    }

    box.innerHTML = "";


    // -----------------------------
    // ไม่มีข้อมูล
    // -----------------------------

    if (!rows.length) {

      box.textContent =
        "ยังไม่มีการตั้งเวลา";

      return;
    }


    // -----------------------------
    // สร้างแต่ละมื้อ
    // -----------------------------

    rows.forEach(
      s => {

        const h =
          String(
            s.hour
          ).padStart(
            2,
            "0"
          );

        const m =
          String(
            s.minute
          ).padStart(
            2,
            "0"
          );


        const div =
          document.createElement(
            "div"
          );


        // สำคัญ:
        // ใช้ schedule-row ให้ตรงกับ CSS
        div.className =
          "schedule-row";


        div.innerHTML = `

          <b>
            มื้อที่ ${s.slot}
          </b>

          <input
            type="time"
            id="time-${s.slot}"
            value="${h}:${m}"
          >

          <label>

            <input
              type="checkbox"
              id="enable-${s.slot}"
              ${s.enabled ? "checked" : ""}
            >

            เปิดใช้งาน

          </label>

          <button
            type="button"
            onclick="saveSchedule(${s.slot})"
          >
            บันทึก
          </button>

          <span
            id="schedule-msg-${s.slot}"
          ></span>

        `;


        box.appendChild(
          div
        );

      }
    );

  } catch (e) {

    console.error(
      "Schedule Error:",
      e
    );

    const box =
      document.getElementById(
        "schedules"
      );

    if (box) {

      box.textContent =
        "โหลดเวลาไม่สำเร็จ";
    }
  }
}


// =====================================================
// SAVE SCHEDULE
// =====================================================

async function saveSchedule(slot) {

  const timeInput =
    document.getElementById(
      "time-" + slot
    );

  const enableInput =
    document.getElementById(
      "enable-" + slot
    );

  const msg =
    document.getElementById(
      "schedule-msg-" + slot
    );


  if (!timeInput) {
    return;
  }


  // -----------------------------
  // อ่านเวลา
  // -----------------------------

  const time =
    timeInput.value;


  if (!time) {

    if (msg) {

      msg.textContent =
        "กรุณาเลือกเวลา";
    }

    return;
  }


  const parts =
    time.split(":");


  const hour =
    Number(
      parts[0]
    );

  const minute =
    Number(
      parts[1]
    );


  // -----------------------------
  // อ่านสถานะเปิด/ปิด
  // -----------------------------

  const enabled =
    enableInput
      ? enableInput.checked
      : true;


  if (msg) {

    msg.textContent =
      "กำลังบันทึก...";
  }


  try {

    const r =
      await fetch(
        api(
          "feed_schedule?slot=eq." +
          slot
        ),
        {
          method: "PATCH",

          headers: {
            ...headers,
            Prefer: "return=minimal"
          },

          body: JSON.stringify({

            hour:
              hour,

            minute:
              minute,

            enabled:
              enabled

          })
        }
      );


    // -----------------------------
    // ตรวจสอบผลลัพธ์
    // -----------------------------

    if (!r.ok) {

      const text =
        await r.text();

      throw new Error(
        "HTTP " +
        r.status +
        " " +
        text
      );
    }


    // -----------------------------
    // สำเร็จ
    // -----------------------------

    if (msg) {

      msg.textContent =
        "บันทึกแล้ว ✓";
    }


  } catch (e) {

    console.error(
      "Save Schedule Error:",
      e
    );

    if (msg) {

      msg.textContent =
        "บันทึกไม่สำเร็จ: " +
        e.message;
    }
  }
}


// =====================================================
// HISTORY
// =====================================================

async function history() {

  try {

    const rows =
      await get(
        "cat_history?select=id,created_at&order=id.desc&limit=20"
      );

    const box =
      document.getElementById(
        "history"
      );

    if (!box) {
      return;
    }

    box.innerHTML = "";


    if (!rows.length) {

      box.textContent =
        "ยังไม่มีประวัติ";

      return;
    }


    rows.forEach(
      r => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "history-item";

        div.textContent =
          new Date(
            r.created_at
          ).toLocaleString(
            "th-TH"
          );

        box.appendChild(
          div
        );

      }
    );

  } catch (e) {

    console.error(
      "History Error:",
      e
    );
  }
}


// =====================================================
// REMOTE FEED
// =====================================================

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

    btn.disabled =
      true;
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

    setTimeout(
      () => {

        if (btn) {

          btn.disabled =
            false;
        }

      },
      2000
    );
  }
}


// =====================================================
// FEED BUTTON
// =====================================================

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


// =====================================================
// START APP
// =====================================================

async function startApp() {

  setupFeedButton();

  updateClock();

  await sensor();

  await schedule();

  await history();


  // -----------------------------
  // Clock
  // -----------------------------

  setInterval(
    updateClock,
    1000
  );


  // -----------------------------
  // Sensor
  // -----------------------------

  setInterval(
    sensor,
    5000
  );


  // -----------------------------
  // History
  // -----------------------------

  setInterval(
    history,
    10000
  );


  // สำคัญ:
  // ไม่มี setInterval(schedule)
  // เพราะจะทำให้ช่องเวลารีเฟรชตอนกำลังแก้
}


// =====================================================
// START
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  startApp
);
