import fs from "node:fs";
import vm from "node:vm";

const data = JSON.parse(fs.readFileSync("site-public/data/hotel-listing-data.json", "utf8"));

function normalize(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeEvent {
  constructor(type) {
    this.type = type;
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeClassList {
  constructor(owner, initial = []) {
    this.owner = owner;
    this.items = new Set(initial);
  }
  contains(name) {
    return this.items.has(name);
  }
  add(name) {
    this.items.add(name);
    this.owner.className = [...this.items].join(" ");
  }
  remove(name) {
    this.items.delete(name);
    this.owner.className = [...this.items].join(" ");
  }
}

class FakeElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.jqHandlers = {};
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.value = attrs.value || "";
    this.checked = Boolean(attrs.checked);
    this.selected = Boolean(attrs.selected);
    this._innerHTML = "";
    this.textContent = "";
    this.className = attrs.class || "";
    this.classList = new FakeClassList(this, this.className.split(/\s+/).filter(Boolean));
    Object.entries(attrs).forEach(([key, value]) => this.setAttribute(key, value));
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(value) {
    this._innerHTML = String(value || "");
    this.children = [];
    const pageMatches = [...this._innerHTML.matchAll(/data-page="([^"]+)"/g)];
    pageMatches.forEach((match) => {
      this.appendChild(new FakeElement("a", { "data-page": match[1] }));
    });
  }
  setAttribute(key, value) {
    this.attributes[key] = String(value);
    if (key === "id") this.id = String(value);
    if (key === "name") this.name = String(value);
    if (key === "value") this.value = String(value);
    if (key === "class") {
      this.className = String(value);
      this.classList = new FakeClassList(this, this.className.split(/\s+/).filter(Boolean));
    }
    if (key.startsWith("data-")) {
      const dataKey = key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      this.dataset[dataKey] = String(value);
    }
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }
  dispatchEvent(event) {
    (this.listeners[event.type] || []).forEach((handler) => handler.call(this, event));
    return !event.defaultPrevented;
  }
  click() {
    this.dispatchEvent(new FakeEvent("click"));
  }
  get options() {
    return this.children.filter((child) => child.tagName === "OPTION");
  }
  get selectedOptions() {
    return this.options.filter((option) => option.selected);
  }
  querySelector(selector) {
    return querySelectorAll(this, selector)[0] || null;
  }
  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }
}

function descendants(root) {
  const out = [];
  function walk(node) {
    node.children.forEach((child) => {
      out.push(child);
      walk(child);
    });
  }
  walk(root);
  return out;
}

function matches(element, selector) {
  if (selector.startsWith("#")) return element.id === selector.slice(1);
  if (selector.startsWith(".")) return element.classList.contains(selector.slice(1));
  if (selector === "[data-page]") return Object.prototype.hasOwnProperty.call(element.dataset, "page");
  const dataPage = selector.match(/^\[data-page="([^"]+)"\]$/);
  if (dataPage) return element.dataset.page === dataPage[1];
  const inputName = selector.match(/^input\[name="([^"]+)"\](?::checked)?$/);
  if (inputName) {
    return element.tagName === "INPUT" && element.name === inputName[1] && (!selector.endsWith(":checked") || element.checked);
  }
  const typeSelector = selector.match(/^input\[type="([^"]+)"\]$/);
  if (typeSelector) return element.tagName === "INPUT" && element.attributes.type === typeSelector[1];
  return element.tagName.toLowerCase() === selector.toLowerCase();
}

function querySelectorAll(root, selector) {
  return descendants(root).filter((element) => matches(element, selector));
}

function createFixture() {
  const document = new FakeElement("document");
  const form = document.appendChild(new FakeElement("form", { id: "filterForm" }));
  const citySelect = document.appendChild(new FakeElement("select", { id: "cityMultiSelect" }));
  data.cities.forEach((city) => citySelect.appendChild(new FakeElement("option", { value: String(city.id) })));
  document.appendChild(new FakeElement("input", { id: "hotelSearch", type: "text" }));
  const grid = document.appendChild(new FakeElement("div", { class: "change-colm" }));
  document.appendChild(new FakeElement("div", { class: "custom-pagination" }));
  document.appendChild(new FakeElement("p", { id: "hotelResultsSummary" }));
  form.appendChild(new FakeElement("a", { class: "btn-outline-secondary" }));
  ["1", "2", "3", "4", "5"].forEach((value) => form.appendChild(new FakeElement("input", { class: "filter-checkbox", type: "checkbox", name: "room_ranges[]", value })));
  ["2", "3", "4", "5", "6", "7", "8"].forEach((value) => form.appendChild(new FakeElement("input", { class: "filter-checkbox", type: "checkbox", name: "guest_capacities[]", value })));
  ["2", "3", "4", "5", "6", "7"].forEach((value) => form.appendChild(new FakeElement("input", { class: "filter-checkbox", type: "checkbox", name: "wedding_types[]", value })));
  return { document, form, citySelect, grid };
}

function jqWrapper(element) {
  return {
    data(key) {
      return element.__select2Data?.[key];
    },
    select2(options) {
      element.__select2Data = { ...(element.__select2Data || {}), select2: options };
      return this;
    },
    val(values) {
      if (values === undefined) return element.selectedOptions.map((option) => option.value);
      const selected = new Set((Array.isArray(values) ? values : [values]).filter(Boolean).map(String));
      element.options.forEach((option) => {
        option.selected = selected.has(option.value);
      });
      return this;
    },
    off(namespace) {
      Object.keys(element.jqHandlers).forEach((key) => {
        if (key === namespace || key.endsWith(namespace)) delete element.jqHandlers[key];
      });
      return this;
    },
    on(eventName, handler) {
      (element.jqHandlers[eventName] ||= []).push(handler);
      return this;
    },
    trigger(eventName) {
      const base = eventName.split(".")[0];
      Object.entries(element.jqHandlers).forEach(([key, handlers]) => {
        const handlerBase = key.split(".")[0];
        if (eventName === "change.select2") return;
        if (handlerBase === base) handlers.forEach((handler) => handler.call(element, new FakeEvent(base)));
      });
      element.dispatchEvent(new FakeEvent(base));
      return this;
    }
  };
}

async function loadListing({ search = "" } = {}) {
  const fixture = createFixture();
  const location = { pathname: "/hotel-listing", search };
  globalThis.document = fixture.document;
  globalThis.window = {
    location,
    history: {
      replaceState(_state, _title, url) {
        const [path, query = ""] = url.split("?");
        location.pathname = path;
        location.search = query ? `?${query}` : "";
      }
    },
    jQuery: (arg) => jqWrapper(arg instanceof FakeElement ? arg : fixture.document)
  };
  globalThis.window.jQuery.fn = { select2: true };
  globalThis.fetch = async (url) => {
    if (String(url).includes("/data/hotel-listing-data.json")) {
      return { ok: true, json: async () => data };
    }
    return { ok: false, json: async () => [] };
  };
  globalThis.console = console;
  vm.runInThisContext(fs.readFileSync("site-public/js/hotel-listing.js", "utf8"));
  await waitForListingState();
  return fixture;
}

function state() {
  return globalThis.window.__hotelListingState;
}

async function waitForListingState() {
  for (let i = 0; i < 40; i += 1) {
    if (globalThis.window.__hotelListingState) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Hotel listing state did not initialize");
}

function expectedCount({ cityIds = [], query = "", room = [], guest = [], wedding = [] } = {}) {
  const citySet = new Set(cityIds.map(String));
  const q = normalize(query);
  const roomRules = {
    1: (rooms) => rooms < 50,
    2: (rooms) => rooms >= 100,
    3: (rooms) => rooms >= 150,
    4: (rooms) => rooms >= 200,
    5: (rooms) => rooms >= 250
  };
  const guestRules = {
    2: (pax) => pax >= 50 && pax <= 100,
    3: (pax) => pax >= 100 && pax <= 150,
    4: (pax) => pax >= 150 && pax <= 200,
    5: (pax) => pax >= 200 && pax <= 250,
    6: (pax) => pax >= 250 && pax <= 300,
    7: (pax) => pax >= 300 && pax <= 350,
    8: (pax) => pax >= 350 && pax <= 400
  };
  const weddingMap = { 2: "destination", 3: "city", 4: "resort", 5: "palace", 6: "luxury", 7: "intimate" };
  const weddingTypes = wedding.map((value) => weddingMap[value]).filter(Boolean);
  return data.hotels.filter((hotel) => {
    if (citySet.size && !citySet.has(String(hotel.city_id))) return false;
    if (q && !hotel.search.includes(q)) return false;
    if (room.length && !room.some((key) => roomRules[key]?.(Number(hotel.rooms) || 0))) return false;
    if (guest.length && !guest.some((key) => guestRules[key]?.(Number(hotel.capacity) || 0))) return false;
    if (weddingTypes.length && !weddingTypes.some((type) => hotel.types.includes(type))) return false;
    return true;
  }).length;
}

function checkState(label, expectedTotal, expectedPage = 1) {
  assert(state().total === expectedTotal, `${label}: expected total ${expectedTotal}, got ${state().total}`);
  assert(state().page === expectedPage, `${label}: expected page ${expectedPage}, got ${state().page}`);
}

{
  const { document, form, citySelect } = await loadListing();
  checkState("initial", expectedCount());

  window.jQuery(citySelect).val(["8"]).trigger("change");
  checkState("city dropdown", expectedCount({ cityIds: ["8"] }));
  assert(window.location.search.includes("city_ids%5B%5D=8"), "city dropdown did not update URL");

  document.querySelector("#hotelSearch").value = "Taj";
  document.querySelector("#hotelSearch").dispatchEvent(new FakeEvent("input"));
  await new Promise((resolve) => setTimeout(resolve, 280));
  checkState("city + hotel search", expectedCount({ cityIds: ["8"], query: "Taj" }));

  form.querySelector('input[name="room_ranges[]"]').checked = true;
  form.querySelector('input[name="room_ranges[]"]').dispatchEvent(new FakeEvent("change"));
  checkState("room filter", expectedCount({ cityIds: ["8"], query: "Taj", room: ["1"] }));

  form.querySelector(".btn-outline-secondary").click();
  checkState("clear filters", expectedCount());
  assert(!document.querySelector("#hotelSearch").value, "clear filters did not reset hotel search");
  assert(!citySelect.selectedOptions.length, "clear filters did not reset cities");
}

{
  const { document, form } = await loadListing();
  const pageTwo = document.querySelector('[data-page="2"]');
  assert(pageTwo, "pagination page 2 was not rendered");
  pageTwo.click();
  checkState("pagination", expectedCount(), 2);

  const guest = form.querySelector('input[name="guest_capacities[]"]');
  guest.checked = true;
  guest.dispatchEvent(new FakeEvent("change"));
  checkState("guest filter", expectedCount({ guest: [guest.value] }));

  const wedding = form.querySelector('input[name="wedding_types[]"]');
  wedding.checked = true;
  wedding.dispatchEvent(new FakeEvent("change"));
  checkState("combined guest + wedding filter", expectedCount({ guest: [guest.value], wedding: [wedding.value] }));
}

{
  await loadListing({ search: "?city_search=Goa&hotel_search=marriott&page=2" });
  checkState("URL city_search + hotel_search", expectedCount({ cityIds: ["7"], query: "marriott" }), 1);
}

console.log("Hotel listing controls audit passed");
