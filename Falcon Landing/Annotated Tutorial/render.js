
function highlightJS(code) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const KW = /^(const|let|var|function|return|if|else|for|while|of|in|new|typeof|true|false|null|undefined|this|break|continue|switch|case|default|try|catch|throw|class|extends|Math)$/;
  let out = "";
  let i = 0;
  const n = code.length;

  function take(re) {
    const m = re.exec(code.slice(i));
    if (m && m.index === 0) { i += m[0].length; return m[0]; }
    return null;
  }

  while (i < n) {
    if (code.startsWith("//", i)) {
      const j = code.indexOf("\n", i);
      const end = j < 0 ? n : j;
      out += '<span class="tok-cm">' + esc(code.slice(i, end)) + "</span>";
      i = end;
      continue;
    }
    if (code.startsWith("/*", i)) {
      const j = code.indexOf("*/", i + 2);
      const end = j < 0 ? n : j + 2;
      out += '<span class="tok-cm">' + esc(code.slice(i, end)) + "</span>";
      i = end;
      continue;
    }
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code[j] === ch) { j++; break; }
        j++;
      }
      out += '<span class="tok-str">' + esc(code.slice(i, j)) + "</span>";
      i = j;
      continue;
    }
    const ident = take(/^[A-Za-z_$][\w$]*/);
    if (ident) {
      const nextNonWs = code.slice(i).match(/^\s*/);
      const after = code.slice(i + (nextNonWs ? nextNonWs[0].length : 0), i + 40);
      if (KW.test(ident)) {
        out += '<span class="tok-kw">' + esc(ident) + "</span>";
        if (ident === "function") {
          const name = take(/^\s+[A-Za-z_$][\w$]*/);
          if (name) {
            const sp = name.match(/^\s*/)[0];
            out += esc(sp) + '<span class="tok-fn">' + esc(name.trim()) + "</span>";
          }
        }
      } else if (after.startsWith("(") && ident !== "if" && ident !== "for" && ident !== "while") {
        out += '<span class="tok-fn">' + esc(ident) + "</span>";
      } else {
        out += esc(ident);
      }
      continue;
    }
    const num = take(/^[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (num) {
      out += '<span class="tok-num">' + esc(num) + "</span>";
      continue;
    }
    out += esc(ch);
    i++;
  }
  return out;
}

function resolveSnippet(raw) {
  const aliases = window.SNIPPET_ALIASES || {};
  const key = aliases[raw] || raw;
  const rec = (window.SNIPPETS || {})[key] || null;
  return { key, rec };
}

function setHash(key) {
  const next = "#code-" + key;
  if (location.hash !== next) {
    try { history.replaceState(null, "", next); } catch (e) { location.hash = next; }
  }
}

function clearCodeHash() {
  if (!location.hash || location.hash.indexOf("#code-") !== 0) return;
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}

function openSnippet(raw) {
  const { key, rec } = resolveSnippet(raw);
  const overlay = document.getElementById("code-modal");
  if (!overlay || !rec) return false;
  document.getElementById("modal-title").textContent = rec.title;
  document.getElementById("modal-meta").textContent = rec.file + "  ·  " + rec.fn;
  document.getElementById("modal-code").innerHTML = highlightJS(rec.code);
  document.getElementById("modal-note").textContent = rec.note;
  const link = document.getElementById("modal-sim");
  link.href = rec.file + "#" + rec.anchor;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setHash(key);
  document.getElementById("modal-x").focus();
  return true;
}

function closeSnippet() {
  const overlay = document.getElementById("code-modal");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearCodeHash();
}

function bootFromLocation() {
  try {
    const q = new URLSearchParams(location.search).get("code");
    if (q && openSnippet(q)) return;
  } catch (e) {}
  const h = (location.hash || "").replace(/^#/, "");
  if (!h) return;
  if (h.indexOf("code-") === 0) openSnippet(h.slice(5));
  else if (resolveSnippet(h).rec) openSnippet(h);
}

document.addEventListener("DOMContentLoaded", function () {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ],
      throwOnError: false
    });
  }
  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false, theme: "dark" });
    window.mermaid.run();
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-snippet]");
    if (!btn) return;
    e.preventDefault();
    openSnippet(btn.getAttribute("data-snippet"));
  });

  const overlay = document.getElementById("code-modal");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSnippet();
    });
    document.getElementById("modal-x").addEventListener("click", closeSnippet);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSnippet();
  });
  window.addEventListener("hashchange", function () {
    const h = (location.hash || "").replace(/^#/, "");
    if (h.indexOf("code-") === 0) openSnippet(h.slice(5));
  });

  bootFromLocation();
});
