/* ===========================================================
   My Lists — PWA
   Three tabs: To-Do · Calendar · Shopping
   All data is stored locally (localStorage) on the device.
   =========================================================== */

(() => {
  'use strict';

  /* ---------- Storage helpers ---------- */
  const KEY = 'mylists.v1';

  const defaultState = () => ({
    todos: [],
    // calendar notes keyed by 'YYYY-MM-DD'
    notes: {},
    // shopping
    shopping: {
      activeId: 'p_default',
      profiles: [
        { id: 'p_default', name: 'Groceries', items: [] }
      ]
    }
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // merge with defaults to stay forward-compatible
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ===========================================================
     TAB NAVIGATION
     =========================================================== */
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      $$('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
      $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === target));
    });
  });

  /* ===========================================================
     TO-DO LIST
     =========================================================== */
  const todoForm  = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoList  = $('#todo-list');
  const todoEmpty = $('#todo-empty');

  function renderTodos() {
    todoList.innerHTML = '';
    // not-done first, then done
    const ordered = [...state.todos].sort((a, b) => Number(a.done) - Number(b.done));

    ordered.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'item' + (todo.done ? ' done' : '');

      const check = document.createElement('button');
      check.className = 'check' + (todo.done ? ' done' : '');
      check.innerHTML = todo.done ? '✓' : '';
      check.setAttribute('aria-label', todo.done ? 'Mark not done' : 'Mark done');
      check.addEventListener('click', () => {
        todo.done = !todo.done;
        save();
        renderTodos();
      });

      const span = document.createElement('span');
      span.className = 'item-text';
      span.textContent = todo.text;

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '🗑';
      del.setAttribute('aria-label', 'Delete task');
      del.addEventListener('click', () => {
        state.todos = state.todos.filter(t => t.id !== todo.id);
        save();
        renderTodos();
      });

      li.append(check, span, del);
      todoList.appendChild(li);
    });

    todoEmpty.classList.toggle('show', state.todos.length === 0);
  }

  todoForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    state.todos.push({ id: uid(), text, done: false });
    todoInput.value = '';
    save();
    renderTodos();
  });

  /* ===========================================================
     CALENDAR
     - Day notes start being editable from START_DATE (30 May 2026)
       up to the real "today". Future days are disabled.
     =========================================================== */
  const START_DATE = new Date(2026, 4, 30); // month is 0-based → 4 = May
  START_DATE.setHours(0, 0, 0, 0);

  const calTitle = $('#cal-title');
  const calGrid  = $('#cal-grid');
  const calPrev  = $('#cal-prev');
  const calNext  = $('#cal-next');

  const MONTHS = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];

  const todayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sameDay = (a, b) => a.getTime() === b.getTime();

  // currently viewed month — start on the START_DATE's month
  let viewYear  = START_DATE.getFullYear();
  let viewMonth = START_DATE.getMonth();

  function renderCalendar() {
    const today = todayDate();
    calTitle.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = '';

    // disable navigation outside the meaningful range
    const firstOfView = new Date(viewYear, viewMonth, 1);
    const startMonth  = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), 1);
    const todayMonth  = new Date(today.getFullYear(), today.getMonth(), 1);
    calPrev.disabled = firstOfView <= startMonth;
    calNext.disabled = firstOfView >= todayMonth;

    // Monday-first offset
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const offset = (firstDay + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell empty';
      calGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      d.setHours(0, 0, 0, 0);
      const cell = document.createElement('button');
      cell.className = 'cal-cell';
      cell.textContent = day;

      const inRange = d >= START_DATE && d <= today;
      const isToday = sameDay(d, today);
      const hasNote = !!(state.notes[key(d)] && state.notes[key(d)].trim());

      if (!inRange) {
        cell.classList.add('disabled');
      } else {
        cell.classList.add('in-range');
        if (isToday) cell.classList.add('today');
        if (hasNote) {
          const dot = document.createElement('span');
          dot.className = 'dot';
          cell.appendChild(dot);
        }
        cell.addEventListener('click', () => openDay(d));
      }

      calGrid.appendChild(cell);
    }
  }

  calPrev.addEventListener('click', () => {
    if (calPrev.disabled) return;
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    if (calNext.disabled) return;
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  /* ----- Day note modal ----- */
  const dayModal = $('#day-modal');
  const dayTitle = $('#day-modal-title');
  const dayNote  = $('#day-note');
  const daySave  = $('#day-save');
  let activeDayKey = null;

  function openDay(d) {
    activeDayKey = key(d);
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dayTitle.textContent = d.toLocaleDateString('en-US', opts);
    dayNote.value = state.notes[activeDayKey] || '';
    openModal(dayModal);
    setTimeout(() => dayNote.focus(), 250);
  }

  daySave.addEventListener('click', () => {
    if (activeDayKey == null) return;
    const text = dayNote.value.trim();
    if (text) state.notes[activeDayKey] = text;
    else delete state.notes[activeDayKey];
    save();
    closeModal(dayModal);
    renderCalendar();
  });

  /* ===========================================================
     SHOPPING LIST (multiple profiles)
     =========================================================== */
  const profileTabs   = $('#profile-tabs');
  const profileAdd    = $('#profile-add');
  const profileDelete = $('#profile-delete');
  const shopForm  = $('#shop-form');
  const shopInput = $('#shop-input');
  const shopList  = $('#shop-list');
  const shopEmpty = $('#shop-empty');

  const activeProfile = () =>
    state.shopping.profiles.find(p => p.id === state.shopping.activeId)
    || state.shopping.profiles[0];

  function renderProfiles() {
    profileTabs.innerHTML = '';
    state.shopping.profiles.forEach(p => {
      const chip = document.createElement('button');
      chip.className = 'profile-chip' + (p.id === state.shopping.activeId ? ' active' : '');
      chip.textContent = p.name;
      chip.addEventListener('click', () => {
        state.shopping.activeId = p.id;
        save();
        renderShopping();
      });
      profileTabs.appendChild(chip);
    });
    profileDelete.style.display = state.shopping.profiles.length > 1 ? 'block' : 'none';
  }

  function renderItems() {
    const profile = activeProfile();
    shopList.innerHTML = '';

    // not-bought first
    const ordered = [...profile.items].sort((a, b) => Number(a.bought) - Number(b.bought));

    ordered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item' + (item.bought ? ' done' : '');

      const span = document.createElement('span');
      span.className = 'item-text';
      span.textContent = item.text;

      const pill = document.createElement('button');
      pill.className = 'status-pill ' + (item.bought ? 'yes' : 'no');
      pill.textContent = item.bought ? '✓ Bought' : 'To buy';
      pill.addEventListener('click', () => {
        item.bought = !item.bought;
        save();
        renderItems();
      });

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '🗑';
      del.setAttribute('aria-label', 'Delete item');
      del.addEventListener('click', () => {
        profile.items = profile.items.filter(i => i.id !== item.id);
        save();
        renderItems();
      });

      li.append(span, pill, del);
      shopList.appendChild(li);
    });

    shopEmpty.classList.toggle('show', profile.items.length === 0);
  }

  function renderShopping() {
    renderProfiles();
    renderItems();
  }

  shopForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = shopInput.value.trim();
    if (!text) return;
    activeProfile().items.push({ id: uid(), text, bought: false });
    shopInput.value = '';
    save();
    renderItems();
  });

  profileDelete.addEventListener('click', () => {
    if (state.shopping.profiles.length <= 1) return;
    const profile = activeProfile();
    if (!confirm(`Delete the list “${profile.name}” and all its items?`)) return;
    state.shopping.profiles = state.shopping.profiles.filter(p => p.id !== profile.id);
    state.shopping.activeId = state.shopping.profiles[0].id;
    save();
    renderShopping();
  });

  /* ----- New profile modal ----- */
  const nameModal = $('#name-modal');
  const nameInput = $('#name-input');
  const nameSave  = $('#name-save');

  profileAdd.addEventListener('click', () => {
    nameInput.value = '';
    openModal(nameModal);
    setTimeout(() => nameInput.focus(), 250);
  });

  function createProfile() {
    const name = nameInput.value.trim();
    if (!name) return;
    const id = 'p_' + uid();
    state.shopping.profiles.push({ id, name, items: [] });
    state.shopping.activeId = id;
    save();
    closeModal(nameModal);
    renderShopping();
  }
  nameSave.addEventListener('click', createProfile);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') createProfile(); });

  /* ===========================================================
     MODAL plumbing
     =========================================================== */
  function openModal(m)  { m.hidden = false; }
  function closeModal(m) { m.hidden = true; }

  $$('.modal [data-close]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.closest('.modal')));
  });

  /* ===========================================================
     INIT
     =========================================================== */
  renderTodos();
  renderCalendar();
  renderShopping();

  /* ===========================================================
     Service worker (offline support)
     =========================================================== */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
})();
