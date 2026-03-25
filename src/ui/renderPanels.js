import {
  formatFiberPath,
  reconcileTrees,
  summarizeCommitOperations,
} from '../lib/fiber.js';
import {
  countVNodeStats,
  createRootVNode,
} from '../lib/vdom.js';
import {
  describeEffect,
  escapeHtml,
  formatTime,
  getTreeLabel,
} from './formatters.js';

// 현재 state를 검사 패널용 HTML 문자열로 바꿔 실제 대시보드 DOM에 주입한다.
/**
 * 앱 상태를 기준으로 통계, effect 목록, 트리 뷰, 히스토리 UI를 다시 그린다.
 *
 * @param {object} refs - 패널 DOM 참조 모음.
 * @param {object} state - 현재 playground 상태.
 * @returns {void}
 */
export function renderPanels(refs, state) {
  const committedTree = state.history[state.historyIndex] || createRootVNode([]);
  const pendingWork = state.parseError
    ? { effects: [] }
    : reconcileTrees(committedTree, state.workingTree);
  const panelEffects = pendingWork.effects.length
    ? pendingWork.effects
    : state.lastCommitEffects;
  const panelMode = pendingWork.effects.length
    ? '대기 중 Fiber Work'
    : '마지막 Commit 기록';
  const committedStats = countVNodeStats(committedTree);
  const workingStats = countVNodeStats(state.workingTree);
  const operationSummary = summarizeCommitOperations(pendingWork.effects);

  refs.patchButton.disabled = !state.history.length || Boolean(state.parseError);
  refs.autoCommitToggle.checked = state.autoCommitEnabled;
  refs.undoButton.disabled = state.historyIndex === 0;
  refs.redoButton.disabled = state.historyIndex === state.history.length - 1;
  refs.editor.classList.toggle('has-error', Boolean(state.parseError));
  refs.vdomEditor.classList.toggle('has-error', Boolean(state.parseError));
  refs.htmlEditorShell.classList.toggle('is-hidden', state.editorMode !== 'html');
  refs.vdomEditorShell.classList.toggle('is-hidden', state.editorMode !== 'vdom');
  refs.editorModeButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === state.editorMode);
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.editorMode));
  });
  refs.status.textContent = state.parseError || state.statusMessage;
  refs.actualStats.innerHTML = `
    <span>${committedStats.totalNodes} nodes</span>
    <span>${committedStats.maxDepth} depth</span>
    <span>${state.historyIndex + 1}/${state.history.length || 1} history</span>
  `;
  refs.testStats.innerHTML = `
    <span>${workingStats.totalNodes} nodes</span>
    <span>${pendingWork.effects.length} pending effects</span>
    <span>${state.parseError ? 'parse error' : 'preview synced'}</span>
  `;
  refs.pendingStats.textContent = pendingWork.effects.length;
  refs.effectMode.textContent = panelMode;
  refs.effectJsonMeta.textContent = `${panelEffects.length} effect objects`;
  refs.insertStat.textContent = operationSummary.insert;
  refs.removeStat.textContent = operationSummary.remove;
  refs.moveStat.textContent = operationSummary.move;
  refs.attrStat.textContent = operationSummary.attribute;
  refs.textStat.textContent = operationSummary.text;

  refs.effectCards.innerHTML = panelEffects.length
    ? panelEffects.map(renderEffectCard).join('')
    : getEmptyState('Fiber queue', '현재 표시할 effect가 없습니다.');
  refs.effectJson.textContent = JSON.stringify(panelEffects, null, 2);
  refs.committedTree.innerHTML = renderTreeNode(committedTree, 0);
  refs.workingTree.innerHTML = renderTreeNode(state.workingTree, 0);
  refs.historyList.innerHTML = state.historyMeta.map((entry, index) => {
    const activeClass = index === state.historyIndex ? 'history-item is-active' : 'history-item';

    return `
      <button type="button" class="${activeClass}" data-history-index="${index}">
        <strong>#${index}</strong>
        <span>${escapeHtml(entry.label)}</span>
        <small>${entry.effectCount} effects · ${formatTime(entry.timestamp)}</small>
      </button>
    `;
  }).join('');
}

/**
 * effect 객체 하나를 카드 UI 조각으로 렌더링한다.
 *
 * @param {object} effect - 화면에 표시할 effect.
 * @returns {string} 카드 마크업 문자열.
 */
function renderEffectCard(effect) {
  return `
    <article class="patch-item">
      <div class="patch-head">
        <span class="patch-type">${escapeHtml(effect.opType)}</span>
        <span class="patch-path">${escapeHtml(formatFiberPath(effect.path || effect.parentPath || []))}</span>
      </div>
      <p>${escapeHtml(describeEffect(effect))}</p>
      <div class="flag-chip-row">
        ${effect.flagNames.map((flag) => `<span class="flag-chip">${escapeHtml(flag)}</span>`).join('')}
      </div>
    </article>
  `;
}

/**
 * vnode 트리를 재귀적으로 접이식 트리 UI로 렌더링한다.
 *
 * @param {object} node - 렌더링할 vnode.
 * @param {number} depth - 현재 트리 깊이.
 * @returns {string} 트리 뷰 마크업 문자열.
 */
function renderTreeNode(node, depth) {
  const label = getTreeLabel(node);

  if (!node.children?.length) {
    return `
      <div class="tree-leaf">
        <span class="tree-token is-${node.type}">${escapeHtml(label)}</span>
      </div>
    `;
  }

  const open = depth < 2 ? 'open' : '';
  const children = node.children.map((child) => renderTreeNode(child, depth + 1)).join('');

  return `
    <details class="tree-node" ${open}>
      <summary>
        <span class="tree-token is-${node.type}">${escapeHtml(label)}</span>
        <span class="tree-count">${node.children.length} children</span>
      </summary>
      <div class="tree-children">${children}</div>
    </details>
  `;
}

/**
 * 데이터가 없을 때 패널 안에 보여줄 공통 empty state 마크업을 만든다.
 *
 * @param {string} title - empty state 제목.
 * @param {string} description - 보조 설명.
 * @returns {string} empty state 마크업 문자열.
 */
function getEmptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}
