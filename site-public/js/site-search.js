(function () {
  var dataPromise = null;
  var lastQuery = "";

  function searchBox() {
    return document.getElementById("searchbox");
  }

  function suggestionBox() {
    return document.getElementById("search-suggestions");
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function loadLocalHotels() {
    if (!dataPromise) {
      dataPromise = fetch("/data/hotel-listing-data.json")
        .then(function (response) {
          if (!response.ok) throw new Error("Hotel data unavailable");
          return response.json();
        })
        .then(function (data) {
          return data.hotels || [];
        });
    }
    return dataPromise;
  }

  function apiResults(query) {
    return fetch("/hotel-search?q=" + encodeURIComponent(query))
      .then(function (response) {
        if (!response.ok) throw new Error("Search endpoint unavailable");
        return response.json();
      })
      .then(function (items) {
        if (!Array.isArray(items)) return [];
        return items.map(function (item) {
          return { name: item.hotel_name || item.name || "" };
        }).filter(function (item) {
          return item.name;
        });
      });
  }

  function localResults(query) {
    var needle = query.toLowerCase();
    return loadLocalHotels().then(function (hotels) {
      return hotels
        .filter(function (hotel) {
          return String(hotel.name || "").toLowerCase().includes(needle);
        })
        .sort(function (a, b) {
          return String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
        })
        .slice(0, 8)
        .map(function (hotel) {
          return { name: hotel.name };
        });
    });
  }

  function render(items) {
    var box = suggestionBox();
    if (!box) return;
    if (!items.length) {
      box.innerHTML = "<div class='no-result'>No hotels found</div>";
      return;
    }
    box.innerHTML = items.map(function (hotel) {
      var name = esc(hotel.name);
      return "<a href=\"/hotel-listing?hotel_search=" + encodeURIComponent(hotel.name) + "\" class=\"search-item\">" + name + "</a>";
    }).join("");
  }

  function runSearch() {
    var input = searchBox();
    var box = suggestionBox();
    if (!input || !box) return;
    var query = input.value.trim();
    lastQuery = query;
    if (query.length < 2) {
      box.innerHTML = "";
      return;
    }

    apiResults(query)
      .catch(function () {
        return localResults(query);
      })
      .then(function (items) {
        if (query === lastQuery) render(items);
      })
      .catch(function () {
        if (query === lastQuery) render([]);
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = searchBox();
    if (!input || input.dataset.siteSearchReady === "true") return;
    input.dataset.siteSearchReady = "true";
    input.addEventListener("input", runSearch);
    input.addEventListener("keyup", runSearch);
  });
})();
