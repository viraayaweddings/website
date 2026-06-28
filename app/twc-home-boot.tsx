"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TwcHomeBoot() {
  const pathname = usePathname();

  useEffect(() => {
    const legacyHomepage = Boolean(document.querySelector("#home-page-revamp"));
    const sharedCleanup = setupSharedHeader();
    const cityPopupCleanup = setupCityPopupRemoval();

    if (!legacyHomepage) {
      return () => {
        cityPopupCleanup();
        sharedCleanup();
      };
    }

    const existing = document.querySelector('script[data-twc-home="1"]');
    if (existing) {
      return () => {
        cityPopupCleanup();
        sharedCleanup();
      };
    }

    const script = document.createElement("script");
    script.src = "/twc-home.js?v=13";
    script.defer = true;
    script.dataset.twcHome = "1";
    document.body.appendChild(script);

    return () => {
      cityPopupCleanup();
      sharedCleanup();
    };
  }, [pathname]);

  return null;
}

function setupCityPopupRemoval() {
  const popupMarkers = [
    "Get wedding services curated for your city",
    "Use my current location"
  ];

  const unlockBody = () => {
    document.body.classList.remove("twc-modal-open");
    document.body.classList.remove("block-scroll");
    document.body.style.overflow = "";
  };

  const findPopupShell = (element: Element) => {
    let current: Element | null = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const className = typeof current.className === "string" ? current.className : "";
      const id = current.id || "";
      if (
        current.getAttribute("role") === "dialog" ||
        current.getAttribute("aria-modal") === "true" ||
        /modal|dialog|portal/i.test(`${className} ${id}`) ||
        (style.position === "fixed" && Number(style.zIndex || 0) >= 20)
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return element.parentElement || element;
  };

  const removeCityPopup = () => {
    document.querySelectorAll<HTMLElement>("#portal, #modal-wrapper, #modal-content, #drawer-portal").forEach((element) => {
      const text = element.textContent || "";
      if (popupMarkers.some((marker) => text.includes(marker))) element.remove();
    });

    const matches = Array.from(document.body.querySelectorAll("*")).filter((element) => {
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return false;
      const text = element.textContent || "";
      return popupMarkers.some((marker) => text.includes(marker));
    });

    matches.forEach((element) => findPopupShell(element)?.remove());

    document.querySelectorAll<HTMLElement>("body > div, body > section").forEach((element) => {
      const text = element.textContent || "";
      if (popupMarkers.some((marker) => text.includes(marker))) element.remove();
    });

    if (matches.length) unlockBody();
    if (document.body.classList.contains("twc-modal-open") || document.body.classList.contains("block-scroll")) {
      unlockBody();
    }
  };

  removeCityPopup();
  [100, 400, 1000, 2500, 5000].forEach((delay) => window.setTimeout(removeCityPopup, delay));
  const interval = window.setInterval(removeCityPopup, 250);
  window.setTimeout(() => window.clearInterval(interval), 10000);

  const observer = new MutationObserver(removeCityPopup);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    window.clearInterval(interval);
    observer.disconnect();
    unlockBody();
  };
}

function setupSharedHeader() {
  const cleanups: Array<() => void> = [];

  const trigger = document.querySelector<HTMLElement>("#other_services_dropdown_container");
  if (trigger && trigger.dataset.twcDropdownReady !== "1") {
    let menu = trigger.querySelector<HTMLElement>(".twc-more-menu");
    let createdMoreMenu = false;

    if (!menu) {
      menu = document.createElement("div");
      menu.className = "twc-more-menu";
      menu.setAttribute("role", "menu");
      menu.innerHTML = `
        <a href="/wedding-ideas" role="menuitem">Wedding Ideas</a>
        <a href="/wedding-photography" role="menuitem">Wedding Photographers</a>
        <a href="/wedding-decorators" role="menuitem">Wedding Decorators</a>
        <a href="/wedding-services" role="menuitem">Wedding Services</a>
        <a href="/wedding-invitation-card" role="menuitem">Wedding Invitation Card</a>
      `;
      trigger.appendChild(menu);
      createdMoreMenu = true;
    }

    let closeTimer: number | undefined;
    const clearCloseTimer = () => {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    };
    const open = () => {
      clearCloseTimer();
      trigger.classList.add("twc-more-open");
    };
    const close = () => {
      clearCloseTimer();
      trigger.classList.remove("twc-more-open");
    };
    const scheduleClose = () => {
      clearCloseTimer();
      closeTimer = window.setTimeout(close, 180);
    };
    const toggle = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(".twc-more-menu")) return;
      event.preventDefault();
      clearCloseTimer();
      trigger.classList.toggle("twc-more-open");
    };
    const closeFromOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && trigger.contains(event.target)) return;
      close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    trigger.addEventListener("pointerenter", open);
    trigger.addEventListener("pointerleave", scheduleClose);
    trigger.addEventListener("click", toggle);
    document.addEventListener("click", closeFromOutside);
    document.addEventListener("keydown", closeOnEscape);
    trigger.dataset.twcDropdownReady = "1";
    cleanups.push(() => {
      close();
      trigger.removeEventListener("pointerenter", open);
      trigger.removeEventListener("pointerleave", scheduleClose);
      trigger.removeEventListener("click", toggle);
      document.removeEventListener("click", closeFromOutside);
      document.removeEventListener("keydown", closeOnEscape);
      delete trigger.dataset.twcDropdownReady;
      if (createdMoreMenu) menu.remove();
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
