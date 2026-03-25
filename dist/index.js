import { reconcileTrees as w, commitRoot as q, summarizeCommitOperations as H, formatFiberPath as N } from "./fiber.js";
import { ChildDeletion as it, NoFlags as lt, Placement as st, Update as dt, getFlagNames as nt } from "./fiber.js";
import { domNodeToVNodeTree as v, cloneVNode as u, mountVNode as p, parseVdomTextToVNode as P, parseHtmlToVNode as V, serializeVNodeToHtml as B, serializeVNodeToText as A, createRootVNode as $, countVNodeStats as f } from "./vdom.js";
import { domNodeToVNode as ut, getVNodeKey as mt, removeDomAttribute as pt, renderVNode as ht, setDomAttribute as vt } from "./vdom.js";
const I = `
<section class="demo-card" data-key="dashboard">
  <header class="hero-block">
    <p class="eyebrow">Virtual DOM Playground</p>
    <h2>수요 코딩회 데모 보드</h2>
    <p class="lede">
      DOM을 읽어 Virtual DOM으로 바꾸고, 이전 상태와 비교해 변경된 노드만 실제 DOM에 반영합니다.
    </p>
  </header>

  <div class="content-grid">
    <article class="insight-card" data-key="insight">
      <h3>핵심 관찰</h3>
      <ul class="feature-list">
        <li data-key="observe">MutationObserver로 실제 DOM 변화를 추적합니다.</li>
        <li data-key="diff">Diff 알고리즘은 최소 변경만 계산합니다.</li>
        <li data-key="history">State History로 Undo/Redo를 지원합니다.</li>
      </ul>
    </article>

    <aside class="stat-panel" data-key="stats">
      <h3>빠른 실험</h3>
      <div class="stat-chip-row">
        <span class="sample-chip">data-key 순서 변경</span>
        <span class="sample-chip">텍스트 수정</span>
        <span class="sample-chip">속성 추가/삭제</span>
      </div>
      <label class="field">
        <span>샘플 입력</span>
        <input type="text" value="ready" />
      </label>
    </aside>
  </div>

  <footer class="demo-footer">
    <button type="button" class="ghost-action" data-role="sample-button" data-count="0">Sample Button 0</button>
    <small>리스트 순서를 바꾸거나 새로운 태그를 추가해 Patch를 눌러보세요.</small>
  </footer>
</section>
`, F = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});
function S(t) {
  return F.format(t);
}
function c(t) {
  return String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function j(t) {
  switch (t.opType) {
    case "INSERT_CHILD":
      return `index ${t.index} 위치에 새 노드를 삽입합니다.`;
    case "MOVE_CHILD":
      return `key "${t.key}" 노드를 index ${t.toIndex} 위치로 이동합니다.`;
    case "REMOVE_CHILD":
      return `index ${t.index} 자식 노드를 제거합니다.`;
    case "UPDATE_PROPS": {
      const e = Object.keys(t.payload.set || {}), o = t.payload.remove || [];
      return `props 변경: set ${e.join(", ") || "-"} / remove ${o.join(", ") || "-"}`;
    }
    case "UPDATE_TEXT":
      return `텍스트를 "${t.value}" 로 갱신합니다.`;
    default:
      return "설명할 수 없는 effect입니다.";
  }
}
function R(t) {
  return t.type === "attributes" ? `${t.attributeName} 속성이 변경되었습니다.` : t.type === "characterData" ? "텍스트 노드가 수정되었습니다." : `자식 노드 ${t.addedNodes.length}개 추가, ${t.removedNodes.length}개 제거`;
}
function J(t) {
  if (t.type === "root")
    return "root";
  if (t.type === "text")
    return `"${t.value.replace(/\s+/g, " ").trim() || "(whitespace)"}"`;
  const e = Object.entries(t.attrs || {}).slice(0, 3).map(([o, a]) => a === "" ? o : `${o}="${a}"`).join(" ");
  return e ? `<${t.tag} ${e}>` : `<${t.tag}>`;
}
const T = 250;
function _({ refs: t, state: e, render: o }) {
  let a = null;
  const i = () => e.editorMode === "vdom" ? t.vdomEditor : t.editor, d = () => {
    const r = i();
    t.editorModalTextarea.value !== r.value && (t.editorModalTextarea.value = r.value);
  }, s = (r) => {
    r.target.closest('[data-role="sample-button"]') && U({ refs: t, state: e, render: o });
  };
  t.editor.addEventListener("input", () => {
    C({
      refs: t,
      state: e,
      render: o,
      mode: "html",
      rawValue: t.editor.value,
      autoCommitTimerRef: () => a,
      setAutoCommitTimer: (r) => {
        a = r;
      }
    });
  }), t.vdomEditor.addEventListener("input", () => {
    C({
      refs: t,
      state: e,
      render: o,
      mode: "vdom",
      rawValue: t.vdomEditor.value,
      autoCommitTimerRef: () => a,
      setAutoCommitTimer: (r) => {
        a = r;
      }
    });
  }), t.testPreview.addEventListener("input", (r) => {
    k(r.target) && x({ refs: t, state: e, render: o, autoCommitTimerRef: () => a, setAutoCommitTimer: (l) => {
      a = l;
    } });
  }), t.testPreview.addEventListener("change", (r) => {
    k(r.target) && x({ refs: t, state: e, render: o, autoCommitTimerRef: () => a, setAutoCommitTimer: (l) => {
      a = l;
    } });
  }), t.testPreview.addEventListener("click", s), t.editorModeButtons.forEach((r) => {
    r.addEventListener("click", () => {
      const l = r.dataset.mode;
      l !== "html" && l !== "vdom" || e.editorMode !== l && (e.editorMode = l, e.statusMessage = l === "vdom" ? "VDOM 편집 모드로 전환했습니다." : "HTML 편집 모드로 전환했습니다.", o(), e.isEditorModalOpen && (d(), t.editorModalTextarea.focus()));
    });
  }), t.editorExpandButton.addEventListener("click", () => {
    e.isEditorModalOpen = !0, d(), o(), t.editorModalTextarea.focus();
  }), t.editorModalClose.addEventListener("click", () => {
    e.isEditorModalOpen = !1, o();
  }), t.editorModalBackdrop.addEventListener("click", () => {
    e.isEditorModalOpen = !1, o();
  }), t.editorModalTextarea.addEventListener("input", () => {
    const r = i();
    r.value = t.editorModalTextarea.value, r.dispatchEvent(new Event("input", { bubbles: !0 }));
  }), document.addEventListener("keydown", (r) => {
    r.key !== "Escape" || !e.isEditorModalOpen || (e.isEditorModalOpen = !1, o());
  }), t.patchButton.addEventListener("click", () => {
    a && (clearTimeout(a), a = null), h({ refs: t, state: e, render: o, source: "manual" });
  }), t.autoCommitToggle.addEventListener("change", () => {
    e.autoCommitEnabled = t.autoCommitToggle.checked, e.statusMessage = e.autoCommitEnabled ? "실시간 commit 모드를 활성화했습니다." : "실시간 commit 모드를 비활성화했습니다.", a && (clearTimeout(a), a = null), e.autoCommitEnabled && !e.parseError && (a = window.setTimeout(() => {
      h({ refs: t, state: e, render: o, source: "auto" });
    }, T)), o();
  }), t.undoButton.addEventListener("click", () => {
    b(e.historyIndex - 1, { refs: t, state: e, render: o });
  }), t.redoButton.addEventListener("click", () => {
    b(e.historyIndex + 1, { refs: t, state: e, render: o });
  }), t.historyList.addEventListener("click", (r) => {
    const l = r.target.closest("[data-history-index]");
    l && b(Number(l.dataset.historyIndex), { refs: t, state: e, render: o });
  });
}
function h({ refs: t, state: e, render: o, source: a }) {
  const i = e.history[e.historyIndex];
  if (!i || e.parseError)
    return;
  const d = u(v(t.testPreview)), s = w(i, d);
  if (e.lastCommitEffects = s.effects, e.workingTree = u(d), a === "manual" && m(t, e, d), !s.effects.length) {
    e.statusMessage = a === "auto" ? "자동 commit을 확인했지만 반영할 변경점이 없습니다." : "변경점이 없어 commit 단계를 생략했습니다.", o();
    return;
  }
  q(t.actual, s.rootFiber);
  const r = e.history.slice(0, e.historyIndex + 1), l = e.historyMeta.slice(0, e.historyIndex + 1);
  r.push(u(d)), l.push({
    label: `${a === "auto" ? "Auto Commit" : "Commit"} #${r.length - 1}`,
    effectCount: s.effects.length,
    timestamp: Date.now()
  }), e.history = r, e.historyMeta = l, e.historyIndex = r.length - 1, e.statusMessage = a === "auto" ? `${s.effects.length}개의 effect를 자동 commit 했습니다.` : `${s.effects.length}개의 effect를 commit 했습니다.`, o();
}
function x({ refs: t, state: e, render: o, autoCommitTimerRef: a, setAutoCommitTimer: i }) {
  const d = u(v(t.testPreview));
  e.workingTree = d, e.parseError = "", m(t, e, d), e.statusMessage = e.autoCommitEnabled ? "테스트 영역 입력을 동기화했고 자동 commit을 대기 중입니다." : "테스트 영역 입력을 샘플 HTML 코드와 동기화했습니다.";
  const s = a();
  if (s && (clearTimeout(s), i(null)), e.autoCommitEnabled) {
    const r = window.setTimeout(() => {
      h({ refs: t, state: e, render: o, source: "auto" });
    }, T);
    i(r);
  }
  o();
}
function U({ refs: t, state: e, render: o }) {
  const a = t.testPreview.querySelector('[data-role="sample-button"]');
  if (!(a instanceof HTMLButtonElement))
    return;
  const i = Number(a.dataset.count ?? "0"), d = Number.isNaN(i) ? 1 : i + 1, s = `Sample Button ${d}`;
  a.dataset.count = String(d), a.textContent = s;
  const r = u(v(t.testPreview));
  e.workingTree = u(r), m(t, e, r), e.parseError = "", e.statusMessage = `Sample Button count를 ${d}로 올렸습니다. Commit Patch 전까지 actual DOM은 유지됩니다.`, o();
}
function k(t) {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}
function z({ refs: t, state: e }) {
  t.actual.innerHTML = I;
  const o = v(t.actual), a = u(o);
  p(t.actual, o), p(t.testPreview, o), m(t, e, o), e.history = [a], e.historyMeta = [{
    label: "Initial DOM",
    effectCount: 0,
    timestamp: Date.now()
  }], e.historyIndex = 0, e.workingTree = u(o), e.parseError = "", e.statusMessage = "브라우저 DOM을 읽어 첫 번째 Virtual DOM과 Fiber 기준선을 만들었습니다.";
}
function K({ refs: t, state: e, render: o }) {
  new MutationObserver((i) => {
    const d = i.map((s) => ({
      id: `${s.type}-${s.target.nodeName}-${Math.random().toString(16).slice(2)}`,
      time: Date.now(),
      text: R(s)
    }));
    d.length && (e.mutationFeed = [...d.reverse(), ...e.mutationFeed].slice(0, 14), o());
  }).observe(t.actual, {
    subtree: !0,
    childList: !0,
    attributes: !0,
    characterData: !0
  });
}
function b(t, { refs: e, state: o, render: a }) {
  if (t < 0 || t >= o.history.length)
    return;
  const i = u(o.history[t]);
  p(e.actual, i), p(e.testPreview, i), o.historyIndex = t, o.workingTree = i, o.parseError = "", o.lastCommitEffects = [], m(e, o, i), o.statusMessage = `히스토리 #${t} 상태로 이동했습니다.`, a();
}
function C({
  refs: t,
  state: e,
  render: o,
  mode: a,
  rawValue: i,
  autoCommitTimerRef: d,
  setAutoCommitTimer: s
}) {
  try {
    const l = a === "vdom" ? P(i) : V(i);
    e.workingTree = l, e.parseError = "", p(t.testPreview, l), m(t, e, l, { preserveModeBuffer: a }), e.statusMessage = a === "vdom" ? e.autoCommitEnabled ? "VDOM 미리보기를 동기화했고 자동 commit을 대기 중입니다." : "VDOM 미리보기를 최신 가상 DOM으로 동기화했습니다." : e.autoCommitEnabled ? "테스트 영역 미리보기를 동기화했고 자동 commit을 대기 중입니다." : "테스트 영역 미리보기를 최신 HTML로 동기화했습니다.";
  } catch (l) {
    e.parseError = l instanceof Error ? l.message : a === "vdom" ? "VDOM 파싱 실패" : "HTML 파싱 실패";
  }
  const r = d();
  if (r && (clearTimeout(r), s(null)), e.autoCommitEnabled && !e.parseError) {
    const l = window.setTimeout(() => {
      h({ refs: t, state: e, render: o, source: "auto" });
    }, T);
    s(l);
  }
  o();
}
function m(t, e, o, a = {}) {
  const { preserveModeBuffer: i = null } = a, d = B(o), s = A(o);
  i !== "html" && (t.editor.value = d), i !== "vdom" && (t.vdomEditor.value = s), i === "html" && (t.vdomEditor.value = s), i === "vdom" && (t.editor.value = d);
}
function W() {
  return {
    history: [],
    historyMeta: [],
    historyIndex: 0,
    workingTree: $([]),
    editorMode: "html",
    isEditorModalOpen: !1,
    parseError: "",
    autoCommitEnabled: !1,
    lastCommitEffects: [],
    mutationFeed: [],
    statusMessage: "실제 DOM을 초기화하고 있습니다."
  };
}
function Q(t, e) {
  const o = e.history[e.historyIndex] || $([]), a = e.parseError ? { effects: [] } : w(o, e.workingTree), i = a.effects.length ? a.effects : e.lastCommitEffects, d = a.effects.length ? "대기 중 Fiber Work" : "마지막 Commit 기록", s = f(o), r = f(e.workingTree), l = H(a.effects);
  t.patchButton.disabled = !e.history.length || !!e.parseError, t.autoCommitToggle.checked = e.autoCommitEnabled, t.undoButton.disabled = e.historyIndex === 0, t.redoButton.disabled = e.historyIndex === e.history.length - 1, t.editor.classList.toggle("has-error", !!e.parseError), t.vdomEditor.classList.toggle("has-error", !!e.parseError), t.htmlEditorShell.classList.toggle("is-hidden", e.editorMode !== "html"), t.vdomEditorShell.classList.toggle("is-hidden", e.editorMode !== "vdom"), t.editorModal.classList.toggle("is-open", e.isEditorModalOpen), t.editorModal.setAttribute("aria-hidden", String(!e.isEditorModalOpen)), t.editorModeButtons.forEach((n) => {
    n.classList.toggle("is-active", n.dataset.mode === e.editorMode), n.setAttribute("aria-pressed", String(n.dataset.mode === e.editorMode));
  });
  const g = e.editorMode === "html", O = g ? "HTML 크게 보기" : "가상 DOM(JSON) 크게 보기", D = g ? "샘플 HTML 코드" : "가상 DOM(JSON)", E = g ? t.editor.value : t.vdomEditor.value;
  t.editorModalTitle.textContent = O, t.editorModalLabel.textContent = D, t.editorModalTextarea.value !== E && (t.editorModalTextarea.value = E), t.status.textContent = e.parseError || e.statusMessage, t.actualStats.innerHTML = `
    <span>${s.totalNodes} nodes</span>
    <span>${s.maxDepth} depth</span>
    <span>${e.historyIndex + 1}/${e.history.length || 1} history</span>
  `, t.testStats.innerHTML = `
    <span>${r.totalNodes} nodes</span>
    <span>${a.effects.length} pending effects</span>
    <span>${e.parseError ? "parse error" : "preview synced"}</span>
  `, t.pendingStats.textContent = a.effects.length, t.effectMode.textContent = d, t.effectJsonMeta.textContent = `${i.length} effect objects`, t.insertStat.textContent = l.insert, t.removeStat.textContent = l.remove, t.moveStat.textContent = l.move, t.attrStat.textContent = l.attribute, t.textStat.textContent = l.text, t.effectCards.innerHTML = i.length ? i.map(X).join("") : L("Fiber queue", "현재 표시할 effect가 없습니다."), t.effectJson.textContent = JSON.stringify(i, null, 2), t.committedTree.innerHTML = M(o, 0), t.workingTree.innerHTML = M(e.workingTree, 0), t.historyList.innerHTML = e.historyMeta.map((n, y) => `
      <button type="button" class="${y === e.historyIndex ? "history-item is-active" : "history-item"}" data-history-index="${y}">
        <strong>#${y}</strong>
        <span>${c(n.label)}</span>
        <small>${n.effectCount} effects · ${S(n.timestamp)}</small>
      </button>
    `).join(""), t.mutationFeed.innerHTML = e.mutationFeed.length ? e.mutationFeed.map((n) => `
        <div class="mutation-item">
          <strong>${S(n.time)}</strong>
          <span>${c(n.text)}</span>
        </div>
      `).join("") : L("Mutation log", "Commit 또는 History 이동 후 실제 DOM 변경 기록이 여기에 쌓입니다.");
}
function X(t) {
  return `
    <article class="patch-item">
      <div class="patch-head">
        <span class="patch-type">${c(t.opType)}</span>
        <span class="patch-path">${c(N(t.path || t.parentPath || []))}</span>
      </div>
      <p>${c(j(t))}</p>
      <div class="flag-chip-row">
        ${t.flagNames.map((e) => `<span class="flag-chip">${c(e)}</span>`).join("")}
      </div>
    </article>
  `;
}
function M(t, e) {
  var d;
  const o = J(t);
  if (!((d = t.children) != null && d.length))
    return `
      <div class="tree-leaf">
        <span class="tree-token is-${t.type}">${c(o)}</span>
      </div>
    `;
  const a = e < 2 ? "open" : "", i = t.children.map((s) => M(s, e + 1)).join("");
  return `
    <details class="tree-node" ${a}>
      <summary>
        <span class="tree-token is-${t.type}">${c(o)}</span>
        <span class="tree-count">${t.children.length} children</span>
      </summary>
      <div class="tree-children">${i}</div>
    </details>
  `;
}
function L(t, e) {
  return `
    <div class="empty-state">
      <strong>${c(t)}</strong>
      <p>${c(e)}</p>
    </div>
  `;
}
function Y() {
  return `
    <main class="app-shell">
      <section class="hero-section">
        <h1>Virtual DOM Diff Lab</h1>
      </section>

      <section class="control-bar">
        <div class="button-row">
          <button type="button" class="primary-button" data-role="patch-button">Commit Patch</button>
          <label class="toggle-pill">
            <input type="checkbox" data-role="auto-commit-toggle" />
            <span>실시간 반영</span>
          </label>
          <button type="button" class="secondary-button" data-role="undo-button">뒤로가기</button>
          <button type="button" class="secondary-button" data-role="redo-button">앞으로가기</button>
        </div>

        <div class="status-pill">
          <strong>Status</strong>
          <span data-role="status-text"></span>
        </div>
      </section>

      <section class="stage-grid">
        <article class="panel surface-panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">실제 영역</p>
              <h2>Actual DOM</h2>
            </div>
            <div class="mini-chip-row" data-role="actual-stats"></div>
          </header>
          <div class="dom-canvas">
            <div class="dom-canvas-body" data-role="actual-dom"></div>
          </div>
        </article>

        <article class="panel surface-panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">테스트 영역</p>
              <h2>Editor + Preview</h2>
            </div>
            <div class="editor-head-actions">
              <div class="mini-chip-row" data-role="test-stats"></div>
              <div class="editor-toolbar">
                <div class="segmented-toggle" role="tablist" aria-label="Editor mode">
                  <button type="button" class="mode-button is-active" data-role="editor-mode-button" data-mode="html">HTML</button>
                  <button type="button" class="mode-button" data-role="editor-mode-button" data-mode="vdom">VDOM</button>
                </div>
                <button type="button" class="secondary-button editor-expand-button" data-role="editor-expand-button">크게 보기</button>
              </div>
            </div>
          </header>
          <div class="test-stack">
            <div class="dom-canvas is-test">
              <div class="dom-canvas-body" data-role="test-preview"></div>
            </div>
            <label class="editor-shell" data-role="html-editor-shell">
              <span>샘플 HTML 코드</span>
              <textarea spellcheck="false" data-role="html-editor"></textarea>
            </label>
            <label class="editor-shell is-hidden" data-role="vdom-editor-shell">
              <span>가상 DOM(JSON)</span>
              <textarea spellcheck="false" data-role="vdom-editor"></textarea>
            </label>
          </div>
        </article>
      </section>

      <section class="stats-grid">
        <article class="stat-card"><span>Pending Insert</span><strong data-role="stat-insert">0</strong></article>
        <article class="stat-card"><span>Pending Remove</span><strong data-role="stat-remove">0</strong></article>
        <article class="stat-card"><span>Pending Move</span><strong data-role="stat-move">0</strong></article>
        <article class="stat-card"><span>Fiber Queue</span><strong data-role="pending-stats">0</strong></article>
        <article class="stat-card"><span>Pending Attr</span><strong data-role="stat-attr">0</strong></article>
        <article class="stat-card"><span>Pending Text</span><strong data-role="stat-text">0</strong></article>
      </section>

      <section class="inspector-grid">
        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">Fiber Effects</p>
              <h2 data-role="effect-mode"></h2>
            </div>
          </header>
          <div class="patch-list" data-role="effect-cards"></div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">Effect JSON</p>
              <h2>Commit Queue</h2>
            </div>
            <div class="json-meta">
              <strong>Raw effects</strong>
              <span data-role="effect-json-meta"></span>
            </div>
          </header>
          <pre class="json-code"><code data-role="effect-json"></code></pre>
        </article>

        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">Virtual DOM</p>
              <h2>Committed Tree</h2>
            </div>
          </header>
          <div class="tree-shell" data-role="committed-tree"></div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">Virtual DOM</p>
              <h2>Working Tree</h2>
            </div>
          </header>
          <div class="tree-shell" data-role="working-tree"></div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">History</p>
              <h2>Snapshots</h2>
            </div>
          </header>
          <div class="history-list" data-role="history-list"></div>
        </article>

        <article class="panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">Browser API</p>
              <h2>MutationObserver Feed</h2>
            </div>
          </header>
          <div class="mutation-feed" data-role="mutation-feed"></div>
        </article>
      </section>

      <div class="editor-modal" data-role="editor-modal" aria-hidden="true">
        <div class="editor-modal-backdrop" data-role="editor-modal-backdrop"></div>
        <section class="editor-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-modal-title">
          <header class="editor-modal-head">
            <div>
              <p class="panel-kicker">Expanded Editor</p>
              <h2 id="editor-modal-title" data-role="editor-modal-title">HTML 크게 보기</h2>
            </div>
            <button type="button" class="secondary-button" data-role="editor-modal-close">닫기</button>
          </header>
          <label class="editor-modal-body">
            <span data-role="editor-modal-label">샘플 HTML 코드</span>
            <textarea spellcheck="false" data-role="editor-modal-textarea"></textarea>
          </label>
        </section>
      </div>
    </main>
  `;
}
function G(t) {
  return {
    actual: t.querySelector('[data-role="actual-dom"]'),
    testPreview: t.querySelector('[data-role="test-preview"]'),
    editor: t.querySelector('[data-role="html-editor"]'),
    vdomEditor: t.querySelector('[data-role="vdom-editor"]'),
    htmlEditorShell: t.querySelector('[data-role="html-editor-shell"]'),
    vdomEditorShell: t.querySelector('[data-role="vdom-editor-shell"]'),
    editorModeButtons: Array.from(t.querySelectorAll('[data-role="editor-mode-button"]')),
    editorExpandButton: t.querySelector('[data-role="editor-expand-button"]'),
    editorModal: t.querySelector('[data-role="editor-modal"]'),
    editorModalBackdrop: t.querySelector('[data-role="editor-modal-backdrop"]'),
    editorModalClose: t.querySelector('[data-role="editor-modal-close"]'),
    editorModalTitle: t.querySelector('[data-role="editor-modal-title"]'),
    editorModalLabel: t.querySelector('[data-role="editor-modal-label"]'),
    editorModalTextarea: t.querySelector('[data-role="editor-modal-textarea"]'),
    patchButton: t.querySelector('[data-role="patch-button"]'),
    autoCommitToggle: t.querySelector('[data-role="auto-commit-toggle"]'),
    undoButton: t.querySelector('[data-role="undo-button"]'),
    redoButton: t.querySelector('[data-role="redo-button"]'),
    status: t.querySelector('[data-role="status-text"]'),
    actualStats: t.querySelector('[data-role="actual-stats"]'),
    testStats: t.querySelector('[data-role="test-stats"]'),
    pendingStats: t.querySelector('[data-role="pending-stats"]'),
    effectCards: t.querySelector('[data-role="effect-cards"]'),
    effectJson: t.querySelector('[data-role="effect-json"]'),
    effectMode: t.querySelector('[data-role="effect-mode"]'),
    effectJsonMeta: t.querySelector('[data-role="effect-json-meta"]'),
    committedTree: t.querySelector('[data-role="committed-tree"]'),
    workingTree: t.querySelector('[data-role="working-tree"]'),
    historyList: t.querySelector('[data-role="history-list"]'),
    mutationFeed: t.querySelector('[data-role="mutation-feed"]'),
    insertStat: t.querySelector('[data-role="stat-insert"]'),
    removeStat: t.querySelector('[data-role="stat-remove"]'),
    moveStat: t.querySelector('[data-role="stat-move"]'),
    attrStat: t.querySelector('[data-role="stat-attr"]'),
    textStat: t.querySelector('[data-role="stat-text"]')
  };
}
function ot(t) {
  t.innerHTML = Y();
  const e = G(t), o = W(), a = () => Q(e, o);
  _({ refs: e, state: o, render: a }), z({ refs: e, state: o }), K({ refs: e, state: o, render: a }), a();
}
export {
  it as ChildDeletion,
  lt as NoFlags,
  st as Placement,
  dt as Update,
  u as cloneVNode,
  q as commitRoot,
  f as countVNodeStats,
  $ as createRootVNode,
  ut as domNodeToVNode,
  v as domNodeToVNodeTree,
  N as formatFiberPath,
  nt as getFlagNames,
  mt as getVNodeKey,
  ot as initApp,
  p as mountVNode,
  V as parseHtmlToVNode,
  P as parseVdomTextToVNode,
  w as reconcileTrees,
  pt as removeDomAttribute,
  ht as renderVNode,
  B as serializeVNodeToHtml,
  A as serializeVNodeToText,
  vt as setDomAttribute,
  H as summarizeCommitOperations
};
