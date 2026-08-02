/* =========================================================
   Fitness Park Offenbach — F9
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Jahreszahl im Footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav: Hintergrund ab Scroll ---------- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobiles Menü ---------- */
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    if (!burger || !navLinks) return;
    navLinks.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü öffnen');
  }

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
        closeMenu();
        burger.focus();
      }
    });
  }

  /* ---------- Reveal beim Scrollen ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Zahlen hochzählen ---------- */
  var counters = document.querySelectorAll('[data-count]');

  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;

    if (reduced) {
      el.textContent = target.toLocaleString('de-DE');
      return;
    }

    var start = null;
    var dur = 1400;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('de-DE');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- Longevity: Jahrzehnte ---------- */
  var DECADES = {
    '20': {
      title: 'Kapazität aufbauen',
      lead: 'Das Jahrzehnt mit der höchsten Rendite. Was du jetzt an Muskelmasse, ' +
            'Knochendichte und Bewegungsqualität aufbaust, zehrst du dein Leben lang auf.',
      bullets: [
        'Technik vor Gewicht — saubere Muster, bevor die Last steigt',
        'Progressive Belastungssteigerung mit klarer Struktur',
        'Grundlagenausdauer als Basis für alles Weitere'
      ],
      bars: { kraft: 45, mobilitaet: 15, ausdauer: 25, regeneration: 15 }
    },
    '30': {
      title: 'Substanz halten',
      lead: 'Job, Familie, weniger Zeit. Jetzt entscheidet nicht das perfekte Programm, ' +
            'sondern das, was du drei Mal pro Woche wirklich durchziehst.',
      bullets: [
        'Effiziente Grundübungen statt Programmen mit 14 Stationen',
        'Gegenspieler zum Sitzen: Hüfte, Brustwirbelsäule, Schultern',
        'Kraft halten ist ab hier keine Selbstverständlichkeit mehr'
      ],
      bars: { kraft: 40, mobilitaet: 25, ausdauer: 20, regeneration: 15 }
    },
    '40': {
      title: 'Gegen den Abbau arbeiten',
      lead: 'Ab etwa hier verliert der Körper ohne Reiz messbar Muskelmasse. ' +
            'Krafttraining ist in diesem Jahrzehnt kein Hobby mehr, sondern Vorsorge.',
      bullets: [
        'Krafttraining als feste Größe, nicht als Ergänzung',
        'Beweglichkeit gezielt trainieren, nicht nur dehnen',
        'Belastung und Erholung bewusster steuern als mit 25'
      ],
      bars: { kraft: 40, mobilitaet: 25, ausdauer: 20, regeneration: 15 }
    },
    '50': {
      title: 'Belastbarkeit sichern',
      lead: 'Jetzt zählt, was im Alltag trägt: aus dem Stuhl aufstehen ohne Hände, ' +
            'Treppen ohne Pause, Einkäufe ohne Rückenschmerzen.',
      bullets: [
        'Beinkraft und Rumpfstabilität mit hoher Priorität',
        'Gleichgewicht als eigener Trainingsinhalt',
        'Gelenkschonende Alternativen für jede Übung verfügbar'
      ],
      bars: { kraft: 35, mobilitaet: 25, ausdauer: 20, regeneration: 20 }
    },
    '60': {
      title: 'Selbstständig bleiben',
      lead: 'Das Ziel ist unspektakulär und enorm wichtig: Kraft, Gleichgewicht und ' +
            'Beweglichkeit, die dich unabhängig halten. Dafür ist es nie zu spät.',
      bullets: [
        'Sturzprophylaxe durch Gleichgewicht und Reaktionskraft',
        'Geführte Geräte mit feiner Gewichtsabstufung',
        'Tempo und Umfang individuell — auch mit Vorerkrankungen'
      ],
      bars: { kraft: 30, mobilitaet: 30, ausdauer: 15, regeneration: 25 }
    }
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.decade-tab'));
  var decTitle = document.getElementById('decTitle');
  var decLead = document.getElementById('decLead');
  var decList = document.getElementById('decList');
  var panel = document.getElementById('panel-decade');
  var bars = document.querySelectorAll('.bar');

  function renderDecade(key) {
    var d = DECADES[key];
    if (!d) return;

    decTitle.textContent = d.title;
    decLead.textContent = d.lead;

    decList.innerHTML = '';
    d.bullets.forEach(function (b) {
      var li = document.createElement('li');
      li.textContent = b;
      decList.appendChild(li);
    });

    bars.forEach(function (bar) {
      var val = d.bars[bar.getAttribute('data-key')] || 0;
      bar.querySelector('.bar__fill').style.width = val + '%';
      bar.querySelector('.bar__val').textContent = val + '%';
    });

    if (panel) panel.setAttribute('aria-labelledby', 'tab-' + key);
  }

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    renderDecade(tab.getAttribute('data-decade'));
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });

    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  if (tabs.length) renderDecade('20');

  /* ---------- Kursplan: Zeitraster, Filter, Termin-Suche ---------- */
  (function kursplan() {
    var root = document.getElementById('kursplan');
    var cal = document.getElementById('cal');
    var list = document.getElementById('scheduleList');
    if (!root || !cal || !list) return;

    var DAYS = [
      { key: 1, label: 'Montag', short: 'Mo' },
      { key: 2, label: 'Dienstag', short: 'Di' },
      { key: 3, label: 'Mittwoch', short: 'Mi' },
      { key: 4, label: 'Donnerstag', short: 'Do' },
      { key: 5, label: 'Freitag', short: 'Fr' },
      { key: 6, label: 'Samstag', short: 'Sa' },
      { key: 0, label: 'Sonntag', short: 'So' }
    ];

    // Zwei Zeitbänder statt eines durchgehenden Rasters — die Mittagslücke
    // zwischen 13 und 17 Uhr würde sonst die halbe Höhe fressen.
    var SLOT = 15;                       // Minuten pro Rasterzeile
    var BANDS = [
      { from: 9 * 60, to: 13 * 60 },     // Vormittag
      { from: 17 * 60, to: 21 * 60 }     // Abend
    ];

    function toMin(t) {
      var p = t.split(':');
      return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    }

    // Rasterzeile für einen Zeitpunkt (1-basiert, Kopfzeile ist Zeile 1)
    function rowFor(min) {
      var row = 2;
      for (var i = 0; i < BANDS.length; i++) {
        var b = BANDS[i];
        if (min <= b.to) return row + Math.round((min - b.from) / SLOT);
        row += Math.round((b.to - b.from) / SLOT) + 1; // +1 für die Trennzeile
      }
      return row;
    }

    // Kurse aus der Liste einlesen — sie bleibt die einzige Datenquelle
    var courses = [];
    Array.prototype.forEach.call(list.querySelectorAll('.day'), function (dayEl) {
      var day = parseInt(dayEl.getAttribute('data-day'), 10);
      Array.prototype.forEach.call(dayEl.querySelectorAll('.course'), function (li) {
        courses.push({
          day: day,
          start: toMin(li.getAttribute('data-start')),
          end: toMin(li.getAttribute('data-end')),
          cat: li.getAttribute('data-cat'),
          name: li.querySelector('.course__name').textContent.trim(),
          timeText: li.querySelector('.course__time').textContent.trim(),
          li: li
        });
      });
    });
    if (!courses.length) return;

    var slotRows = BANDS.reduce(function (n, b) { return n + (b.to - b.from) / SLOT; }, 0);
    var today = new Date().getDay();

    /* --- Raster aufbauen --- */
    var rowsCss = BANDS.map(function (b) {
      return 'repeat(' + ((b.to - b.from) / SLOT) + ', var(--slot))';
    }).join(' var(--gap-row) ');
    cal.style.gridTemplateRows = 'auto ' + rowsCss;
    cal.hidden = false;

    var frag = document.createDocumentFragment();

    function add(cls, row, col, span, text) {
      var el = document.createElement('div');
      el.className = cls;
      el.style.gridRow = span ? row + ' / span ' + span : String(row);
      el.style.gridColumn = col;
      if (text) el.textContent = text;
      frag.appendChild(el);
      return el;
    }

    // Spaltenflächen zuerst, damit sie unter Linien und Kacheln liegen
    var bodyRows = slotRows + BANDS.length - 1;
    DAYS.forEach(function (d, i) { add('cal__col', 2, i + 2, bodyRows); });

    // Kopfzeile
    add('cal__corner', 1, 1);
    DAYS.forEach(function (d, i) {
      var head = add('cal__head', 1, i + 2);
      head.innerHTML = '<span class="cal__head-long">' + d.label + '</span>' +
                       '<span class="cal__head-short">' + d.short + '</span>';
      if (d.key === today) {
        head.classList.add('is-today');
        head.insertAdjacentHTML('beforeend', '<span class="cal__today">heute</span>');
      }
    });

    // Stundenlinien und Achsenbeschriftung
    BANDS.forEach(function (b) {
      for (var m = b.from; m < b.to; m += 60) {
        var r = rowFor(m);
        add('cal__hour', r, '2 / -1', 4);
        add('cal__time', r, 1, 4, String(Math.floor(m / 60)).padStart(2, '0') + ':00');
      }
    });

    // Trennzeile für die Mittagspause
    var breakRow = 2 + (BANDS[0].to - BANDS[0].from) / SLOT;
    add('cal__break', breakRow, '1 / -1', 1, 'Mittagspause');

    // Spalte des heutigen Tages hinterlegen
    var todayIdx = DAYS.map(function (d) { return d.key; }).indexOf(today);
    if (todayIdx > -1) add('cal__todaycol', 2, todayIdx + 2, bodyRows);

    // Kurskacheln
    courses.forEach(function (c) {
      var col = DAYS.map(function (d) { return d.key; }).indexOf(c.day) + 2;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot' + (c.end - c.start <= 30 ? ' slot--short' : '');
      btn.setAttribute('data-cat', c.cat);
      btn.setAttribute('data-name', c.name);
      btn.style.gridColumn = String(col);
      btn.style.gridRow = rowFor(c.start) + ' / span ' + ((c.end - c.start) / SLOT);
      btn.innerHTML =
        '<span class="slot__time">' + c.timeText + '</span>' +
        '<span class="slot__name">' + c.name + '</span>';
      btn.setAttribute('aria-label', c.name + ', ' + c.timeText + ' Uhr — alle Termine anzeigen');
      frag.appendChild(btn);
      c.btn = btn;
    });

    cal.appendChild(frag);
    root.classList.add('is-enhanced');

    /* --- Filtern und Hervorheben --- */
    var chips = Array.prototype.slice.call(root.querySelectorAll('.chip'));
    var status = document.getElementById('kursStatus');
    var cat = 'all';
    var picked = null;

    function apply() {
      var visible = 0;

      courses.forEach(function (c) {
        var byCat = cat === 'all' || c.cat === cat;
        var byName = !picked || c.name === picked;
        var on = byCat && byName;
        if (on) visible++;
        [c.btn, c.li].forEach(function (el) {
          el.classList.toggle('is-dim', !on);
          el.classList.toggle('is-pick', Boolean(picked) && c.name === picked);
        });
      });

      if (picked) {
        status.textContent = picked + ' — ' + visible +
          (visible === 1 ? ' Termin' : ' Termine') + ' pro Woche';
        status.classList.add('is-on');
      } else if (cat !== 'all') {
        status.textContent = visible + (visible === 1 ? ' Kurs' : ' Kurse') + ' pro Woche';
        status.classList.add('is-on');
      } else {
        status.textContent = '';
        status.classList.remove('is-on');
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        cat = chip.getAttribute('data-cat');
        picked = null;
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', String(on));
        });
        apply();
      });
    });

    courses.forEach(function (c) {
      function pick() {
        picked = picked === c.name ? null : c.name;
        apply();
      }
      c.btn.addEventListener('click', pick);
      c.li.addEventListener('click', pick);
      c.li.style.cursor = 'pointer';
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (picked || cat !== 'all')) {
        picked = null;
        cat = 'all';
        chips.forEach(function (c) {
          var on = c.getAttribute('data-cat') === 'all';
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', String(on));
        });
        apply();
      }
    });
  })();

  /* ---------- Kontaktformular ---------- */
  var form = document.getElementById('contactForm');

  if (form) {
    var status = document.getElementById('formStatus');

    function setError(input, msg) {
      var field = input.closest('.field');
      if (!field) return true;   // versteckte Felder haben keinen Container
      var err = form.querySelector('[data-err-for="' + input.id + '"]');
      field.classList.toggle('is-invalid', Boolean(msg));
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) {
        err.textContent = msg || '';
        err.classList.toggle('is-visible', Boolean(msg));
      }
      return !msg;
    }

    function validate(input) {
      var v = (input.value || '').trim();

      if (input.type === 'checkbox') {
        return setError(input, input.checked ? '' : 'Bitte stimme der Datenverarbeitung zu, damit wir dir antworten dürfen.');
      }
      if (input.required && !v) {
        return setError(input, 'Bitte fülle dieses Feld aus.');
      }
      if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        return setError(input, 'Diese E-Mail-Adresse sieht nicht vollständig aus.');
      }
      if (input.type === 'tel' && v && !/^[\d\s+()/.-]{6,}$/.test(v)) {
        return setError(input, 'Bitte nur Ziffern, Leerzeichen und + ( ) / - verwenden.');
      }
      return setError(input, '');
    }

    // Versteckte Felder und den Honeypot nicht validieren
    var fields = Array.prototype.filter.call(
      form.querySelectorAll('input, textarea, select'),
      function (el) { return el.type !== 'hidden' && el.name !== 'website'; }
    );

    fields.forEach(function (input) {
      // Erst beim Verlassen prüfen, nicht bei jedem Tastenanschlag
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        var f = input.closest('.field');
        if (f && f.classList.contains('is-invalid')) validate(input);
      });
    });

    // Zeitstempel für die Spam-Zeitfalle in kontakt.php
    var loaded = document.getElementById('f-loaded');
    if (loaded) loaded.value = String(Math.floor(Date.now() / 1000));

    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      var firstBad = null;
      fields.forEach(function (input) {
        if (!validate(input) && !firstBad) firstBad = input;
      });

      if (firstBad) {
        e.preventDefault();
        status.textContent = 'Bitte prüfe die markierten Felder.';
        status.className = 'form__status is-err';
        firstBad.focus();
        return;
      }

      // Ohne fetch: das Formular wird ganz normal abgeschickt, kontakt.php
      // liefert dann eine eigene Bestätigungsseite aus.
      if (!window.fetch) return;

      e.preventDefault();

      // Absenden per fetch an kontakt.php — ohne Seitenwechsel
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = 'Wird gesendet …';
      }
      status.textContent = '';
      status.className = 'form__status';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
      })
        .then(function (res) { return res.json().catch(function () { return null; }); })
        .then(function (data) {
          if (data && data.ok) {
            status.textContent = data.message;
            status.className = 'form__status is-ok';
            form.reset();
            if (loaded) loaded.value = String(Math.floor(Date.now() / 1000));
          } else {
            status.textContent = (data && data.message) ||
              'Das hat leider nicht geklappt. Bitte schreib uns an info@fitness-park-offenbach.com oder ruf an: 069 818424.';
            status.className = 'form__status is-err';
          }
        })
        .catch(function () {
          status.textContent = 'Keine Verbindung zum Server. Bitte schreib uns an info@fitness-park-offenbach.com oder ruf an: 069 818424.';
          status.className = 'form__status is-err';
        })
        .then(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.label || 'Anfrage senden';
          }
        });
    });
  }

  /* ---------- Aktiver Navigationspunkt ---------- */
  var sections = document.querySelectorAll('main section[id]');
  var linkFor = {};
  document.querySelectorAll('.nav__links a[href^="#"]').forEach(function (a) {
    linkFor[a.getAttribute('href').slice(1)] = a;
  });

  if ('IntersectionObserver' in window && sections.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = linkFor[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(linkFor).forEach(function (k) { linkFor[k].classList.remove('is-current'); });
          link.classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { sio.observe(s); });
  }
})();
