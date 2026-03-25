import { reconcileTrees as x, commitRoot as $, summarizeCommitOperations as L, formatFiberPath as D } from "./fiber.js";
import { ChildDeletion as et, NoFlags as at, Placement as ot, Update as rt, getFlagNames as st } from "./fiber.js";
import { domNodeToVNodeTree as v, cloneVNode as u, mountVNode as p, parseVdomTextToVNode as O, parseHtmlToVNode as P, serializeVNodeToHtml as N, serializeVNodeToText as q, createRootVNode as w, countVNodeStats as M } from "./vdom.js";
import { domNodeToVNode as nt, getVNodeKey as lt, removeDomAttribute as dt, renderVNode as ct, setDomAttribute as ut } from "./vdom.js";
const H = `
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
`, V = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});
function T(t) {
  return V.format(t);
}
function c(t) {
  return String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function A(t) {
  switch (t.opType) {
    case "INSERT_CHILD":
      return `index ${t.index} 위치에 새 노드를 삽입합니다.`;
    case "MOVE_CHILD":
      return `key "${t.key}" 노드를 index ${t.toIndex} 위치로 이동합니다.`;
    case "REMOVE_CHILD":
      return `index ${t.index} 자식 노드를 제거합니다.`;
    case "UPDATE_PROPS": {
      const e = Object.keys(t.payload.set || {}), a = t.payload.remove || [];
      return `props 변경: set ${e.join(", ") || "-"} / remove ${a.join(", ") || "-"}`;
    }
    case "UPDATE_TEXT":
      return `텍스트를 "${t.value}" 로 갱신합니다.`;
    default:
      return "설명할 수 없는 effect입니다.";
  }
}
function B(t) {
  return t.type === "attributes" ? `${t.attributeName} 속성이 변경되었습니다.` : t.type === "characterData" ? "텍스트 노드가 수정되었습니다." : `자식 노드 ${t.addedNodes.length}개 추가, ${t.removedNodes.length}개 제거`;
}
function I(t) {
  if (t.type === "root")
    return "root";
  if (t.type === "text")
    return `"${t.value.replace(/\s+/g, " ").trim() || "(whitespace)"}"`;
  const e = Object.entries(t.attrs || {}).slice(0, 3).map(([a, o]) => o === "" ? a : `${a}="${o}"`).join(" ");
  return e ? `<${t.tag} ${e}>` : `<${t.tag}>`;
}
const b = 250;
function F({ refs: t, state: e, render: a }) {
  let o = null;
  const i = (s) => {
    s.target.closest('[data-role="sample-button"]') && j({ refs: t, state: e, render: a });
  };
  t.editor.addEventListener("input", () => {
    k({
      refs: t,
      state: e,
      render: a,
      mode: "html",
      rawValue: t.editor.value,
      autoCommitTimerRef: () => o,
      setAutoCommitTimer: (s) => {
        o = s;
      }
    });
  }), t.vdomEditor.addEventListener("input", () => {
    k({
      refs: t,
      state: e,
      render: a,
      mode: "vdom",
      rawValue: t.vdomEditor.value,
      autoCommitTimerRef: () => o,
      setAutoCommitTimer: (s) => {
        o = s;
      }
    });
  }), t.testPreview.addEventListener("input", (s) => {
    E(s.target) && S({ refs: t, state: e, render: a, autoCommitTimerRef: () => o, setAutoCommitTimer: (r) => {
      o = r;
    } });
  }), t.testPreview.addEventListener("change", (s) => {
    E(s.target) && S({ refs: t, state: e, render: a, autoCommitTimerRef: () => o, setAutoCommitTimer: (r) => {
      o = r;
    } });
  }), t.testPreview.addEventListener("click", i), t.editorModeButtons.forEach((s) => {
    s.addEventListener("click", () => {
      const r = s.dataset.mode;
      r !== "html" && r !== "vdom" || e.editorMode !== r && (e.editorMode = r, e.statusMessage = r === "vdom" ? "VDOM 편집 모드로 전환했습니다." : "HTML 편집 모드로 전환했습니다.", a());
    });
  }), t.patchButton.addEventListener("click", () => {
    o && (clearTimeout(o), o = null), h({ refs: t, state: e, render: a, source: "manual" });
  }), t.autoCommitToggle.addEventListener("change", () => {
    e.autoCommitEnabled = t.autoCommitToggle.checked, e.statusMessage = e.autoCommitEnabled ? "실시간 commit 모드를 활성화했습니다." : "실시간 commit 모드를 비활성화했습니다.", o && (clearTimeout(o), o = null), e.autoCommitEnabled && !e.parseError && (o = window.setTimeout(() => {
      h({ refs: t, state: e, render: a, source: "auto" });
    }, b)), a();
  }), t.undoButton.addEventListener("click", () => {
    y(e.historyIndex - 1, { refs: t, state: e, render: a });
  }), t.redoButton.addEventListener("click", () => {
    y(e.historyIndex + 1, { refs: t, state: e, render: a });
  }), t.historyList.addEventListener("click", (s) => {
    const r = s.target.closest("[data-history-index]");
    r && y(Number(r.dataset.historyIndex), { refs: t, state: e, render: a });
  });
}
function h({ refs: t, state: e, render: a, source: o }) {
  const i = e.history[e.historyIndex];
  if (!i || e.parseError)
    return;
  const s = u(v(t.testPreview)), r = x(i, s);
  if (e.lastCommitEffects = r.effects, e.workingTree = u(s), o === "manual" && m(t, e, s), !r.effects.length) {
    e.statusMessage = o === "auto" ? "자동 commit을 확인했지만 반영할 변경점이 없습니다." : "변경점이 없어 commit 단계를 생략했습니다.", a();
    return;
  }
  $(t.actual, r.rootFiber);
  const l = e.history.slice(0, e.historyIndex + 1), n = e.historyMeta.slice(0, e.historyIndex + 1);
  l.push(u(s)), n.push({
    label: `${o === "auto" ? "Auto Commit" : "Commit"} #${l.length - 1}`,
    effectCount: r.effects.length,
    timestamp: Date.now()
  }), e.history = l, e.historyMeta = n, e.historyIndex = l.length - 1, e.statusMessage = o === "auto" ? `${r.effects.length}개의 effect를 자동 commit 했습니다.` : `${r.effects.length}개의 effect를 commit 했습니다.`, a();
}
function S({ refs: t, state: e, render: a, autoCommitTimerRef: o, setAutoCommitTimer: i }) {
  const s = u(v(t.testPreview));
  e.workingTree = s, e.parseError = "", m(t, e, s), e.statusMessage = e.autoCommitEnabled ? "테스트 영역 입력을 동기화했고 자동 commit을 대기 중입니다." : "테스트 영역 입력을 샘플 HTML 코드와 동기화했습니다.";
  const r = o();
  if (r && (clearTimeout(r), i(null)), e.autoCommitEnabled) {
    const l = window.setTimeout(() => {
      h({ refs: t, state: e, render: a, source: "auto" });
    }, b);
    i(l);
  }
  a();
}
function j({ refs: t, state: e, render: a }) {
  const o = t.testPreview.querySelector('[data-role="sample-button"]');
  if (!(o instanceof HTMLButtonElement))
    return;
  const i = Number(o.dataset.count ?? "0"), s = Number.isNaN(i) ? 1 : i + 1, r = `Sample Button ${s}`;
  o.dataset.count = String(s), o.textContent = r;
  const l = u(v(t.testPreview));
  e.workingTree = u(l), m(t, e, l), e.parseError = "", e.statusMessage = `Sample Button count를 ${s}로 올렸습니다. Commit Patch 전까지 actual DOM은 유지됩니다.`, a();
}
function E(t) {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}
function R({ refs: t, state: e }) {
  t.actual.innerHTML = H;
  const a = v(t.actual), o = u(a);
  p(t.actual, a), p(t.testPreview, a), m(t, e, a), e.history = [o], e.historyMeta = [{
    label: "Initial DOM",
    effectCount: 0,
    timestamp: Date.now()
  }], e.historyIndex = 0, e.workingTree = u(a), e.parseError = "", e.statusMessage = "브라우저 DOM을 읽어 첫 번째 Virtual DOM과 Fiber 기준선을 만들었습니다.";
}
function _({ refs: t, state: e, render: a }) {
  new MutationObserver((i) => {
    const s = i.map((r) => ({
      id: `${r.type}-${r.target.nodeName}-${Math.random().toString(16).slice(2)}`,
      time: Date.now(),
      text: B(r)
    }));
    s.length && (e.mutationFeed = [...s.reverse(), ...e.mutationFeed].slice(0, 14), a());
  }).observe(t.actual, {
    subtree: !0,
    childList: !0,
    attributes: !0,
    characterData: !0
  });
}
function y(t, { refs: e, state: a, render: o }) {
  if (t < 0 || t >= a.history.length)
    return;
  const i = u(a.history[t]);
  p(e.actual, i), p(e.testPreview, i), a.historyIndex = t, a.workingTree = i, a.parseError = "", a.lastCommitEffects = [], m(e, a, i), a.statusMessage = `히스토리 #${t} 상태로 이동했습니다.`, o();
}
function k({
  refs: t,
  state: e,
  render: a,
  mode: o,
  rawValue: i,
  autoCommitTimerRef: s,
  setAutoCommitTimer: r
}) {
  try {
    const n = o === "vdom" ? O(i) : P(i);
    e.workingTree = n, e.parseError = "", p(t.testPreview, n), m(t, e, n, { preserveModeBuffer: o }), e.statusMessage = o === "vdom" ? e.autoCommitEnabled ? "VDOM 미리보기를 동기화했고 자동 commit을 대기 중입니다." : "VDOM 미리보기를 최신 가상 DOM으로 동기화했습니다." : e.autoCommitEnabled ? "테스트 영역 미리보기를 동기화했고 자동 commit을 대기 중입니다." : "테스트 영역 미리보기를 최신 HTML로 동기화했습니다.";
  } catch (n) {
    e.parseError = n instanceof Error ? n.message : o === "vdom" ? "VDOM 파싱 실패" : "HTML 파싱 실패";
  }
  const l = s();
  if (l && (clearTimeout(l), r(null)), e.autoCommitEnabled && !e.parseError) {
    const n = window.setTimeout(() => {
      h({ refs: t, state: e, render: a, source: "auto" });
    }, b);
    r(n);
  }
  a();
}
function m(t, e, a, o = {}) {
  const { preserveModeBuffer: i = null } = o, s = N(a), r = q(a);
  i !== "html" && (t.editor.value = s), i !== "vdom" && (t.vdomEditor.value = r), i === "html" && (t.vdomEditor.value = r), i === "vdom" && (t.editor.value = s);
}
function J() {
  return {
    history: [],
    historyMeta: [],
    historyIndex: 0,
    workingTree: w([]),
    editorMode: "html",
    parseError: "",
    autoCommitEnabled: !1,
    lastCommitEffects: [],
    mutationFeed: [],
    statusMessage: "실제 DOM을 초기화하고 있습니다."
  };
}
function U(t, e) {
  const a = e.history[e.historyIndex] || w([]), o = e.parseError ? { effects: [] } : x(a, e.workingTree), i = o.effects.length ? o.effects : e.lastCommitEffects, s = o.effects.length ? "대기 중 Fiber Work" : "마지막 Commit 기록", r = M(a), l = M(e.workingTree), n = L(o.effects);
  t.patchButton.disabled = !e.history.length || !!e.parseError, t.autoCommitToggle.checked = e.autoCommitEnabled, t.undoButton.disabled = e.historyIndex === 0, t.redoButton.disabled = e.historyIndex === e.history.length - 1, t.editor.classList.toggle("has-error", !!e.parseError), t.vdomEditor.classList.toggle("has-error", !!e.parseError), t.htmlEditorShell.classList.toggle("is-hidden", e.editorMode !== "html"), t.vdomEditorShell.classList.toggle("is-hidden", e.editorMode !== "vdom"), t.editorModeButtons.forEach((d) => {
    d.classList.toggle("is-active", d.dataset.mode === e.editorMode), d.setAttribute("aria-pressed", String(d.dataset.mode === e.editorMode));
  }), t.status.textContent = e.parseError || e.statusMessage, t.actualStats.innerHTML = `
    <span>${r.totalNodes} nodes</span>
    <span>${r.maxDepth} depth</span>
    <span>${e.historyIndex + 1}/${e.history.length || 1} history</span>
  `, t.testStats.innerHTML = `
    <span>${l.totalNodes} nodes</span>
    <span>${o.effects.length} pending effects</span>
    <span>${e.parseError ? "parse error" : "preview synced"}</span>
  `, t.pendingStats.textContent = o.effects.length, t.effectMode.textContent = s, t.effectJsonMeta.textContent = `${i.length} effect objects`, t.insertStat.textContent = n.insert, t.removeStat.textContent = n.remove, t.moveStat.textContent = n.move, t.attrStat.textContent = n.attribute, t.textStat.textContent = n.text, t.effectCards.innerHTML = i.length ? i.map(z).join("") : C("Fiber queue", "현재 표시할 effect가 없습니다."), t.effectJson.textContent = JSON.stringify(i, null, 2), t.committedTree.innerHTML = f(a, 0), t.workingTree.innerHTML = f(e.workingTree, 0), t.historyList.innerHTML = e.historyMeta.map((d, g) => `
      <button type="button" class="${g === e.historyIndex ? "history-item is-active" : "history-item"}" data-history-index="${g}">
        <strong>#${g}</strong>
        <span>${c(d.label)}</span>
        <small>${d.effectCount} effects · ${T(d.timestamp)}</small>
      </button>
    `).join(""), t.mutationFeed.innerHTML = e.mutationFeed.length ? e.mutationFeed.map((d) => `
        <div class="mutation-item">
          <strong>${T(d.time)}</strong>
          <span>${c(d.text)}</span>
        </div>
      `).join("") : C("Mutation log", "Commit 또는 History 이동 후 실제 DOM 변경 기록이 여기에 쌓입니다.");
}
function z(t) {
  return `
    <article class="patch-item">
      <div class="patch-head">
        <span class="patch-type">${c(t.opType)}</span>
        <span class="patch-path">${c(D(t.path || t.parentPath || []))}</span>
      </div>
      <p>${c(A(t))}</p>
      <div class="flag-chip-row">
        ${t.flagNames.map((e) => `<span class="flag-chip">${c(e)}</span>`).join("")}
      </div>
    </article>
  `;
}
function f(t, e) {
  var s;
  const a = I(t);
  if (!((s = t.children) != null && s.length))
    return `
      <div class="tree-leaf">
        <span class="tree-token is-${t.type}">${c(a)}</span>
      </div>
    `;
  const o = e < 2 ? "open" : "", i = t.children.map((r) => f(r, e + 1)).join("");
  return `
    <details class="tree-node" ${o}>
      <summary>
        <span class="tree-token is-${t.type}">${c(a)}</span>
        <span class="tree-count">${t.children.length} children</span>
      </summary>
      <div class="tree-children">${i}</div>
    </details>
  `;
}
function C(t, e) {
  return `
    <div class="empty-state">
      <strong>${c(t)}</strong>
      <p>${c(e)}</p>
    </div>
  `;
}
function K() {
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
              <div class="segmented-toggle" role="tablist" aria-label="Editor mode">
                <button type="button" class="mode-button is-active" data-role="editor-mode-button" data-mode="html">HTML</button>
                <button type="button" class="mode-button" data-role="editor-mode-button" data-mode="vdom">VDOM</button>
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
    </main>
  `;
}
function W(t) {
  return {
    actual: t.querySelector('[data-role="actual-dom"]'),
    testPreview: t.querySelector('[data-role="test-preview"]'),
    editor: t.querySelector('[data-role="html-editor"]'),
    vdomEditor: t.querySelector('[data-role="vdom-editor"]'),
    htmlEditorShell: t.querySelector('[data-role="html-editor-shell"]'),
    vdomEditorShell: t.querySelector('[data-role="vdom-editor-shell"]'),
    editorModeButtons: Array.from(t.querySelectorAll('[data-role="editor-mode-button"]')),
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
function G(t) {
  t.innerHTML = K();
  const e = W(t), a = J(), o = () => U(e, a);
  F({ refs: e, state: a, render: o }), R({ refs: e, state: a }), _({ refs: e, state: a, render: o }), o();
}
export {
  et as ChildDeletion,
  at as NoFlags,
  ot as Placement,
  rt as Update,
  u as cloneVNode,
  $ as commitRoot,
  M as countVNodeStats,
  w as createRootVNode,
  nt as domNodeToVNode,
  v as domNodeToVNodeTree,
  D as formatFiberPath,
  st as getFlagNames,
  lt as getVNodeKey,
  G as initApp,
  p as mountVNode,
  P as parseHtmlToVNode,
  O as parseVdomTextToVNode,
  x as reconcileTrees,
  dt as removeDomAttribute,
  ct as renderVNode,
  N as serializeVNodeToHtml,
  q as serializeVNodeToText,
  ut as setDomAttribute,
  L as summarizeCommitOperations
};
