// 앱의 정적 레이아웃 HTML과 각 패널 DOM 참조 수집 함수를 제공한다.
/**
 * playground 전체 UI 뼈대를 문자열 템플릿으로 반환한다.
 *
 * @returns {string} 루트 컨테이너에 주입할 앱 셸 마크업.
 */
export function getAppShell() {
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

      </section>
    </main>
  `;
}

/**
 * 셸 안에서 자주 접근하는 DOM 노드들을 data-role 기준으로 모아 반환한다.
 *
 * @param {Element} container - 앱 셸이 이미 주입된 루트 컨테이너.
 * @returns {object} 렌더링과 이벤트 바인딩에 사용할 DOM 참조 모음.
 */
export function getRefs(container) {
  return {
    actual: container.querySelector('[data-role="actual-dom"]'),
    testPreview: container.querySelector('[data-role="test-preview"]'),
    editor: container.querySelector('[data-role="html-editor"]'),
    vdomEditor: container.querySelector('[data-role="vdom-editor"]'),
    htmlEditorShell: container.querySelector('[data-role="html-editor-shell"]'),
    vdomEditorShell: container.querySelector('[data-role="vdom-editor-shell"]'),
    editorModeButtons: Array.from(container.querySelectorAll('[data-role="editor-mode-button"]')),
    patchButton: container.querySelector('[data-role="patch-button"]'),
    autoCommitToggle: container.querySelector('[data-role="auto-commit-toggle"]'),
    undoButton: container.querySelector('[data-role="undo-button"]'),
    redoButton: container.querySelector('[data-role="redo-button"]'),
    status: container.querySelector('[data-role="status-text"]'),
    actualStats: container.querySelector('[data-role="actual-stats"]'),
    testStats: container.querySelector('[data-role="test-stats"]'),
    pendingStats: container.querySelector('[data-role="pending-stats"]'),
    effectCards: container.querySelector('[data-role="effect-cards"]'),
    effectJson: container.querySelector('[data-role="effect-json"]'),
    effectMode: container.querySelector('[data-role="effect-mode"]'),
    effectJsonMeta: container.querySelector('[data-role="effect-json-meta"]'),
    committedTree: container.querySelector('[data-role="committed-tree"]'),
    workingTree: container.querySelector('[data-role="working-tree"]'),
    historyList: container.querySelector('[data-role="history-list"]'),
    insertStat: container.querySelector('[data-role="stat-insert"]'),
    removeStat: container.querySelector('[data-role="stat-remove"]'),
    moveStat: container.querySelector('[data-role="stat-move"]'),
    attrStat: container.querySelector('[data-role="stat-attr"]'),
    textStat: container.querySelector('[data-role="stat-text"]'),
  };
}
