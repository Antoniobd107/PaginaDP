(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------------------------------------------------------
     Splash
  --------------------------------------------------------- */
  function initSplash() {
    var splash = $("[data-splash]");
    if (!splash) return;
    var hide = function () { splash.classList.add("is-out"); };
    if (document.readyState === "complete") setTimeout(hide, 450);
    else window.addEventListener("load", function () { setTimeout(hide, 350); });
    setTimeout(hide, 3200);
  }

  /* ---------------------------------------------------------
     Nav: scroll state + mobile menu + active link
  --------------------------------------------------------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 60) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var burger = $("[data-nav-burger]");
    var mobile = $("[data-nav-mobile]");
    if (burger && mobile) {
      var closeMenu = function () {
        mobile.setAttribute("aria-hidden", "true");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      };
      var openMenu = function () {
        mobile.setAttribute("aria-hidden", "false");
        burger.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      };
      burger.addEventListener("click", function () {
        var isOpen = mobile.getAttribute("aria-hidden") === "false";
        if (isOpen) closeMenu(); else openMenu();
      });
      $$("[data-nav-mobile] a").forEach(function (a) { a.addEventListener("click", closeMenu); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
      });
    }

    var here = document.body.getAttribute("data-page");
    if (here) {
      $$(".nav-link, [data-nav-mobile] a").forEach(function (a) {
        if (a.getAttribute("data-page-link") === here) a.classList.add("is-active");
      });
    }
  }

  /* ---------------------------------------------------------
     Smooth anchor scrolling (native)
  --------------------------------------------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href) return;
      var hashIndex = href.indexOf("#");
      if (hashIndex === -1) return;
      var path = href.slice(0, hashIndex);
      var hash = href.slice(hashIndex);
      if (hash === "#" || hash.length < 2) return;
      var samePage = path === "" || path === window.location.pathname.split("/").pop();
      if (!samePage) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - (window.innerWidth < 960 ? 64 : 80);
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------
     Reveal on scroll — universal, safe threshold + timeout net
  --------------------------------------------------------- */
  function initReveals() {
    var els = $$("[data-reveal], [data-reveal-stagger]");
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-revealed") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-revealed");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Tilt 3D subtle on cards
  --------------------------------------------------------- */
  function initTilt() {
    if (!fineHover) return;
    $$(".has-tilt").forEach(function (card) {
      var MAX = 6.5;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------------------------------------------------
     Magnetic buttons
  --------------------------------------------------------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-magnetic-strength") || "0.25");
      var inner = document.createElement("span");
      inner.className = "magnetic-inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add("has-magnetic");
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) - r.width / 2) * strength;
        ty = ((e.clientY - r.top) - r.height / 2) * strength;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        inner.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
        raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------------------------------------------------
     Open / closed status badge (uses manifest hours)
  --------------------------------------------------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function minutesToLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return pad(h) + ":" + pad(m);
  }
  function computeStatus(now) {
    var hours = data.hours;
    if (!hours) return null;
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var todays = hours[day] || [];
    for (var i = 0; i < todays.length; i++) {
      if (mins >= todays[i][0] && mins < todays[i][1]) {
        return { open: true, until: todays[i][1] };
      }
    }
    // find next opening within 7 days
    for (var d = 0; d < 8; d++) {
      var checkDay = (day + d) % 7;
      var ranges = hours[checkDay] || [];
      for (var j = 0; j < ranges.length; j++) {
        var start = ranges[j][0];
        if (d > 0 || mins < start) {
          return { open: false, day: checkDay, at: start, sameDay: d === 0 };
        }
      }
    }
    return { open: false };
  }
  var DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function initOpenStatus() {
    var badges = $$("[data-open-status]");
    if (!badges.length) return;
    var status = computeStatus(new Date());
    if (!status) return;
    badges.forEach(function (badge) {
      var dot = badge.querySelector(".status-dot") || badge;
      var label = badge.querySelector("[data-status-label]") || badge;
      if (status.open) {
        badge.classList.add("is-open");
        label.textContent = "Abierto ahora · cierra " + minutesToLabel(status.until);
      } else {
        badge.classList.add("is-closed");
        if (status.at !== undefined) {
          var dayLabel = status.sameDay ? "hoy" : DAY_NAMES[status.day];
          label.textContent = "Cerrado ahora · abre " + dayLabel + " a las " + minutesToLabel(status.at);
        } else {
          label.textContent = "Cerrado ahora";
        }
      }
    });
  }

  /* ---------------------------------------------------------
     Hero parallax (GSAP, gated by feature detection)
  --------------------------------------------------------- */
  function initHeroParallax() {
    if (!window.gsap || !window.ScrollTrigger || reduced) return;
    var bg = $(".hero-bg img");
    if (!bg) return;
    gsap.to(bg, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
  }

  /* ---------------------------------------------------------
     WhatsApp links — build hrefs from manifest at runtime
     (hardcoded fallback hrefs already present in HTML for no-JS)
  --------------------------------------------------------- */
  function initWaLinks() {
    if (!data.waLink) return;
    $$("[data-wa]").forEach(function (a) {
      var msg = a.getAttribute("data-wa") || "";
      a.setAttribute("href", data.waLink(msg));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  function boot() {
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initWaLinks, "initWaLinks");
    safe(initOpenStatus, "initOpenStatus");
    safe(initReveals, "initReveals");
    safe(initTilt, "initTilt");
    safe(initMagnetic, "initMagnetic");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}
      safe(initHeroParallax, "initHeroParallax");
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
