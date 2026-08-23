(function () {
  var leadActions = new Set([
    "/api/lead",
    "/contact/save",
    "/blog-form-submit",
    "/get_in_touch/store",
    "#",
    "",
  ]);
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  /** "Wedding Hotel Listing - Viraaya Weddings" -> "Wedding Hotel Listing". */
  var SITE_SUFFIX = /\s+[-|–—]\s+/;
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

  /**
   * The name a message calls a field.
   *
   * Almost none of the cloned markup pairs a <label> with its control through
   * `for`, so this also accepts the label sitting alongside it in the same
   * .form-group. Falling straight through to the placeholder produced
   * "Please enter Enter Your Name." on the pages whose placeholder is a
   * sentence, so an imperative opener is trimmed off it.
   */
  function labelFor(control) {
    var linked = control.id ? document.querySelector('label[for="' + CSS.escape(control.id) + '"]') : null;
    var group = control.closest(".form-group");
    var nearby = !linked && group ? group.querySelector("label") : null;
    // A <select> usually names itself in its placeholder option
    // ("SELECT ENQUIRY TYPE"), which is the only wording it carries.
    var firstOption = control.tagName === "SELECT" && control.options.length ? control.options[0].text : "";

    return (
      trimLead((linked && linked.textContent) || "") ||
      trimLead((nearby && nearby.textContent) || "") ||
      trimLead(control.getAttribute("aria-label") || "") ||
      trimLead(control.getAttribute("placeholder") || "") ||
      trimLead(firstOption) ||
      titleCase(control.name) ||
      "this field"
    );
  }

  /**
   * Strips an imperative opener, so a placeholder can be read as a field name.
   *
   * The cloned markup writes these every way at once -- "Enter Your Name",
   * "name", "SELECT ENQUIRY TYPE" -- and a message quoting them verbatim reads
   * differently on every page, so the case is normalised too.
   */
  function trimLead(value) {
    var text = String(value)
      .replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(please\s+)?(enter|select|choose|type|pick|add)\s+(your\s+|a\s+|an\s+|the\s+)?/i, "")
      .replace(/^your\s+/i, "")
      .replace(/[:\s]+$/, "")
      .trim();

    // "SELECT ENQUIRY TYPE" would otherwise shout in the middle of a sentence.
    if (text.length > 3 && text === text.toUpperCase()) text = titleCase(text.toLowerCase());
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/\[\]$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim()
      .replace(/\w/g, function (letter) { return letter.toUpperCase(); });
  }

  /** Selects are chosen, boxes are ticked, everything else is typed into. */
  function requiredMessage(control, label) {
    // "Mobile No." would otherwise end the sentence with two full stops.
    var subject = label.replace(/\.+$/, "");
    if (control.tagName === "SELECT") return "Please select " + subject + ".";
    if (control.type === "checkbox" || control.type === "radio") return "Please choose " + subject + ".";
    return "Please enter " + subject + ".";
  }

  function fieldKey(control) {
    return (control.name || control.id || labelFor(control)).replace(/\[\]$/, "");
  }

  /**
   * The status box, created inside the form (or any container) on first use.
   *
   * `[data-lead-status]` lets a container that is not a <form> say where the
   * box belongs, so a bespoke page can share this design without moving its
   * markup around.
   */
  function addStatus(container) {
    var host = container.querySelector("[data-lead-status]") || container;
    var existing = host.querySelector(".lead-form-status") || container.querySelector(".lead-form-status");
    if (existing) return existing;

    var status = document.createElement("div");
    status.className = "lead-form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    host.appendChild(status);
    return status;
  }

  function setStatus(container, message, type) {
    var status = addStatus(container);
    status.className = "lead-form-status lead-form-status--" + type;
    status.textContent = message || "";
    status.setAttribute("tabindex", "-1");
    window.setTimeout(function () {
      status.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      status.focus({ preventScroll: true });
    }, 50);
  }

  function clearStatus(container) {
    var status = container.querySelector(".lead-form-status");
    if (status) status.remove();
  }

  function markInvalid(control, message) {
    control.classList.add("lead-field-invalid");
    control.setAttribute("aria-invalid", "true");
    control.dataset.leadError = message;
    setFieldError(control, message);
  }

  /**
   * Every field in a container. `form.elements` covers controls that sit
   * outside the element in the DOM but are owned by the form; a plain
   * container has no such notion, so it is queried directly.
   */
  function controlsIn(root) {
    var all = root.elements ? Array.prototype.slice.call(root.elements) : Array.prototype.slice.call(root.querySelectorAll("input, select, textarea"));
    return all.filter(function (control) {
      if (control.dataset && control.dataset.leadHoneypot === "true") return false;
      return control.name && !control.disabled && control.type !== "hidden" && control.type !== "submit" && control.type !== "button";
    });
  }

  var HONEYPOT_NAME = "company_website";

  /**
   * A field only a bot fills in.
   *
   * The API has always refused a submission that carries one, but no page had
   * the field, so the check never fired. Adding it here rather than to the
   * markup means it covers every form on the site, including the ones stored in
   * the database.
   */
  function addHoneypot(form) {
    if (form.tagName !== "FORM" || form.querySelector("[data-lead-honeypot]")) return;

    var wrapper = document.createElement("div");
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.cssText = "position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden";

    var input = document.createElement("input");
    input.type = "text";
    input.name = HONEYPOT_NAME;
    input.tabIndex = -1;
    input.autocomplete = "off";
    input.dataset.leadHoneypot = "true";

    wrapper.appendChild(input);
    form.appendChild(wrapper);
  }

  function clearInvalid(form) {
    form.querySelectorAll(".lead-field-invalid").forEach(function (control) {
      control.classList.remove("lead-field-invalid");
      control.removeAttribute("aria-invalid");
      delete control.dataset.leadError;
      setFieldError(control, "");
    });
  }

  function fieldErrorId(control) {
    if (!control.id) control.id = "lead-field-" + Math.random().toString(36).slice(2, 10);
    return control.id + "-error";
  }

  function setFieldError(control, message) {
    var group = control.closest(".form-group") || control.parentElement;
    if (!group) return;

    var errorId = fieldErrorId(control);
    var error = group.querySelector("#" + CSS.escape(errorId));

    if (!message) {
      if (error) error.remove();
      control.removeAttribute("aria-describedby");
      return;
    }

    if (!error) {
      error = document.createElement("div");
      error.id = errorId;
      error.className = "lead-field-error";
      group.appendChild(error);
    }

    error.textContent = message;
    control.setAttribute("aria-describedby", errorId);
  }

  function controlValue(control) {
    if (control.type === "checkbox" || control.type === "radio") {
      return control.checked ? control.value || "Yes" : "";
    }
    return (control.value || "").trim();
  }

  function validateControl(form, control, showRequired) {
    if (!control.name || control.disabled || control.type === "hidden" || control.type === "submit" || control.type === "button") {
      return "";
    }

    var errors = [];
    var value = controlValue(control);
    var label = labelFor(control);
    var key = fieldKey(control).toLowerCase();

    control.classList.remove("lead-field-invalid");
    control.removeAttribute("aria-invalid");
    delete control.dataset.leadError;
    setFieldError(control, "");

    if (control.required && (!value || /^select\b/i.test(value))) {
      if (!showRequired) return "";
      return requiredMessage(control, label);
    }

    if (value && (control.type === "email" || key.indexOf("email") !== -1) && !emailPattern.test(value)) {
      return "Please enter a valid email address.";
    }

    if (value && /(phone|mobile|number|tel)/i.test(key) && !phonePattern.test(value.replace(/\D/g, ""))) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    if (value && /name/i.test(key) && value.length < 2) {
      return "Please enter a valid name.";
    }

    return errors[0] || "";
  }

  function validate(form) {
    clearInvalid(form);
    var errors = [];

    controlsIn(form).forEach(function (control) {
      var message = validateControl(form, control, true);
      if (!message) return;
      errors.push(message);
      markInvalid(control, message);
    });

    return errors;
  }

  function attachLiveValidation(form) {
    if (!form) return;
    // Only a <form> has native validation to switch off. A bespoke container
    // shares everything below it.
    if (form.tagName === "FORM") {
      form.noValidate = true;
      form.setAttribute("novalidate", "novalidate");
    }
    addHoneypot(form);
    if (form.dataset.leadLiveValidation === "true") return;
    form.dataset.leadLiveValidation = "true";

    var validateField = function (control, showRequired) {
      var message = validateControl(form, control, showRequired);
      if (message) {
        markInvalid(control, message);
      }
      return message;
    };

    var bindControl = function (control) {
      if (!control.name || control.disabled || control.type === "hidden" || control.type === "submit" || control.type === "button") return;

      var onInput = function () {
        validateField(control, false);
      };
      var onBlur = function () {
        validateField(control, true);
      };
      var onInvalid = function (event) {
        event.preventDefault();
        validateField(control, true);
      };

      if (window.jQuery) {
        window.jQuery(control).on("input.leadValidation change.leadValidation", onInput);
        window.jQuery(control).on("blur.leadValidation", onBlur);
      } else {
        control.addEventListener("input", onInput);
        control.addEventListener("change", onInput);
        control.addEventListener("blur", onBlur);
      }

      control.addEventListener("invalid", onInvalid);
    };

    controlsIn(form).forEach(bindControl);
  }

  function attachLiveValidationToLeadForms(root) {
    Array.from((root || document).querySelectorAll("form")).forEach(function (form) {
      if (isLeadForm(form)) attachLiveValidation(form);
    });
  }

  /**
   * What the enquiry is called in the panel and in the notification subject.
   *
   * The CTA block on the listing and city pages carries neither a
   * `data-form-name` nor an id, so 64 pages' worth of enquiries all arrived as
   * "Website Query" and could only be told apart by their stored page URL. The
   * page title is the next most specific thing the form knows about itself.
   */
  function formTitle(form) {
    if (form.dataset.formName) return form.dataset.formName;
    if (form.id) return titleCase(form.id);

    var pageName = (document.title || "").split(SITE_SUFFIX)[0].trim();
    return pageName || "Website Query";
  }

  var csrfToken = "";

  async function fetchCsrfToken() {
    var response = await fetch("/api/lead/csrf", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    var data = await response.json().catch(function () { return {}; });
    return data.token || "";
  }

  async function ensureCsrfToken() {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchCsrfToken();
    return csrfToken;
  }

  /**
   * The token lasts an hour; a page left open for longer keeps the one it
   * fetched on load. That submission came back 403 and told the visitor their
   * session had expired, which is not something they should have to act on.
   */
  async function refreshCsrfToken() {
    csrfToken = "";
    csrfToken = await fetchCsrfToken();
    return csrfToken;
  }

  window.viraayaLeadCsrf = ensureCsrfToken;

  /**
   * The same validation and the same error markup, for a page that has to build
   * its own payload.
   *
   * /check-hotel-availability collects a plan, hotels, dates and a rooms/pax
   * grid before it can post, so it cannot be an ordinary lead <form>. It used
   * to carry its own rules and its own error elements, which drifted from
   * every other form on the site. It now drives these.
   */
  window.viraayaLeadForms = {
    csrf: ensureCsrfToken,
    /** Live validation on any container of named fields. */
    attach: attachLiveValidation,
    /** Validates everything in the container; returns the messages. */
    validate: validate,
    /** Clears the invalid state and the field messages. */
    clear: clearInvalid,
    /** type: "pending" | "success" | "error". */
    status: setStatus,
    clearStatus: clearStatus,
    fieldError: markInvalid,
    /** The first field left invalid, for focus and scrolling. */
    firstInvalid: function (container) {
      return container.querySelector(".lead-field-invalid");
    },
  };

  function payload(form) {
    var fields = {};
    var requiredFields = [];
    var formData = new FormData(form);
    var pageUrl = window.location.href;

    var honeypotValue = "";

    formData.forEach(function (value, rawKey) {
      var key = rawKey.replace(/\[\]$/, "");
      if (key === "_token") return;
      if (key === HONEYPOT_NAME) {
        honeypotValue = String(value || "").trim();
        return;
      }
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
      honeypot: honeypotValue || fields.website || "",
      metadata: {
        "Page Title": document.title,
        "Page URL": pageUrl,
        "Source Page": fields.source_page || "",
        "Submission Endpoint": normalizeAction(form),
        "Referrer": document.referrer || "",
        // The user agent is not sent from here: the server records the same
        // string from the request header, and two identical rows under
        // "Browser" and "Request Browser" read as two different facts.
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

  function setButtonSending(button, isSending) {
    if (!button) return;
    var text = button.querySelector("#btnText, [data-button-text]");
    var loader = button.querySelector("#btnLoader, [data-button-loader]");

    button.disabled = isSending;

    if (text && loader) {
      text.classList.toggle("d-none", isSending);
      loader.classList.toggle("d-none", !isSending);
      return;
    }

    if (isSending && button.textContent.trim()) {
      button.dataset.originalText = button.dataset.originalText || button.textContent;
      button.textContent = "Sending...";
    } else if (!isSending && button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function showSuccessPanel(form) {
    var container = form.closest(".enquiry-popup-form");
    if (!container) return false;

    var existing = container.querySelector(".enquiry-success-panel");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "enquiry-success-panel";
      existing.setAttribute("role", "status");
      existing.setAttribute("aria-live", "polite");
      existing.setAttribute("tabindex", "-1");
      existing.innerHTML = [
        '<span class="enquiry-success-icon" aria-hidden="true"></span>',
        '<h5>Your venue shortlist request is in.</h5>',
        '<p>Our senior wedding planner will call within 24 hours with handpicked venue options for your celebration.</p>',
        '<small>Thank you for choosing Viraaya Weddings.</small>'
      ].join("");
      form.insertAdjacentElement("afterend", existing);
    }

    // The "Sending your enquiry..." box would otherwise sit inside the hidden
    // form and reappear if the panel is ever dismissed.
    clearStatus(form);
    form.reset();
    form.hidden = true;
    form.setAttribute("aria-hidden", "true");
    existing.hidden = false;
    existing.focus({ preventScroll: true });
    return true;
  }

  async function submitLead(form) {
    var button = submitButton(form);
    var errors = validate(form);

    if (errors.length) {
      clearStatus(form);
      var firstInvalid = form.querySelector(".lead-field-invalid");
      if (firstInvalid) firstInvalid.focus({ preventScroll: false });
      return;
    }

    setButtonSending(button, true);
    setStatus(form, "Sending your enquiry...", "pending");

    try {
      var body = payload(form);

      var post = async function (token) {
        body.csrfToken = token;
        var sent = await fetch("/api/lead", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
        });
        return { response: sent, data: await sent.json().catch(function () { return {}; }) };
      };

      var result = await post(await ensureCsrfToken());

      // One retry with a fresh token, for the tab that sat open past the hour.
      if (result.response.status === 403) {
        result = await post(await refreshCsrfToken());
      }

      var response = result.response;
      var data = result.data;

      if (!response.ok || data.ok === false) {
        var message = (data.errors && data.errors[0]) || data.message || "Could not send your enquiry right now.";
        setStatus(form, message, "error");
        return;
      }

      if (!showSuccessPanel(form)) {
        setStatus(form, data.message || "Thanks. We will get back to you shortly.", "success");
        form.reset();
      }
    } catch (error) {
      setStatus(form, "Could not send your enquiry right now.", "error");
    } finally {
      setButtonSending(button, false);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      attachLiveValidationToLeadForms(document);
    });
  } else {
    attachLiveValidationToLeadForms(document);
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !isLeadForm(form)) return;
    attachLiveValidation(form);
    event.preventDefault();
    event.stopImmediatePropagation();
    submitLead(form);
  }, true);
})();
