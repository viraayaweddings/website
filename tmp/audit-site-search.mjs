import fs from "node:fs";
import vm from "node:vm";

const data = JSON.parse(fs.readFileSync("site-public/data/hotel-listing-data.json", "utf8"));

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.dataset = {};
    this.listeners = {};
    this.innerHTML = "";
  }
  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }
  dispatch(type) {
    (this.listeners[type] || []).forEach((handler) => handler.call(this));
  }
}

const searchbox = new FakeElement("searchbox");
const suggestions = new FakeElement("search-suggestions");

globalThis.document = {
  listeners: {},
  getElementById(id) {
    if (id === "searchbox") return searchbox;
    if (id === "search-suggestions") return suggestions;
    return null;
  },
  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }
};

globalThis.fetch = async (url) => {
  if (String(url).startsWith("/hotel-search")) {
    return { ok: false, json: async () => [] };
  }
  if (String(url).includes("/data/hotel-listing-data.json")) {
    return { ok: true, json: async () => data };
  }
  return { ok: false, json: async () => [] };
};

vm.runInThisContext(fs.readFileSync("site-public/js/site-search.js", "utf8"));
document.listeners.DOMContentLoaded.forEach((handler) => handler());

searchbox.value = "taj";
searchbox.dispatch("input");
await new Promise((resolve) => setTimeout(resolve, 20));

if (!suggestions.innerHTML.includes("/hotel-listing?hotel_search=") || !/taj/i.test(suggestions.innerHTML)) {
  throw new Error("Top search suggestions did not render from local fallback");
}

searchbox.value = "x";
searchbox.dispatch("input");
if (suggestions.innerHTML !== "") {
  throw new Error("Top search did not clear short queries");
}

console.log("Site search audit passed");
