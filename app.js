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

  function renderIntro(lang) {
    const html = (lang.intro.body || []).map((p) => `<p>${p}</p>`).join("");
    $(".intro-body").innerHTML = html;
  }

  function renderSenses(lang) {
    const grid = $("#sensesGrid");
    grid.innerHTML = "";
    for (const s of lang.senses) {
      const card = el("article", { class: "sense-card", "data-color": s.color },
        el("div", { class: "ico-wrap" }, iconSvg(s.icon)),
        el("h3", {}, s.name),
        el("p",  { class: "why" }, s.why),
        el("ul", {}, s.tips.map((t) => el("li", {}, t))),
        s.signs ? el("p", { class: "signs" }, s.signs) : null,
      );
      grid.append(card);
    }
  }

  function renderMethod5s(lang) {
    const grid = $("#method5sGrid");
    grid.innerHTML = "";
    for (const m of lang.method5s) {
      grid.append(el("article", { class: "five-s-card" },
        el("span", { class: "s-pill" }, m.s),
        el("h3", {}, m.title),
        el("p",  {}, m.body),
      ));
    }
  }

  function renderSigns(lang) {
    const stressUl = $("#signsStressList");
    const calmUl   = $("#signsCalmList");
    stressUl.innerHTML = ""; calmUl.innerHTML = "";
    lang.signsStress.list.forEach((t) => stressUl.append(el("li", {}, t)));
    lang.signsCalm.list.forEach((t)   => calmUl.append(el("li", {}, t)));
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
    for (const d of lang.planDimensions) {
      panel.append(el("div", { class: "plan-dim", "data-color": d.color },
        el("div", { class: "dim-head" },
          el("div", { class: "dim-ico" }, iconSvg(d.icon)),
          el("span", {}, d.name),
        ),
        el("p", {}, age.items[d.key] || ""),
      ));
    }
  }

  function renderTips(lang) {
    const grid = $("#tipsGrid");
    grid.innerHTML = "";
    for (const t of lang.tips) {
      grid.append(el("article", { class: "tip-card" },
        el("div", { class: "tip-ico" }, iconSvg(t.icon)),
        el("h3", {}, t.title),
        el("p",  {}, t.body),
      ));
    }
  }

  function renderResearch(lang) {
    const grid = $("#researchGrid");
    grid.innerHTML = "";
    const linkLabel = lang.lang === "ar" ? "اقرأ المقال" : "קראו את המאמר";
    for (const r of lang.research) {
      grid.append(el("article", { class: "research-card" },
        el("h3", {}, r.title),
        el("p",  {}, r.body),
        el("a",  { href: r.url, target: "_blank", rel: "noopener" }, linkLabel),
      ));
    }
  }

  // --- language ------------------------------------------------------------
  function applyLanguage(code) {
    const lang = CONTENT[code] || CONTENT[DEFAULT_LANG];
    document.documentElement.lang = lang.lang;
    document.documentElement.dir  = lang.dir;
    document.title = (lang.hero.title || "SENSE & NIDCAP") + " — " +
                     (code === "ar" ? "دليل أهل الخديج" : "מדריך להורי הפג");

    renderBoundText(lang);
    renderIntro(lang);
    renderSenses(lang);
    renderMethod5s(lang);
    renderSigns(lang);
    renderPlan(lang);
    renderTips(lang);
    renderResearch(lang);

    // language-switch label always shows the OTHER language
    const switchBtn = $("#langSwitch");
    switchBtn.textContent = lang.switchLabel;
    switchBtn.setAttribute("data-next-lang", code === "he" ? "ar" : "he");
  }

  function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const code = (stored && CONTENT[stored]) ? stored : DEFAULT_LANG;
    applyLanguage(code);

    $("#langSwitch").addEventListener("click", (e) => {
      const next = e.currentTarget.getAttribute("data-next-lang") || "ar";
      localStorage.setItem(STORAGE_KEY, next);
      applyLanguage(next);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
