import { createRootVNode } from '../lib/vdom.js';

// 렌더 패널, 히스토리, 미리보기, commit 상태가 공유하는 앱 전역 상태를 만든다.
/**
 * playground 초기 상태 객체를 생성한다.
 *
 * @returns {object} UI와 commit 흐름이 함께 사용하는 상태 스냅샷.
 */
export function createAppState() {
  return {
    history: [],
    historyMeta: [],
    historyIndex: 0,
    workingTree: createRootVNode([]),
    editorMode: 'html',
    parseError: '',
    autoCommitEnabled: false,
    lastCommitEffects: [],
    statusMessage: '실제 DOM을 초기화하고 있습니다.',
  };
}
