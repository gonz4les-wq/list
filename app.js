/* ===========================================================
   My Lists — PWA
   Three tabs: To-Do · Calendar · Shopping
   All data is stored locally (localStorage) on the device.
   =========================================================== */

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Date helpers ---------- */
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayKey = () => key(new Date());
  const parseKey = k => { const [y,m,dd] = k.split('-').map(Number); const d = new Date(y, m-1, dd); d.setHours(0,0,0,0); return d; };
  const fmtLong  = k => parseKey(k).toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const fmtShort = k => parseKey(k).toLocaleDateString('en-US', { day:'numeric', month:'short' });

  /* ---------- Storage ---------- */
  const KEY = 'mylists.v1';

  const defaultState = () => ({
    startDate: todayKey(),              // calendar starts the day the app is first used
    todos: [],                          // { id, text, done, day:null|'YYYY-MM-DD' }
    notes: {},                          // 'YYYY-MM-DD' -> text
    shopping: {
      activeId: 'p_default',
      profiles: [ { id: 'p_default', name: 'Groceries', items: [] } ]
    }
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      // make sure every todo has a `day` field
      merged.todos = (merged.todos || []).map(t => ({ day: null, ...t }));
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  save(); // persist startDate on first run

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
  const todoDay   = $('#todo-day');
  const todoList  = $('#todo-list');
  const todoEmpty = $('#todo-empty');
  const todoSub   = $('#todo-subtitle');

  function dayBadgeClass(dayKey) {
    if (!dayKey) return '';
    const tk = todayKey();
    if (dayKey === tk) return 'today';
    if (dayKey < tk) return 'overdue';
    return '';
  }
  function dayBadgeLabel(dayKey) {
    const tk = todayKey();
    if (dayKey === tk) return 'Today';
    return fmtShort(dayKey);
  }

  function todoSort(a, b) {
    if (a.done !== b.done) return Number(a.done) - Number(b.done); // open first
    // among open: dated before undated, earlier day first
    if (!!a.day !== !!b.day) return a.day ? -1 : 1;
    if (a.day && b.day && a.day !== b.day) return a.day < b.day ? -1 : 1;
    return 0;
  }

  function makeTodoItem(todo, { showDay = true } = {}) {
    const li = document.createElement('li');
    li.className = 'item' + (todo.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'check' + (todo.done ? ' done' : '');
    check.innerHTML = todo.done ? '✓' : '';
    check.setAttribute('aria-label', todo.done ? 'Mark not done' : 'Mark done');
    check.addEventListener('click', () => { todo.done = !todo.done; save(); renderAll(); });

    const main = document.createElement('div');
    main.className = 'item-main';
    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = todo.text;
    main.appendChild(span);
    if (showDay && todo.day) {
      const badge = document.createElement('span');
      badge.className = 'day-badge ' + dayBadgeClass(todo.day);
      badge.textContent = '📅 ' + dayBadgeLabel(todo.day);
      main.appendChild(badge);
    }

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.innerHTML = '🗑';
    del.setAttribute('aria-label', 'Delete task');
    del.addEventListener('click', () => {
      state.todos = state.todos.filter(t => t.id !== todo.id);
      save(); renderAll();
    });

    li.append(check, main, del);
    return li;
  }

  function renderTodos() {
    todoList.innerHTML = '';
    [...state.todos].sort(todoSort).forEach(t => todoList.appendChild(makeTodoItem(t)));
    todoEmpty.classList.toggle('show', state.todos.length === 0);

    const open = state.todos.filter(t => !t.done).length;
    const done = state.todos.length - open;
    todoSub.textContent = state.todos.length
      ? `${open} open · ${done} done`
      : 'Stay on top of your day';
  }

  todoForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    state.todos.push({ id: uid(), text, done: false, day: todoDay.value || null });
    todoInput.value = '';
    todoDay.value = '';
    save(); renderAll();
  });

  /* ===========================================================
     CALENDAR
     - Starts at state.startDate (the day the app was first used).
     - Days from startDate onward are open for notes & tasks
       (future days too, so you can plan ahead).
     =========================================================== */
  const calSub    = $('#cal-subtitle');
  const calView   = $('#cal-view');
  const calResults= $('#cal-results');
  const calTitle  = $('#cal-title');
  const calGrid   = $('#cal-grid');
  const calPrev   = $('#cal-prev');
  const calNext   = $('#cal-next');
  const calSearch = $('#cal-search');
  const calClear  = $('#cal-search-clear');

  const MONTHS = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];

  // open on the current month
  let viewYear  = new Date().getFullYear();
  let viewMonth = new Date().getMonth();

  const tasksOnDay = dayKey => state.todos.filter(t => t.day === dayKey);

  function renderCalendar() {
    const start = parseKey(state.startDate);
    const tk = todayKey();
    calTitle.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = '';

    const firstOfView = new Date(viewYear, viewMonth, 1);
    const startMonth  = new Date(start.getFullYear(), start.getMonth(), 1);
    calPrev.disabled = firstOfView <= startMonth;

    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const offset = (firstDay + 6) % 7;                          // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell empty';
      calGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      d.setHours(0, 0, 0, 0);
      const dk = key(d);
      const cell = document.createElement('button');
      cell.className = 'cal-cell';
      cell.textContent = day;

      const inRange = d >= start;
      if (!inRange) {
        cell.classList.add('disabled');
      } else {
        cell.classList.add('in-range');
        if (dk === tk) cell.classList.add('today');

        const hasNote = !!(state.notes[dk] && state.notes[dk].trim());
        const hasTask = tasksOnDay(dk).length > 0;
        if (hasNote || hasTask) {
          const dots = document.createElement('span');
          dots.className = 'cal-dots';
          if (hasNote) { const n = document.createElement('span'); n.className = 'dot note'; dots.appendChild(n); }
          if (hasTask) { const t = document.createElement('span'); t.className = 'dot task'; dots.appendChild(t); }
          cell.appendChild(dots);
        }
        cell.addEventListener('click', () => openDay(dk));
      }
      calGrid.appendChild(cell);
    }

    const noteCount = Object.values(state.notes).filter(v => v && v.trim()).length;
    calSub.textContent = noteCount
      ? `${noteCount} note${noteCount === 1 ? '' : 's'} saved`
      : 'A note for every day';
  }

  calPrev.addEventListener('click', () => {
    if (calPrev.disabled) return;
    if (--viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    if (++viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });
  calTitle.addEventListener('click', () => {
    viewYear = new Date().getFullYear();
    viewMonth = new Date().getMonth();
    renderCalendar();
  });

  /* ----- Search notes ----- */
  function renderSearch(q) {
    const query = q.trim().toLowerCase();
    calClear.hidden = q.length === 0;

    if (!query) {
      calResults.hidden = true;
      calView.hidden = false;
      return;
    }
    calView.hidden = true;
    calResults.hidden = false;
    calResults.innerHTML = '';

    const hits = Object.keys(state.notes)
      .filter(k => state.notes[k] && state.notes[k].toLowerCase().includes(query))
      .sort((a, b) => b.localeCompare(a)); // newest first

    if (hits.length === 0) {
      const p = document.createElement('p');
      p.className = 'results-empty';
      p.textContent = 'No notes match “' + q + '”.';
      calResults.appendChild(p);
      return;
    }

    hits.forEach(k => {
      const text = state.notes[k];
      const card = document.createElement('button');
      card.className = 'result-card';
      const date = document.createElement('div');
      date.className = 'result-date';
      date.textContent = fmtLong(k);
      const snip = document.createElement('div');
      snip.className = 'result-snippet';
      snip.innerHTML = highlight(snippet(text, query), query);
      card.append(date, snip);
      card.addEventListener('click', () => openDay(k));
      calResults.appendChild(card);
    });
  }

  function snippet(text, query) {
    const i = text.toLowerCase().indexOf(query);
    if (i < 0) return text.slice(0, 120);
    const startI = Math.max(0, i - 30);
    let s = text.slice(startI, i + query.length + 60);
    if (startI > 0) s = '…' + s;
    if (i + query.length + 60 < text.length) s = s + '…';
    return s;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function highlight(text, query) {
    const esc = escapeHtml(text);
    const qi = esc.toLowerCase().indexOf(query.toLowerCase());
    if (qi < 0) return esc;
    return esc.slice(0, qi) + '<mark>' + esc.slice(qi, qi + query.length) + '</mark>' + esc.slice(qi + query.length);
  }

  calSearch.addEventListener('input', () => renderSearch(calSearch.value));
  calClear.addEventListener('click', () => { calSearch.value = ''; renderSearch(''); calSearch.focus(); });

  /* ----- Day modal (note + tasks for that day) ----- */
  const dayModal     = $('#day-modal');
  const dayTitle     = $('#day-modal-title');
  const dayNote      = $('#day-note');
  const daySave      = $('#day-save');
  const dayTasksList = $('#day-tasks');
  const dayTaskForm  = $('#day-task-form');
  const dayTaskInput = $('#day-task-input');
  let activeDayKey = null;

  function renderDayTasks() {
    dayTasksList.innerHTML = '';
    tasksOnDay(activeDayKey)
      .sort((a, b) => Number(a.done) - Number(b.done))
      .forEach(t => dayTasksList.appendChild(makeTodoItem(t, { showDay: false })));
  }

  function openDay(dk) {
    activeDayKey = dk;
    dayTitle.textContent = fmtLong(dk);
    dayNote.value = state.notes[dk] || '';
    renderDayTasks();
    openModal(dayModal);
    setTimeout(() => dayNote.focus(), 250);
  }

  dayTaskForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = dayTaskInput.value.trim();
    if (!text || !activeDayKey) return;
    state.todos.push({ id: uid(), text, done: false, day: activeDayKey });
    dayTaskInput.value = '';
    save();
    renderDayTasks();
    renderTodos();
    renderCalendar();
  });

  daySave.addEventListener('click', () => {
    if (activeDayKey == null) return;
    const text = dayNote.value.trim();
    if (text) state.notes[activeDayKey] = text;
    else delete state.notes[activeDayKey];
    save();
    closeModal(dayModal);
    renderCalendar();
    if (calSearch.value) renderSearch(calSearch.value);
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
  const shopSub   = $('#shop-subtitle');

  const activeProfile = () =>
    state.shopping.profiles.find(p => p.id === state.shopping.activeId)
    || state.shopping.profiles[0];

  function renderProfiles() {
    profileTabs.innerHTML = '';
    state.shopping.profiles.forEach(p => {
      const chip = document.createElement('button');
      chip.className = 'profile-chip' + (p.id === state.shopping.activeId ? ' active' : '');
      chip.textContent = p.name;
      chip.addEventListener('click', () => { state.shopping.activeId = p.id; save(); renderShopping(); });
      profileTabs.appendChild(chip);
    });
    profileDelete.style.display = state.shopping.profiles.length > 1 ? 'block' : 'none';
  }

  function renderItems() {
    const profile = activeProfile();
    shopList.innerHTML = '';

    [...profile.items].sort((a, b) => Number(a.bought) - Number(b.bought)).forEach(item => {
      const li = document.createElement('li');
      li.className = 'item' + (item.bought ? ' done' : '');

      const main = document.createElement('div');
      main.className = 'item-main';
      const span = document.createElement('span');
      span.className = 'item-text';
      span.textContent = item.text;
      main.appendChild(span);

      const pill = document.createElement('button');
      pill.className = 'status-pill ' + (item.bought ? 'yes' : 'no');
      pill.textContent = item.bought ? '✓ Bought' : 'To buy';
      pill.addEventListener('click', () => { item.bought = !item.bought; save(); renderShopping(); });

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '🗑';
      del.setAttribute('aria-label', 'Delete item');
      del.addEventListener('click', () => {
        profile.items = profile.items.filter(i => i.id !== item.id);
        save(); renderShopping();
      });

      li.append(main, pill, del);
      shopList.appendChild(li);
    });

    shopEmpty.classList.toggle('show', profile.items.length === 0);

    const toBuy  = profile.items.filter(i => !i.bought).length;
    const bought = profile.items.length - toBuy;
    shopSub.textContent = profile.items.length
      ? `${toBuy} to buy · ${bought} bought`
      : 'Lists for every occasion';
  }

  function renderShopping() { renderProfiles(); renderItems(); }

  shopForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = shopInput.value.trim();
    if (!text) return;
    activeProfile().items.push({ id: uid(), text, bought: false });
    shopInput.value = '';
    save(); renderShopping();
  });

  profileDelete.addEventListener('click', () => {
    if (state.shopping.profiles.length <= 1) return;
    const profile = activeProfile();
    if (!confirm(`Delete the list “${profile.name}” and all its items?`)) return;
    state.shopping.profiles = state.shopping.profiles.filter(p => p.id !== profile.id);
    state.shopping.activeId = state.shopping.profiles[0].id;
    save(); renderShopping();
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
  function renderAll() {
    renderTodos();
    renderCalendar();
    if (!dayModal.hidden) renderDayTasks();
  }

  renderTodos();
  renderCalendar();
  renderShopping();

  /* ----- Service worker (offline) ----- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
})();
