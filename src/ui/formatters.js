const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// effect 카드, 히스토리, mutation 피드에 들어갈 텍스트 표현을 모아둔 포매터 모듈이다.
/**
 * timestamp를 한국어 시각 문자열로 포맷한다.
 *
 * @param {number} timestamp - `Date.now()` 기준 밀리초 값.
 * @returns {string} 화면 표시용 시각 문자열.
 */
export function formatTime(timestamp) {
  return timeFormatter.format(timestamp);
}

/**
 * 사용자 입력이나 DOM 텍스트를 HTML에 안전하게 삽입할 수 있도록 이스케이프한다.
 *
 * @param {unknown} value - 문자열로 변환해 출력할 값.
 * @returns {string} 이스케이프된 HTML 안전 문자열.
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * fiber effect 객체를 카드 설명 문장으로 바꾼다.
 *
 * @param {object} effect - 설명할 effect 객체.
 * @returns {string} 사용자에게 보여줄 한 줄 설명.
 */
export function describeEffect(effect) {
  switch (effect.opType) {
    case 'INSERT_CHILD':
      return `index ${effect.index} 위치에 새 노드를 삽입합니다.`;
    case 'MOVE_CHILD':
      return `key "${effect.key}" 노드를 index ${effect.toIndex} 위치로 이동합니다.`;
    case 'REMOVE_CHILD':
      return `index ${effect.index} 자식 노드를 제거합니다.`;
    case 'UPDATE_PROPS': {
      const setKeys = Object.keys(effect.payload.set || {});
      const removeKeys = effect.payload.remove || [];
      return `props 변경: set ${setKeys.join(', ') || '-'} / remove ${removeKeys.join(', ') || '-'}`;
    }
    case 'UPDATE_TEXT':
      return `텍스트를 "${effect.value}" 로 갱신합니다.`;
    default:
      return '설명할 수 없는 effect입니다.';
  }
}

/**
 * 트리 패널에 보여줄 vnode 라벨 문자열을 만든다.
 *
 * @param {object} node - 라벨링할 vnode.
 * @returns {string} root, text, element 중 타입에 맞는 표시 문자열.
 */
export function getTreeLabel(node) {
  if (node.type === 'root') {
    return 'root';
  }

  if (node.type === 'text') {
    const normalized = node.value.replace(/\s+/g, ' ').trim();
    return `"${normalized || '(whitespace)'}"`;
  }

  const attrs = Object.entries(node.attrs || {})
    .slice(0, 3)
    .map(([name, value]) => (value === '' ? name : `${name}="${value}"`))
    .join(' ');

  return attrs ? `<${node.tag} ${attrs}>` : `<${node.tag}>`;
}
