document.addEventListener("DOMContentLoaded", () => {
  const popup = document.querySelector(".sidebar-mobile-popup");
  const openBtn = document.querySelector(".filter-btn");
  const closeBtn = document.querySelector(".filter-btn-close");

  if (!popup || !openBtn) return;

  const setOpen = (open) => {
    popup.classList.toggle("is-open", open);
    openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    popup.setAttribute("aria-hidden", open ? "false" : "true");
  };

  openBtn.setAttribute("role", "button");
  openBtn.setAttribute("aria-controls", "filterForm");
  openBtn.setAttribute("aria-expanded", "false");
  popup.setAttribute("aria-hidden", "true");

  openBtn.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(true);
  });

  closeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(false);
  });

  popup.addEventListener("click", (event) => {
    if (event.target === popup) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
});
