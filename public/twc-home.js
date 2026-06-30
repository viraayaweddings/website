(function () {
  const revealSelectors = [
    "main > section",
    "#book_venues_section",
    "#industry_partners_section",
    "#wedding_proposals_section",
    "#explore_wedding_ideas_section",
    "#why_are_we_better_section",
    "#frequently_asked_questions_section",
    "#are_you_a_vendor_section",
    "#more_about_betterhalf_section",
    "#footer_section"
  ];

  const heroSlides = [
    {
      couple: "Anjali & Apurav",
      location: "Goa",
      date: "May '25",
      poster:
        "/gcpimages/weddings/d0e26332-36c0-4d65-b839-b18d17c0494e/admin_uploads/d2bfa004-e6c1-41e5-830e-16ce72835de5_thumbnail.jpg",
      mobile: "/gcpimages/weddings/assets/goa-new-ph-potrait.mp4#t=0.01",
      desktop: "/gcpimages/weddings/assets/goa-new-ph.mp4#t=0.01"
    },
    {
      couple: "Ishita & Shubh",
      location: "Bangalore",
      date: "Apr '24",
      poster:
        "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp",
      mobile: "/gcpimages/weddings/assets/hero-2-mobile.mp4#t=0.01",
      desktop: "/gcpimages/weddings/assets/hero-2-desktop.mp4#t=0.01"
    },
    {
      couple: "Shivika & Ashish",
      location: "Udaipur",
      date: "Feb '25",
      poster:
        "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp",
      mobile: "/gcpimages/weddings/assets/hero-3-mobile.mp4#t=0.01",
      desktop: "/gcpimages/weddings/assets/hero-3-desktop.mp4#t=0.01"
    },
    {
      couple: "Ishita & Akshay",
      location: "Jaipur",
      date: "Feb '25",
      poster:
        "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp",
      mobile: "/gcpimages/weddings/assets/hero-4-mobile.mp4#t=0.01",
      desktop: "/gcpimages/weddings/assets/hero-4-desktop.mp4#t=0.01"
    },
    {
      couple: "Chitwan & Abhitendra",
      location: "Delhi",
      date: "Dec '24",
      poster:
        "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp",
      mobile: "/gcpimages/weddings/assets/hero-5-mobile.mp4#t=0.01",
      desktop: "/gcpimages/weddings/assets/hero-5-desktop.mp4#t=0.01"
    }
  ];

  const cleanups = [];

  function setupMobileMenu() {
    if (document.querySelector(".twc-mobile-menu")) {
      return () => {};
    }

    const overlay = document.createElement("div");
    overlay.className = "twc-mobile-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const menu = document.createElement("aside");
    menu.className = "twc-mobile-menu";
    menu.innerHTML = `
      <div class="twc-mobile-menu-header">
        <img class="twc-mobile-menu-logo" src="/brand/viraaya-logo-header.png" alt="Viraaya Weddings logo" />
        <button type="button" aria-label="Close menu">x</button>
      </div>
      <nav>
        <a href="/">Home</a>
        <a href="/wedding-venues">Wedding Venues</a>
        <a href="/price-beat-challenge">Price Beat Challenge</a>
        <a href="/wedding-ideas">Wedding Ideas</a>
        <a href="/wedding-photographers">Wedding Photographers</a>
        <a href="/wedding-decorators">Wedding Decorators</a>
        <a href="/wedding-services">Wedding Services</a>
      </nav>
      <div class="twc-mobile-menu-actions">
        <a href="https://wa.me/918130222141">Whatsapp</a>
        <button type="button" data-scroll-planning>Get free Quote</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

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

    overlay.addEventListener("click", close);
    menu.querySelector('button[aria-label="Close menu"]')?.addEventListener("click", close);
    menu.querySelector("[data-scroll-planning]")?.addEventListener("click", () => {
      close();
      document
        .querySelector("#end_to_end_services_section")
        ?.scrollIntoView({ behavior: "smooth" });
    });

    const navButton = document.querySelector("main > div:first-child button.lg\\:hidden");
    navButton?.addEventListener("click", open);

    return () => {
      navButton?.removeEventListener("click", open);
      overlay.remove();
      menu.remove();
      document.body.style.overflow = "";
    };
  }

  function revealVisibleNow() {
    document.querySelectorAll(".twc-reveal:not(.twc-reveal-visible)").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight * 1.05) {
        element.classList.add("twc-reveal-visible");
      }
    });
  }

  function setupHowItWorksImages() {
    const section = document.querySelector("#how_it_works_outer_section");
    if (!section) {
      return () => {};
    }

    section.querySelectorAll("div").forEach((container) => {
      if (!String(container.className).includes("overflow-hidden")) {
        return;
      }

      const images = [...container.querySelectorAll('img[src*="weddingStep"]')];
      if (images.length < 2 || container.querySelector(".twc-how-images-track")) {
        return;
      }

      const track = document.createElement("div");
      track.className = "twc-how-images-track";
      images.forEach((image) => track.appendChild(image));
      container.appendChild(track);
    });

    return () => {};
  }

  function setupCityIconHovers() {
    const icons = document.querySelectorAll(
      '#venues_in_different_cities_section [id^="hp-"][id$="-icon"]'
    );

    icons.forEach((icon) => {
      const onEnter = () => {
        icon.style.transform = "scale(1.06) translateZ(0)";
        icon.style.transition = "transform 220ms ease";
      };
      const onLeave = () => {
        icon.style.transform = "";
      };
      icon.addEventListener("mouseenter", onEnter);
      icon.addEventListener("mouseleave", onLeave);
    });

    return () => {
      icons.forEach((icon) => {
        icon.replaceWith(icon.cloneNode(true));
      });
    };
  }

  function setupRevealAnimations() {
    const elements = new Set();

    revealSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (element.id === "how_it_works_outer_section") {
          return;
        }

        element.classList.add("twc-reveal");
        elements.add(element);

        Array.from(element.children)
          .slice(0, 8)
          .forEach((child, index) => {
            const cls = String(child.className || "");
            const isCornerDecor =
              child.classList?.contains("absolute") &&
              (cls.includes("bottom-4") ||
                cls.includes("top-1.5") ||
                child.tagName === "svg" ||
                child.tagName === "SVG");
            if (isCornerDecor) {
              return;
            }

            child.classList.add("twc-reveal-child");
            child.style.setProperty("--twc-delay", `${Math.min(index * 70, 420)}ms`);
          });
      });
    });

    document
      .querySelectorAll(
        "#why_are_we_better_section li, #why_are_we_better_section article, #venues_in_different_cities_section a, #industry_partners_section img"
      )
      .forEach((element, index) => {
        element.classList.add("twc-reveal", "twc-reveal-small");
        element.style.setProperty("--twc-delay", `${Math.min(index * 45, 360)}ms`);
        elements.add(element);
      });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("twc-reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );

    elements.forEach((element) => observer.observe(element));
    revealVisibleNow();

    return () => observer.disconnect();
  }

  function setupFaqAccordion() {
    const buttons = Array.from(document.querySelectorAll("[data-szh-adn-btn]"));

    return buttons.map((button) => {
      const item = button.closest(".szh-accordion__item");
      const content = item?.querySelector(".szh-accordion__item-content");
      const icon = button.querySelector("svg");

      if (!item || !content) {
        return () => {};
      }

      const setOpen = (open) => {
        button.setAttribute("aria-expanded", String(open));
        item.classList.toggle("szh-accordion__item--status-entered", open);
        item.classList.toggle("szh-accordion__item--status-exited", !open);
        content.style.display = open ? "block" : "none";
        content.style.height = open ? `${content.scrollHeight}px` : "0px";
        if (icon) {
          icon.style.transform = open ? "rotate(180deg)" : "";
        }
      };

      const onClick = () => {
        const open = button.getAttribute("aria-expanded") === "true";
        buttons.forEach((otherButton) => {
          if (otherButton !== button) {
            otherButton.dispatchEvent(new CustomEvent("twc-close-faq"));
          }
        });
        setOpen(!open);
      };

      const onClose = () => setOpen(false);

      setOpen(button.getAttribute("aria-expanded") === "true");
      button.addEventListener("click", onClick);
      button.addEventListener("twc-close-faq", onClose);

      return () => {
        button.removeEventListener("click", onClick);
        button.removeEventListener("twc-close-faq", onClose);
      };
    });
  }

  function setupHeroSliders() {
    const heroSliders = Array.from(
      document.querySelectorAll("#home-page-revamp .keen-slider")
    ).filter((slider) => !slider.classList.contains("keen-slider__slide"));

    const slider =
      heroSliders.find((element) => element.getClientRects().length > 0) ?? heroSliders[0];

    if (!slider) {
      return [];
    }

    const slides = Array.from(slider.querySelectorAll(".keen-slider__slide")).slice(
      0,
      heroSlides.length
    );

    if (slides.length !== heroSlides.length) {
      return [];
    }

    slider.classList.add("twc-hero-slider");
    slides.forEach((slide) => slide.classList.add("twc-hero-slide"));

    const hero = slider.closest("#home-page-revamp > div");
    const labelParts = hero
      ?.querySelector('[class*="bottom-0"][class*="left-0"][class*="right-0"]')
      ?.querySelectorAll("p");
    const dotContainer = hero?.querySelector('[class*="left-2"]');

    const getVideoSrc = (item) =>
      window.matchMedia("(max-width: 768px)").matches ? item.mobile : item.desktop;

    const syncVideoSource = (index) => {
      const video = slides[index]?.querySelector("video");
      const item = heroSlides[index];
      if (!video || !item) {
        return;
      }

      const source = getVideoSrc(item);
      if (video.dataset.twcSrc !== source) {
        video.dataset.twcSrc = source;
        video.src = source;
        video.load();
      }
    };

    heroSlides.forEach((item, index) => {
      slides[index].innerHTML = `<video class="h-full w-full object-cover" playsinline muted loop preload="metadata" poster="${item.poster}"></video>`;
    });

    if (dotContainer) {
      dotContainer.innerHTML = heroSlides
        .map(
          (_, index) =>
            `<button type="button" aria-label="Show wedding ${index + 1}" class="twc-hero-dot"></button>`
        )
        .join("");
    }

    const dots = Array.from(dotContainer?.querySelectorAll(".twc-hero-dot") ?? []);
    let active = 0;
    let timer = 0;

    const showSlide = (nextIndex) => {
      active = nextIndex;
      syncVideoSource(active);
      slides.forEach((slide, index) => {
        slide.classList.toggle("twc-hero-active", index === active);
        slide.style.display = "flex";
        slide.style.opacity = index === active ? "1" : "0";
        slide.style.pointerEvents = index === active ? "auto" : "none";
        slide.style.transform = "translate3d(0, 0, 0)";

        const video = slide.querySelector("video");
        if (index === active) {
          if (video) {
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.preload = "metadata";
            video.playsInline = true;
            void video.play().catch(() => {});
          }
        } else {
          video?.pause();
        }
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle("twc-hero-dot-active", index === active);
      });

      if (labelParts?.length === 3) {
        labelParts[0].textContent = heroSlides[active].couple;
        labelParts[1].textContent = heroSlides[active].location;
        labelParts[2].textContent = heroSlides[active].date;
      }
    };

    const restartTimer = () => {
      window.clearInterval(timer);
      timer = window.setInterval(
        () => showSlide((active + 1) % slides.length),
        6500
      );
    };

    const dotCleanups = dots.map((dot, index) => {
      const onClick = () => {
        showSlide(index);
        restartTimer();
      };
      dot.addEventListener("click", onClick);
      return () => dot.removeEventListener("click", onClick);
    });

    showSlide(0);
    restartTimer();

    const onResize = () => syncVideoSource(active);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
      dotCleanups.forEach((cleanup) => cleanup());
    };
  }

  function setupPartnerSlider() {
    const slider = document.querySelector("#industry_partners_section .keen-slider");
    if (!slider) {
      return () => {};
    }

    slider.classList.add("twc-partner-track");
    const originals = Array.from(slider.children);
    originals.forEach((slide) => slide.classList.add("twc-partner-slide"));

    originals.forEach((slide) => {
      slider.appendChild(slide.cloneNode(true));
    });

    return () => {
      slider.classList.remove("twc-partner-track");
      Array.from(slider.children).forEach((slide) => {
        slide.classList.remove("twc-partner-slide");
      });
    };
  }

  function setupProposalCarousel() {
    const section = document.querySelector("#wedding_proposals_section");
    const slider = section?.querySelector(".keen-slider");
    if (!section || !slider) {
      return () => {};
    }

    const row = slider.parentElement;
    const navs = row ? Array.from(row.querySelectorAll("div.cursor-pointer")) : [];
    const prev = navs[0];
    const next = navs[navs.length - 1];
    const slides = Array.from(slider.querySelectorAll(".keen-slider__slide"));

    if (!slides.length) {
      return () => {};
    }

    if (row) {
      row.classList.add("twc-proposal-ready");
    }

    section.classList.add("twc-proposal-ready");
    slider.classList.add("twc-proposal-slider");

    const getSlideWidth = () => slider.getBoundingClientRect().width || 1;

    const syncSlideSizes = () => {
      const width = getSlideWidth();
      slides.forEach((slide) => {
        slide.classList.add("twc-proposal-slide");
        slide.style.flex = `0 0 ${width}px`;
        slide.style.minWidth = `${width}px`;
        slide.style.maxWidth = `${width}px`;
        slide.style.width = `${width}px`;
      });
    };

    let active = Math.min(2, slides.length - 1);
    let timer = 0;
    let visible = false;

    const render = () => {
      const offset = active * getSlideWidth();
      slider.style.transform = "none";
      slides.forEach((slide) => {
        slide.style.transform = `translate3d(-${offset}px, 0px, 0px)`;
      });
    };

    const onResize = () => {
      syncSlideSizes();
      render();
    };

    window.addEventListener("resize", onResize);
    syncSlideSizes();

    const go = (index) => {
      active = (index + slides.length) % slides.length;
      render();
    };

    const restartTimer = () => {
      window.clearInterval(timer);
      if (!visible) {
        return;
      }
      timer = window.setInterval(() => go(active + 1), 5000);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          restartTimer();
        } else {
          window.clearInterval(timer);
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(section);

    const onPrev = () => {
      go(active - 1);
      restartTimer();
    };
    const onNext = () => {
      go(active + 1);
      restartTimer();
    };

    prev?.addEventListener("click", onPrev);
    next?.addEventListener("click", onNext);

    go(active);
    restartTimer();

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
      prev?.removeEventListener("click", onPrev);
      next?.removeEventListener("click", onNext);
      section.classList.remove("twc-proposal-ready");
      slider.classList.remove("twc-proposal-slider");
      slider.style.transform = "";
      slides.forEach((slide) => {
        slide.classList.remove("twc-proposal-slide");
        slide.style.transform = "";
        slide.style.flex = "";
        slide.style.minWidth = "";
        slide.style.maxWidth = "";
        slide.style.width = "";
      });
    };
  }

  function setupWeddingIdeasImages() {
    const section = document.querySelector("#explore_wedding_ideas_section");
    if (!section) {
      return () => {};
    }

    const localIdeaImages = [
      "/twc-assets/ideabook/lehenga.webp",
      "/twc-assets/ideabook/decor.webp",
      "/twc-assets/ideabook/makeup.webp",
      "/twc-assets/ideabook/mehendi.webp",
      "/twc-assets/ideabook/hairstyles.webp",
      "/twc-assets/ideabook/photography.webp"
    ];

    const row = section.querySelector(".no-scrollbar");
    const ideaImages = row
      ? Array.from(row.querySelectorAll("img")).filter((image) => !image.closest("#hp-wedding-ideas"))
      : [];

    ideaImages.slice(0, localIdeaImages.length).forEach((image, index) => {
      image.src = localIdeaImages[index];
      image.removeAttribute("srcset");
      image.loading = "lazy";
      image.decoding = "async";
    });

    return () => {};
  }

  function setupMoreDropdown() {
    const trigger = document.querySelector("#twc-homepage-shared-header #other_services_dropdown_container");
    if (!trigger || trigger.dataset.twcDropdownReady === "1") {
      return () => {};
    }

    let menu = trigger.querySelector(".twc-more-menu");
    let createdMoreMenu = false;

    if (!menu) {
      menu = document.createElement("div");
      menu.className = "twc-more-menu";
      menu.innerHTML = `
        <a href="/wedding-ideas">Wedding Ideas</a>
        <a href="/wedding-photographers">Wedding Photographers</a>
        <a href="/wedding-decorators">Wedding Decorators</a>
        <a href="/wedding-services">Wedding Services</a>
        <a href="/wedding-invitation-card">Wedding Invitation Card</a>
      `;
      trigger.appendChild(menu);
      createdMoreMenu = true;
    }

    const open = () => trigger.classList.add("twc-more-open");
    const close = () => trigger.classList.remove("twc-more-open");
    const toggle = () => trigger.classList.toggle("twc-more-open");

    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", close);
    trigger.addEventListener("pointerenter", open);
    trigger.addEventListener("pointerleave", close);
    trigger.addEventListener("focusin", open);
    trigger.addEventListener("focusout", close);
    trigger.addEventListener("click", toggle);
    trigger.dataset.twcDropdownReady = "1";

    return () => {
      close();
      trigger.removeEventListener("mouseenter", open);
      trigger.removeEventListener("mouseleave", close);
      trigger.removeEventListener("pointerenter", open);
      trigger.removeEventListener("pointerleave", close);
      trigger.removeEventListener("focusin", open);
      trigger.removeEventListener("focusout", close);
      trigger.removeEventListener("click", toggle);
      delete trigger.dataset.twcDropdownReady;
      if (createdMoreMenu) menu.remove();
    };
  }

  function setupTagembedWidgets() {
    document.querySelectorAll(".tagembed-widget").forEach((widget) => {
      widget.setAttribute("aria-hidden", "true");
    });
    return () => {};
  }

  function updateHowItWorks() {
    const section = document.querySelector("#how_it_works_outer_section");
    if (!section) {
      return;
    }

    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(-rect.top / scrollable, 0), 0.999);
    const activeIndex = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;

    const stepTitles = [
      "Share your requirements",
      "Get a personalised proposal",
      "Confirm and book"
    ];

    const stepBlocks = stepTitles
      .map((title) =>
        Array.from(section.querySelectorAll("p"))
          .find((element) => element.textContent?.includes(title))
          ?.closest("div.relative")
      )
      .filter(Boolean);

    const images = Array.from(section.querySelectorAll('img[src*="weddingStep"]'));
    const track = section.querySelector(".twc-how-images-track");

    if (track) {
      track.style.transform = `translateY(-${activeIndex * 100}%) translateZ(0)`;
    } else {
      images.forEach((image) => {
        image.classList.add("twc-how-image");
        image.style.opacity = "1";
        image.style.transform = `translateY(-${activeIndex * 100}%) translateZ(0)`;
      });
    }

    stepBlocks.forEach((block, index) => {
      const isActive = index === activeIndex;
      block.classList.toggle("twc-how-step-active", isActive);
      block.classList.toggle("twc-how-step-muted", !isActive);

      if (isActive) {
        block.classList.add("pb-8", "lg:pb-12");
      } else {
        block.classList.remove("pb-8", "lg:pb-12");
      }

      const paragraphs = Array.from(block.querySelectorAll("p"));
      const children = Array.from(block.children);
      const title = paragraphs.find((paragraph) =>
        paragraph.textContent?.includes(stepTitles[index])
      );
      const description = title ? paragraphs[paragraphs.indexOf(title) + 1] : undefined;
      const number = children.find((child) => child.textContent?.trim() === String(index + 1));
      const haloClass =
        "twc-how-step-halo absolute left-0 top-0 -z-10 h-7 w-7 rounded-full bg-TWCPrimaryTheme/30 lg:h-9 lg:w-9";

      if (title) {
        title.className = isActive
          ? "transition-all duration-500 ease-in-out mb-2 font-playfair text-xl font-semibold text-neutral-900 lg:mb-5 lg:text-[40px] lg:leading-10"
          : "transition-all duration-500 ease-in-out text-sm font-semibold text-secondary lg:text-xl";
      }
      if (description) {
        description.className = isActive
          ? "text-base text-primaryTextColor transition-opacity duration-300 ease-linear lg:w-3/4 lg:text-xl opacity-100"
          : "text-base text-primaryTextColor transition-opacity duration-300 ease-linear lg:w-3/4 lg:text-xl opacity-0";
      }
      if (number) {
        number.className = isActive
          ? "absolute left-0 top-0 z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-[background-color,color] duration-300 ease-linear lg:h-9 lg:w-9 lg:text-xl bg-TWCPrimaryTheme text-white"
          : "absolute left-0 top-0 z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-[background-color,color] duration-300 ease-linear lg:h-9 lg:w-9 lg:text-xl bg-footerGrey text-disabledColor";
        number.style.transform = "translateX(-18px) translateZ(0)";

        const existingHalo = children.find((child) => child.classList.contains("twc-how-step-halo"));
        const legacyHalo = children.find(
          (child) => child !== number && child.textContent?.trim() === "" && child.classList.contains("rounded-full")
        );

        if (isActive) {
          const halo = existingHalo || legacyHalo || document.createElement("div");
          halo.className = haloClass;
          halo.style.transform = "translateX(-18px) scale(1.4) translateZ(0)";
          if (!halo.parentElement) {
            block.appendChild(halo);
          }
        } else {
          existingHalo?.remove();
          if (legacyHalo?.classList.contains("twc-how-step-halo")) {
            legacyHalo.remove();
          }
        }
      }
    });
  }

  function updateBookVenueReveal() {
    const section = document.querySelector("#book_venues_section");
    if (!section) {
      return;
    }

    const rect = section.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const progress = Math.min(
      Math.max((viewHeight * 0.65 - rect.top) / (section.offsetHeight + viewHeight * 0.35), 0),
      1
    );
    const eased = 1 - Math.pow(1 - progress, 2);
    const start = window.innerWidth >= 768 ? 400 : 260;
    const finish = Math.hypot(window.innerWidth, window.innerHeight) * 1.35;
    const size = start + (finish - start) * eased;

    section.style.maskSize = `${size}px ${size}px`;
    section.style.webkitMaskSize = `${size}px ${size}px`;
  }

  function init() {
    if (window.__twcHomeInitialized) {
      return;
    }
    window.__twcHomeInitialized = true;

    document.documentElement.classList.add("twc-js");

    const stickyCta = document.querySelector("#wpt-sticky-cta-homepage-desktop")?.parentElement;

    const onScroll = () => {
      if (stickyCta) {
        const shouldShow = window.scrollY > window.innerHeight * 0.75;
        stickyCta.style.transform = shouldShow
          ? "translateY(0) translateZ(0)"
          : "translateY(100%) translateZ(0)";
        stickyCta.style.transition = "transform 200ms ease";
      }

      revealVisibleNow();
      updateHowItWorks();
      updateBookVenueReveal();
    };

    document
      .querySelectorAll(
        "#mobile-go-to-planning-section, #desktop-go-to-planning-section, #wpt-sticky-cta-homepage-desktop"
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          document
            .querySelector("#end_to_end_services_section, #home-page-revamp")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

    cleanups.push(setupMobileMenu());
    cleanups.push(setupHowItWorksImages());
    cleanups.push(setupRevealAnimations());
    cleanups.push(...setupFaqAccordion());
    const heroCleanup = setupHeroSliders();
    if (typeof heroCleanup === "function") {
      cleanups.push(heroCleanup);
    }
    cleanups.push(setupPartnerSlider());
    cleanups.push(setupCityIconHovers());
    cleanups.push(setupMoreDropdown());
    cleanups.push(setupTagembedWidgets());
    cleanups.push(setupProposalCarousel());
    cleanups.push(setupWeddingIdeasImages());

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    updateHowItWorks();
    revealVisibleNow();
  }

  function boot() {
    init();
  }

  // Loaded after React hydration via app/twc-home-boot.tsx
  boot();
})();
