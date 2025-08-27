
API_BASE = "http://157.230.121.24:5050";

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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

    // Сохраняем пользователя
    localStorage.setItem("user", JSON.stringify(result.user));
    console.log("[LOGIN] Пользователь сохранён в localStorage");

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
  // проверяем, если это profile.html
  if (window.location.pathname.includes("profile.html")) {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("Please log in first.");
      window.location.href = "index.html";
      return;
    }

    try {
     const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, { credentials: "include" });
      const user = await res.json();
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
      document.getElementById("profileRoleTextarea").value = user.role || "";
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
      // ✅ Инициализация textarea "Про мене"
const coursesTextarea = document.getElementById("profileCoursesTextarea");
const coursesCheckIcon = document.getElementById("coursesCheckIcon");

if (coursesTextarea && coursesCheckIcon) {
  coursesTextarea.value = user.courses || "";

  coursesTextarea.addEventListener("input", () => {
    coursesCheckIcon.style.display = "inline";
  });

  coursesCheckIcon.addEventListener("click", async () => {
    const newValue = coursesTextarea.value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courses: newValue }),
      });

      const result = await res.json();
      if (res.ok) {
        coursesCheckIcon.style.display = "none";
        alert("Збережено!");
      } else {
        alert("Помилка при збереженні: " + result.message);
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
    }
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



function enableCheckboxEdit(fieldId, mongoKey, optionsArray) {
  const container = document.getElementById(fieldId).parentNode;
  const selectedValues = (window.currentUser[mongoKey] || []);
 
const customOthers = selectedValues.filter(v => !optionsArray.includes(v));
if (customOthers.length) {
  const otherBadge = document.createElement('div');
  otherBadge.style.margin = '8px 0';
  otherBadge.style.fontSize = '14px';
  otherBadge.style.opacity = '0.8';
  otherBadge.textContent = 'Інше: ' + customOthers[0];
  checkboxContainer.appendChild(otherBadge);
}

  // Удаляем старый span
  const oldSpan = document.getElementById(fieldId);
  oldSpan.remove();

  // Создаём div с плитками
  const checkboxContainer = document.createElement("div");
  checkboxContainer.className = "checkbox-group";

  const checkboxes = [];

  optionsArray.forEach(option => {
    const tile = document.createElement("div");
    tile.className = "checkbox-tile";

    const square = document.createElement("div");
    square.className = "checkbox-square";
    if (selectedValues.includes(option)) {
      square.classList.add("checked");
    }

    const label = document.createElement("span");
    label.textContent = option;

    tile.appendChild(square);
    tile.appendChild(label);
    checkboxContainer.appendChild(tile);

    // логика переключения
    square.addEventListener("click", () => {
      square.classList.toggle("checked");
    });

    checkboxes.push({ square, value: option });
  });

  // Кнопка сохранить
  const checkIcon = document.createElement("img");
  checkIcon.src = "assets/check-icon.svg";
  checkIcon.className = "check-icon";
  checkIcon.style.cursor = "pointer";
  checkIcon.style.width = "20px";
  checkIcon.style.marginLeft = "8px";

  container.appendChild(checkboxContainer);
  container.appendChild(checkIcon);

  checkIcon.addEventListener("click", async () => {
    const selected = checkboxes
      .filter(({ square }) => square.classList.contains("checked"))
      .map(({ value }) => value);

    updatedProfileData[mongoKey] = selected;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    fetch(`${API_BASE}/api/users/${storedUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [mongoKey]: selected }),
    });

    if (res.ok) {
      const newSpan = document.createElement("span");
      newSpan.id = fieldId;
      newSpan.textContent = selected.join(", ");
      checkboxContainer.remove();
      checkIcon.remove();
      container.appendChild(newSpan);
      alert("Збережено!");
    } else {
      alert("Помилка при збереженні");
    }
  });
}

let users = [];
let selectedParticipants = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.pathname.includes("registration")) return;

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    users = await res.json();
  } catch (err) {
    console.error("Помилка завантаження користувачів:", err);
  }
});


function openUserModal() {
  
  document.getElementById("userModal").style.display = "block";
  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  users.forEach(user => {
    const wrapper = document.createElement("div");
wrapper.style.display = "flex";
wrapper.style.justifyContent = "space-between";
wrapper.style.alignItems = "center";
wrapper.style.padding = "6px 0";
wrapper.style.gap = "12px";  // расстояние между текстом и чекбоксом

const name = document.createElement("span");
name.textContent = `${user.firstName} ${user.lastName}`;
name.style.flex = "1";  // чтобы имя занимало всё свободное место

const checkbox = document.createElement("input");
checkbox.type = "checkbox";
checkbox.value = user._id;
checkbox.checked = selectedParticipants.includes(user._id);

checkbox.addEventListener("change", () => {
  if (checkbox.checked) {
    selectedParticipants.push(user._id);
  } else {
    selectedParticipants = selectedParticipants.filter(id => id !== user._id);
  }
  updateSelectedDisplay();
});

wrapper.appendChild(name);
wrapper.appendChild(checkbox);
userList.appendChild(wrapper);

  });
}

function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
}

function saveSelectedParticipants() {
  closeUserModal();
  updateSelectedDisplay();
}

function updateSelectedDisplay() {
  const container = document.getElementById("selectedParticipants");
  container.innerHTML = "";

  selectedParticipants.forEach(id => {
    const user = users.find(u => u._id === id);
    if (!user) return;

    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "6px";
    item.style.padding = "4px 10px";
    item.style.background = "#f2f2f2";
    item.style.borderRadius = "12px";

    const name = document.createElement("span");
    name.textContent = `${user.firstName} ${user.lastName}`;

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✕";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.color = "red";
    removeBtn.addEventListener("click", () => {
      selectedParticipants = selectedParticipants.filter(pid => pid !== id);
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
      directions = otherDirText ? [otherDirText] : [];
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

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const creatorId = storedUser?._id;

    let creatorName = "";
    let creatorRole = "";

    try {
      const resUser = await fetch(`http://157.230.121.24:5050/api/users/${creatorId}`);
      const user = await resUser.json();
      creatorName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      creatorRole = user.role || "";
    } catch (err) {
      console.error("Помилка при отриманні даних користувача:", err);
    }

    const formData = {
      eventType: form.eventType.value,
      courseTitle: form.courseTitle.value,
      courseSubtitle: form.courseSubtitle.value,
      courseDescription: form.courseDescription.value,
      courseDates: {
        start: form.startDate.value,
        end: form.endDate.value
      },
      courseDays: [...form.querySelectorAll('input[name="courseDays"]:checked')].map(cb => cb.value),
      courseTime: {
        start: form.startTime.value,
        end: form.endTime.value
      },
      accessType: form.accessType.value,
      courseDuration: form.courseDuration.value,
      coursePrice: form.coursePrice.value,
      zoomLink: form.zoomLink.value,
      participants: selectedParticipants,
      creatorId,
      creatorName,
      creatorRole
    };

    try {
      const res = await fetch("http://157.230.121.24:5050/api/courses", {
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
  const email = document.getElementById("email").value.trim();
  if (!email) {
    alert("Будь ласка, введіть email.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const result = await res.json();
    if (res.ok) {
      alert("✅ Код надіслано на пошту.");
      // Можна перейти на сторінку введення коду (якщо є)
      // window.location.href = "reset-code.html";
    } else {
      alert("❌ " + result.message);
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
  if (!isTouchDevice()) {
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

// Rewire the existing toggle to act as a "pin/unpin"
const _origToggleSidebar = toggleSidebar;
toggleSidebar = function(){
  // Invert pin state and persist
  sidebarPinned = !sidebarPinned;
  localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  applySidebarState();
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', enableSidebarHover);


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