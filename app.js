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
async function post(path, body) {

  const r = await fetch(api(path), {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    throw new Error("HTTP " + r.status);
  }

  return true;
}


// =========================
// CLOCK
// =========================
function updateClock() {

  const now = new Date();

  document.getElementById("clock").textContent =
    now.toLocaleTimeString("th-TH");

  document.getElementById("date").textContent =
    now.toLocaleDateString(
      "th-TH",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );
}


// =========================
// SENSOR
// =========================
async function sensor() {

  try {

    const data = await get(
      "cat_feeder" +
      "?select=" +
      "cat_distance," +
      "food_level," +
      "food_percent," +
      "cat_detected," +
      "created_at" +
      "&order=id.desc" +
      "&limit=1"
    );

    if (!data.length) {
      return;
    }

    const d = data[0];

    // ระยะแมว
    document.getElementById(
      "catDistance"
    ).textContent =
      d.cat_distance ?? "--";

    // สถานะแมว
    document.getElementById(
      "catStatus"
    ).textContent =
      d.cat_detected
        ? "🐱 พบแมว"
        : "ไม่พบแมว";

    // ระดับอาหาร
    document.getElementById(
      "foodPercent"
    ).textContent =
      (d.food_percent ?? 0) + "%";

    document.getElementById(
      "foodLevel"
    ).textContent =
      d.food_level ?? "--";

    // progress bar
    let percent =
      Number(d.food_percent ?? 0);

    if (percent < 0)
      percent = 0;

    if (percent > 100)
      percent = 100;

    document.getElementById(
      "foodBar"
    ).style.width =
      percent + "%";

    // connection
    const connection =
      document.getElementById(
        "connection"
      );

    connection.textContent =
      "เชื่อมต่อแล้ว";

    connection.className =
      "badge online";

  } catch (err) {

    console.error(
      "Sensor error:",
      err
    );

    const connection =
      document.getElementById(
        "connection"
      );

    connection.textContent =
      "เชื่อมต่อไม่ได้";

    connection.className =
      "badge offline";
  }
}


// =========================
// SCHEDULE
// =========================
async function schedule() {

  const box =
    document.getElementById(
      "schedules"
    );

  try {

    const data = await get(
      "feed_schedule" +
      "?select=slot,hour,minute,enabled" +
      "&order=slot.asc"
    );

    box.innerHTML = "";

    data.forEach(item => {

      const hour =
        String(item.hour)
          .padStart(2, "0");

      const minute =
        String(item.minute)
          .padStart(2, "0");

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "schedule-row";

      row.innerHTML = `
        <label>มื้อ ${item.slot}</label>

        <input
          type="time"
          id="time-${item.slot}"
          value="${hour}:${minute}"
        >

        <label>
          <input
            type="checkbox"
            id="enable-${item.slot}"
            ${item.enabled ? "checked" : ""}
          >
          เปิด
        </label>

        <button
          onclick="saveSchedule(${item.slot})"
        >
          บันทึก
        </button>
      `;

      box.appendChild(row);
    });

  } catch (err) {

    console.error(
      "Schedule error:",
      err
    );

    box.innerHTML =
      `<div class="empty">
        โหลดตารางเวลาไม่ได้
      </div>`;
  }
}


// =========================
// SAVE SCHEDULE
// =========================
async function saveSchedule(slot) {

  const time =
    document.getElementById(
      `time-${slot}`
    ).value;

  const enabled =
    document.getElementById(
      `enable-${slot}`
    ).checked;

  if (!time) {
    alert("กรุณาเลือกเวลา");
    return;
  }

  const parts =
    time.split(":");

  const hour =
    Number(parts[0]);

  const minute =
    Number(parts[1]);

  try {

    const r = await fetch(
      api(
        `feed_schedule?slot=eq.${slot}`
      ),
      {
        method: "PATCH",

        headers: {
          ...headers,
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          hour,
          minute,
          enabled
        })
      }
    );

    if (!r.ok) {
      throw new Error(
        "HTTP " + r.status
      );
    }

    alert(
      `บันทึกมื้อ ${slot} แล้ว`
    );

    schedule();

  } catch (err) {

    console.error(
      "Save schedule error:",
      err
    );

    alert(
      "บันทึกเวลาไม่สำเร็จ"
    );
  }
}


// =========================
// HISTORY
// =========================
async function history() {

  const box =
    document.getElementById(
      "history"
    );

  try {

    const data = await get(
      "cat_history" +
      "?select=id,created_at" +
      "&order=id.desc" +
      "&limit=20"
    );

    if (!data.length) {

      box.innerHTML =
        `<div class="empty">
          ยังไม่มีประวัติ
        </div>`;

      return;
    }

    box.innerHTML =
      data.map(item => {

        const date =
          new Date(
            item.created_at
          );

        return `
          <div class="history-item">
            🐱 พบแมว —
            ${date.toLocaleString(
              "th-TH"
            )}
          </div>
        `;

      }).join("");

  } catch (err) {

    console.error(
      "History error:",
      err
    );

    box.innerHTML =
      `<div class="empty">
        โหลดประวัติไม่ได้
      </div>`;
  }
}


// =========================
// FEED NOW
// =========================
async function feedNow() {

  const message =
    document.getElementById(
      "feedMessage"
    );

  const button =
    document.getElementById(
      "feedBtn"
    );

  button.disabled = true;

  message.textContent =
    "กำลังสั่งให้อาหาร...";

  try {

    await post(
      "feed_commands",
      {
        executed: false
      }
    );

    message.textContent =
      "ส่งคำสั่งให้อาหารแล้ว ✓";

  } catch (err) {

    console.error(
      "Feed error:",
      err
    );

    message.textContent =
      "ส่งคำสั่งไม่สำเร็จ";

  } finally {

    setTimeout(() => {

      button.disabled = false;

    }, 1000);
  }
}


// =========================
// FEED BUTTON
// =========================
function setupFeedButton() {

  const button =
    document.getElementById(
      "feedBtn"
    );

  button.addEventListener(
    "click",
    feedNow
  );
}


// =========================
// START
// =========================
async function startApp() {

  await sensor();
  await schedule();
  await history();

  setupFeedButton();

  // เวลา
  updateClock();

  setInterval(
    updateClock,
    1000
  );

  // sensor เร็วขึ้น
  setInterval(
    sensor,
    1000
  );

  // ตารางเวลา
  setInterval(
    schedule,
    10000
  );

  // ประวัติ
  setInterval(
    history,
    10000
  );
}


startApp();
