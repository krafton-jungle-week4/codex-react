import { SAMPLE_MARKUP } from '../lib/sampleMarkup.js';
import {
  commitRoot,
  reconcileTrees,
} from '../lib/fiber.js';
import {
  cloneVNode,
  domNodeToVNodeTree,
  mountVNode,
  parseHtmlToVNode,
  parseVdomTextToVNode,
  serializeVNodeToHtml,
  serializeVNodeToText,
} from '../lib/vdom.js';

const AUTO_COMMIT_DELAY_MS = 250;

// 편집기, 미리보기, 히스토리 버튼을 하나의 상태 흐름으로 묶는 상호작용 계층이다.
/**
 * playground UI 전체 이벤트를 연결한다.
 *
 * @param {{refs: object, state: object, render: Function}} params - DOM 참조, 앱 상태, 재렌더 함수.
 * @returns {void}
 */
export function bindEvents({ refs, state, render }) {
  let autoCommitTimer = null;

  const handleSampleButtonClick = (event) => {
    const button = event.target.closest('[data-role="sample-button"]');

    if (!button) {
      return;
    }

    incrementSampleButton({ refs, state, render });
  };

  refs.editor.addEventListener('input', () => {
    handleEditorInput({
      refs,
      state,
      render,
      mode: 'html',
      rawValue: refs.editor.value,
      autoCommitTimerRef: () => autoCommitTimer,
      setAutoCommitTimer: (value) => {
        autoCommitTimer = value;
      },
    });
  });

  refs.vdomEditor.addEventListener('input', () => {
    handleEditorInput({
      refs,
      state,
      render,
      mode: 'vdom',
      rawValue: refs.vdomEditor.value,
      autoCommitTimerRef: () => autoCommitTimer,
      setAutoCommitTimer: (value) => {
        autoCommitTimer = value;
      },
    });
  });

  refs.testPreview.addEventListener('input', (event) => {
    if (!shouldSyncPreviewField(event.target)) {
      return;
    }

    syncFromPreview({ refs, state, render, autoCommitTimerRef: () => autoCommitTimer, setAutoCommitTimer: (value) => {
      autoCommitTimer = value;
    } });
  });

  refs.testPreview.addEventListener('change', (event) => {
    if (!shouldSyncPreviewField(event.target)) {
      return;
    }

    syncFromPreview({ refs, state, render, autoCommitTimerRef: () => autoCommitTimer, setAutoCommitTimer: (value) => {
      autoCommitTimer = value;
    } });
  });

  refs.testPreview.addEventListener('click', handleSampleButtonClick);

  refs.editorModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.mode;

      if (nextMode !== 'html' && nextMode !== 'vdom') {
        return;
      }

      if (state.editorMode === nextMode) {
        return;
      }

      state.editorMode = nextMode;
      state.statusMessage = nextMode === 'vdom'
        ? 'VDOM 편집 모드로 전환했습니다.'
        : 'HTML 편집 모드로 전환했습니다.';
      render();
    });
  });

  refs.patchButton.addEventListener('click', () => {
    if (autoCommitTimer) {
      clearTimeout(autoCommitTimer);
      autoCommitTimer = null;
    }

    runCommit({ refs, state, render, source: 'manual' });
  });

  refs.autoCommitToggle.addEventListener('change', () => {
    state.autoCommitEnabled = refs.autoCommitToggle.checked;
    state.statusMessage = state.autoCommitEnabled
      ? '실시간 commit 모드를 활성화했습니다.'
      : '실시간 commit 모드를 비활성화했습니다.';

    if (autoCommitTimer) {
      clearTimeout(autoCommitTimer);
      autoCommitTimer = null;
    }

    if (state.autoCommitEnabled && !state.parseError) {
      autoCommitTimer = window.setTimeout(() => {
        runCommit({ refs, state, render, source: 'auto' });
      }, AUTO_COMMIT_DELAY_MS);
    }

    render();
  });

  refs.undoButton.addEventListener('click', () => {
    jumpToHistory(state.historyIndex - 1, { refs, state, render });
  });

  refs.redoButton.addEventListener('click', () => {
    jumpToHistory(state.historyIndex + 1, { refs, state, render });
  });

  refs.historyList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-history-index]');

    if (!button) {
      return;
    }

    jumpToHistory(Number(button.dataset.historyIndex), { refs, state, render });
  });
}

/**
 * 현재 test preview DOM을 기준으로 reconciliation과 commit을 실행한다.
 *
 * @param {{refs: object, state: object, render: Function, source: 'auto' | 'manual'}} params - commit 실행 컨텍스트.
 * @returns {void}
 */
function runCommit({ refs, state, render, source }) {
  const committedTree = state.history[state.historyIndex];

  if (!committedTree || state.parseError) {
    return;
  }

  const nextTree = cloneVNode(domNodeToVNodeTree(refs.testPreview));
  const workInProgress = reconcileTrees(committedTree, nextTree);

  state.lastCommitEffects = workInProgress.effects;
  state.workingTree = cloneVNode(nextTree);

  // 수동 commit일 때만 HTML을 정규화하고, 자동 commit 중에는 textarea 값을 덮어쓰지 않는다.
  if (source === 'manual') {
    syncEditorsFromTree(refs, state, nextTree);
  }

  if (!workInProgress.effects.length) {
    state.statusMessage = source === 'auto'
      ? '자동 commit을 확인했지만 반영할 변경점이 없습니다.'
      : '변경점이 없어 commit 단계를 생략했습니다.';
    render();
    return;
  }

  commitRoot(refs.actual, workInProgress.rootFiber);

  const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
  const truncatedMeta = state.historyMeta.slice(0, state.historyIndex + 1);

  truncatedHistory.push(cloneVNode(nextTree));
  truncatedMeta.push({
    label: `${source === 'auto' ? 'Auto Commit' : 'Commit'} #${truncatedHistory.length - 1}`,
    effectCount: workInProgress.effects.length,
    timestamp: Date.now(),
  });

  state.history = truncatedHistory;
  state.historyMeta = truncatedMeta;
  state.historyIndex = truncatedHistory.length - 1;
  state.statusMessage = source === 'auto'
    ? `${workInProgress.effects.length}개의 effect를 자동 commit 했습니다.`
    : `${workInProgress.effects.length}개의 effect를 commit 했습니다.`;

  render();
}

/**
 * 사용자가 미리보기 영역에서 직접 바꾼 값을 editor와 working tree에 역방향 동기화한다.
 *
 * @param {{refs: object, state: object, render: Function, autoCommitTimerRef: Function, setAutoCommitTimer: Function}} params - 동기화에 필요한 상태와 타이머 접근자.
 * @returns {void}
 */
function syncFromPreview({ refs, state, render, autoCommitTimerRef, setAutoCommitTimer }) {
  const nextTree = cloneVNode(domNodeToVNodeTree(refs.testPreview));

  state.workingTree = nextTree;
  state.parseError = '';
  syncEditorsFromTree(refs, state, nextTree);
  state.statusMessage = state.autoCommitEnabled
    ? '테스트 영역 입력을 동기화했고 자동 commit을 대기 중입니다.'
    : '테스트 영역 입력을 샘플 HTML 코드와 동기화했습니다.';

  const activeTimer = autoCommitTimerRef();

  if (activeTimer) {
    clearTimeout(activeTimer);
    setAutoCommitTimer(null);
  }

  if (state.autoCommitEnabled) {
    const nextTimer = window.setTimeout(() => {
      runCommit({ refs, state, render, source: 'auto' });
    }, AUTO_COMMIT_DELAY_MS);

    setAutoCommitTimer(nextTimer);
  }

  render();
}

/**
 * 샘플 버튼 클릭 수를 test preview와 working tree에만 반영한다.
 *
 * @param {{refs: object, state: object, render: Function}} params - 동기화에 필요한 상태와 렌더 함수.
 * @returns {void}
 */
function incrementSampleButton({ refs, state, render }) {
  const previewButton = refs.testPreview.querySelector('[data-role="sample-button"]');

  if (!(previewButton instanceof HTMLButtonElement)) {
    return;
  }

  const currentCount = Number(previewButton.dataset.count ?? '0');
  const nextCount = Number.isNaN(currentCount) ? 1 : currentCount + 1;
  const nextLabel = `Sample Button ${nextCount}`;

  previewButton.dataset.count = String(nextCount);
  previewButton.textContent = nextLabel;

  const nextTree = cloneVNode(domNodeToVNodeTree(refs.testPreview));

  state.workingTree = cloneVNode(nextTree);
  syncEditorsFromTree(refs, state, nextTree);
  state.parseError = '';
  state.statusMessage = `Sample Button count를 ${nextCount}로 올렸습니다. Commit Patch 전까지 actual DOM은 유지됩니다.`;

  render();
}

/**
 * 입력값을 가지는 form control인지 검사해 preview 역동기화 대상을 한정한다.
 *
 * @param {EventTarget | null} target - 이벤트가 발생한 DOM 대상.
 * @returns {boolean} 동기화 대상이면 `true`.
 */
function shouldSyncPreviewField(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}

/**
 * 샘플 마크업을 기준으로 actual/test/editor/history의 첫 상태를 맞춘다.
 *
 * @param {{refs: object, state: object}} params - DOM 참조와 앱 상태.
 * @returns {void}
 */
export function mountInitialState({ refs, state }) {
  refs.actual.innerHTML = SAMPLE_MARKUP;
  const initialTree = domNodeToVNodeTree(refs.actual);
  const initialSnapshot = cloneVNode(initialTree);

  // 이후 fiber path가 실제 DOM 구조와 일치하도록 초기 actual DOM을 한 번 정규화한다.
  mountVNode(refs.actual, initialTree);
  mountVNode(refs.testPreview, initialTree);
  syncEditorsFromTree(refs, state, initialTree);

  state.history = [initialSnapshot];
  state.historyMeta = [{
    label: 'Initial DOM',
    effectCount: 0,
    timestamp: Date.now(),
  }];
  state.historyIndex = 0;
  state.workingTree = cloneVNode(initialTree);
  state.parseError = '';
  state.statusMessage = '브라우저 DOM을 읽어 첫 번째 Virtual DOM과 Fiber 기준선을 만들었습니다.';
}

/**
 * 저장된 히스토리 스냅샷으로 actual/test/editor 상태를 되돌린다.
 *
 * @param {number} nextIndex - 이동할 히스토리 인덱스.
 * @param {{refs: object, state: object, render: Function}} params - DOM 참조, 앱 상태, 재렌더 함수.
 * @returns {void}
 */
function jumpToHistory(nextIndex, { refs, state, render }) {
  if (nextIndex < 0 || nextIndex >= state.history.length) {
    return;
  }

  const snapshot = cloneVNode(state.history[nextIndex]);
  mountVNode(refs.actual, snapshot);
  mountVNode(refs.testPreview, snapshot);

  state.historyIndex = nextIndex;
  state.workingTree = snapshot;
  state.parseError = '';
  state.lastCommitEffects = [];
  syncEditorsFromTree(refs, state, snapshot);
  state.statusMessage = `히스토리 #${nextIndex} 상태로 이동했습니다.`;

  render();
}

function handleEditorInput({
  refs,
  state,
  render,
  mode,
  rawValue,
  autoCommitTimerRef,
  setAutoCommitTimer,
}) {
  try {
    const nextTree = mode === 'vdom'
      ? parseVdomTextToVNode(rawValue)
      : parseHtmlToVNode(rawValue);

    state.workingTree = nextTree;
    state.parseError = '';
    mountVNode(refs.testPreview, nextTree);
    syncEditorsFromTree(refs, state, nextTree, { preserveModeBuffer: mode });
    state.statusMessage = mode === 'vdom'
      ? (state.autoCommitEnabled
        ? 'VDOM 미리보기를 동기화했고 자동 commit을 대기 중입니다.'
        : 'VDOM 미리보기를 최신 가상 DOM으로 동기화했습니다.')
      : (state.autoCommitEnabled
        ? '테스트 영역 미리보기를 동기화했고 자동 commit을 대기 중입니다.'
        : '테스트 영역 미리보기를 최신 HTML로 동기화했습니다.');
  } catch (error) {
    state.parseError = error instanceof Error
      ? error.message
      : mode === 'vdom'
        ? 'VDOM 파싱 실패'
        : 'HTML 파싱 실패';
  }

  const activeTimer = autoCommitTimerRef();

  if (activeTimer) {
    clearTimeout(activeTimer);
    setAutoCommitTimer(null);
  }

  if (state.autoCommitEnabled && !state.parseError) {
    const nextTimer = window.setTimeout(() => {
      runCommit({ refs, state, render, source: 'auto' });
    }, AUTO_COMMIT_DELAY_MS);

    setAutoCommitTimer(nextTimer);
  }

  render();
}

function syncEditorsFromTree(refs, state, tree, options = {}) {
  const { preserveModeBuffer = null } = options;
  const htmlValue = serializeVNodeToHtml(tree);
  const vdomValue = serializeVNodeToText(tree);

  if (preserveModeBuffer !== 'html') {
    refs.editor.value = htmlValue;
  }

  if (preserveModeBuffer !== 'vdom') {
    refs.vdomEditor.value = vdomValue;
  }

  if (preserveModeBuffer === 'html') {
    refs.vdomEditor.value = vdomValue;
  }

  if (preserveModeBuffer === 'vdom') {
    refs.editor.value = htmlValue;
  }
}
