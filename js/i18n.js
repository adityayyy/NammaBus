/* ============================================================
   NammaBus - i18n.js  (Phase 5)
   English / Kannada language toggle. Choice stored in
   localStorage key 'lang'. Any element with a data-i18n
   attribute is translated when the language changes.
   ============================================================ */

(function () {
  'use strict';

  const DICT = {
    en: {
      'nav.home': 'Home',
      'nav.map': 'Map',
      'nav.bookings': 'My Bookings',
      'nav.admin': 'Admin',
      'common.simulated': 'Simulated data',
      'common.demo': 'Demo only, no real money',
      'brand.tag': '',
      'hero.eyebrow': 'Karnataka · Student prototype',
      'hero.title': 'Track. Book.',
      'hero.title2': 'Ride easy.',
      'hero.lead': 'Search a route, watch buses move on the map, pick your seat and get a ticket. Every bus and price here is simulated for demonstration only.',
      'hero.search': 'Search buses →',
      'search.from': 'From',
      'search.to': 'To',
      'search.date': 'Date',
      'search.search': 'Search',
      'popular.title': 'Popular routes',
      'popular.sub': 'Tap a card to open it on the live map. All times and fares are demo values.',
      'how.title': 'How it works',
      'how.sub': 'Four steps from search to ticket.',
      'how.s1': 'Search a route',
      'how.s1d': 'Pick where you start, where you go and the date.',
      'how.s2': 'Watch the map',
      'how.s2d': 'Follow simulated buses and compare ETAs.',
      'how.s3': 'Pick your seats',
      'how.s3d': 'Choose a 2+2 seat layout; seats lock for 5 minutes.',
      'how.s4': 'Get a ticket',
      'how.s4d': 'Complete the demo payment and print your ticket.',
      'footer.protocol': 'NammaBus · Student prototype, not an official KSRTC/BMTC service.',
      'footer.demo': 'All buses, fares and payments are simulated. No real money is handled.',
      'footer.protocol.map': 'NammaBus · Student prototype, not an official KSRTC/BMTC service.',
      'footer.demo.map': 'Map is stylised, not a real geographic survey. All bus data is simulated.',
      'map.title': 'Map',
      'map.summary.default': 'Pick a route on the home page to highlight it here. All buses shown are simulated.',
      'map.buses': 'Buses on this route',
      'map.meta.default': 'All active buses',
      'map.change': '← Change route',
      'map.legend': 'Legend',
      'map.free': 'Many seats free',
      'map.mid': 'Filling up',
      'map.low': 'Nearly full',
      'map.route': 'Blue line = selected route',
      'map.timetravel': 'Developer: time travel',
      'map.realtime': 'Real time',
      'map.follow': 'Follow',
      'map.stopfollow': 'Stop follow',
      'map.book': 'Book seats →',
      'tip.fullscreen': 'Full screen',
      'tip.hidePanels': 'Hide panels',
      'tip.showPanels': 'Show panels',
      'tip.recenter': 'Re-centre',
      'tip.follow': 'Follow bus',
      'tip.theme': 'Theme',
      'tip.sidebar': 'Sidebar'
    },
    kn: {
      'nav.home': 'ಮುಖಪುಟ',
      'nav.map': 'ನಕ್ಷೆ',
      'nav.bookings': 'ನನ್ನ ಬುಕಿಂಗ್',
      'nav.admin': 'ನಿರ್ವಾಹಕ',
      'common.simulated': 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಡೇಟಾ',
      'common.demo': 'ಡೆಮೊ ಮಾತ್ರ, ನಿಜ ಹಣವಿಲ್ಲ',
      'brand.tag': 'ಲೈವ್',
      'hero.eyebrow': 'ಕರ್ನಾಟಕ · ವಿದ್ಯಾರ್ಥಿ ಪ್ರೋಟೋಟೈಪ್',
      'hero.title': 'ಹುಡುಕಿ. ಬುಕ್ ಮಾಡಿ.',
      'hero.title2': 'ಸುಲಭ ಪ್ರಯಾಣ.',
      'hero.lead': 'ಮಾರ್ಗ ಹುಡುಕಿ, ನಕ್ಷೆಯಲ್ಲಿ ಬಸ್ ನಡೆಯುವುದನ್ನು ವೀಕ್ಷಿಸಿ, ಆಸನ ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಟಿಕೆಟ್ ಪಡೆಯಿರಿ. ಎಲ್ಲಾ ಬಸ್ ಮತ್ತು ದರಗಳು ಪ್ರದರ್ಶನಕ್ಕಾಗಿ ಸಿಮ್ಯುಲೇಟ್ ಮಾಡಲಾಗಿದೆ.',
      'hero.search': 'ಬಸ್ ಹುಡುಕಿ →',
      'search.from': 'ಇಂದ',
      'search.to': 'ಗೆ',
      'search.date': 'ದಿನಾಂಕ',
      'search.search': 'ಹುಡುಕಿ',
      'popular.title': 'ಜನಪ್ರಿಯ ಮಾರ್ಗಗಳು',
      'popular.sub': 'ನಕ್ಷೆಯಲ್ಲಿ ತೆರೆಯಲು ಕಾರ್ಡ್ ಟ್ಯಾಪ್ ಮಾಡಿ. ಎಲ್ಲಾ ಸಮಯ ಮತ್ತು ದರಗಳು ಡೆಮೊ.',
      'how.title': 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
      'how.sub': 'ಹುಡುಕಾಟದಿಂದ ಟಿಕೆಟ್‌ಗೆ ನಾಲ್ಕು ಹಂತಗಳು.',
      'how.s1': 'ಮಾರ್ಗ ಹುಡುಕಿ',
      'how.s1d': 'ನೀವು ಶುರು ಮಾಡುವ ಸ್ಥಳ, ತಲುಪುವ ಜಾಗ ಮತ್ತು ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ.',
      'how.s2': 'ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ',
      'how.s2d': 'ಸಿಮ್ಯುಲೇಟ್ ಬಸ್ ಗಳನ್ನು ಅನುಸರಿಸಿ ಮತ್ತು ETA ಹೋಲಿಕೆ ಮಾಡಿ.',
      'how.s3': 'ಆಸನ ಆಯ್ಕೆ',
      'how.s3d': '2+2 ಆಸನ ವಿನ್ಯಾಸ; ಆಸನಗಳು 5 ನಿಮಿಷ ಲಾಕ್ ಆಗುತ್ತವೆ.',
      'how.s4': 'ಟಿಕೆಟ್ ಪಡೆಯಿರಿ',
      'how.s4d': 'ಡೆಮೊ ಪೇಮೆಂಟ್ ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ಟಿಕೆಟ್ ಪ್ರಿಂಟ್ ಮಾಡಿ.',
      'footer.protocol': 'ನಮ್ಮಬಸ್ ಲೈವ್ · ವಿದ್ಯಾರ್ಥಿ ಪ್ರೋಟೋಟೈಪ್, ಅಧಿಕೃತ KSRTC/BMTC ಸೇವೆಯಲ್ಲ.',
      'footer.demo': 'ಎಲ್ಲಾ ಬಸ್, ದರ ಮತ್ತು ಪೇಮೆಂಟ್ ಸಿಮ್ಯುಲೇಟ್. ನಿಜ ಹಣವಿಲ್ಲ.',
      'footer.protocol.map': 'ನಮ್ಮಬಸ್ ಲೈವ್ · ವಿದ್ಯಾರ್ಥಿ ಪ್ರೋಟೋಟೈಪ್, ಅಧಿಕೃತ KSRTC/BMTC ಸೇವೆಯಲ್ಲ.',
      'footer.demo.map': 'ನಕ್ಷೆ ಶೈಲ್ಯುಕ್ತ, ನಿಜ ಭೌಗೋಳಿಕ ಸಮೀಕ್ಷೆಯಲ್ಲ. ಎಲ್ಲಾ ಬಸ್ ಡೇಟಾ ಸಿಮ್ಯುಲೇಟ್.',
      'map.title': 'ಲೈವ್ ನಕ್ಷೆ',
      'map.summary.default': 'ಮುಖಪುಟದಲ್ಲಿ ಮಾರ್ಗ ಆಯ್ಕೆಮಾಡಿ. ಎಲ್ಲಾ ಬಸ್ ಸಿಮ್ಯುಲೇಟ್.',
      'map.buses': 'ಈ ಮಾರ್ಗದಲ್ಲಿ ಬಸ್ ಗಳು',
      'map.meta.default': 'ಎಲ್ಲಾ ಸಕ್ರಿಯ ಬಸ್ ಗಳು',
      'map.change': '← ಮಾರ್ಗ ಬದಲಿಸಿ',
      'map.legend': 'ಲೆಜೆಂಡ್',
      'map.free': 'ಅನೇಕ ಆಸನ ಖಾಲಿ',
      'map.mid': 'ತುಂಬುತ್ತಿದೆ',
      'map.low': 'ಬಹುತೇಕ ತುಂಬಿದೆ',
      'map.route': 'ನೀಲಿ ರೇಖೆ = ಆಯ್ದ ಮಾರ್ಗ',
      'map.timetravel': 'ಡೆವಲಪರ್: ಸಮಯ ಪ್ರಯಾಣ',
      'map.realtime': 'ನಿಜ ಸಮಯ',
      'map.follow': 'ಅನುಸರಿಸಿ',
      'map.stopfollow': 'ಅನುಸರಣೆ ನಿಲ್ಲಿಸಿ',
      'map.book': 'ಆಸನ ಬುಕ್ ಮಾಡಿ →',
      'tip.fullscreen': 'ಪೂರ್ಣ ಪರದೆ',
      'tip.hidePanels': 'ಪ್ಯಾನೆಲ್ ಮುಚ್ಚಿ',
      'tip.showPanels': 'ಪ್ಯಾನೆಲ್ ತೋರಿಸಿ',
      'tip.recenter': 'ಮರು ಕೇಂದ್ರೀಕರಿಸಿ',
      'tip.follow': 'ಬಸ್ ಅನುಸರಿಸಿ',
      'tip.theme': 'ಥೀಮ್',
      'tip.sidebar': 'ಪಾರ್ಶ್ವಪಟ್ಟಿ'
    }
  };

  const KEY = 'lang';

  function getLang() { return localStorage.getItem(KEY) === 'kn' ? 'kn' : 'en'; }

  function t(key) {
    const lang = getLang();
    const dict = DICT[lang] || DICT.en;
    return dict[key] !== undefined ? dict[key] : (DICT.en[key] || key);
  }

  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      const spec = el.getAttribute('data-i18n-attr'); // e.g. "title:tip.recenter|aria-label:tip.recenter"
      spec.split('|').forEach(function (pair) {
        const parts = pair.split(':');
        const attr = parts[0];
        const key = parts.slice(1).join(':');
        const val = t(key);
        if (val) el.setAttribute(attr, val);
      });
    });
    document.documentElement.lang = getLang() === 'kn' ? 'kn' : 'en';
    updateToggleLabel();
  }

  function setLang(lang) {
    localStorage.setItem(KEY, lang);
    applyI18n();
  }

  function toggleLang() {
    setLang(getLang() === 'en' ? 'kn' : 'en');
  }

  function updateToggleLabel() {
    const btn = document.getElementById('langToggle');
    if (btn) {
      const next = getLang() === 'en' ? 'ಕ' : 'EN';
      btn.textContent = next;
      btn.setAttribute('aria-label', getLang() === 'en' ? 'Switch to Kannada' : 'Switch to English');
    }
  }

  function init() {
    // attach toggle
    const btn = document.getElementById('langToggle');
    if (btn) btn.addEventListener('click', toggleLang);
    applyI18n();
  }

  window.I18N = { t: t, getLang: getLang, setLang: setLang, applyI18n: applyI18n, init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();