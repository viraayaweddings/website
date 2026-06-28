"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TwcHomeBoot() {
  const pathname = usePathname();

  useEffect(() => {
    const legacyHomepage = Boolean(document.querySelector("#home-page-revamp"));
    const sharedCleanup = setupSharedHeader();

    if (!legacyHomepage) {
      return sharedCleanup;
    }

    const existing = document.querySelector('script[data-twc-home="1"]');
    if (existing) {
      return sharedCleanup;
    }

    const script = document.createElement("script");
    script.src = "/twc-home.js?v=13";
    script.defer = true;
    script.dataset.twcHome = "1";
    document.body.appendChild(script);

    return sharedCleanup;
  }, [pathname]);

  return null;
}

function setupSharedHeader() {
  const cleanups: Array<() => void> = [];

  const trigger = document.querySelector("#other_services_dropdown_container");
  if (trigger && !trigger.querySelector(".twc-more-menu")) {
    const menu = document.createElement("div");
    menu.className = "twc-more-menu";
    menu.innerHTML = `
      <a href="/wedding-ideas">Wedding Ideas</a>
      <a href="/wedding-photography">Wedding Photographers</a>
      <a href="/wedding-decorators">Wedding Decorators</a>
      <a href="/wedding-services">Wedding Services</a>
      <a href="/wedding-invitation-card">Wedding Invitation Card</a>
    `;
    trigger.appendChild(menu);

    const open = () => trigger.classList.add("twc-more-open");
    const close = () => trigger.classList.remove("twc-more-open");
    const toggle = () => trigger.classList.toggle("twc-more-open");

    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", close);
    trigger.addEventListener("click", toggle);
    cleanups.push(() => {
      trigger.removeEventListener("mouseenter", open);
      trigger.removeEventListener("mouseleave", close);
      trigger.removeEventListener("click", toggle);
      menu.remove();
    });
  }

  let overlay = document.querySelector<HTMLElement>(".twc-mobile-overlay");
  let menu = document.querySelector<HTMLElement>(".twc-mobile-menu");
  let createdMobileMenu = false;

  if (!overlay || !menu) {
    overlay?.remove();
    menu?.remove();

    overlay = document.createElement("div");
    overlay.className = "twc-mobile-overlay";
    overlay.setAttribute("aria-hidden", "true");

    menu = document.createElement("aside");
    menu.className = "twc-mobile-menu";
    menu.innerHTML = `
      <div class="twc-mobile-menu-header">
        <img class="twc-mobile-menu-logo" src="/brand/viraaya-logo-header.png" alt="Viraaya Weddings logo" />
        <button type="button" aria-label="Close menu">x</button>
      </div>
      <nav>
        <a href="/">Home</a>
        <a href="/wedding-venues">Wedding Venues</a>
        <a href="/wedding-ideas">Wedding Ideas</a>
        <a href="/wedding-photography">Wedding Photographers</a>
        <a href="/wedding-decorators">Wedding Decorators</a>
        <a href="/wedding-services">Wedding Services</a>
      </nav>
      <div class="twc-mobile-menu-actions">
        <a href="https://wa.me/918130222141">Whatsapp</a>
        <a href="/#end_to_end_services_section">Get free Quote</a>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);
    createdMobileMenu = true;
  }

  const close = () => {
    overlay.classList.remove("twc-mobile-overlay-open");
    menu.classList.remove("twc-mobile-menu-open");
    document.body.style.overflow = "";
  };

  const open = () => {
    overlay.classList.add("twc-mobile-overlay-open");
    menu.classList.add("twc-mobile-menu-open");
    document.body.style.overflow = "hidden";
  };

  const navButton = document.querySelector(
    "#twc-homepage-shared-header button.lg\\:hidden, main > div:first-child button.lg\\:hidden"
  );
  const closeButton = menu.querySelector('button[aria-label="Close menu"]');
  const menuLinks = Array.from(menu.querySelectorAll("a"));
  const closeFromMenuClick = (event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('.twc-mobile-menu button[aria-label="Close menu"]')
    ) {
      close();
    }
  };

  overlay.addEventListener("click", close);
  document.addEventListener("click", closeFromMenuClick, true);
  closeButton?.addEventListener("click", close);
  menuLinks.forEach((link) => link.addEventListener("click", close));
  navButton?.addEventListener("click", open);

  cleanups.push(() => {
    overlay.removeEventListener("click", close);
    document.removeEventListener("click", closeFromMenuClick, true);
    closeButton?.removeEventListener("click", close);
    menuLinks.forEach((link) => link.removeEventListener("click", close));
    navButton?.removeEventListener("click", open);
    if (createdMobileMenu) {
      overlay.remove();
      menu.remove();
    }
    document.body.style.overflow = "";
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
