/* =========================================================================
   App: renders bilingual NICU SPA from window.CONTENT
   ========================================================================= */
(() => {
  "use strict";

  const STORAGE_KEY = "nicu-spa-lang";
  const DEFAULT_LANG = "he";
  const CONTENT = window.CONTENT;

  // --- helpers --------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const get = (obj, path) =>
    path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      n.append(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  };

  // Fisher–Yates shuffle — returns a new shuffled copy, leaves input untouched.
  const shuffled = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const iconSvg = (id) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${id}`);
    svg.append(use);
    return svg;
  };

  // --- renderers ------------------------------------------------------------
  function renderBoundText(lang) {
    $$("[data-bind]").forEach((node) => {
      const path = node.getAttribute("data-bind");
      const value = get(lang, path);
      if (value != null) node.textContent = value;
    });
    $$("[data-bind-html]").forEach((node) => {
      const path = node.getAttribute("data-bind-html");
      const value = get(lang, path);
      if (value != null) node.innerHTML = value;
    });
  }

  function renderHeroSubtitle(lang) {
    const wrap = $("#heroSubtitle");
    if (!wrap) return;
    const paragraphs = (lang.hero && lang.hero.subtitle) || [];
    // Inline HTML is intentional — we wrap the word "SENSE" in <strong>
    // inside the source content for emphasis.
    wrap.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join("");
  }

  // Photo shown on the back of each sense card. Keyed by sense.key so it
  // stays language-agnostic (he/ar/ru all share the same image).
  const SENSE_BACK_IMAGES = {
    touch:   "images/nurse-incubator.jpg",
    hearing: "images/nurse-cuddle.jpg",
    smell:   "images/father-kangaroo.jpg",
    taste:   "images/teast.jpg",
    sight:   "images/sensory-cards.jpg",
  };

  function renderSenses(lang) {
    const grid = $("#sensesGrid");
    grid.innerHTML = "";
    for (const s of lang.senses) {
      // Front face — the existing card content.
      const front = el("article", { class: "sense-card face-front", "data-color": s.color },
        el("div", { class: "ico-wrap" }, iconSvg(s.icon)),
        el("h3", {}, s.name),
        el("p",  { class: "why" }, s.why),
        el("ul", {}, s.tips.map((t) => el("li", {}, t))),
        s.signs ? el("p", { class: "signs" }, s.signs) : null,
        el("span", { class: "flip-hint", "aria-hidden": "true" }, "↻"),
      );

      // Back face — the photo + a small label so users still know which sense.
      const backImg = SENSE_BACK_IMAGES[s.key];
      const back = el("div", {
        class: "face-back",
        "data-color": s.color,
        style: backImg ? `background-image:url('${backImg}');` : "",
      },
        el("span", { class: "back-label" }, s.name),
        el("span", { class: "back-hint", "aria-hidden": "true" }, "↺"),
      );

      // Button wrapper — keyboard-accessible, holds the 3D flip animation.
      const flip = el("button", {
        class: "sense-flip",
        type: "button",
        "aria-pressed": "false",
        "aria-label": s.name,
        onclick: function () {
          const flipped = this.classList.toggle("is-flipped");
          this.setAttribute("aria-pressed", flipped ? "true" : "false");
        },
      },
        el("div", { class: "card-inner" }, front, back),
      );

      grid.append(flip);
    }
  }

  function renderSigns(lang) {
    const stressUl = $("#signsStressList");
    const calmUl   = $("#signsCalmList");
    stressUl.innerHTML = ""; calmUl.innerHTML = "";
    lang.signsStress.list.forEach((t) => stressUl.append(el("li", {}, t)));
    lang.signsCalm.list.forEach((t)   => calmUl.append(el("li", {}, t)));

    // Closing rest-and-care note below both cards.
    const noteEl = $("#signsNote");
    if (noteEl) {
      const n = lang.signsNote;
      if (n) {
        noteEl.innerHTML = "";
        noteEl.append(
          el("div", { class: "howto-note-ico", "aria-hidden": "true" }, iconSvg("clock")),
          el("div", { class: "howto-note-body" },
            el("h3", {}, n.title || ""),
            el("p",  {}, n.body  || ""),
          ),
        );
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
        noteEl.innerHTML = "";
      }
    }
  }

  let selectedAgeIdx = 0;
  function renderPlan(lang) {
    const tabs = $("#planTabs");
    const panel = $("#planPanel");
    tabs.innerHTML = "";

    lang.planAges.forEach((age, idx) => {
      const btn = el("button", {
        class: "plan-tab",
        role: "tab",
        "aria-selected": idx === selectedAgeIdx ? "true" : "false",
        type: "button",
        onclick: () => {
          selectedAgeIdx = idx;
          renderPlan(lang);
        },
      }, age.label);
      tabs.append(btn);
    });

    panel.innerHTML = "";
    const age = lang.planAges[selectedAgeIdx];
    const durations = (lang.planDurations || {})[age.key] || {};
    for (const d of lang.planDimensions) {
      const dur = durations[d.key];
      panel.append(el("div", { class: "plan-dim", "data-color": d.color },
        el("div", { class: "dim-head" },
          el("div", { class: "dim-ico" }, iconSvg(d.icon)),
          el("span", {}, d.name),
        ),
        el("p", {}, age.items[d.key] || ""),
        dur ? el("p", { class: "dim-duration" }, dur) : null,
      ));
    }
  }

  function renderIntroBadges(lang) {
    const wrap = $("#introBadges");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (const b of (lang.intro && lang.intro.badges) || []) {
      wrap.append(el("span", { class: "badge" }, b));
    }
  }

  function renderParentLed(lang) {
    const grid = $("#parentLedGrid");
    if (!grid || !lang.parentLed) return;
    grid.innerHTML = "";
    for (const t of lang.parentLed.topics) {
      // Each topic links to a section on the page; clicking smooth-scrolls
      // there (the global `scroll-behavior: smooth` handles the animation).
      const card = el("a", {
        class: "parent-led-card",
        href: t.target || "#",
        "aria-label": t.title,
      },
        el("div", { class: "pl-ico" }, iconSvg(t.icon)),
        el("h3", {}, t.title),
        el("p",  {}, t.body),
        el("span", { class: "pl-chev", "aria-hidden": "true" }, "↓"),
      );
      grid.append(card);
    }
  }

  function renderEnvironment(lang) {
    const grid = $("#environmentGrid");
    const legend = $("#environmentLegend");
    if (!grid || !lang.environment) return;

    // Legend
    legend.innerHTML = "";
    const L = lang.environment.legend;
    [["positive", L.positive], ["neutral", L.neutral], ["clinical", L.clinical]].forEach(([k, label]) => {
      legend.append(el("span", { class: "legend-item" },
        el("span", { class: `dot ${k}` }),
        label,
      ));
    });

    // Cards per sense
    grid.innerHTML = "";
    for (const s of lang.environment.senses) {
      const ul = el("ul", {},
        s.items.map((it) => el("li", { "data-kind": it.kind }, it.text)),
      );
      grid.append(el("article", { class: "env-card", "data-color": s.color },
        el("div", { class: "env-head" },
          el("div", { class: "env-ico" }, iconSvg(s.icon)),
          el("h3", {}, s.name),
        ),
        ul,
      ));
    }
  }

  function renderHowTo(lang) {
    const grid = $("#howToGrid");
    if (!grid || !lang.howTo) return;
    grid.innerHTML = "";
    for (const g of lang.howTo.guides) {
      const summary = el("summary", { class: "howto-summary" },
        el("div", { class: "ht-ico" }, iconSvg(g.icon)),
        el("div", { class: "ht-title-wrap" },
          el("h3", {}, g.title),
          g.duration ? el("span", { class: "ht-duration" }, g.duration) : null,
        ),
        chevronSvg(),
      );
      const body = el("div", { class: "howto-body" },
        el("ol", {}, g.steps.map((s) => el("li", {}, s))),
      );
      const details = el("details", { class: "howto-card", "data-color": g.color },
        summary,
        body,
      );
      grid.append(details);
    }

    // Optional closing note at the bottom of the section.
    const noteEl = $("#howToNote");
    if (noteEl) {
      const n = lang.howTo.note;
      if (n) {
        noteEl.innerHTML = "";
        noteEl.append(
          el("div", { class: "howto-note-ico", "aria-hidden": "true" }, iconSvg("clock")),
          el("div", { class: "howto-note-body" },
            el("h3", {}, n.title || ""),
            el("p",  {}, n.body  || ""),
          ),
        );
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
        noteEl.innerHTML = "";
      }
    }
  }

  function chevronSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "ht-chev");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  // Per-language strings that aren't part of CONTENT (UI chrome / labels)
  const RESEARCH_LINK = {
    he: "קראו את המאמר",
    ar: "اقرأ المقال",
    ru: "Читать статью",
  };
  const TITLE_SUFFIX = {
    he: "מדריך להורי הפג",
    ar: "دليل أهل الخديج",
    ru: "Руководство для родителей",
  };

  function renderResearch(lang) {
    const grid = $("#researchGrid");
    grid.innerHTML = "";
    const linkLabel = RESEARCH_LINK[lang.lang] || RESEARCH_LINK.he;
    for (const r of lang.research) {
      grid.append(el("article", { class: "research-card" },
        el("h3", {}, r.title),
        el("p",  {}, r.body),
        el("a",  { href: r.url, target: "_blank", rel: "noopener" }, linkLabel),
      ));
    }
  }

  // --- hero carousel --------------------------------------------------------
  // Full photo pool. `pos` is the crop focal point (see .carousel-slide[data-pos]
  // in styles.css) so off-center subjects stay in frame after the cover-crop.
  const CAROUSEL_POOL = [
    { src: "images/hero.jpg",          pos: "right"  },
    { src: "images/shush.jpg",         pos: "right"  },
    { src: "images/incubator.jpg",     pos: "bottom" },
    { src: "images/care.jpg",          pos: "center" },
    { src: "images/hand.jpg",          pos: "center" },
    { src: "images/nurse-kiss.jpg",    pos: "center" },
    { src: "images/baby-bath.jpg",     pos: "center" },
    { src: "images/nurse-monitor.jpg", pos: "center" },
    { src: "images/nurse-cradle.jpg",  pos: "center" },
  ];
  // How many photos to show per visit. Fewer than the pool, so each load
  // surfaces a different mix.
  const CAROUSEL_COUNT = 5;

  function renderCarousel() {
    const track = $(".carousel-track");
    if (!track) return;

    const count = Math.min(CAROUSEL_COUNT, CAROUSEL_POOL.length);
    const pick = shuffled(CAROUSEL_POOL).slice(0, count);

    // Drives the CSS animation duration (calc(--slide-time * --carousel-count))
    // so the scroll speed stays constant no matter how many were picked.
    const carousel = track.closest(".hero-carousel");
    if (carousel) carousel.style.setProperty("--carousel-count", String(count));

    // Two IDENTICAL halves: the track animates by exactly -50%, so both halves
    // must hold the same slides in the same order for the wrap to be seamless.
    track.innerHTML = "";
    for (let half = 0; half < 2; half++) {
      for (const item of pick) {
        const attrs = { class: "carousel-slide", "data-pos": item.pos };
        if (half === 1) attrs["aria-hidden"] = "true";
        track.append(el("div", attrs,
          el("img", { src: item.src, alt: "", loading: "lazy", decoding: "async" }),
        ));
      }
    }
  }

  // --- language ------------------------------------------------------------
  function updatePickerActive(code) {
    $$(".lang-pill").forEach((btn) => {
      if (btn.getAttribute("data-lang") === code) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });
  }

  function applyLanguage(code) {
    const lang = CONTENT[code] || CONTENT[DEFAULT_LANG];
    document.documentElement.lang = lang.lang;
    document.documentElement.dir  = lang.dir;
    document.title = (lang.hero.title || "SENSE") + " — " +
                     (TITLE_SUFFIX[code] || TITLE_SUFFIX.he);

    renderBoundText(lang);
    renderHeroSubtitle(lang);
    renderIntroBadges(lang);
    renderParentLed(lang);
    renderEnvironment(lang);
    renderSenses(lang);
    renderSigns(lang);
    renderPlan(lang);
    renderHowTo(lang);
    renderResearch(lang);

    updatePickerActive(code);
  }

  // Detect the visitor's preferred language from the browser. We walk
  // navigator.languages (the user's full preference order) and pick the
  // first tag whose base code (`he`/`ar`/`ru`) maps to a supported locale.
  // Falls back to DEFAULT_LANG (Hebrew) for everything else — e.g. English
  // or French speakers see Hebrew, matching the hospital's primary language.
  function detectLang() {
    const list = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ""];
    for (const tag of list) {
      let base = String(tag || "").toLowerCase().split("-")[0];
      if (base === "iw") base = "he";   // legacy ISO code for Hebrew
      if (base === "ji") base = "yi";   // no-op but documents intent
      if (CONTENT[base]) return base;
    }
    return DEFAULT_LANG;
  }

  function init() {
    // Order of precedence:
    //  1. User's prior manual choice (localStorage)
    //  2. Browser language preference
    //  3. Hebrew default
    const stored = localStorage.getItem(STORAGE_KEY);
    const code = (stored && CONTENT[stored]) ? stored : detectLang();
    applyLanguage(code);

    // Hero photos: random subset, shuffled fresh on every page load.
    renderCarousel();

    $$(".lang-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-lang");
        if (!next || !CONTENT[next]) return;
        localStorage.setItem(STORAGE_KEY, next);
        applyLanguage(next);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
