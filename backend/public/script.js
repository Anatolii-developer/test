async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("https://psychologist-backend.onrender.com/api/users/login", {
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



  function togglePassword() {
    const passwordInput = document.getElementById("password");
    const toggleIcon = passwordInput.nextElementSibling;

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleIcon.src = "assets/icon-eye-open.svg"; // если хочешь поменять иконку
    } else {
      passwordInput.type = "password";
      toggleIcon.src = "assets/icon-eye-close.svg"; // вернуть обычную
    }
  }




document.getElementById("saveBtn").addEventListener("click", async () => {
  const payload = {
    username: document.getElementById("username")?.value || "",
    password: document.getElementById("password")?.value || "",
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
    topics: [...document.querySelectorAll('#extra-checkboxes input[type="checkbox"]:checked')].map(c => c.parentElement.textContent.trim()),
    createdAt: new Date(),
    status: "WAIT FOR REVIEW"
  };

  try {
    const res = await fetch("https://psychologist-backend.onrender.com/api/users/register", {
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
