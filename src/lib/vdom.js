const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

const BLOCKED_TAGS = new Set([
  'embed',
  'head',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
  'style',
]);

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const PRESERVE_WHITESPACE_TAGS = new Set(['code', 'pre', 'textarea']);

// 브라우저 DOM과 내부 virtual DOM 표현 사이를 오가며 파싱, 복제, 렌더링, 직렬화를 담당한다.
/**
 * 여러 최상위 노드를 감싸는 내부 루트 vnode를 만든다.
 *
 * @param {object[]} [children=[]] - 루트 아래에 둘 자식 vnode 목록.
 * @returns {{type: string, children: object[]}} 내부 루트 vnode.
 */
export function createRootVNode(children = []) {
  return {
    type: 'root',
    children,
  };
}

/**
 * vnode 트리를 깊은 복제로 복사해 후속 변경이 원본 스냅샷을 오염시키지 않게 한다.
 *
 * @param {object | null} node - 복제할 vnode.
 * @returns {object | null} 새로 복제한 vnode 또는 `null`.
 */
export function cloneVNode(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'text') {
    return {
      type: 'text',
      value: node.value,
    };
  }

  return {
    type: node.type,
    tag: node.tag,
    attrs: node.attrs ? { ...node.attrs } : undefined,
    children: node.children ? node.children.map(cloneVNode) : [],
  };
}

/**
 * HTML 문자열을 브라우저의 파서로 해석한 뒤, 이 프로젝트의 표준 Virtual DOM 구조로 변환한다.
 *
 * 문자열을 바로 정규화된 vnode 트리로 바꾸기 때문에 초기 샘플 마크업을 읽거나,
 * textarea에 입력된 HTML을 working tree로 바꿀 때 사용한다. 반환값은 항상 내부 `root`
 * 노드를 최상위로 가지는 트리이며, 이후 `reconcileTrees`의 입력으로 바로 넘길 수 있다.
 *
 * @param {string} html - 파싱할 HTML 문자열.
 * @param {Document} [doc=document] - `template` 요소를 생성할 문서 객체. 테스트 환경이나 다른 document에서도 재사용할 수 있다.
 * @returns {object} 내부 표준 형태로 정규화된 루트 vnode 트리.
 */
export function parseHtmlToVNode(html, doc = document) {
  const template = doc.createElement('template');
  template.innerHTML = html;
  return domNodeToVNode(template.content);
}

/**
 * JSON 문자열로 작성된 vnode 트리를 읽고 내부 표준 형태로 정규화한다.
 *
 * @param {string} raw - 파싱할 JSON 문자열.
 * @returns {object} 검증과 정규화를 마친 루트 vnode 트리.
 */
export function parseVdomTextToVNode(raw) {
  const parsed = JSON.parse(raw);
  return normalizeVNode(parsed, ['root']);
}

/**
 * DOM 노드 하나를 대응되는 vnode로 바꾼다.
 *
 * @param {Node | null} node - 변환할 DOM 노드.
 * @returns {object | null} 변환된 vnode 또는 무시 대상이면 `null`.
 */
export function domNodeToVNode(node) {
  if (!node) {
    return null;
  }

  if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
    return createRootVNode(
      Array.from(node.childNodes)
        .map((child) => domNodeToVNode(child))
        .filter(Boolean),
    );
  }

  if (node.nodeType === ELEMENT_NODE) {
    return elementToVNode(node);
  }

  if (node.nodeType === TEXT_NODE) {
    return textToVNode(node);
  }

  return null;
}

/**
 * 특정 DOM 컨테이너의 "현재 브라우저 상태"를 기준으로 전체 자식 노드를 Virtual DOM으로 스냅샷한다.
 *
 * `parseHtmlToVNode`가 문자열 입력을 기준으로 한다면, 이 함수는 이미 렌더된 실제 DOM을 읽는다는 점이 다르다.
 * 그래서 사용자가 직접 수정한 input value, checked 상태 같은 live DOM 값까지 반영한 트리를 얻을 수 있다.
 * playground에서는 test preview와 actual DOM을 다시 기준선으로 삼을 때 이 함수를 사용한다.
 *
 * @param {Element} container - 스냅샷을 뜰 실제 DOM 컨테이너.
 * @returns {object} 컨테이너의 현재 자식 구조를 반영한 루트 vnode 트리.
 */
export function domNodeToVNodeTree(container) {
  return createRootVNode(
    Array.from(container.childNodes)
      .map((child) => domNodeToVNode(child))
      .filter(Boolean),
  );
}

// 공백만 있는 텍스트는 보존이 필요한 태그가 아니면 vnode에서 제거한다.
function textToVNode(node) {
  const value = node.textContent ?? '';
  const parentTag = node.parentElement?.tagName?.toLowerCase();

  if (!PRESERVE_WHITESPACE_TAGS.has(parentTag) && value.trim() === '') {
    return null;
  }

  return {
    type: 'text',
    value,
  };
}

// 위험하거나 의미 없는 태그는 제외하고, element 노드를 재귀적인 vnode로 바꾼다.
function elementToVNode(element) {
  const tag = element.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag)) {
    return null;
  }

  const attrs = readElementAttributes(element, tag);

  if (tag === 'textarea') {
    return {
      type: 'element',
      tag,
      attrs,
      children: [],
    };
  }

  return {
    type: 'element',
    tag,
    attrs,
    children: Array.from(element.childNodes)
      .map((child) => domNodeToVNode(child))
      .filter(Boolean),
  };
}

// form control처럼 속성과 실제 상태가 어긋날 수 있는 요소는 브라우저 상태를 우선해 읽는다.
function readElementAttributes(element, tag) {
  const attrs = {};

  for (const attr of Array.from(element.attributes)) {
    attrs[attr.name] = attr.value;
  }

  if (tag === 'input') {
    const type = (element.getAttribute('type') || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      if (element.checked) {
        attrs.checked = '';
      } else {
        delete attrs.checked;
      }
    }

    if (element.value !== undefined) {
      attrs.value = element.value;
    }
  }

  if (tag === 'textarea') {
    attrs.value = element.value ?? '';
  }

  if (tag === 'option') {
    if (element.selected) {
      attrs.selected = '';
    } else {
      delete attrs.selected;
    }
  }

  return attrs;
}

/**
 * keyed diff에 사용할 안정적인 식별자를 vnode에서 읽는다.
 *
 * @param {object | null} node - 검사할 vnode.
 * @returns {string | null} `data-key`, `id` 중 하나 또는 `null`.
 */
export function getVNodeKey(node) {
  if (!node || node.type !== 'element') {
    return null;
  }

  return node.attrs?.['data-key'] || node.attrs?.id || null;
}

/**
 * vnode 트리를 실제 DOM 노드로 렌더링한다.
 *
 * @param {object} node - 렌더링할 vnode.
 * @param {Document} [doc=document] - DOM 생성에 사용할 문서 객체.
 * @returns {Node} 렌더된 DOM 노드 또는 fragment.
 */
export function renderVNode(node, doc = document) {
  if (node.type === 'root') {
    const fragment = doc.createDocumentFragment();

    for (const child of node.children) {
      fragment.append(renderVNode(child, doc));
    }

    return fragment;
  }

  if (node.type === 'text') {
    return doc.createTextNode(node.value);
  }

  const element = doc.createElement(node.tag);

  for (const [name, value] of Object.entries(node.attrs || {})) {
    setDomAttribute(element, name, value);
  }

  if (node.tag === 'textarea') {
    element.value = node.attrs?.value ?? '';
    return element;
  }

  for (const child of node.children || []) {
    element.append(renderVNode(child, doc));
  }

  return element;
}

/**
 * 전달된 vnode 트리를 실제 DOM으로 렌더링해, 대상 컨테이너의 기존 내용을 통째로 교체한다.
 *
 * 이 함수는 diff를 계산하지 않고 "현재 트리를 그대로 그린다"는 점이 핵심이다.
 * 따라서 초기 마운트, history 점프, preview 즉시 동기화처럼 전체 상태를 다시 맞춰야 할 때 적합하다.
 * 반대로 최소 변경만 반영하고 싶다면 `reconcileTrees`와 `commitRoot` 조합을 사용해야 한다.
 *
 * @param {Element} container - 렌더 결과로 교체할 DOM 컨테이너.
 * @param {object} node - 렌더링할 vnode 트리.
 * @returns {void}
 */
export function mountVNode(container, node) {
  const doc = container.ownerDocument || document;
  const rendered = renderVNode(node, doc);
  container.replaceChildren(rendered);
}

/**
 * vnode 속성 값을 실제 DOM 속성으로 반영한다.
 *
 * @param {Element} element - 값을 쓸 DOM 요소.
 * @param {string} name - 속성 이름.
 * @param {string} value - 설정할 속성 값.
 * @returns {void}
 */
export function setDomAttribute(element, name, value) {
  if (name === 'checked') {
    element.checked = true;
    element.setAttribute('checked', '');
    return;
  }

  if (name === 'value') {
    element.value = value ?? '';

    if (element.tagName.toLowerCase() !== 'textarea') {
      element.setAttribute('value', value ?? '');
    }
    return;
  }

  element.setAttribute(name, value ?? '');
}

/**
 * DOM 요소에서 속성을 제거하고, 동기화가 필요한 프로퍼티도 함께 초기화한다.
 *
 * @param {Element} element - 속성을 제거할 DOM 요소.
 * @param {string} name - 제거할 속성 이름.
 * @returns {void}
 */
export function removeDomAttribute(element, name) {
  if (name === 'checked') {
    element.checked = false;
  }

  if (name === 'value') {
    element.value = '';
  }

  element.removeAttribute(name);
}

/**
 * vnode 트리를 사람이 읽고 수정할 수 있는 HTML 문자열로 직렬화한다.
 *
 * @param {object} node - 직렬화할 vnode.
 * @returns {string} 들여쓰기가 적용된 HTML 문자열.
 */
export function serializeVNodeToHtml(node) {
  if (node.type === 'root') {
    return node.children.map((child) => serializeNode(child, 0)).join('\n');
  }

  return serializeNode(node, 0);
}

/**
 * vnode 트리를 textarea 편집용 JSON 문자열로 직렬화한다.
 *
 * @param {object} node - 직렬화할 vnode.
 * @returns {string} 사람이 수정하기 쉬운 들여쓰기 JSON 문자열.
 */
export function serializeVNodeToText(node) {
  return JSON.stringify(node, null, 2);
}

// 텍스트 한 줄짜리 노드는 압축하고, 그 외에는 들여쓰기를 유지해 보기 좋은 HTML로 만든다.
function serializeNode(node, depth) {
  if (node.type === 'text') {
    return `${indent(depth)}${escapeText(node.value)}`;
  }

  const attrs = Object.entries(node.attrs || {})
    .map(([name, value]) => {
      if (value === '') {
        return name;
      }

      return `${name}="${escapeAttribute(value)}"`;
    })
    .join(' ');
  const openTag = attrs ? `<${node.tag} ${attrs}>` : `<${node.tag}>`;

  if (node.tag === 'textarea') {
    return `${indent(depth)}${openTag}${escapeText(node.attrs?.value ?? '')}</${node.tag}>`;
  }

  if (VOID_TAGS.has(node.tag)) {
    return `${indent(depth)}${openTag}`;
  }

  if (!node.children?.length) {
    return `${indent(depth)}${openTag}</${node.tag}>`;
  }

  if (
    node.children.length === 1
    && node.children[0].type === 'text'
    && node.children[0].value.length <= 48
    && !node.children[0].value.includes('\n')
  ) {
    return `${indent(depth)}${openTag}${escapeText(node.children[0].value)}</${node.tag}>`;
  }

  const children = node.children
    .map((child) => serializeNode(child, depth + 1))
    .join('\n');

  return `${indent(depth)}${openTag}\n${children}\n${indent(depth)}</${node.tag}>`;
}

// 직렬화된 HTML 들여쓰기는 2칸 기준을 사용한다.
function indent(depth) {
  return '  '.repeat(depth);
}

// 텍스트 노드에 들어가면 안 되는 최소한의 문자만 이스케이프한다.
function escapeText(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// 속성 값은 텍스트 이스케이프에 더해 큰따옴표도 안전하게 처리한다.
function escapeAttribute(text) {
  return escapeText(text).replaceAll('"', '&quot;');
}

/**
 * vnode 트리를 순회하며 노드 수, 깊이, keyed element 수를 집계한다.
 *
 * @param {object} tree - 통계를 계산할 루트 vnode.
 * @returns {{totalNodes: number, elements: number, textNodes: number, keyedElements: number, maxDepth: number}} 트리 통계값.
 */
export function countVNodeStats(tree) {
  const stats = {
    totalNodes: 0,
    elements: 0,
    textNodes: 0,
    keyedElements: 0,
    maxDepth: 0,
  };

  walkTree(tree, 0, (node, depth) => {
    if (node.type === 'root') {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      return;
    }

    stats.totalNodes += 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (node.type === 'text') {
      stats.textNodes += 1;
      return;
    }

    stats.elements += 1;

    if (getVNodeKey(node)) {
      stats.keyedElements += 1;
    }
  });

  return stats;
}

// 공통 순회 유틸로, 여러 통계 계산이 같은 트리 순회 로직을 재사용하게 한다.
function walkTree(node, depth, visit) {
  visit(node, depth);

  if (!node.children?.length) {
    return;
  }

  for (const child of node.children) {
    walkTree(child, depth + 1, visit);
  }
}

function normalizeVNode(node, path) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(`${path.join('.')}는 vnode 객체여야 합니다.`);
  }

  if (node.type === 'root') {
    return {
      type: 'root',
      children: normalizeChildren(node.children, [...path, 'children']),
    };
  }

  if (node.type === 'text') {
    if (typeof node.value !== 'string') {
      throw new Error(`${path.join('.')}의 text.value는 문자열이어야 합니다.`);
    }

    return {
      type: 'text',
      value: node.value,
    };
  }

  if (node.type === 'element') {
    if (typeof node.tag !== 'string' || !node.tag.trim()) {
      throw new Error(`${path.join('.')}의 element.tag는 비어 있지 않은 문자열이어야 합니다.`);
    }

    if (node.attrs !== undefined && (typeof node.attrs !== 'object' || node.attrs === null || Array.isArray(node.attrs))) {
      throw new Error(`${path.join('.')}의 element.attrs는 객체여야 합니다.`);
    }

    const attrs = normalizeAttrs(node.attrs || {}, [...path, 'attrs']);
    const tag = node.tag.toLowerCase();

    if (tag === 'textarea') {
      return {
        type: 'element',
        tag,
        attrs,
        children: [],
      };
    }

    return {
      type: 'element',
      tag,
      attrs,
      children: normalizeChildren(node.children, [...path, 'children']),
    };
  }

  throw new Error(`${path.join('.')}의 type은 root, element, text 중 하나여야 합니다.`);
}

function normalizeChildren(children, path) {
  if (children === undefined) {
    return [];
  }

  if (!Array.isArray(children)) {
    throw new Error(`${path.join('.')}는 배열이어야 합니다.`);
  }

  return children.map((child, index) => normalizeVNode(child, [...path, String(index)]));
}

function normalizeAttrs(attrs, path) {
  const normalized = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value !== 'string') {
      throw new Error(`${path.join('.')}의 "${key}" 값은 문자열이어야 합니다.`);
    }

    normalized[key] = value;
  }

  return normalized;
}
