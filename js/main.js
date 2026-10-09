/* ============================================================
   Alex Chen — Personal Website interactions
   Vanilla JS, no dependencies · shared across all pages
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Current year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  var header = document.getElementById("site-header");

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");

  if (navToggle && siteNav) {
    function closeMenu() {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }

    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close the drawer after choosing a link (mobile)
    siteNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    // Close when clicking outside
    document.addEventListener("click", function (event) {
      if (
        siteNav.classList.contains("is-open") &&
        !siteNav.contains(event.target) &&
        !navToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  /* ---------- Scroll-reveal animations ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  // Cascade hero items on the homepage
  var heroReveals = document.querySelectorAll(".home-hero-inner .reveal");
  heroReveals.forEach(function (el, i) {
    el.style.setProperty("--reveal-delay", i * 0.08 + "s");
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Contact form ----------
     No backend: builds a pre-filled email to the QQ mailbox and
     opens the visitor's email client (QQ Mail, Outlook, Gmail, …). */
  var form = document.getElementById("contact-form");
  var formNote = document.getElementById("form-note");
  var CONTACT_EMAIL = "2984978189@qq.com";

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      var subject = form.querySelector("#subject");
      var message = form.querySelector("#message");

      // Light validation
      var valid = true;
      [name, email, message].forEach(function (field) {
        if (field && !field.value.trim()) {
          valid = false;
          field.style.borderColor = "#e07856";
        } else if (field) {
          field.style.borderColor = "";
        }
      });

      var emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (email.value.trim() && !emailLooksValid) {
        valid = false;
        email.style.borderColor = "#e07856";
      }

      if (!valid) {
        if (formNote) {
          formNote.textContent = "Please fill in your name, a valid email, and a message.";
          formNote.style.color = "#c9613f";
        }
        return;
      }

      var senderName = name.value.trim();
      var senderEmail = email.value.trim();
      var subjectText =
        subject && subject.value.trim()
          ? subject.value.trim()
          : "Message from " + senderName + " via your website";
      var bodyText =
        "Hi Yuxin,\n\n" +
        message.value.trim() +
        "\n\n— " + senderName + "\nReply-to: " + senderEmail;

      var mailto =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subjectText) +
        "&body=" + encodeURIComponent(bodyText);

      if (formNote) {
        formNote.textContent =
          "Opening your email app with everything filled in… if it doesn't open, write to " +
          CONTACT_EMAIL + " directly. 🌿";
        formNote.style.color = "";
      }

      window.location.href = mailto;
      form.reset();
    });
  }
  /* ---------- To-Do List App (Supabase-backed) ---------- */
  var todoList = document.getElementById("todo-list");
  var todoInput = document.getElementById("todo-text");
  var dateInput = document.getElementById("todo-date");
  var addBtn = document.getElementById("todo-add");
  var emptyMsg = document.getElementById("todo-empty");
  var countEl = document.getElementById("todo-count");
  var clearBtn = document.getElementById("todo-clear");
  var statusEl = document.getElementById("todo-status");
  var filterBtns = document.querySelectorAll(".todo-filter");
  var emojiBtns = document.querySelectorAll(".emoji-btn");
  var priorityBtns = document.querySelectorAll(".priority-btn");
  var selectedEmoji = "\u{1F4CC}";
  var selectedPriority = "medium";

  // --- Supabase init ---
  var SUPABASE_URL = "https://ggpjvtbxyqrbpglilmyb.supabase.co";
  var SUPABASE_KEY = "sb_publishable_VTPSLEjFJItLJnWPnYT5qA_Qzxv2KRK";
  var sb = null;
  var sdkReady = false;
  var sdkLoading = null; // promise

  var SDK_CDNS = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.0/supabase.min.js"
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadSupabaseSDK() {
    if (sdkLoading) return sdkLoading;
    sdkLoading = (async function () {
      for (var i = 0; i < SDK_CDNS.length; i++) {
        try {
          console.log("[todo] trying CDN:", SDK_CDNS[i]);
          await loadScript(SDK_CDNS[i]);
          if (window.supabase && typeof window.supabase.createClient === "function") {
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            sdkReady = true;
            console.log("[todo] Supabase SDK loaded from:", SDK_CDNS[i]);
            return true;
          }
        } catch (e) {
          console.warn("[todo] CDN failed:", SDK_CDNS[i], e);
        }
      }
      console.error("[todo] All Supabase CDNs failed.");
      return false;
    })();
    return sdkLoading;
  }

  // --- Local fallback store (used when Supabase is unreachable) ---
  var LOCAL_KEY = "yg-todo-tasks-v1";

  function localLoad() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("[todo] Could not read local tasks:", e);
      return [];
    }
  }

  function localSave(list) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("[todo] Could not persist local tasks:", e);
    }
  }

  function genId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "local-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  // fetch() throws "TypeError: Failed to fetch" for DNS / offline / CORS /
  // aborted requests — i.e. the server could not be reached at all.
  function isNetworkError(err) {
    if (!err) return false;
    var msg = String(err.message || err.name || "").toLowerCase();
    return (
      msg.indexOf("failed to fetch") !== -1 ||
      msg.indexOf("networkerror") !== -1 ||
      msg.indexOf("network request failed") !== -1 ||
      msg.indexOf("load failed") !== -1 ||
      msg.indexOf("name_not_resolved") !== -1 ||
      msg.indexOf("could not resolve") !== -1 ||
      (err.name === "TypeError" && msg.indexOf("fetch") !== -1)
    );
  }

  var OFFLINE_MESSAGE =
    "Offline mode: the cloud database is unreachable right now, so tasks are saved in this browser. They will sync again once the database is restored and the page is refreshed.";

  function showStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = false;
  }

  if (todoList && todoInput && addBtn) {
    var todos = [];
    var currentFilter = "all";
    var mode = "cloud"; // "cloud" (Supabase) | "offline" (localStorage)

    // Entered on page load: local storage is the source of truth.
    function enterOfflineFromLoad(reason) {
      mode = "offline";
      console.warn("[todo] Offline mode (localStorage). Reason:", reason);
      todos = localLoad();
      emptyMsg.textContent = "No tasks yet — let's add some magic! ✨";
      showStatus(OFFLINE_MESSAGE);
      render();
    }

    // Entered mid-session after a failed mutation: keep the current
    // in-memory list (including optimistic changes) and persist it locally.
    function switchOffline(reason) {
      mode = "offline";
      console.warn("[todo] Connection lost — switching to offline mode. Reason:", reason);
      localSave(todos);
      showStatus(OFFLINE_MESSAGE);
    }

    // --- Set today's date as default ---
    function todayStr() {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + day;
    }
    dateInput.value = todayStr();

    // --- Format date for display ---
    function formatDate(dateStr) {
      if (!dateStr) return "";
      var parts = String(dateStr).split("-");
      if (parts.length !== 3) return dateStr;
      var d = new Date(parts[0], parts[1] - 1, parts[2]);
      var opts = { month: "short", day: "numeric", year: "numeric" };
      return d.toLocaleDateString("en-US", opts);
    }

    // --- Render ---
    function render() {
      todoList.innerHTML = "";

      var visible = todos.filter(function (t) {
        if (currentFilter === "active") return !t.done;
        if (currentFilter === "done") return t.done;
        return true;
      });

      visible.forEach(function (t) {
        var li = document.createElement("li");
        li.className = "todo-item" + (t.done ? " is-done" : "");
        li.dataset.id = t.id;

        // Checkbox
        var check = document.createElement("label");
        check.className = "todo-check";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = t.done;
        cb.addEventListener("change", function () {
          toggleDone(t.id);
        });

        var box = document.createElement("span");
        box.className = "check-box";

        check.appendChild(cb);
        check.appendChild(box);

        // Emoji
        var emoji = document.createElement("span");
        emoji.className = "todo-task-emoji";
        emoji.textContent = t.emoji || "";

        // Content
        var content = document.createElement("div");
        content.className = "todo-content";

        var text = document.createElement("span");
        text.className = "todo-task-text";
        text.textContent = t.text;
        text.title = "Click to edit";
        text.style.cursor = "pointer";
        text.addEventListener("click", function () {
          startEdit(t.id, text);
        });

        var metaRow = document.createElement("div");
        metaRow.className = "todo-meta-row";

        var dateLabel = document.createElement("span");
        dateLabel.className = "todo-task-date";
        dateLabel.textContent = formatDate(t.date);
        metaRow.appendChild(dateLabel);

        if (t.priority) {
          var badge = document.createElement("span");
          badge.className = "todo-priority-badge";
          badge.dataset.priority = t.priority;
          badge.textContent = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
          metaRow.appendChild(badge);
        }

        content.appendChild(text);
        content.appendChild(metaRow);

        // Delete button
        var del = document.createElement("button");
        del.type = "button";
        del.className = "todo-delete";
        del.setAttribute("aria-label", "Delete task");
        del.textContent = "\u00d7";
        del.addEventListener("click", function () {
          removeTask(t.id, li);
        });

        li.appendChild(check);
        li.appendChild(emoji);
        li.appendChild(content);
        li.appendChild(del);
        todoList.appendChild(li);
      });

      var hasVisible = visible.length > 0;
      emptyMsg.style.display = hasVisible ? "none" : "block";

      var doneCount = todos.filter(function (t) { return t.done; }).length;
      var total = todos.length;
      countEl.textContent = doneCount + " of " + total + " tasks completed";
    }

    // --- Wait for the Supabase SDK then load todos ---
    async function ensureClient() {
      if (sdkReady) return true;
      emptyMsg.textContent = "Loading database…";
      var ok = await loadSupabaseSDK();
      return ok;
    }

    // --- Load todos from Supabase (fall back to local storage) ---
    async function loadTodos() {
      var ok = await ensureClient();
      if (!ok) {
        // SDK itself couldn't be loaded — nothing to talk to.
        enterOfflineFromLoad("Supabase SDK could not be loaded from any CDN");
        return;
      }
      emptyMsg.textContent = "Loading tasks…";

      try {
        var result = await sb
          .from("todos")
          .select("*")
          .order("created_at", { ascending: true });

        if (result.error) throw result.error;

        mode = "cloud";
        todos = (result.data || []).map(function (row) {
          return {
            id: row.id,
            text: row.task || row.text || "",
            date: row.date || "",
            done: !!row.is_complete,
            emoji: row.emoji || "",
            priority: row.priority || "medium"
          };
        });
        render();
      } catch (err) {
        console.error("[todo] Failed to load tasks from Supabase:", err);
        if (isNetworkError(err)) {
          // Project paused/deleted, DNS failure, or visitor is offline.
          enterOfflineFromLoad(err);
        } else {
          emptyMsg.textContent = "Could not load tasks: " + (err.message || "unknown error");
        }
      }
    }

    // --- Add task ---
    async function addTask() {
      var text = todoInput.value.trim();
      if (!text) {
        todoInput.style.borderColor = "#e07856";
        todoInput.focus();
        setTimeout(function () { todoInput.style.borderColor = ""; }, 1200);
        return;
      }

      // In cloud mode, make sure the SDK is ready; if it isn't, degrade
      // gracefully to local storage instead of blocking the user.
      if (mode === "cloud" && !sdkReady) {
        var ready = await ensureClient();
        if (!ready) enterOfflineFromLoad("Supabase SDK could not be loaded from any CDN");
      }

      addBtn.disabled = true;
      addBtn.textContent = "Adding…";

      var saved = false;
      try {
        var taskDate = dateInput.value || todayStr();

        if (mode === "offline") {
          todos.push({
            id: genId(),
            text: text,
            date: taskDate,
            done: false,
            emoji: selectedEmoji,
            priority: selectedPriority
          });
          localSave(todos);
          saved = true;
        } else {
          saved = await insertTaskRemotely(text, taskDate);
        }

        if (saved) {
          render();
          todoInput.value = "";
          todoInput.focus();
        }
      } catch (err) {
        // Detailed log for debugging; keep the typed text so nothing is lost.
        console.error("[todo] addTask failed — could not save task:", err);
        alert("Could not save task: " + (err && err.message ? err.message : "Unknown error"));
        todoInput.focus();
      } finally {
        // The button must ALWAYS return to its idle state.
        addBtn.disabled = false;
        addBtn.textContent = "Add";
      }
    }

    // Insert against Supabase. Returns true on success.
    // Retries with core columns when optional columns are missing;
    // transparently switches to offline mode on network failures.
    async function insertTaskRemotely(text, taskDate) {
      var localTask = {
        id: genId(),
        text: text,
        date: taskDate,
        done: false,
        emoji: selectedEmoji,
        priority: selectedPriority
      };

      try {
        var result = await sb.from("todos").insert({
          task: text,
          date: taskDate,
          is_complete: false,
          emoji: selectedEmoji,
          priority: selectedPriority
        }).select().single();

        if (result.error) throw result.error;

        var row = result.data;
        todos.push({
          id: row.id,
          text: row.task || row.text || "",
          date: row.date || "",
          done: !!row.is_complete,
          emoji: row.emoji || selectedEmoji,
          priority: row.priority || selectedPriority
        });
        return true;
      } catch (err) {
        // Network-level failure (DNS / offline / project paused or deleted)
        if (isNetworkError(err)) {
          console.warn("[todo] Insert unreachable; keeping task locally.", err);
          todos.push(localTask);
          switchOffline(err);
          render();
          return true;
        }

        // Optional columns may not exist — retry with core columns only.
        var msg = String((err && err.message) || "").toLowerCase();
        if (msg.indexOf("column") !== -1) {
          try {
            var fallback = await sb.from("todos").insert({
              task: text,
              date: taskDate,
              is_complete: false
            }).select().single();
            if (fallback.error) throw fallback.error;

            var fr = fallback.data;
            todos.push({
              id: fr.id,
              text: fr.task || fr.text || "",
              date: fr.date || "",
              done: !!fr.is_complete,
              emoji: selectedEmoji,
              priority: selectedPriority
            });
            return true;
          } catch (err2) {
            if (isNetworkError(err2)) {
              console.warn("[todo] Retry insert unreachable; keeping task locally.", err2);
              todos.push(localTask);
              switchOffline(err2);
              render();
              return true;
            }
            console.error("[todo] Retry insert failed:", err2);
            throw err2;
          }
        }

        throw err;
      }
    }

    // --- Toggle done ---
    async function toggleDone(id) {
      var task = todos.find(function (t) { return t.id === id; });
      if (!task) return;

      var newDone = !task.done;

      // Optimistic update
      task.done = newDone;
      render();

      if (mode === "offline") {
        localSave(todos);
        return;
      }

      try {
        var result = await sb
          .from("todos")
          .update({ is_complete: newDone })
          .eq("id", id);

        if (result.error) throw result.error;
      } catch (err) {
        if (isNetworkError(err)) {
          // Keep the toggle and continue locally.
          switchOffline(err);
          return;
        }
        // If is_complete column doesn't exist, keep local state only (no revert)
        var msg = (err.message || "").toLowerCase();
        if (msg.indexOf("column") === -1) {
          task.done = !newDone;
          render();
        }
      }
    }

    // --- Remove task ---
    async function removeTask(id, li) {
      li.classList.add("is-removing");

      setTimeout(function () {
        todos = todos.filter(function (t) { return t.id !== id; });
        if (mode === "offline") localSave(todos);
        render();
      }, 250);

      if (mode === "offline") return;

      try {
        var result = await sb.from("todos").delete().eq("id", id);
        if (result.error) throw result.error;
      } catch (err) {
        if (isNetworkError(err)) {
          // Deletion already applied in memory — persist it and stay local.
          switchOffline(err);
        } else {
          // Reload to restore correct state
          loadTodos();
        }
      }
    }

    // --- Inline edit task ---
    function startEdit(id, span) {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "todo-edit-input";
      input.value = span.textContent;
      input.setAttribute("aria-label", "Edit task");

      span.replaceWith(input);
      input.focus();
      input.select();

      var settled = false;

      async function commit() {
        if (settled) return;
        settled = true;
        var newText = input.value.trim();
        if (!newText) {
          render();
          return;
        }

        // Optimistic update
        var task = todos.find(function (t) { return t.id === id; });
        if (task) task.text = newText;
        render();

        if (mode === "offline") {
          localSave(todos);
          return;
        }

        try {
          var result = await sb
            .from("todos")
            .update({ task: newText })
            .eq("id", id);

          if (result.error) throw result.error;
        } catch (err) {
          if (isNetworkError(err)) {
            switchOffline(err);
          } else {
            loadTodos();
          }
        }
      }

      function cancel() {
        if (settled) return;
        settled = true;
        render();
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      });

      input.addEventListener("blur", commit);
    }

    // --- Clear completed ---
    if (clearBtn) {
      clearBtn.addEventListener("click", async function () {
        var doneIds = todos.filter(function (t) { return t.done; }).map(function (t) { return t.id; });
        if (doneIds.length === 0) return;

        todos = todos.filter(function (t) { return !t.done; });
        render();

        if (mode === "offline") {
          localSave(todos);
          return;
        }

        try {
          var result = await sb.from("todos").delete().in("id", doneIds);
          if (result.error) throw result.error;
        } catch (err) {
          if (isNetworkError(err)) {
            switchOffline(err);
          } else {
            loadTodos();
          }
        }
      });
    }

    // --- Filter tabs ---
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    // --- Event listeners ---
    addBtn.addEventListener("click", addTask);
    todoInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addTask();
    });

    // --- Emoji picker ---
    emojiBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        emojiBtns.forEach(function (b) { b.classList.remove("is-selected"); });
        btn.classList.add("is-selected");
        selectedEmoji = btn.dataset.emoji;
      });
    });

    // --- Priority picker ---
    priorityBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        priorityBtns.forEach(function (b) { b.classList.remove("is-selected"); });
        btn.classList.add("is-selected");
        selectedPriority = btn.dataset.priority;
      });
    });

    // --- Load from Supabase on page open ---
    loadTodos();
  }
})();

// --- Resume print button ---
document.addEventListener("DOMContentLoaded", function () {
  var printBtn = document.getElementById("resume-print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.print();
    });
  }
});
