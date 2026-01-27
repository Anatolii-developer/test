

window.API_BASE = window.API_BASE || "https://cabinet.mamko-prof-supervision.com";

// --- Global fetch wrapper: add Bearer token and credentials by default ---
(function(){
  const _fetch = window.fetch;
  window.fetch = function(input, init){
    init = init || {};
    const headers = new Headers(init.headers || {});
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('jwt') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('bearer');
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch(_) {}
    return _fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? 'include',
    });
  };
})();

async function login() {
   const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const username = usernameEl.value.trim();
const password = passwordEl.value;

  if (!username || !password) {
    alert("Введіть username і пароль.");
    if (!username) usernameEl.focus(); else passwordEl.focus();
    return;
  }

  console.log("[LOGIN] Введено:", { username, password });

  try {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    console.log("[LOGIN] Ответ от /login:", res.status, res.statusText);
    const result = await res.json();
    console.log("[LOGIN] Тело ответа:", result);

    if (!res.ok) {
      alert("Помилка: " + (result.message || "Невідома"));
      return;
    }
    // Сохраняем токен и пользователя
    if (result.token) {
      try { localStorage.setItem('token', result.token); } catch(_) {}
    }
    localStorage.setItem("user", JSON.stringify(result.user));
    console.log("[LOGIN] Пользователь и токен сохранены в localStorage");

    // Проверим, реально ли куки установились
    console.log("[LOGIN] Делаю проверочный запрос /profile...");
    const profileRes = await fetch(`${API_BASE}/api/users/profile`, {
      method: "GET",
      credentials: "include",
    });

    console.log("[LOGIN] Ответ от /profile:", profileRes.status, profileRes.statusText);
    const profileData = await profileRes.json();
    console.log("[LOGIN] Данные профиля:", profileData);

    if (profileRes.ok) {
      console.log("[LOGIN] Авторизация успешна → редирект на profile.html");
      window.location.href = "profile.html";
    } else {
      console.warn("[LOGIN] Авторизация не подтверждена, 401. Куки не установились или истекли.");
      alert("Авторизация не подтверждена — проверь настройки cookies на сервере.");
    }

  } catch (err) {
    console.error("[LOGIN] Ошибка запроса:", err);
    alert("Server error");
  }
}

function safeSetValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

window.addEventListener("DOMContentLoaded", async () => {
  // Только для profile.html
  if (!window.location.pathname.includes("profile.html")) return;

  try {
    // 1) Проверяем реальную авторизацию на сервере
    const pr = await fetch(`${API_BASE}/api/users/profile`, { credentials: "include" });

    if (!pr.ok) {
      // Нет валидной сессии — чистим локальные следы и уходим на логин
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("bearer");
      } catch(_) {}
      alert("Please log in first.");
      window.location.href = "index.html";
      return;
    }

    // 2) Доверяемся серверу, обновляем локальный слепок
    const sessionUser = await pr.json();
    try { localStorage.setItem("user", JSON.stringify(sessionUser)); } catch(_) {}

    // 3) Грузим свежие данные пользователя по id
    const res = await fetch(`${API_BASE}/api/users/${sessionUser._id}`, { credentials: "include" });
    const user = await res.json();

    // 4) Заполняем профиль
    document.getElementById("profileUsername").textContent = user.username || "";
    document.getElementById("profileFirstName").textContent = user.firstName || "";
    document.getElementById("profileLastName").textContent = user.lastName || "";
    document.getElementById("profileMiddleName").textContent = user.middleName || "";
    document.getElementById("profileEmail").textContent = user.email || "";
    document.getElementById("profilePhone").textContent = user.phone || "";
    document.getElementById("profileGender").textContent = user.gender || "";
    document.getElementById("profileExperience").textContent = user.experience || "";
    document.getElementById("profileEducation").textContent = user.education || "";
    document.getElementById("profileDirections").textContent = (user.directions || []).join(", ");
    document.getElementById("profileTopics").textContent = (user.topics || []).join(", ");
    document.getElementById("profileAboutTextarea").value = user.about || "";
    document.getElementById("profileCoursesTextarea").value = user.courses || "";
    {
  const roleEl = document.getElementById("profileRoleTextarea");
  if (roleEl) {
    const roleText = Array.isArray(user.roles) && user.roles.length
      ? user.roles.join(", ")
      : (user.role || "");
    roleEl.value = roleText;
    // щоб textarea гарно підтягнулась по висоті
    if (typeof autoResize === "function") autoResize(roleEl);
  }
}
    document.getElementById("profileCostTextarea").value = user.cost || "";

    const videoTextarea = document.getElementById("profileVideoTextarea");
    if (videoTextarea) {
      videoTextarea.value = user.videoLink || "";
    }
    safeSetValue("profileQualificationsTextarea", user.qualifications);
    safeSetValue("profileExperienceExtraTextarea", user.experienceExtra);

    const languageTextarea = document.getElementById("profileLanguageTextarea");
    if (languageTextarea) {
      languageTextarea.value = user.language || "";
    }
    const formatTextarea = document.getElementById("profileFormatTextarea");
    if (formatTextarea) {
      formatTextarea.value = user.format || "";
    }

    window.currentUser = user;

    // ✅ Ініціалізація textarea "Курси"
    const coursesTextarea = document.getElementById("profileCoursesTextarea");
    const coursesCheckIcon = document.getElementById("coursesCheckIcon");

    if (coursesTextarea && coursesCheckIcon) {
      coursesTextarea.value = user.courses || "";
      coursesTextarea.addEventListener("input", () => {
        coursesCheckIcon.style.display = "inline";
      });

      coursesCheckIcon.addEventListener("click", async () => {
        const newValue = (coursesTextarea.value || "").trim();
        try {
          const upd = await fetch(`${API_BASE}/api/users/${user._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ courses: newValue }),
          });

          const result = await upd.json().catch(() => ({}));
          if (upd.ok) {
            coursesCheckIcon.style.display = "none";
            alert("Збережено!");
          } else {
            alert("Помилка при збереженні: " + (result.message || "невідома"));
          }
        } catch (err) {
          console.error("❌ Error:", err);
          alert("Серверна помилка.");
        }
      });
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
    alert("Failed to load user data.");
    window.location.href = "index.html";
  }
});





function saveLoginAndContinue() {
  // Read values directly from the current page
  const username = (document.getElementById("username")?.value || "").trim();
  const password = document.getElementById("password")?.value || "";
  const confirmPassword = document.getElementById("confirm-password")?.value || "";

  if (!username || !password || !confirmPassword) {
    alert("Будь ласка, заповніть всі поля.");
    return;
  }

  // Username must not be an email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(username)) {
    alert("Придумайте username, а не email.");
    return;
  }

  // Passwords must match
  if (password !== confirmPassword) {
    alert("Паролі не співпадають.");
    return;
  }

  // Persist for the next step and continue
  localStorage.setItem("registrationUsername", username);
  localStorage.setItem("registrationPassword", password);
  window.location.href = "registration.html";
}

function togglePassword(iconElement) {
  const wrapper = iconElement.closest('.input-wrapper');
  const passwordInput = wrapper.querySelector('input');

  if (!passwordInput) {
    console.warn("Input not found");
    return;
  }

  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  iconElement.src = isHidden ? "assets/icon-eye-open.svg" : "assets/icon-eye-close.svg";
}













let updatedProfileData = {};

function enableEdit(fieldId, mongoKey) {
  const span = document.getElementById(fieldId);
  const currentValue = span.textContent.trim();

  // Удаляем предыдущий контейнер, если есть
  const existing = document.querySelector(`.edit-container[data-key="${mongoKey}"]`);
  if (existing) existing.remove();

  // Создаем контейнер
  const container = document.createElement("div");
  container.className = "edit-container";
  container.dataset.key = mongoKey;
  container.style.marginTop = "10px";
  container.style.display = "flex";
  container.style.flexDirection = "column"; // ✅ Чтобы всё шло вниз
  container.style.gap = "10px";

  // Создаем textarea
  const input = document.createElement("textarea");
  input.value = currentValue;
  input.rows = 4;
  input.className = "edit-input";
  input.style.width = "100%";
  input.style.padding = "8px 16px";
  input.style.fontSize = "16px";
  input.style.border = "1px solid #ccc";
  input.style.borderRadius = "8px";
  if (mongoKey === "experience") {
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("pattern", "\\d*");
    input.setAttribute("placeholder", "Напр.: 5");
  }

  // Кнопка сохранить
  const checkIcon = document.createElement("img");
  checkIcon.src = "assets/check-icon.svg";
  checkIcon.className = "check-icon";
  checkIcon.style.cursor = "pointer";
  checkIcon.style.width = "20px";
  checkIcon.style.height = "20px";
  checkIcon.style.alignSelf = "flex-start";

  container.appendChild(input);
  container.appendChild(checkIcon);

  // Вставляем container после <p>
  const parentP = span.closest("p");
  parentP.insertAdjacentElement("afterend", container);

  input.addEventListener("input", () => {
    if (mongoKey === "experience") {
      input.value = input.value.replace(/\D+/g, "");
    }
    updatedProfileData[mongoKey] = input.value.trim();
  });

  checkIcon.addEventListener("click", async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("Please log in first.");
      return;
    }

    try {
      const payload = { [mongoKey]: updatedProfileData[mongoKey] };
     const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(payload),
});

      const result = await res.json();
      if (res.ok) {
        const newSpan = document.createElement("span");
        newSpan.id = fieldId;
        newSpan.textContent = updatedProfileData[mongoKey];
        newSpan.style.display = "block";
        newSpan.style.whiteSpace = "pre-wrap";
        newSpan.style.wordBreak = "break-word";
        newSpan.style.marginTop = "8px";

        parentP.appendChild(newSpan); // ✅ Добавляем в <p>
        span.remove();               // ❌ Удаляем старый span
        container.remove();          // ❌ Удаляем textarea
        updatedProfileData = {};
        alert("Зміни збережено!");
      } else {
        alert("Помилка при збереженні: " + result.message);
      }
    } catch (err) {
      console.error("Error updating:", err);
      alert("Серверна помилка.");
    }
  });
}
const directionsOptions = [
  "Психоаналіз",
  "Групаналіз",
  "Індивідуальна психологія (Адлер)",
  "Аналітична психологія (Юнг)",
  "Клієнт-центрованa терапія (К. Роджерс)",
  "Інтерперсональний підхід (Г. Салліван)",
  "Логотерапія (В. Франкл)",
  "EMDR – Десенсибілізація та Репроцесуалізація",
  "Групова психотерапія і психодрама",
  "Гештальт-терапія",
  "Когнітивно-поведінкова терапія",
  "Гіпнотерапія",
  "Інше"
];

const topicsOptions = [
  "Дратівливість",
  "Депресивні стани",
  "Тривожні стани",
  "Психосоматика",
  "Емоційне вигорання",
  "Нові умови життя",
  "Стосунки з собою",
  "Панічні атаки",
  "Самотність",
  "Спроби самогубства",
  "Втома",
  "Самооцінка та самоцінність",
  "Нав’язливі думки та ритуали",
  "Хімічні залежності",
  "Ставлення до їжі",
  "Стосунки з іншими",
  "Сімейні стосунки",
  "Інтимність та сексуальність",
  "Романтичні стосунки",
  "Співзалежність",
  "Аб’юз, емоційне насилля",
  "Діяльність",
  "Самовизначення та самоідентифікація",
  "Ставлення до грошей",
  "Прокрастинація",
  "Втрата та горе",
  "Адаптація, еміграція",
  "Народження дитини",
  "ПТСР",
  "Кризи та травми"
];
function enableCheckboxEdit(fieldId, mongoKey, optionsArray, otherLabel = 'Інше') {
  const container = document.getElementById(fieldId).parentNode;
  const selectedValues = Array.isArray(window.currentUser?.[mongoKey]) ? window.currentUser[mongoKey] : [];

  // 1) Удаляем старый span
  const oldSpan = document.getElementById(fieldId);
  if (oldSpan) oldSpan.remove();

  // 2) Контейнер с плитками
  const checkboxContainer = document.createElement("div");
  checkboxContainer.className = "checkbox-group";

  // Найдем уже сохраненный кастомный вариант (не из списка)
  const normalizedOptions = new Set(optionsArray.map(String));
  const preSavedCustom = (selectedValues.find(v => v && !normalizedOptions.has(String(v))) || '').toString().trim();

  const tiles = [];

  // 2.1) Рисуем обычные опции, исключая сам ярлык «Інше» (его сделаем отдельно)
  optionsArray
    .filter(opt => String(opt) !== otherLabel)
    .forEach(option => {
      const tile = document.createElement("div");
      tile.className = "checkbox-tile";

      const square = document.createElement("div");
      square.className = "checkbox-square";
      if (selectedValues.includes(option)) square.classList.add("checked");

      const label = document.createElement("span");
      label.textContent = option;

      tile.appendChild(square);
      tile.appendChild(label);
      checkboxContainer.appendChild(tile);

      square.addEventListener("click", () => {
        square.classList.toggle("checked");
      });

      tiles.push({ type: 'regular', square, value: option });
    });

  // 2.2) Плитка «Інше» с input
  const otherTile = document.createElement("div");
  otherTile.className = "checkbox-tile";

  const otherSquare = document.createElement("div");
  otherSquare.className = "checkbox-square";

  const otherText = document.createElement("span");
  otherText.textContent = otherLabel;

  const otherInput = document.createElement("input");
  otherInput.type = "text";
  otherInput.placeholder = "Вкажіть інше…";
  otherInput.style.display = "none";
  otherInput.style.marginTop = "8px";
  otherInput.style.width = "100%";
  otherInput.value = preSavedCustom;

  // Если был сохранен кастом — активируем «Інше» и показываем поле
  if (preSavedCustom) {
    otherSquare.classList.add("checked");
    otherInput.style.display = "block";
  }

  // Клик по квадрату включает/выключает и показывает/скрывает поле
  otherSquare.addEventListener("click", () => {
    const checked = otherSquare.classList.toggle("checked");
    otherInput.style.display = checked ? "block" : "none";
    if (!checked) otherInput.value = otherInput.value.trim(); // не чистим — пусть остается
  });

  otherTile.appendChild(otherSquare);
  otherTile.appendChild(otherText);
  checkboxContainer.appendChild(otherTile);
  // Поле под плиткой «Інше»
  checkboxContainer.appendChild(otherInput);

  container.appendChild(checkboxContainer);

  // 3) Кнопка сохранить
  const checkIcon = document.createElement("img");
  checkIcon.src = "assets/check-icon.svg";
  checkIcon.className = "check-icon";
  checkIcon.style.cursor = "pointer";
  checkIcon.style.width = "20px";
  checkIcon.style.marginLeft = "8px";
  container.appendChild(checkIcon);

  checkIcon.addEventListener("click", async () => {
    // Собираем выбранные обычные
    const selected = tiles
      .filter(({ square }) => square.classList.contains("checked"))
      .map(({ value }) => value);

    // Обрабатываем «Інше»
    const otherVal = otherInput.value.trim();
    const otherChecked = otherSquare.classList.contains("checked");
    if (otherChecked && otherVal) {
      selected.push(otherVal); // кладём реальный текст, НЕ ярлык «Інше»
    }
    // Если otherChecked, но текста нет — просто ничего не добавляем

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?._id) {
      alert("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [mongoKey]: selected }),
      });
      const result = await res.json();

      if (res.ok) {
        // Обновим локальный снимок
        try { localStorage.setItem("user", JSON.stringify(result)); } catch(_) {}
        window.currentUser = result;

        // Отрисуем обратно в текстовом виде
        const newSpan = document.createElement("span");
        newSpan.id = fieldId;
        newSpan.textContent = selected.join(", ");

        checkboxContainer.remove();
        checkIcon.remove();
        container.appendChild(newSpan);
        alert("Збережено!");
      } else {
        alert("Помилка при збереженні: " + (result.message || "невідома"));
      }
    } catch (e) {
      console.error(e);
      alert("Серверна помилка.");
    }
  });
}

function normalizeWithOther(arr, options, otherLabel='Інше'){
  if (!Array.isArray(arr)) return [];
  const set = new Set(options.map(String));
  return arr
    .map(v => String(v).trim())
    .filter(v => v && v !== otherLabel) // выкинем буквальный ярлык «Інше»
    .filter((v, idx, self) => self.indexOf(v) === idx) // уникальные
    .map(v => v); // можно дополнительно триммить
}


document.addEventListener('DOMContentLoaded', () => {
  const dirSpan = document.getElementById('profileDirections');
  if (!dirSpan) return;

  // Prefer the fresh user object you set earlier (window.currentUser), fall back to localStorage snapshot
  const me = window.currentUser || (function() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const dirs = normalizeWithOther((me && Array.isArray(me.directions) ? me.directions : []), directionsOptions);
  dirSpan.textContent = dirs.join(', ');
});

let users = [];
let selectedParticipants = window.selectedParticipants || [];
window.selectedParticipants = selectedParticipants;

function syncSelectedParticipants(nextArr) {
  selectedParticipants = Array.isArray(nextArr) ? nextArr : [];
  window.selectedParticipants = selectedParticipants;
}

function ensureParticipantsArray() {
  if (!Array.isArray(selectedParticipants)) {
    selectedParticipants = [];
  }
  if (!Array.isArray(window.selectedParticipants)) {
    window.selectedParticipants = selectedParticipants;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.pathname.includes("registration")) return;

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    users = await res.json();
  } catch (err) {
    console.error("Помилка завантаження користувачів:", err);
  }
});


function getUserDisplayName(user) {
  if (!user) return "";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.username || user.email || user._id;
}

function renderUserList(searchTerm = "") {
  const userList = document.getElementById("userList");
  if (!userList) return;

  const lowerCaseSearchTerm = searchTerm.toLowerCase();

  const filteredUsers = users.filter((user) => {
    if (!user || !user._id) return false;
    const displayName = getUserDisplayName(user).toLowerCase();
    return displayName.includes(lowerCaseSearchTerm);
  });

  userList.innerHTML = ""; // Очищаємо список перед рендерингом

  filteredUsers.forEach((user) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "space-between";
    wrapper.style.alignItems = "center";
    wrapper.style.padding = "6px 0";
    wrapper.style.gap = "12px";

    const name = document.createElement("span");
    name.textContent = getUserDisplayName(user);
    name.style.flex = "1";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = user._id;
    checkbox.checked = selectedParticipants.includes(user._id);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!selectedParticipants.includes(user._id)) {
          selectedParticipants.push(user._id);
        }
      } else {
        syncSelectedParticipants(
          selectedParticipants.filter((id) => id !== user._id)
        );
      }
      updateSelectedDisplay();
    });

    wrapper.appendChild(name);
    wrapper.appendChild(checkbox);
    userList.appendChild(wrapper);
  });
}

async function openUserModal() {
  ensureParticipantsArray();
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    if (res.ok) {
      users = await res.json();
      window.users = users; // Зберігаємо в глобальну область видимості
    } else {
      console.error(
        "Не вдалося завантажити користувачів: ",
        res.status,
        res.statusText
      );
    }
  } catch (err) {
    console.error("Не вдалося завантажити користувачів:", err);
  }

  document.getElementById("userModal").style.display = "block";
  document.getElementById("searchInput").value = ""; // Очищаємо пошук
  renderUserList(); // Перший рендер без фільтрації
}

function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
}

function saveSelectedParticipants() {
  closeUserModal();
  updateSelectedDisplay();
}

function updateSelectedDisplay() {
  ensureParticipantsArray();
  const container = document.getElementById("selectedParticipants");
  container.innerHTML = "";

  selectedParticipants.forEach((id) => {
    const user = users.find((u) => u._id === id);
    if (!user) return;

    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "6px";
    item.style.padding = "4px 10px";
    item.style.background = "#f2f2f2";
    item.style.borderRadius = "12px";

    const name = document.createElement("span");
    name.textContent = getUserDisplayName(user);

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✕";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.color = "red";
    removeBtn.addEventListener("click", () => {
      syncSelectedParticipants(selectedParticipants.filter((pid) => pid !== id));
      updateSelectedDisplay();
    });

    item.appendChild(name);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}


async function fetchUserCoursesByStatus(targetStatus) {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  if (!storedUser) return;

  try {
    const res = await fetch(`${API_BASE}/api/courses`);
    const courses = await res.json();

    const filtered = allCourses.filter(course =>
  course.status === "Запланований" &&
  (
    course.accessType === "Відкрита група" ||
    course.participants.includes(storedUser._id)
  )
);


    const container = document.querySelector(".current-courses-container");
    container.innerHTML = "";

    filtered.forEach(course => {
      const courseHTML = `
        <div class="current-course-item">
          <div class="course-date-line">
            <hr />
            <span>${new Date(course.courseDates.start).toLocaleDateString("uk-UA")}</span>
            <hr />
          </div>
          <div class="current-course-inner">
            <div>
              <h3 class="current-course-title">${course.courseTitle}</h3>
              <p class="current-course-subtitle">${course.courseSubtitle || ""}</p>
            </div>
            <a href="course-details.html?id=${course._id}">
              <button class="current-show-more-btn">Дізнатись більше</button>
            </a>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", courseHTML);
    });

  } catch (err) {
    console.error("Не вдалося завантажити курси:", err);
  }
}


const saveChangesBtn = document.getElementById("saveProfileChangesBtn");
if (saveChangesBtn) {
  saveChangesBtn.addEventListener("click", async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(updatedProfileData),
});

      const result = await res.json();
      if (res.ok) {
        alert("Профіль оновлено успішно!");
        updatedProfileData = {};
        saveChangesBtn.style.display = "none";
      } else {
        alert("Помилка: " + result.message);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Помилка сервера.");
    }
  });
}

const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    // Work directions: if "Інше" checked, save ONLY textarea text
    const otherDirCheckbox = document.getElementById('directionOtherCheckbox');
const otherDirText = (document.getElementById('directionOther')?.value || '').trim();

if (otherDirCheckbox && otherDirCheckbox.checked && !otherDirText) {
  alert('Будь ласка, заповніть поле "Інше" або зніміть вибір.');
  return;
}

let directions = [...document.querySelectorAll('.work-direction input[type="checkbox"]:checked')]
  .map(c => c.parentElement.textContent.trim())
  .filter(v => v !== 'Інше');

if (otherDirCheckbox && otherDirCheckbox.checked) {
  directions = otherDirText ? [otherDirText] : []; // <-- зберігаємо саме текст з textarea
}

    const topics = [...document.querySelectorAll('.work-topics input[type="checkbox"]:checked')]
      .map(c => c.parentElement.textContent.trim());

    const payload = {
      username: localStorage.getItem("registrationUsername") || "",
      password: localStorage.getItem("registrationPassword") || "",
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      middleName: document.getElementById("middleName").value,
      dateOfBirth: document.getElementById("dateOfBirth").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      gender: document.querySelector('input[name="gender"]:checked')?.value || "",
      experience: document.getElementById("experience").value,
      education: document.getElementById("education").value,
      directions,
      topics,
      createdAt: new Date(),
      status: "WAIT FOR REVIEW"
    };

    try {
      console.log("📤 Payload:", payload);
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("📩 Response:", result); // 👈 Добавь это

      if (res.ok) {
        window.location.href = "registration-success.html";
      } else {
        alert("❌ Error: " + result.message);
      }
    } catch (err) {
      console.error("❌ Server error:", err);
      alert("Server error");
    }
  });
}

function toggleCheckboxes() {
  const extra = document.getElementById("extra-checkboxes");
  const trigger = document.querySelector(".toggle-btn");
  const checkbox = document.getElementById("extra-checkbox");

  const isHidden = extra.style.display === "none";

  // Toggle visibility
  extra.style.display = isHidden ? "block" : "none";

  // Update button text
  trigger.textContent = isHidden ? "Приховати" : "Показати ще";

  // Enable/disable the main checkbox
  checkbox.disabled = !isHidden;
}



window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createCourseForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.mainType || !form.mainType.value) {
      alert("Оберіть головний вид курсу");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const creatorId = storedUser?._id;

    let creatorName = "";
    let creatorRole = "";

    try {
      const resUser = await fetch(`${API_BASE}/api/users/${creatorId}`);
      const user = await resUser.json();
      creatorName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      creatorRole = user.role || "";
    } catch (err) {
      console.error("Помилка при отриманні даних користувача:", err);
    }

    const formatType = form.formatType ? form.formatType.value || null : null;
    const formatDetails = Array.from(form.querySelectorAll('input[name="formatDetails"]:checked'))
      .map((item) => item.value)
      .filter(Boolean);
    const participantsPayload = Array.from(new Set(selectedParticipants || []));
    const unitsPayload = Array.isArray(window.units)
      ? window.units
          .map((u) => ({
            dayName: u.dayName || null,
            date: u.date || null,
            startTime: u.startTime || "",
            endTime: u.endTime || "",
            unitType: u.unitType || "",
            title: u.title || "",
            hours:
              typeof u.hours === "number"
                ? u.hours
                : u.hours !== undefined && u.hours !== null && u.hours !== ""
                  ? Number(u.hours)
                  : null,
            members: Array.isArray(u.members)
              ? u.members.map((m) => ({ user: m.user, mode: m.mode }))
              : [],
          }))
          .filter((u) => u.dayName && u.unitType)
      : [];

    const formData = {
      mainType: form.mainType.value,
      formatType,
      courseTitle: form.courseTitle.value,
      courseSubtitle: form.courseSubtitle.value,
      courseDescription: form.courseDescription.value,
      courseDates: {
        start: form.startDate.value,
        end: form.endDate.value
      },
      formatDetails,
      courseDays: [...form.querySelectorAll('input[name="courseDays"]:checked')].map(cb => cb.value),
      accessType: form.accessType.value,
      courseDuration: form.courseDuration.value,
      coursePrice: form.coursePrice.value,
      zoomLink: form.zoomLink.value,
      participants: participantsPayload,
      units: unitsPayload,
      creatorId,
      creatorName,
      creatorRole
    };

    try {
      const res = await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Не вдалося зберегти курс");
      }

      alert("Курс успішно збережено");
      form.reset();
    } catch (err) {
      alert("Помилка при збереженні курсу: " + err.message);
    }
  });
});



function handleSubmit() {
  const _otherDirCheckbox = document.getElementById('directionOtherCheckbox');
  const _otherDirText = (document.getElementById('directionOther')?.value || '').trim();
  let _directions = Array.from(document.querySelectorAll('.work-direction input[type="checkbox"]:checked'))
    .map(cb => cb.parentElement.textContent.trim())
    .filter(v => v !== 'Інше');
  if (_otherDirCheckbox && _otherDirCheckbox.checked) {
    _directions = _otherDirText ? [_otherDirText] : [];
  }
  const data = {
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    middleName: document.getElementById("middleName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || "",
    experience: document.getElementById("experience").value,
    education: document.getElementById("education").value,
    directions: _directions,
    topics: Array.from(document.querySelectorAll('.work-topics input[type="checkbox"]:checked')).map(cb => cb.parentElement.textContent.trim()),
  };

  window.location.href = "profile.html";
}



async function sendRecoveryCode() {
  const email = document.getElementById("email")?.value.trim();
  if (!email) {
    alert("Будь ласка, введіть email.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/recovery/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    // Безпечний парсинг відповіді (може бути і text/html при помилці з проксі)
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (res.ok) {
      alert("✅ Код надіслано на пошту (якщо акаунт існує). Перевірте вхідні та спам.");
      // За потреби можна перейти на сторінку введення коду:
      // window.location.href = "reset-code.html";
    } else {
      alert("❌ " + (data?.message || "Помилка відправки коду"));
    }
  } catch (err) {
    console.error("Server error:", err);
    alert("Помилка сервера.");
  }
}



function editField(fieldId, mongoKey) {
  const span = document.getElementById(fieldId);
  const currentValue = span.textContent.trim();
  const wrapper = span.closest('.profile-value-wrapper');

  // Удалить span и иконку
  const pencil = wrapper.querySelector('.edit-icon');
  span.remove();
  pencil.remove();

  // Создать input
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentValue;
  input.className = "edit-input";
  input.style.padding = "8px 12px";
  input.style.fontSize = "16px";
  input.style.border = "1px solid #ccc";
  input.style.borderRadius = "8px";
  input.style.flex = "1";
  input.style.minWidth = "0";

  // Создать галочку
  const checkIcon = document.createElement("img");
  checkIcon.src = "assets/check-icon.svg";
  checkIcon.className = "check-icon";
  checkIcon.style.cursor = "pointer";
  checkIcon.style.width = "20px";
  checkIcon.style.height = "20px";
  checkIcon.style.marginLeft = "8px";

  // Вставляем input и галочку
  wrapper.appendChild(input);
  wrapper.appendChild(checkIcon);

  input.focus();

  checkIcon.addEventListener("click", async () => {
    const newValue = input.value.trim();
    if (!newValue) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    try {
      const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ [mongoKey]: newValue }),
});

      const result = await res.json();

      if (res.ok) {
        // Обновляем DOM
        const newSpan = document.createElement("span");
        newSpan.id = fieldId;
        newSpan.textContent = newValue;
        newSpan.className = "profile-value";

        const newPencil = document.createElement("img");
        newPencil.src = "assets/edit-icon.svg";
        newPencil.className = "edit-icon";
        newPencil.onclick = () => editField(fieldId, mongoKey);

        wrapper.innerHTML = ""; // Очищаем
        wrapper.appendChild(newSpan);
        wrapper.appendChild(newPencil);

        alert("Збережено!");
      } else {
        alert("Помилка: " + result.message);
      }
    } catch (err) {
      console.error("❌ Error saving field:", err);
      alert("Серверна помилка.");
    }
  });
}



function showStep(stepNumber) {
  const steps = document.querySelectorAll('.profile-step');
  const indicators = document.querySelectorAll('.progress-indicator .step');

  steps.forEach((step, index) => {
    step.style.display = (index === stepNumber - 1) ? 'block' : 'none';
  });

  indicators.forEach((el, index) => {
    el.classList.toggle('active', index === stepNumber - 1);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const videoList = document.querySelector('.video-list');
  const bookList = document.querySelector('.book-list');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Tab styling
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const isVideo = tab.textContent.trim() === 'Відео';

      // Toggle content
      videoList.style.display = isVideo ? 'flex' : 'none';
      bookList.style.display = isVideo ? 'none' : 'flex';
    });
  });
});




document.addEventListener("DOMContentLoaded", () => {
  const stars = document.querySelectorAll("#profileRating .star");
  let currentRating = parseInt(localStorage.getItem("companyRating")) || 0;

  function updateStarDisplay(rating) {
    stars.forEach(star => {
      const value = parseInt(star.getAttribute("data-value"));
      star.src = value <= rating 
        ? "assets/star-filled.svg"
        : "assets/star.svg"; 
    });
  }

  updateStarDisplay(currentRating); // set stars on load

  stars.forEach(star => {
    star.addEventListener("click", () => {
      currentRating = parseInt(star.getAttribute("data-value"));
      localStorage.setItem("companyRating", currentRating);
      updateStarDisplay(currentRating);
    });
  });
});

async function uploadProfilePhoto(file) {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  if (!storedUser) {
    alert("Please log in first.");
    return;
  }

  const formData = new FormData();
  formData.append("photo", file); // "photo" — имя поля на сервере

  try {
    const res = await fetch(`${API_BASE}/api/users/${storedUser._id}/photo`, {
  method: "POST",
  credentials: "include",
  body: formData,
});

    const result = await res.json();
    if (res.ok) {
      alert("Фото оновлено!");
      document.getElementById("profilePhoto").src = result.photoUrl; // обновляем фото
    } else {
      alert("Помилка: " + result.message);
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("Серверна помилка.");
  }
}



function previewPhoto(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function () {
    const img = document.getElementById("profilePhoto");
    img.src = reader.result; // превью
  };

  reader.readAsDataURL(file);

  // Загрузка на сервер
  if (file) {
    uploadProfilePhoto(file);
  }
}



function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');
  const arrow = document.getElementById('toggleArrow');
  const logoExpanded = document.getElementById('logoExpanded');
  const logoCollapsed = document.getElementById('logoCollapsed');

  sidebar.classList.toggle('expanded');
  sidebar.classList.toggle('collapsed');
  if (sidebar.classList.contains('expanded')) {
    arrow.style.transform = 'rotate(180deg)';
  } else {
    arrow.style.transform = 'rotate(0deg)';
  }
}

// === Sidebar hover-to-open + pin state ===
let sidebarPinned = false;
let drawerMenuBound = false;

// Try to restore pin state
try {
  sidebarPinned = JSON.parse(localStorage.getItem('sidebarPinned') || 'false');
} catch (_) {
  sidebarPinned = false;
}

function isTouchDevice(){
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
}

function applySidebarState() {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('toggleArrow');
  if (!sidebar) return;

  if (sidebarPinned) {
    sidebar.classList.add('expanded');
    sidebar.classList.remove('collapsed');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    sidebar.classList.remove('expanded');
    sidebar.classList.add('collapsed');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
}

function enableSidebarHover() {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('toggleArrow');
  if (!sidebar) return;

  // Apply initial state (respect saved pin)
  applySidebarState();

  // On non-touch devices we expand on hover when NOT pinned
if (!isTouchDevice() && !isMobile()) {
    sidebar.addEventListener('mouseenter', () => {
      if (!sidebarPinned) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
      }
    });

    sidebar.addEventListener('mouseleave', () => {
      if (!sidebarPinned) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    });

    // Accessibility: keep open while focusing inside with keyboard
    sidebar.addEventListener('focusin', () => {
      if (!sidebarPinned) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
      }
    });
    sidebar.addEventListener('focusout', (e) => {
      // Collapse only if focus moved fully outside
      if (!sidebarPinned && !sidebar.contains(document.activeElement)) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    });
  }
}

toggleSidebar = function(){
  // Мобильный: открываем/закрываем оверлей вместо pin/unpin
  if (isMobile()) {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) closeMobileSidebar(); else openMobileSidebar();
    return;
  }

  // Десктоп: pin/unpin как раньше
  sidebarPinned = !sidebarPinned;
  localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  applySidebarState();
};

// ===== Mobile helpers & overlay open/close =====
function isMobile() {
  return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

function getDrawerBackdrop() {
  return document.getElementById('drawerBackdrop') || document.getElementById('backdrop');
}

function setBurgerExpanded(isOpen) {
  const burger = document.getElementById('burgerBtn');
  if (burger) {
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.add('open');
  const backdrop = getDrawerBackdrop();
  if (backdrop) {
    backdrop.classList.add('active');
    backdrop.classList.add('show');
  }
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.classList.add('drawer-open');
  setBurgerExpanded(true);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.remove('open');
  const backdrop = getDrawerBackdrop();
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.classList.remove('show');
  }
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.classList.remove('drawer-open');
  setBurgerExpanded(false);
}

// Wire mobile events

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', enableSidebarHover);
window.addEventListener('resize', () => {
  applySidebarState();
});
document.addEventListener('DOMContentLoaded', () => {
  if (drawerMenuBound) return;
  const sidebar = document.getElementById('sidebar');
  const burger = document.getElementById('burgerBtn');
  const backdrop = getDrawerBackdrop();
  if (!sidebar || !burger || !backdrop) return;

  drawerMenuBound = true;

  burger.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  backdrop.addEventListener('click', closeMobileSidebar);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  sidebar.querySelectorAll('nav a, .logout').forEach((el) => {
    el.addEventListener('click', closeMobileSidebar);
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  const participantsSelect = document.getElementById("participantsSelect");

  if (!participantsSelect) {
    console.warn("Елемент #participantsSelect не знайдено в DOM.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const users = await res.json();

    users.forEach(user => {
      const option = document.createElement("option");
      option.value = user._id;
      option.textContent = `${user.firstName} ${user.lastName}`.trim() || user.username;
      participantsSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Не вдалося завантажити учасників:", err);
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.querySelector(".logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("jwt");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("bearer");
      window.location.href = "index.html";
    });
  }
});


function setupDateFilterButton() {
  const inputs = document.querySelectorAll('.date-input');
  const button = document.querySelector('.filter-btn');

  if (!inputs.length || !button) return; // Don't run if no filter exists on the page

  function toggleButtonState() {
    const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
    button.disabled = !allFilled;
  }

  inputs.forEach(input => {
    input.addEventListener('input', toggleButtonState);
  });

  toggleButtonState();
}

document.addEventListener('DOMContentLoaded', setupDateFilterButton);


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
  });
});


const LOCKED_FIELDS = new Set(['profileCoursesTextarea','profileRoleTextarea']);

  // Проставити readonly і підказку
  function lockField(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('readonly','readonly');
    el.classList.add('locked');
    el.title = 'Це поле редагувати не можна';
  }
  ['profileCoursesTextarea','profileRoleTextarea'].forEach(lockField);

  // Якщо у вас є функція типу enableEdit(...) — підстрахуємось
  const _enableEdit = window.enableEdit;
  window.enableEdit = function(id, key){
    if (LOCKED_FIELDS.has(id)) return; // блокуємо
    if (typeof _enableEdit === 'function') return _enableEdit(id, key);
  };

  // Якщо є універсальна функція, що знімає readonly з textarea — теж блокуємо
  const _enableCheckboxEdit = window.enableCheckboxEdit;
  window.enableCheckboxEdit = function(id, key, opts){
    if (LOCKED_FIELDS.has(id)) return;
    if (typeof _enableCheckboxEdit === 'function') return _enableCheckboxEdit(id, key, opts);
  };


  

document.addEventListener('DOMContentLoaded', () => {
  const otherDirCheckbox = document.getElementById('directionOtherCheckbox');
  const otherDirTextarea = document.getElementById('directionOther');
  if (!otherDirCheckbox || !otherDirTextarea) return;

  const syncOtherDir = () => {
    otherDirTextarea.style.display = otherDirCheckbox.checked ? 'block' : 'none';
    if (!otherDirCheckbox.checked) otherDirTextarea.value = '';
  };

  syncOtherDir();
  otherDirCheckbox.addEventListener('change', syncOtherDir);
});


window.resolvePhotoUrl = window.resolvePhotoUrl || function(url) {
  if (!url) return '';
  try {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return window.location.protocol + url;
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : '').replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : '/' + url;
    return base + path;
  } catch { return url; }
};

async function getFreshUserSafe() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  let me;
  try { me = JSON.parse(raw); } catch { return null; }
  if (!me || !me._id) return me;

  try {
    const r = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : ''}/api/users/${me._id}`, { credentials: 'include' });
    if (r.ok) {
      const fresh = await r.json();
      localStorage.setItem('user', JSON.stringify(fresh));
      return fresh;
    }
  } catch {}
  return me; // fallback к локальному снимку
}

async function applySidebarAvatar(selector = '.sidebar .profile') {
  const img = document.querySelector(selector);
  if (!img) return;

  const me = await getFreshUserSafe();
  const src = me?.photoUrl ? resolvePhotoUrl(me.photoUrl) + `?v=${Date.now()}` : 'assets/profile-photo.png';

  img.src = src;
  img.onerror = () => { img.src = 'assets/profile-photo.png'; };
}

// Автоматически ставим аватар при загрузке на ВСЕХ страницах, где есть сайдбар
document.addEventListener('DOMContentLoaded', () => {
  applySidebarAvatar();
});

function courseProgressNormalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value._id || value.id || null;
  return null;
}

function courseProgressIdsMatch(a, b) {
  const aId = courseProgressNormalizeId(a);
  const bId = courseProgressNormalizeId(b);
  return aId && bId && String(aId) === String(bId);
}

function courseProgressNormalizeIdentity(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return text || null;
}

function courseProgressAddIdentityToken(set, value) {
  const token = courseProgressNormalizeIdentity(value);
  if (token) set.add(token);
}

function courseProgressCollectIdentityTokens(value) {
  const tokens = new Set();
  if (!value) return tokens;

  if (typeof value === 'string') {
    courseProgressAddIdentityToken(tokens, value);
    return tokens;
  }

  if (typeof value !== 'object') return tokens;

  courseProgressAddIdentityToken(tokens, value._id);
  courseProgressAddIdentityToken(tokens, value.id);
  courseProgressAddIdentityToken(tokens, value.email);
  courseProgressAddIdentityToken(tokens, value.phone);
  courseProgressAddIdentityToken(tokens, value.username);
  courseProgressAddIdentityToken(tokens, value.fullName);
  courseProgressAddIdentityToken(tokens, value.name);

  if (value.user) {
    courseProgressCollectIdentityTokens(value.user).forEach((token) => tokens.add(token));
  }

  const firstName = value.firstName || '';
  const lastName = value.lastName || '';
  const middleName = value.middleName || '';
  const nameParts = [lastName, firstName, middleName].filter(Boolean).join(' ');
  const nameAlt = [firstName, lastName, middleName].filter(Boolean).join(' ');
  if (nameParts) courseProgressAddIdentityToken(tokens, nameParts);
  if (nameAlt) courseProgressAddIdentityToken(tokens, nameAlt);

  return tokens;
}

function courseProgressUserMatchesValue(value, user) {
  if (courseProgressIdsMatch(value, user)) return true;
  const userTokens = courseProgressCollectIdentityTokens(user);
  if (!userTokens.size) return false;
  const valueTokens = courseProgressCollectIdentityTokens(value);
  for (const token of valueTokens) {
    if (userTokens.has(token)) return true;
  }
  return false;
}

function courseProgressGetUnitMember(unit, user) {
  if (!unit || !Array.isArray(unit.members)) return null;
  const directMatch =
    unit.members.find((m) => courseProgressIdsMatch(m?.user, user)) || null;
  if (directMatch) return directMatch;
  const relaxedMatch = unit.members.find((m) => {
    if (!m) return false;
    return (
      courseProgressUserMatchesValue(m?.user, user) ||
      courseProgressUserMatchesValue(m?.userId, user) ||
      courseProgressUserMatchesValue(m?.member, user) ||
      courseProgressUserMatchesValue(m, user)
    );
  });
  return relaxedMatch || null;
}

function courseProgressGetUnitMode(unit, user) {
  const member = courseProgressGetUnitMember(unit, user);
  return member ? member.mode : null;
}

function courseProgressGetUnitAmount(unit, member) {
  const memberRaw = member?.amount;
  if (memberRaw !== null && memberRaw !== undefined && memberRaw !== '') {
    const memberAmount = Number(memberRaw);
    if (Number.isFinite(memberAmount)) return memberAmount;
  }
  return 1;
}

function courseProgressGetDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function courseProgressGetWeekdayIndex(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase().replace(/’/g, "'");
  const map = {
    "понеділок": 1,
    "вівторок": 2,
    "середа": 3,
    "четвер": 4,
    "п'ятниця": 5,
    "пятниця": 5,
    "субота": 6,
    "неділя": 0,
  };
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

function courseProgressGetCourseWeeks(course) {
  const startDate = courseProgressGetDateOnly(course?.courseDates?.start);
  const endDate = courseProgressGetDateOnly(course?.courseDates?.end);
  if (!startDate || !endDate || endDate < startDate) return null;
  const diffDays = Math.floor((endDate - startDate) / 86400000);
  const totalDays = diffDays + 1;
  const weeks = Math.round(totalDays / 7);
  return Math.max(1, weeks);
}

function courseProgressGetUnitOccurrences(unit, course) {
  if (!unit) return 0;
  const startDate = courseProgressGetDateOnly(course?.courseDates?.start);
  const endDate = courseProgressGetDateOnly(course?.courseDates?.end);

  if (unit.date) {
    const unitDate = courseProgressGetDateOnly(unit.date);
    if (!unitDate) return 0;
    if (startDate && unitDate < startDate) return 0;
    if (endDate && unitDate > endDate) return 0;
    return 1;
  }

  const weekdayIndex = courseProgressGetWeekdayIndex(unit.dayName || unit.day);
  if (startDate && endDate && weekdayIndex !== null) {
    const startDay = startDate.getUTCDay();
    const offset = (weekdayIndex - startDay + 7) % 7;
    const first = new Date(startDate.getTime());
    first.setUTCDate(first.getUTCDate() + offset);
    if (first > endDate) return 0;
    const diffDays = Math.floor((endDate - first) / 86400000);
    return Math.floor(diffDays / 7) + 1;
  }

  const weeks = courseProgressGetCourseWeeks(course);
  return weeks || 1;
}

function courseProgressFormatValue(value) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

function courseProgressFormatShortDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('uk-UA');
}

function courseProgressParseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function courseProgressGetActiveFilters() {
  const params = new URLSearchParams(window.location.search);
  const from = courseProgressParseDate(params.get('from'));
  const to = courseProgressParseDate(params.get('to'));
  const category = params.get('category');
  const units = params
    .getAll('unit')
    .map((value) => value.trim())
    .filter((value) => value && value !== 'Все');
  return {
    from,
    to,
    category: category && category.trim() ? category.trim() : null,
    units: units.length ? units : null,
  };
}

function courseProgressCourseMatchesFilters(course, filters) {
  if (!filters) return true;
  if (filters.category && course?.mainType !== filters.category) return false;

  if (filters.from || filters.to) {
    const endRaw = course?.courseDates?.end;
    const startRaw = course?.courseDates?.start;
    const dateRaw = endRaw || startRaw;
    const dateValue = dateRaw ? new Date(dateRaw) : null;
    if (!dateValue || Number.isNaN(dateValue.getTime())) return false;
    if (filters.from && dateValue < filters.from) return false;
    if (filters.to) {
      const endLimit = new Date(filters.to);
      endLimit.setHours(23, 59, 59, 999);
      if (dateValue > endLimit) return false;
    }
  }

  if (filters.units && filters.units.length) {
    if (!Array.isArray(course?.units)) return false;
    const unitSet = new Set(filters.units);
    const hasUnit = course.units.some((unit) => unit && unitSet.has(unit.unitType));
    if (!hasUnit) return false;
  }

  return true;
}

function courseProgressUpdateFilterSummary(filters) {
  const summary = document.getElementById('progressFilterSummary');
  if (!summary) return;
  const items = [];

  if (filters?.category) {
    items.push(`Категорія: ${filters.category}`);
  }

  if (filters?.from || filters?.to) {
    const fromLabel = filters.from ? courseProgressFormatShortDate(filters.from) : '';
    const toLabel = filters.to ? courseProgressFormatShortDate(filters.to) : '';
    let periodText = '';
    if (fromLabel && toLabel) {
      periodText = `${fromLabel} — ${toLabel}`;
    } else if (fromLabel) {
      periodText = `з ${fromLabel}`;
    } else if (toLabel) {
      periodText = `до ${toLabel}`;
    }
    if (periodText) items.push(`Період: ${periodText}`);
  }

  if (filters?.units?.length) {
    items.push(`Юніти: ${filters.units.join(', ')}`);
  }

  if (!items.length) {
    summary.style.display = 'none';
    summary.innerHTML = '';
    return;
  }

  summary.style.display = 'flex';
  summary.innerHTML = items
    .map((text) => `<span class="progress-filter-chip">${text}</span>`)
    .join('');
}

function courseProgressEnsureBucket(map, key, label) {
  if (!map[key]) {
    map[key] = { key, label, taught: 0, attended: 0 };
  }
  return map[key];
}

function courseProgressNormalizeOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const normalized = {};
  Object.keys(raw).forEach((key) => {
    const entry = raw[key];
    if (!entry || typeof entry !== 'object') return;
    const taught = courseProgressParseOverride(entry.taught);
    const attended = courseProgressParseOverride(entry.attended);
    if (taught === null && attended === null) return;
    const next = {};
    if (taught !== null) next.taught = taught;
    if (attended !== null) next.attended = attended;
    if (Object.keys(next).length) normalized[key] = next;
  });
  return normalized;
}

function courseProgressParseOverride(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function courseProgressApplyOverrides(rows, overrides) {
  if (!overrides || !Object.keys(overrides).length) return rows;
  const used = new Set();
  const updated = rows.map((row) => {
    const override = overrides[row.key];
    if (!override) return row;
    used.add(row.key);
    const next = Object.assign({}, row);
    if (Object.prototype.hasOwnProperty.call(override, 'taught')) {
      next.taught = Math.max(next.taught || 0, override.taught);
    }
    if (Object.prototype.hasOwnProperty.call(override, 'attended')) {
      next.attended = Math.max(next.attended || 0, override.attended);
    }
    return next;
  });

  Object.keys(overrides).forEach((key) => {
    if (used.has(key)) return;
    const override = overrides[key] || {};
    updated.push({
      key,
      label: key,
      taught: Object.prototype.hasOwnProperty.call(override, 'taught') ? override.taught : 0,
      attended: Object.prototype.hasOwnProperty.call(override, 'attended') ? override.attended : 0,
    });
  });

  return updated;
}

function courseProgressMergeOverrides(baseOverrides, userOverrides) {
  const result = Object.assign({}, baseOverrides || {});
  Object.keys(userOverrides || {}).forEach((key) => {
    const base = result[key] || {};
    result[key] = Object.assign({}, base, userOverrides[key] || {});
  });
  return result;
}

function courseProgressGetBaseTypes() {
  return [
    { key: 'Особистий аналіз', label: 'Особистий аналіз' },
    { key: 'Індивідуальна супервізія', label: 'Індивідуальна супервізія' },
    { key: 'Групова супервізія', label: 'Групова супервізія' },
    { key: 'Менторське заняття', label: 'Менторське заняття' },
    { key: 'Лекція', label: 'Лекція' },
    { key: 'Семінар', label: 'Семінар' },
    { key: 'Терапевтична група', label: 'Терапевтична група' },
    { key: 'Супервізійно-семінарське заняття', label: 'Супервізійно-семінарське заняття' },
    { key: 'Парна терапія', label: 'Проведення парної терапії' },
    { key: 'Лекторій', label: 'Лекторій' },
    { key: 'Конференція', label: 'Конференція' },
  ];
}

function courseProgressComputeDisplayRows({ courses, user, filters }) {
  const baseTypes = courseProgressGetBaseTypes();
  const stats = {};
  baseTypes.forEach((type) => courseProgressEnsureBucket(stats, type.key, type.label));
  const extraStats = {};

  (Array.isArray(courses) ? courses : []).forEach((course) => {
    if (!course || course.status !== 'Пройдений') return;
    if (!courseProgressCourseMatchesFilters(course, filters)) return;

    const courseStats = {};
    const ensureCourseBucket = (key, label) => {
      if (!courseStats[key]) {
        courseStats[key] = { key, label, taught: 0, attended: 0 };
      }
      return courseStats[key];
    };

    let hasParticipation = false;

    if (Array.isArray(course.units)) {
      course.units.forEach((unit) => {
        if (!unit || !unit.unitType) return;
        if (filters?.units?.length && !filters.units.includes(unit.unitType)) return;
        const member = courseProgressGetUnitMember(unit, user);
        if (!member) return;
        hasParticipation = true;
        const occurrences = courseProgressGetUnitOccurrences(unit, course);
        if (!occurrences) return;
        const amount = courseProgressGetUnitAmount(unit, member) * occurrences;
        const bucket = ensureCourseBucket(unit.unitType, unit.unitType);

        if (member.mode === 'проводив') {
          bucket.taught += amount;
        } else {
          bucket.attended += amount;
        }
      });
    }

    if (course.mainType === 'Конференція' && !(filters?.units?.length)) {
      const isCreator = courseProgressUserMatchesValue(course.creatorId, user);
      const isParticipant = Array.isArray(course.participants)
        ? course.participants.some((p) => courseProgressUserMatchesValue(p, user))
        : false;
      if (isCreator || isParticipant) {
        hasParticipation = true;
        const bucket = ensureCourseBucket('Конференція', 'Конференція');
        if (isCreator) bucket.taught += 1;
        if (isParticipant) bucket.attended += 1;
      }
    }

    if (!hasParticipation) return;

    const courseRows = Object.values(courseStats);
    const courseOverrides = courseProgressNormalizeOverrides(course?.progressOverrides || {});
    const userOverrides = courseProgressNormalizeOverrides(
      course?.progressUserOverrides?.[user._id] || {}
    );
    const mergedOverrides = courseProgressMergeOverrides(courseOverrides, userOverrides);
    const adjustedRows = courseProgressApplyOverrides(courseRows, mergedOverrides);

    adjustedRows.forEach((row) => {
      const bucket =
        stats[row.key] || courseProgressEnsureBucket(extraStats, row.key, row.label);
      bucket.taught += row.taught;
      bucket.attended += row.attended;
    });
  });

  const baseKeys = baseTypes.map((type) => type.key);
  const extraKeys = Object.keys(extraStats)
    .filter((key) => !baseKeys.includes(key))
    .sort((a, b) => a.localeCompare(b, 'uk'));
  const rows = [
    ...baseTypes.map((type) => stats[type.key]),
    ...extraKeys.map((key) => extraStats[key]),
  ];
  const overrides = courseProgressNormalizeOverrides(user?.progressOverrides || {});
  const rowsWithOverrides = courseProgressApplyOverrides(rows, overrides);

  let displayRows = rowsWithOverrides;
  if (filters?.units?.length) {
    const unitSet = new Set(filters.units);
    displayRows = rowsWithOverrides.filter((row) => unitSet.has(row.key));
  } else if (filters?.category) {
    displayRows = rowsWithOverrides.filter((row) => row.taught + row.attended > 0);
  }

  const unitRows = displayRows.filter((row) => row.key !== 'Конференція');
  const unitLabels = unitRows
    .filter((row) => row.taught + row.attended > 0)
    .map((row) => row.label);
  const uniqueUnitLabels = Array.from(new Set(unitLabels));
  const totalUnits = unitRows.reduce((sum, row) => sum + row.taught + row.attended, 0);

  return {
    displayRows,
    unitLabels: uniqueUnitLabels,
    totalUnits,
  };
}

async function loadCourseProgress() {
  const tableBody = document.getElementById('courseProgressBody');
  if (!tableBody || !document.body.classList.contains('course-progress-page')) return;

  tableBody.innerHTML = '<tr><td colspan="4">Завантаження...</td></tr>';

  const user = typeof getFreshUserSafe === 'function' ? await getFreshUserSafe() : null;
  if (!user || !user._id) {
    tableBody.innerHTML = '<tr><td colspan="4">Увійдіть, щоб побачити прогрес</td></tr>';
    return;
  }

  let courses = [];
  try {
    const res = await fetch(`${API_BASE}/api/courses`, { credentials: 'include' });
    const data = await res.json();
    courses = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Помилка при завантаженні курсів:', err);
    tableBody.innerHTML = '<tr><td colspan="4">Не вдалося завантажити дані</td></tr>';
    return;
  }

  const filters = courseProgressGetActiveFilters();
  courseProgressUpdateFilterSummary(filters);
  const { displayRows } = courseProgressComputeDisplayRows({ courses, user, filters });

  tableBody.innerHTML = '';
  if (!displayRows.length) {
    tableBody.innerHTML = '<tr><td colspan="4">Немає даних</td></tr>';
    return;
  }

  displayRows.forEach((row) => {
    const total = row.taught + row.attended;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.label}</td>
      <td><span class="progress-pill">${courseProgressFormatValue(total)}</span></td>
      <td>${courseProgressFormatValue(row.taught)}</td>
      <td>${courseProgressFormatValue(row.attended)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function courseProgressGetFullName(user) {
  if (!user) return '__________';
  const fullName = [user.lastName, user.firstName, user.middleName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
  return (
    fullName ||
    (user.fullName || '').trim() ||
    (user.name || '').trim() ||
    (user.username || '').trim() ||
    (user.email || '').trim() ||
    '__________'
  );
}

function courseProgressFormatDateUA(value) {
  const date = value instanceof Date ? value : new Date();
  const months = [
    'січня',
    'лютого',
    'березня',
    'квітня',
    'травня',
    'червня',
    'липня',
    'серпня',
    'вересня',
    'жовтня',
    'листопада',
    'грудня',
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()] || '';
  const year = date.getFullYear();
  return `«${day}» ${month} ${year}р.`;
}

function courseProgressGetPassedVerb(user) {
  const gender = String(user?.gender || '').toLowerCase().trim();
  if (gender === 'female' || gender === 'жінка') return 'пройшла';
  if (gender === 'male' || gender === 'чоловік') return 'пройшов';
  return 'пройшов(ла)';
}

function courseProgressGetGenderForms(user) {
  const gender = String(user?.gender || '').toLowerCase().trim();
  if (gender === 'female' || gender === 'жінка') {
    return {
      pronoun: 'Вона',
      openAdj: 'відкрита',
    };
  }
  if (gender === 'male' || gender === 'чоловік') {
    return {
      pronoun: 'Він',
      openAdj: 'відкритий',
    };
  }
  return {
    pronoun: 'Він/Вона',
    openAdj: 'відкритий(а)',
  };
}

function courseProgressBuildUnitsBreakdown({ displayRows, filters }) {
  const rows = Array.isArray(displayRows) ? displayRows : [];
  const totalsByKey = new Map(rows.map((row) => [row.key, row.taught + row.attended]));
  const labelByKey = new Map(rows.map((row) => [row.key, row.label || row.key]));

  let unitKeys = [];
  if (filters?.units?.length) {
    unitKeys = filters.units.slice();
  } else {
    unitKeys = rows
      .filter((row) => row.key !== 'Конференція')
      .filter((row) => row.taught + row.attended > 0)
      .map((row) => row.key);
  }

  if (!unitKeys.length) {
    return 'супервізії клінічної практики в обсязі 0 сесій';
  }

  const parts = unitKeys.map((key) => {
    const label = labelByKey.get(key) || key;
    const total = totalsByKey.has(key) ? totalsByKey.get(key) : 0;
    const formatted = courseProgressFormatValue(total || 0);
    return `${label} в обсязі ${formatted} сесій`;
  });

  return parts.join(', ');
}

function courseProgressBuildExtractHtml({
  fullName,
  dateText,
  baseHref,
  verbText,
  unitsText,
  pronounText,
  openAdjText,
}) {
  const safeName = String(fullName || '').replace(/[<>]/g, '');
  const safeDate = String(dateText || '').replace(/[<>]/g, '');
  const safeBase = String(baseHref || '').replace(/"/g, '&quot;');
  const safeVerb = String(verbText || '').replace(/[<>]/g, '');
  const safeUnits = String(unitsText || '').replace(/[<>]/g, '');
  const safePronoun = String(pronounText || '').replace(/[<>]/g, '');
  const safeOpenAdj = String(openAdjText || '').replace(/[<>]/g, '');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${safeBase}">
  <title>Довідка</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --accent: #E37009;
      --text: #1c1c1c;
      --muted: #4d4d4d;
      --hl-verb: #fff36a;
      --hl-units: #49f05b;
      --hl-count: #5ee8ff;
      --hl-name: #ffb347;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Poppins", "Segoe UI", Arial, sans-serif;
      background: #ffffff;
      color: var(--text);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .extract-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 20mm 18mm 26mm;
      position: relative;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    }
    .extract-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .extract-brand {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1 1 auto;
    }
    .extract-logo-box {
      width: 70px;
      height: 150px;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0;
      flex-shrink: 0;
      margin-top: -20mm;
    }
    .extract-logo-box img {
      width: 50px;
      height: 50px;
      object-fit: contain;
      margin-top: 50px
    }
    .extract-brand-words {
      display: flex;
      align-items: center;
      margin-top: 0;
    }
    .extract-brand-words img {
      width: 100px;
      height: 50psx;
      object-fit: contain;
      display: block;
    }
    .extract-contact {
      text-align: center;
      font-size: 12px;
      color: #1b1b1b;
      line-height: 1.55;
      min-width: 280px;
      margin-top: 4px;
    }
    .extract-contact .ua {
      color: var(--accent);
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: block;
      letter-spacing: 0.03em;
    }
    .extract-title {
      text-align: center;
      margin: 30px 0 10px;
      font-size: 24px;
      letter-spacing: 0.06em;
    }
    .extract-lead {
      text-align: center;
      color: #2d2d2d;
      font-size: 14px;
      margin-bottom: 2px;
    }
    .extract-name {
      text-align: center;
      font-size: 22px;
      color: var(--accent);
      font-style: italic;
      font-weight: 600;
      margin: 8px 0 18px;
    }
    .hl {
      padding: 0;
      border-radius: 0;
      background: transparent;
    }
    .hl-verb { color: inherit; }
    .hl-units { color: inherit; }
    .hl-count { color: inherit; }
    .hl-name {
      color: var(--accent);
      font-style: italic;
      font-weight: 600;
    }
    .extract-text {
      font-size: 13.5px;
      line-height: 1.72;
      margin: 0;
      letter-spacing: 0.01em;
      text-align: justify;
      text-justify: inter-word;
    }
    .extract-text.indent {
      text-indent: 0;
    }
    .extract-date {
      margin-top: 16px;
      font-size: 12px;
      font-weight: 600;
    }
    .extract-sign {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      align-items: end;
      margin-top: 28px;
      gap: 16px;
    }
    .extract-sign-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 180px;
    }
    .extract-role {
      font-size: 12px;
      font-weight: 600;
    }
    .extract-stamp {
      width: 118px;
      height: 118px;
      margin-top: 6px;
    }
    .extract-stamp img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .extract-sign-center {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding: 0 8px;
    }
    .extract-sign-right {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }
    .extract-signature {
      position: relative;
      width: 240px;
      height: 90px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .extract-signature-line {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      border-top: 1px solid #2a2a2a;
    }
    .extract-signature-img {
      max-width: 170px;
      max-height: 50px;
      object-fit: contain;
      display: block;
      transform: scale(2.2);
      transform-origin: center bottom;
      margin-bottom: 10px;
    }
    .extract-sign-name {
      text-align: right;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
    }
    .extract-footer {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 70px;
      background: var(--accent);
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 0 18mm;
      font-size: 12px;
      letter-spacing: 0.01em;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .extract-footer-item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
    }
    .extract-footer-item img {
      width: 18px;
      height: 18px;
      object-fit: contain;
      display: block;
    }
    .extract-footer-separator {
      width: 1px;
      height: 14px;
      background: #ffffff;
      display: inline-block;
    }
    @media print {
      body {
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .extract-page {
        margin: 0;
        box-shadow: none;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  <div class="extract-page">
    <div class="extract-header">
      <div class="extract-brand">
        <div class="extract-logo-box">
          <img src="assets/practice-records/emblem.png" alt="IPS" />
        </div>
        <div class="extract-brand-words">
          <img src="assets/practice-records/words.png" alt="Institute of Professional Supervision" />
        </div>
      </div>
      <div class="extract-contact">
        <span class="ua">ІНСТИТУТ ПРОФЕСІЙНОЇ СУПЕРВІЗІЇ</span>
       +380956401316, mamko.supervision@gmail.com<br />
        mamko-prof-supervision.com
      </div>
    </div>

    <h1 class="extract-title">ДОВІДКА</h1>
    <div class="extract-lead">Цим листом підтверджую, що</div>
    <div class="extract-name">${safeName}</div>

    <p class="extract-text">
      <span class="hl hl-verb">${safeVerb}</span>
      <span class="hl hl-units">${safeUnits}</span>, під моїм керівництвом в ІНСТИТУТІ
      ПРОФЕСІЙНОЇ СУПЕРВІЗІЇ ТА EYRA PSYCHOSOCIAL ASSISTANCE, INC. Під час
      супервізійної роботи <span class="hl hl-name">${safeName}</span> демонструє високий рівень професійної
      рефлексії, здатність до глибокого аналізу терапевтичного процесу та
      розуміння динаміки переносу й контрпереносу.
    </p>
    <p class="extract-text indent">
      ${safePronoun} уважно ставиться до проявів власних емоційних реакцій у взаємодії з
      клієнтом, вміє їх усвідомлювати, аналізувати й використовувати як
      інструмент для глибшого розуміння клієнтського матеріалу.
    </p>
    <p class="extract-text indent">
      У роботі характеризується етичністю, відповідальністю, емпатією та
      стабільністю професійної позиції. Активно включається в процес супервізії,
      ${safeOpenAdj} до зворотного зв’язку та саморозвитку.
    </p>
    <p class="extract-text indent">
      Рекомендую <span class="hl hl-name">${safeName}</span> як уважного, професійного й зрілого спеціаліста,
      який розвивається в межах психоаналітичного підходу.
    </p>

    <div class="extract-sign">
      <div class="extract-sign-left">
        <div class="extract-role">Директор ІПС,</div>
        <div class="extract-role">кандидат</div>
        <div class="extract-role">психологічних наук</div>
        <div class="extract-stamp">
          <img src="assets/stamp.png" alt="Печатка IPS" />
        </div>
      </div>
      <div class="extract-sign-center">
        <div class="extract-signature">
          <div class="extract-signature-line"></div>
          <img class="extract-signature-img" src="assets/initials.png" alt="Підпис" />
        </div>
      </div>
      <div class="extract-sign-right">
        <div class="extract-sign-name">д-р Мамко<br />Володимир Петрович</div>
      </div>
    </div>

    <div class="extract-date">${safeDate}</div>

    <div class="extract-footer">
      <span class="extract-footer-item">
        <img src="assets/practice-records/phone.png" alt="" />
        <span class="extract-footer-separator"></span>
        +380956401316
      </span>
      <span class="extract-footer-item">
        <img src="assets/practice-records/mail.png" alt="" />
        <span class="extract-footer-separator"></span>
        mamko.supervision@gmail.com
      </span>
      <span class="extract-footer-item">
        <img src="assets/practice-records/phone.png" alt="" style="opacity:0;" />
        IPS, Київ, Україна
      </span>
    </div>
  </div>
  <script>
    function waitForImages() {
      const images = Array.from(document.images || []);
      if (!images.length) return Promise.resolve();
      return Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 1500);
          });
        })
      );
    }

    function waitForFonts() {
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready.catch(() => {});
      }
      return Promise.resolve();
    }

    window.onload = () => {
      Promise.all([waitForImages(), waitForFonts()]).finally(() => {
        setTimeout(() => {
          window.print();
        }, 200);
      });
    };
    window.onafterprint = () => {
      window.close();
    };
  </script>
</body>
</html>`;
}

async function downloadCourseExtract() {
  const user = typeof getFreshUserSafe === 'function' ? await getFreshUserSafe() : null;
  if (!user || !user._id) {
    alert('Увійдіть, щоб завантажити витяг.');
    return;
  }

  const fullName = courseProgressGetFullName(user);
  const dateText = courseProgressFormatDateUA(new Date());
  const baseHref = new URL('.', window.location.href).href;
  const filters = courseProgressGetActiveFilters();

  let courses = [];
  try {
    const res = await fetch(`${API_BASE}/api/courses`, { credentials: 'include' });
    const data = await res.json();
    courses = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Помилка при завантаженні курсів для витягу:', err);
  }

  const { displayRows } = courseProgressComputeDisplayRows({ courses, user, filters });
  const verbText = courseProgressGetPassedVerb(user);
  const genderForms = courseProgressGetGenderForms(user);
  const unitsText = courseProgressBuildUnitsBreakdown({ displayRows, filters });

  const html = courseProgressBuildExtractHtml({
    fullName,
    dateText,
    baseHref,
    verbText,
    unitsText,
    pronounText: genderForms.pronoun,
    openAdjText: genderForms.openAdj,
  });

  const extractWindow = window.open('', '_blank');
  if (!extractWindow) {
    alert('Дозвольте відкриття нового вікна для завантаження витягу.');
    return;
  }

  extractWindow.document.open();
  extractWindow.document.write(html);
  extractWindow.document.close();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('course-progress-page')) {
    loadCourseProgress();
    const extractBtn = document.getElementById('downloadExtractBtn');
    if (extractBtn) {
      extractBtn.addEventListener('click', downloadCourseExtract);
    }
  }

  if (document.body.classList.contains('course-progress-filter-page')) {
    const applyBtn = document.querySelector('.progress-filter-submit');
    if (!applyBtn) return;
    applyBtn.addEventListener('click', () => {
      const from = document.querySelector('input[name="from"]')?.value || '';
      const to = document.querySelector('input[name="to"]')?.value || '';
      const category = document.querySelector('input[name="courseCategory"]:checked')?.value || '';
      const unitInputs = Array.from(
        document.querySelectorAll('input[name="courseUnit"]:checked')
      );
      const units = unitInputs
        .map((input) => (input?.value || '').trim())
        .filter(Boolean);
      const hasAllUnits = units.includes('Все');

      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (category) params.set('category', category);
      if (!hasAllUnits) {
        units.forEach((unit) => params.append('unit', unit));
      }

      const target = `course-progress.html${params.toString() ? `?${params.toString()}` : ''}`;
      window.location.href = target;
    });
  }
});
