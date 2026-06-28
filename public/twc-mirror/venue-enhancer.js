/* Venue mirror enhancer: wires the Similar Venues slider arrows and renders the
   "Explore nearby venues" map locally without third-party tile requests. */
(function () {
  var D = document;
  function txt(el) { return (el && el.textContent || "").trim(); }

  function wireSimilar() {
    var hs = [].slice.call(D.querySelectorAll("p,h2,h1")).filter(function (e) {
      return /Similar Venues/i.test(txt(e));
    });
    if (!hs.length) return false;
    var sec = hs[0].parentElement;
    var el = sec && sec.querySelector(".swiper");
    if (!el || !el.swiper) return false;
    var sw = el.swiper;
    var prev = D.querySelector(".custom-prev");
    var next = D.querySelector(".custom-next");
    if (prev && !prev.__wired) {
      prev.__wired = 1;
      prev.style.cursor = "pointer";
      prev.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sw.slidePrev();
      });
    }
    if (next && !next.__wired) {
      next.__wired = 1;
      next.style.cursor = "pointer";
      next.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sw.slideNext();
      });
    }
    return !!(prev && next);
  }

  function nextData() {
    try {
      return JSON.parse(D.getElementById("__NEXT_DATA__").textContent);
    } catch (e) {
      return null;
    }
  }

  function loadLeaflet(cb) {
    if (window.L) return cb();
    if (!D.querySelector('link[data-leaflet]')) {
      var css = D.createElement("link");
      css.rel = "stylesheet";
      css.href = "/twc-mirror/vendor/leaflet/leaflet.css";
      css.setAttribute("data-leaflet", "1");
      D.head.appendChild(css);
    }
    var existing = D.querySelector('script[data-leaflet]');
    if (existing) {
      existing.addEventListener("load", cb);
      return;
    }
    var s = D.createElement("script");
    s.src = "/twc-mirror/vendor/leaflet/leaflet.js";
    s.setAttribute("data-leaflet", "1");
    s.onload = cb;
    D.body.appendChild(s);
  }

  function pin(L, color, size) {
    return L.divIcon({
      className: "",
      html:
        '<div style="width:' + size + 'px;height:' + size +
        'px;border-radius:50% 50% 50% 0;background:' + color +
        ';transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    });
  }

  function popupHtml(v) {
    var img = (v.media && v.media[0] && v.media[0].url) || "";
    var href = "/wedding-venues/" + v.citySlug + "/" + v.urlSlug;
    return '<div style="width:170px">' +
      (img ? '<img src="' + img + '" style="width:100%;height:90px;object-fit:cover;border-radius:6px"/>' : '') +
      '<div style="font-weight:700;margin-top:4px">' + (v.venueName || "") + '</div>' +
      '<div style="color:#666;font-size:12px">' + (v.shortAddress || "") + '</div>' +
      '<a href="' + href + '" style="color:#A9804E;font-size:12px">View venue</a></div>';
  }

  function buildMap() {
    var ps = [].slice.call(D.querySelectorAll("p,h2,h1"));
    var sec = null;
    for (var i = 0; i < ps.length; i++) {
      if (/Explore nearby venues/i.test(txt(ps[i]))) {
        sec = ps[i].parentElement;
        break;
      }
    }
    if (!sec) return false;
    var box = sec.querySelector(".relative") || sec.querySelector("div");
    if (!box) return false;
    if (box.__mapped) return true;
    var data = nextData();
    if (!data) return false;
    var pp = data.props.pageProps;
    var vd = pp.vendorDetails || {};
    var center = vd.coordinates && vd.coordinates.length === 2
      ? [vd.coordinates[1], vd.coordinates[0]]
      : null;
    box.__mapped = 1;
    box.innerHTML = '<div id="venue-nearby-leaflet" style="position:absolute;inset:0;height:100%;width:100%;z-index:0"></div>';
    loadLeaflet(function () {
      var L = window.L;
      var mapEl = D.getElementById("venue-nearby-leaflet");
      var map = L.map(mapEl, { scrollWheelZoom: false }).setView(center || [28.61, 77.20], 12);
      mapEl.style.backgroundColor = "#e9dfd1";
      mapEl.style.backgroundImage = [
        "linear-gradient(28deg, transparent 0 42%, rgba(255,255,255,.9) 42% 45%, transparent 45% 100%)",
        "linear-gradient(118deg, transparent 0 49%, rgba(255,255,255,.78) 49% 52%, transparent 52% 100%)",
        "linear-gradient(4deg, transparent 0 57%, rgba(188,162,123,.42) 57% 59%, transparent 59% 100%)",
        "radial-gradient(circle at 22% 28%, rgba(123,169,133,.36) 0 11%, transparent 12%)",
        "radial-gradient(circle at 82% 76%, rgba(112,145,190,.28) 0 13%, transparent 14%)",
        "linear-gradient(135deg,#f6f1ea,#e2d6c6)"
      ].join(",");
      mapEl.style.backgroundSize = "100% 100%,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%";
      var labels = D.createElement("div");
      labels.style.cssText = "position:absolute;inset:0;z-index:350;pointer-events:none;font:600 12px/1.2 Arial,sans-serif;color:#75644f;text-shadow:0 1px 0 rgba(255,255,255,.75)";
      labels.innerHTML =
        '<span style="position:absolute;left:12%;top:20%">Delhi</span>' +
        '<span style="position:absolute;left:42%;top:46%;transform:rotate(28deg);color:#8a7358">MG Road</span>' +
        '<span style="position:absolute;right:18%;bottom:20%;color:#56745f">Green belt</span>' +
        '<span style="position:absolute;left:62%;top:18%;color:#6d75aa">Nearby venues</span>';
      mapEl.appendChild(labels);
      map.attributionControl.setPrefix("Local map preview");
      var bounds = [];
      if (center) {
        bounds.push(center);
        L.marker(center, { icon: pin(L, "#A9804E", 18) })
          .addTo(map)
          .bindPopup("<strong>" + (vd.name || "") + "</strong>")
          .openPopup();
      }
      (pp.similarVenueList || []).forEach(function (v) {
        var c = v.coordinates;
        if (!c || c.length !== 2) return;
        var ll = [c[1], c[0]];
        bounds.push(ll);
        L.marker(ll, { icon: pin(L, "#6B70E8", 14) }).addTo(map).bindPopup(popupHtml(v));
      });
      if (bounds.length > 1) {
        try {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        } catch (e) {}
      }
      setTimeout(function () { map.invalidateSize(); }, 250);
    });
    return true;
  }

  var n = 0;
  var iv = setInterval(function () {
    var a = wireSimilar();
    var b = buildMap();
    n += 1;
    if ((a && b) || n > 80) clearInterval(iv);
  }, 250);
})();
