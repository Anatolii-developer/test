function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  console.log("Username:", username);
  console.log("Password:", password);

  alert("Login clicked (this is a placeholder)");
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

document.getElementById("saveBtn").addEventListener("click", function () {
  const data = {
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    middleName: document.getElementById("middleName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || "",

    experience: document.getElementById("experience").value,
    education: document.getElementById("education").value,

    directions: Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked'))
      .filter(cb => cb.closest('[for="directions"]') || true) // adjust if needed
      .map(cb => cb.parentElement.innerText.trim())
      .join(', '),

    topics: Array.from(document.querySelectorAll('#topicsGroup input[type="checkbox"]:checked'))
      .map(cb => cb.parentElement.innerText.trim())
      .join(', ')
  };

  localStorage.setItem("userProfile", JSON.stringify(data));
  window.location.href = "profile.html";
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

