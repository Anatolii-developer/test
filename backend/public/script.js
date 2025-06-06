const API_BASE = "http://157.230.121.24:5050";


async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await res.json();
    if (res.ok) {
      localStorage.setItem("user", JSON.stringify(result.user));
      window.location.href = "profile.html";
    } else {
      alert("Помилка: " + result.message);
    }
  } catch (err) {
    alert("Server error");
    console.error(err);
  }
}



function saveLoginAndContinue() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!username || !password || !confirmPassword) {
    alert("Будь ласка, заповніть всі поля.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Паролі не співпадають.");
    return;
  }

  localStorage.setItem("registrationUsername", username);
  localStorage.setItem("registrationPassword", password);
  window.location.href = "registration.html";
}

function togglePassword(iconElement) {
  const wrapper = iconElement.closest('.input-wrapper');
  const passwordInput = wrapper.querySelector('input');

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    iconElement.src = "assets/icon-eye-open.svg";
  } else {
    passwordInput.type = "password";
    iconElement.src = "assets/icon-eye-close.svg";
  }
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
      const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`);
      const user = await res.json();

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
      
      window.currentUser = user;
    } catch (err) {
      console.error("Failed to load user data:", err);
      alert("Failed to load user data.");
    }
  }
});








let updatedProfileData = {};

function enableEdit(fieldId, mongoKey) {
  const span = document.getElementById(fieldId);
  const currentValue = span.textContent.trim();

  // Убираем предыдущий контейнер, если он уже открыт
  const existing = document.querySelector(`.edit-container[data-key="${mongoKey}"]`);
  if (existing) existing.remove();

  // Создаём input + иконку внутри отдельного блока
  const container = document.createElement("div");
  container.className = "edit-container";
  container.dataset.key = mongoKey;
  container.style.marginTop = "10px";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "10px";

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentValue;
  input.className = "edit-input";
  input.style.width = "910px";
  input.style.height = "40px";
  input.style.padding = "8px 16px";
  input.style.fontSize = "16px";
  input.style.border = "1px solid #ccc";
  input.style.borderRadius = "8px";

  const checkIcon = document.createElement("img");
  checkIcon.src = "assets/check-icon.svg";
  checkIcon.className = "check-icon";
  checkIcon.style.cursor = "pointer";
  checkIcon.style.width = "20px";
  checkIcon.style.height = "20px";

  container.appendChild(input);
  container.appendChild(checkIcon);

  // Вставляем именно после родительского <p>, а не после span
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
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        span.textContent = updatedProfileData[mongoKey];
        container.remove();
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

document.getElementById("saveProfileChangesBtn").addEventListener("click", async () => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  if (!storedUser) {
    alert("Please log in first.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/${storedUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProfileData),
    });

    const result = await res.json();
    if (res.ok) {
      alert("Профіль оновлено успішно!");
      updatedProfileData = {}; // очистить локальные изменения

      // === СКРЫВАЕМ КНОПКУ ===
      document.getElementById("saveProfileChangesBtn").style.display = "none";
    } else {
      alert("Помилка: " + result.message);
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    alert("Помилка сервера.");
  }
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const payload = {
    username: localStorage.getItem("registrationUsername") || "",
    password: localStorage.getItem("registrationPassword") || "",
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    middleName: document.getElementById("middleName").value,
    dateOfBirth: document.getElementById("dateOfBirth").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    gender: document.querySelector('input[name="gender"]:checked').value,
    experience: document.getElementById("experience").value,
    education: document.getElementById("education").value,
    directions: [...document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked')].map(c => c.parentElement.textContent.trim()),
    topics: [...document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked')].map(c => c.parentElement.textContent.trim()),
    createdAt: new Date(),
    status: "WAIT FOR REVIEW"
  };

  try {
    console.log("payload:", payload);
    const res = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (res.ok) {
      window.location.href = "registration-success.html";
    } else {
      alert("Error: " + result.message);
    }
  } catch (err) {
    alert("Server error");
    console.error(err);
  }
});



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

function handleSubmit() {
  const data = {
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    middleName: document.getElementById("middleName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || "",
    experience: document.getElementById("experience").value,
    education: document.getElementById("education").value,
    directions: Array.from(document.querySelectorAll('.work-direction input[type="checkbox"]:checked')).map(cb => cb.parentElement.textContent.trim()),
    directionOther: document.getElementById("directionOther")?.value || "",
    topics: Array.from(document.querySelectorAll('.work-topics input[type="checkbox"]:checked')).map(cb => cb.parentElement.textContent.trim()),
  };

  localStorage.setItem("userProfile", JSON.stringify(data));
  window.location.href = "profile.html";
}

window.addEventListener("DOMContentLoaded", () => {
  const profileData = JSON.parse(localStorage.getItem("userProfile"));
  if (profileData) {
    document.getElementById("profileFirstName").textContent = profileData.firstName || "";
    document.getElementById("profileLastName").textContent = profileData.lastName || "";
    document.getElementById("profileMiddleName").textContent = profileData.middleName || "";
    document.getElementById("profileEmail").textContent = profileData.email || "";
    document.getElementById("profilePhone").textContent = profileData.phone || "";
    document.getElementById("profileGender").textContent = profileData.gender || "";
    document.getElementById("profileExperience").textContent = profileData.experience || "";
    document.getElementById("profileEducation").textContent = profileData.education || "";
    document.getElementById("profileDirections").textContent = (profileData.directions || []).join(", ") + (profileData.directionOther ? ", " + profileData.directionOther : "");
    document.getElementById("profileTopics").textContent = (profileData.topics || []).join(", ");
  }
});




function editField(fieldId) {
  const span = document.getElementById(fieldId);
  const currentValue = span.textContent;
  
  // Create input
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentValue;
  input.className = "edit-input";
  
  // Replace span with input
  span.replaceWith(input);
  input.focus();

  // Save on blur or Enter
  input.addEventListener("blur", saveEdit);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") input.blur();
  });

  function saveEdit() {
    const newValue = input.value;
    
    // Update span
    span.textContent = newValue;
    input.replaceWith(span);

    // Save to localStorage
    const profileData = JSON.parse(localStorage.getItem("userProfile")) || {};
    const keyMap = {
      profileFirstName: "firstName",
      profileLastName: "lastName",
      profileMiddleName: "middleName",
      profileEmail: "email",
      profilePhone: "phone",
      profileGender: "gender",
    };
    const fieldKey = keyMap[fieldId];
    if (fieldKey) {
      profileData[fieldKey] = newValue;
      localStorage.setItem("userProfile", JSON.stringify(profileData));
    }
  }
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


function previewPhoto(event) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = document.getElementById("profilePhoto");
    img.src = reader.result;
  };
  reader.readAsDataURL(event.target.files[0]);
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
