/* Essays theme — interactions
   - dark/light toggle (persisted)
   - wordmark fades into the header once you scroll past the hero
   - timeline rail scroll-spy + click-to-jump
*/
(function () {
  "use strict";

  /* ---- theme (light by default; dark only when the reader opts in) ---- */
  var root = document.documentElement;
  if (localStorage.getItem("theme") === "dark") {
    root.classList.add("dark");
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    root.classList.add("theme-transitioning");
    root.classList.toggle("dark");
    localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
    setTimeout(function () { root.classList.remove("theme-transitioning"); }, 260);
  });

  /* ---- wordmark reveal ---- */
  var header = document.querySelector(".site-header");
  var hero = document.querySelector(".hero");
  if (header && hero) {
    var io = new IntersectionObserver(function (entries) {
      header.classList.toggle("show-wordmark", !entries[0].isIntersecting);
    }, { rootMargin: "-60px 0px 0px 0px" });
    io.observe(hero);
  }

  /* ---- timeline rail: build from [data-chapter] sections ---- */
  var rail = document.querySelector("[data-rail]");
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  if (rail && chapters.length) {
    var items = chapters.map(function (ch) {
      var li = document.createElement("li");
      li.className = "rail-item";
      li.setAttribute("role", "link");
      li.tabIndex = 0;
      li.innerHTML = '<span class="rail-dot"></span><span class="rail-label"></span>';
      li.querySelector(".rail-label").textContent = ch.getAttribute("data-label") || ch.id;
      function go() { ch.scrollIntoView({ behavior: "smooth", block: "start" }); }
      li.addEventListener("click", go);
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
      rail.appendChild(li);
      return li;
    });

    /* sticky scene panel: one cross-fading layer per chapter */
    var sceneFrame = document.querySelector("[data-scene-frame]");
    var layers = [];
    if (sceneFrame) {
      chapters.forEach(function (ch) {
        var layer = document.createElement("div");
        layer.className = "scene-layer";
        layer.setAttribute("data-scene", ch.getAttribute("data-scene") || "1");
        sceneFrame.appendChild(layer);
        layers.push(layer);
      });
    }

    var activeIdx = 0;
    function paint() {
      items.forEach(function (li, i) {
        var state = i < activeIdx ? "past" : i === activeIdx ? "active" : "future";
        li.setAttribute("data-state", state);
      });
      layers.forEach(function (layer, i) {
        layer.classList.toggle("is-active", i === activeIdx);
      });
    }
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = chapters.indexOf(en.target);
          if (i > -1) { activeIdx = i; paint(); }
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    chapters.forEach(function (ch) { spy.observe(ch); });
    paint();
  }

  /* ---- footer year ---- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
