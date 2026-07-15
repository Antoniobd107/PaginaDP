(function () {
  "use strict";

  window.__BRAND__ = {
    name: "DietaStética",
    tagline: "Belleza que nace del bienestar",
    phone: "+34 609 565 252",
    phoneHref: "tel:+34609565252",
    whatsappNumber: "34609565252",
    instagram: "https://www.instagram.com/desteticacentro/",
    instagramHandle: "@desteticacentro",
    address: {
      line1: "Edificio Eurodom, entreplanta",
      line2: "Calle Luis Álvarez Lencero",
      city: "Badajoz",
      mapQuery: "Edificio Eurodom, Calle Luis Álvarez Lencero, Badajoz"
    },
    // 0 = Sunday ... 6 = Saturday
    hours: {
      1: [[10 * 60, 14 * 60 + 30], [16 * 60 + 30, 20 * 60 + 30]],
      2: [[10 * 60, 14 * 60 + 30], [16 * 60 + 30, 20 * 60 + 30]],
      3: [[10 * 60, 14 * 60 + 30], [16 * 60 + 30, 20 * 60 + 30]],
      4: [[10 * 60, 14 * 60 + 30], [16 * 60 + 30, 20 * 60 + 30]],
      5: [[10 * 60, 14 * 60 + 30], [16 * 60 + 30, 20 * 60 + 30]],
      6: [[10 * 60, 14 * 60 + 30]],
      0: []
    },
    hoursLabel: [
      { days: "Lunes a viernes", ranges: "10:00–14:30 y 16:30–20:30" },
      { days: "Sábados", ranges: "10:00–14:30" },
      { days: "Domingos", ranges: "Cerrado" }
    ]
  };

  window.__BRAND__.waLink = function (message) {
    var base = "https://wa.me/" + window.__BRAND__.whatsappNumber;
    return message ? base + "?text=" + encodeURIComponent(message) : base;
  };
})();
