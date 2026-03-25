import { bindEvents, mountInitialState } from './playground/actions.js';
import { createAppState } from './playground/state.js';
import { renderPanels } from './ui/renderPanels.js';
import { getAppShell, getRefs } from './ui/shell.js';

// 앱 셸 생성, 상태 초기화, 이벤트 연결, 첫 렌더를 한 번에 묶는 엔트리 포인트다.
/**
 * 전달받은 컨테이너 안에 playground 전체 UI를 마운트한다.
 *
 * @param {Element} container - 앱을 렌더링할 루트 DOM 요소.
 * @returns {void}
 */
export function initApp(container) {
  container.innerHTML = getAppShell();

  const refs = getRefs(container);
  const state = createAppState();
  const render = () => renderPanels(refs, state);

  bindEvents({ refs, state, render });
  mountInitialState({ refs, state });
  render();
}
