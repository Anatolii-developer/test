document.addEventListener("DOMContentLoaded", async () => {
  if (typeof Forum === "undefined") {
    console.error("Forum is not defined!");
    return;
  }

  await Forum.init();
  await Forum.applyAvatars();

  const me = Forum.getUser() || {};
  document.getElementById("loginName").textContent =
    Forum.getDisplayName() || me.email || "—";
  document.getElementById("loginRole").textContent =
    Forum.getDisplayRoles().join(", ") || "—";

  const btnCreate = document.getElementById("btnNewThread");
  if (!Forum.can("post:create")) btnCreate.style.display = "none";

  async function load() {
    const q = document.getElementById("q").value.trim();
    const threads = await Forum.api.listThreads({ q });
    Forum.renderThreadList("#list", threads, "#empty");
  }

  btnCreate.addEventListener("click", async () => {
    const title = prompt("Заголовок теми:");
    if (!title) return;
    const content = prompt("Перший пост:") || "";
    const t = await Forum.api.createThread({ title, content });
    location.href = `./thread.html?id=${t._id}`;
  });

  await load();

  // Floating Modal
  const modal = document.getElementById("adminMsgModal");
  const openBtn = document.getElementById("btnContactAdmin");
  const closeBtn = document.getElementById("closeAdminMsg");

  openBtn.onclick = () => modal.style.display = "flex";
  closeBtn.onclick = () => modal.style.display = "none";

  modal.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  document.getElementById("sendAdminMsg").onclick = async () => {
    const text = adminMsgText.value.trim();
    if (!text) return alert("Введіть текст повідомлення");

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });

    alert("Надіслано!");
    modal.style.display = "none";
    adminMsgText.value = "";
  };
});
