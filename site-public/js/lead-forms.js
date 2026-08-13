(function () {
  var leadActions = new Set([
    "/api/lead",
    "/contact/save",
    "/blog-form-submit",
    "#",
    "",
  ]);
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var phonePattern = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/;

  function normalizeAction(form) {
    var action = form.getAttribute("action") || "";
    if (!action || action === "#") return action;
    try {
      return new URL(action, window.location.href).pathname;
    } catch (error) {
      return action;
    }
  }

  function isLeadForm(form) {
    var method = (form.getAttribute("method") || "GET").toUpperCase();
    if (method !== "POST") return false;
    if (form.matches("[data-no-lead-form]")) return false;
    return leadActions.has(normalizeAction(form));
  }

  function labelFor(control) {
    var label = control.id ? document.querySelector('label[for="' + CSS.escape(control.id) + '"]') : null;
    return (
      (label && label.textContent) ||
      control.getAttribute("aria-label") ||
      control.getAttribute("placeholder") ||
      control.name ||
      "this field"
    ).replace(/\*/g, "").trim();
  }

  function fieldKey(control) {
    return (control.name || control.id || labelFor(control)).replace(/\[\]$/, "");
  }

  function addStatus(form) {
    var existing = form.querySelector(".lead-form-status");
    if (existing) return existing;

    var status = document.createElement("div");
    status.className = "lead-form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.appendChild(status);
    return status;
  }

  function setStatus(form, message, type) {
    var status = addStatus(form);
    status.className = "lead-form-status lead-form-status--" + type;
    status.textContent = message || "";
  }

  function markInvalid(control, message) {
    control.classList.add("lead-field-invalid");
    control.setAttribute("aria-invalid", "true");
    control.dataset.leadError = message;
  }

  function clearInvalid(form) {
    form.querySelectorAll(".lead-field-invalid").forEach(function (control) {
      control.classList.remove("lead-field-invalid");
      control.removeAttribute("aria-invalid");
      delete control.dataset.leadError;
    });
  }

  function controlValue(control) {
    if (control.type === "checkbox" || control.type === "radio") {
      return control.checked ? control.value || "Yes" : "";
    }
    return (control.value || "").trim();
  }

  function validate(form) {
    clearInvalid(form);
    var errors = [];
    var controls = Array.from(form.elements).filter(function (control) {
      return control.name && !control.disabled && control.type !== "hidden" && control.type !== "submit" && control.type !== "button";
    });

    controls.forEach(function (control) {
      var value = controlValue(control);
      var label = labelFor(control);
      var key = fieldKey(control).toLowerCase();

      if (control.required && (!value || /^select\b/i.test(value))) {
        var requiredMessage = "Please enter " + label + ".";
        errors.push(requiredMessage);
        markInvalid(control, requiredMessage);
        return;
      }

      if (value && (control.type === "email" || key.indexOf("email") !== -1) && !emailPattern.test(value)) {
        var emailMessage = "Please enter a valid email address.";
        errors.push(emailMessage);
        markInvalid(control, emailMessage);
      }

      if (value && /(phone|mobile|number|tel)/i.test(key) && !phonePattern.test(value.replace(/\D/g, ""))) {
        var phoneMessage = "Please enter a valid 10-digit Indian mobile number.";
        errors.push(phoneMessage);
        markInvalid(control, phoneMessage);
      }

      if (value && /name/i.test(key) && value.length < 2) {
        var nameMessage = "Please enter a valid name.";
        errors.push(nameMessage);
        markInvalid(control, nameMessage);
      }
    });

    return errors;
  }

  function formTitle(form) {
    if (form.dataset.formName) return form.dataset.formName;
    if (form.id) {
      return form.id
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
    }
    return "Website Query";
  }

  function payload(form) {
    var fields = {};
    var requiredFields = [];
    var formData = new FormData(form);
    var pageUrl = window.location.href;

    formData.forEach(function (value, rawKey) {
      var key = rawKey.replace(/\[\]$/, "");
      if (key === "_token") return;
      var valueText = value instanceof File ? value.name : String(value).trim();
      if (!valueText) return;
      if (fields[key]) {
        fields[key] = Array.isArray(fields[key]) ? fields[key].concat(valueText) : [fields[key], valueText];
      } else {
        fields[key] = valueText;
      }
    });

    Array.from(form.elements).forEach(function (control) {
      if (control.name && control.required) requiredFields.push(fieldKey(control));
    });

    fields.source_page = fields.source_page || document.title;
    fields["Page URL"] = fields["Page URL"] || pageUrl;

    return {
      formId: form.id || normalizeAction(form) || "website-form",
      formName: formTitle(form),
      pageUrl: pageUrl,
      fields: fields,
      requiredFields: requiredFields,
      honeypot: fields.website || fields.company_website || "",
      metadata: {
        "Page Title": document.title,
        "Page URL": pageUrl,
        "Source Page": fields.source_page || "",
        "Submission Endpoint": normalizeAction(form),
        "Referrer": document.referrer || "",
        "Browser": navigator.userAgent,
        "Browser Language": navigator.language || "",
        "Browser Languages": navigator.languages ? navigator.languages.join(", ") : "",
        "Platform": navigator.platform || "",
        "Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        "Screen Size": window.screen ? window.screen.width + "x" + window.screen.height : "",
        "Viewport Size": window.innerWidth + "x" + window.innerHeight,
        "Color Depth": window.screen ? String(window.screen.colorDepth) : "",
        "Device Pixel Ratio": String(window.devicePixelRatio || 1),
        "Cookies Enabled": navigator.cookieEnabled ? "Yes" : "No",
        "Online": navigator.onLine ? "Yes" : "No",
      },
    };
  }

  function submitButton(form) {
    return form.querySelector('[type="submit"], button:not([type]), .btn[type="button"]');
  }

  async function submitLead(form) {
    var button = submitButton(form);
    var originalText = button ? button.textContent : "";
    var errors = validate(form);

    if (errors.length) {
      setStatus(form, errors[0], "error");
      var firstInvalid = form.querySelector(".lead-field-invalid");
      if (firstInvalid) firstInvalid.focus({ preventScroll: false });
      return;
    }

    if (button) {
      button.disabled = true;
      if (button.textContent.trim()) button.textContent = "Sending...";
    }
    setStatus(form, "Sending your enquiry...", "pending");

    try {
      var response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload(form)),
      });
      var data = await response.json().catch(function () { return {}; });

      if (!response.ok || data.ok === false) {
        var message = (data.errors && data.errors[0]) || data.message || "Could not send your enquiry right now.";
        setStatus(form, message, "error");
        return;
      }

      setStatus(form, data.message || "Thanks. We will get back to you shortly.", "success");
      form.reset();
    } catch (error) {
      setStatus(form, "Could not send your enquiry right now.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        if (originalText.trim()) button.textContent = originalText;
      }
    }
  }

  function fallbackBackdrop() {
    var backdrop = document.querySelector(".modal-backdrop[data-fallback-modal]");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    backdrop.setAttribute("data-fallback-modal", "true");
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function hideFallbackModal(modal) {
    if (!modal || modal.dataset.fallbackOpen !== "true") return;
    modal.classList.remove("show");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.removeAttribute("aria-modal");
    modal.removeAttribute("role");
    delete modal.dataset.fallbackOpen;

    var backdrop = document.querySelector(".modal-backdrop[data-fallback-modal]");
    if (backdrop) backdrop.remove();
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  }

  function showFallbackModal(modal) {
    if (!modal) return;
    fallbackBackdrop();
    modal.dataset.fallbackOpen = "true";
    modal.style.display = "block";
    modal.removeAttribute("aria-hidden");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("role", "dialog");
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    var focusTarget = modal.querySelector("input, select, textarea, button, a[href]");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  document.addEventListener("click", function (event) {
    if (window.bootstrap && window.bootstrap.Modal) return;

    var trigger = event.target.closest('[data-bs-toggle="modal"][data-bs-target="#BookConsultation"], [data-bs-toggle="modal"][data-bs-target="#enquiryModal"]');
    if (trigger) {
      var target = trigger.getAttribute("data-bs-target") || "#BookConsultation";
      var modal = document.querySelector(target);
      if (!modal) return;
      event.preventDefault();
      event.stopPropagation();
      showFallbackModal(modal);
      return;
    }

    var openModal = document.querySelector("#BookConsultation[data-fallback-open='true'], #enquiryModal[data-fallback-open='true']");
    if (!openModal) return;

    if (event.target.closest('[data-bs-dismiss="modal"]') || event.target === openModal) {
      event.preventDefault();
      hideFallbackModal(openModal);
    }
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    hideFallbackModal(document.querySelector("#BookConsultation[data-fallback-open='true'], #enquiryModal[data-fallback-open='true']"));
  });

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !isLeadForm(form)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitLead(form);
  }, true);
})();
