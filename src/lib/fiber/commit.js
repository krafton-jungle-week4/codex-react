import {
  removeDomAttribute,
  renderVNode,
  setDomAttribute,
} from '../vdom.js';

// reconciliation 이후 준비된 effect 큐를 실제 DOM 연산으로 실행하는 유일한 fiber 모듈이다.

/**
 * reconciliation 단계에서 계산된 effect queue를 안전한 순서로 정렬한 뒤 실제 DOM에 반영한다.
 *
 * `reconcileTrees`가 변경 계획을 만드는 함수라면, 이 함수는 그 계획을 실행하는 commit 진입점이다.
 * 삭제, 이동, 삽입, 속성 변경, 텍스트 변경을 순차적으로 수행해 최종 DOM을 다음 트리 상태에 맞춘다.
 * 호출이 끝나면 전달된 `container` 아래의 실제 DOM은 effect queue가 의도한 결과와 동기화된다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{effects?: object[]}} rootFiber - `reconcileTrees`가 반환한 루트 fiber. 내부 `effects` 배열을 기준으로 commit한다.
 * @returns {void}
 *
 * @remarks 이 함수는 실제 DOM을 직접 변경하므로, 반드시 reconciliation이 끝난 뒤에만 호출해야 한다.
 */
export function commitRoot(container, rootFiber) {
  const orderedEffects = sortEffectsForCommit(rootFiber.effects || []);

  for (const effect of orderedEffects) {
    commitEffect(container, effect);
  }
}

/**
 * 삭제가 삽입과 업데이트보다 먼저 일어나도록 effect를 안전한 commit 순서로 정렬한다.
 *
 * @param {object[]} effects - reconciliation 단계에서 생성된 raw effect 큐.
 * @returns {object[]} commit에 안전한 순서로 정렬된 effect 목록.
 */
function sortEffectsForCommit(effects) {
  const priority = {
    REMOVE_CHILD: 0,
    MOVE_CHILD: 1,
    INSERT_CHILD: 2,
    UPDATE_PROPS: 3,
    UPDATE_TEXT: 4,
  };

  return effects
    .map((effect, order) => ({ ...effect, order }))
    .sort((left, right) => {
      const typeDiff = priority[left.opType] - priority[right.opType];

      if (typeDiff !== 0) {
        return typeDiff;
      }

      if (left.opType === 'REMOVE_CHILD' && right.opType === 'REMOVE_CHILD') {
        const depthDiff = right.parentPath.length - left.parentPath.length;

        if (depthDiff !== 0) {
          return depthDiff;
        }

        return right.index - left.index;
      }

      if (left.opType === 'MOVE_CHILD' && right.opType === 'MOVE_CHILD') {
        const parentDiff = comparePath(left.parentPath, right.parentPath);

        if (parentDiff !== 0) {
          return parentDiff;
        }

        return left.toIndex - right.toIndex;
      }

      if (left.opType === 'INSERT_CHILD' && right.opType === 'INSERT_CHILD') {
        const parentDiff = comparePath(left.parentPath, right.parentPath);

        if (parentDiff !== 0) {
          return parentDiff;
        }

        return left.index - right.index;
      }

      return comparePath(left.path, right.path) || left.order - right.order;
    });
}

/**
 * 두 fiber path를 사전식 순서로 비교한다.
 *
 * @param {number[]} leftPath - 첫 번째 비교 대상 경로.
 * @param {number[]} rightPath - 두 번째 비교 대상 경로.
 * @returns {number} `leftPath`가 먼저면 음수, `rightPath`가 먼저면 양수, 같으면 `0`.
 */
function comparePath(leftPath, rightPath) {
  const length = Math.min(leftPath.length, rightPath.length);

  for (let index = 0; index < length; index += 1) {
    if (leftPath[index] !== rightPath[index]) {
      return leftPath[index] - rightPath[index];
    }
  }

  return leftPath.length - rightPath.length;
}

/**
 * effect 하나를 적절한 DOM 변경 핸들러로 분기한다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {object} effect - fiber 큐에서 꺼낸 정규화된 effect 객체.
 * @returns {void}
 */
function commitEffect(container, effect) {
  switch (effect.opType) {
    case 'REMOVE_CHILD':
      commitDeletion(container, effect);
      return;
    case 'MOVE_CHILD':
      commitMove(container, effect);
      return;
    case 'INSERT_CHILD':
      commitInsertion(container, effect);
      return;
    case 'UPDATE_PROPS':
      commitPropsUpdate(container, effect);
      return;
    case 'UPDATE_TEXT':
      commitTextUpdate(container, effect);
  }
}

/**
 * 실제 DOM에서 자식 노드를 제거한다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{parentPath: number[], index: number, key?: string}} effect - 제거 effect 메타데이터.
 * @returns {void}
 */
function commitDeletion(container, effect) {
  const parentNode = getTargetContainerNode(container, effect.parentPath);

  if (!parentNode) {
    return;
  }

  const targetNode = effect.key
    ? findChildNodeByKey(parentNode, effect.key) || parentNode.childNodes[effect.index]
    : parentNode.childNodes[effect.index];

  if (targetNode) {
    parentNode.removeChild(targetNode);
  }
}

/**
 * 실제 DOM에서 기존 자식 노드를 새로운 형제 위치로 이동시킨다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{parentPath: number[], fromIndex: number, toIndex: number, key?: string}} effect - 이동 effect 메타데이터.
 * @returns {void}
 */
function commitMove(container, effect) {
  const parentNode = getTargetContainerNode(container, effect.parentPath);

  if (!parentNode) {
    return;
  }

  const movingNode = effect.key
    ? findChildNodeByKey(parentNode, effect.key)
    : parentNode.childNodes[effect.fromIndex];

  if (!movingNode) {
    return;
  }

  const snapshot = Array.from(parentNode.childNodes);
  const anchorNode = snapshot[effect.toIndex] || null;

  if (!anchorNode) {
    parentNode.appendChild(movingNode);
    return;
  }

  if (snapshot.indexOf(movingNode) < effect.toIndex) {
    parentNode.insertBefore(movingNode, anchorNode.nextSibling);
  } else {
    parentNode.insertBefore(movingNode, anchorNode);
  }
}

/**
 * 새로 렌더링한 노드를 실제 DOM에 삽입한다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{parentPath: number[], index: number, node: object}} effect - 삽입 effect 메타데이터.
 * @returns {void}
 */
function commitInsertion(container, effect) {
  const parentNode = getTargetContainerNode(container, effect.parentPath);

  if (!parentNode) {
    return;
  }

  const referenceNode = parentNode.childNodes[effect.index] || null;

  parentNode.insertBefore(
    renderVNode(effect.node, parentNode.ownerDocument || document),
    referenceNode,
  );
}

/**
 * 기존 DOM 엘리먼트에 속성 업데이트를 반영한다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{path: number[], payload: {remove: string[], set: Record<string, string> | null}}} effect - prop 업데이트 메타데이터.
 * @returns {void}
 */
function commitPropsUpdate(container, effect) {
  const node = getDomNodeAtPath(container, effect.path);

  if (!(node instanceof Element)) {
    return;
  }

  for (const name of effect.payload.remove) {
    removeDomAttribute(node, name);
  }

  for (const [name, value] of Object.entries(effect.payload.set || {})) {
    setDomAttribute(node, name, value);
  }
}

/**
 * 기존 DOM 텍스트 노드의 textContent를 갱신한다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {{path: number[], value: string}} effect - 텍스트 업데이트 메타데이터.
 * @returns {void}
 */
function commitTextUpdate(container, effect) {
  const node = getDomNodeAtPath(container, effect.path);

  if (node) {
    node.textContent = effect.value;
  }
}

/**
 * 자식 삽입, 이동, 삭제를 적용할 부모 DOM 노드를 찾는다.
 *
 * @param {Element} container - 실제 렌더 트리의 루트 DOM 컨테이너.
 * @param {number[]} path - 부모 fiber 경로.
 * @returns {Node | null} 해당 effect의 대상 부모 DOM 노드.
 */
function getTargetContainerNode(container, path) {
  if (!path.length) {
    return container;
  }

  return getDomNodeAtPath(container, path);
}

/**
 * 자식 인덱스 경로를 따라 DOM을 내려가 commit 대상 노드를 찾는다.
 *
 * @param {Element | Node} container - 탐색 시작 DOM 노드.
 * @param {number[]} path - 루트부터의 자식 인덱스 경로.
 * @returns {Node | null} 해당 경로의 DOM 노드. 경로가 잘못되면 `null`.
 */
function getDomNodeAtPath(container, path) {
  let currentNode = container;

  for (const index of path) {
    currentNode = currentNode?.childNodes?.[index] || null;
  }

  return currentNode;
}

/**
 * keyed reconciliation에서 사용한 것과 같은 안정적인 key로 자식 엘리먼트를 찾는다.
 *
 * @param {Element} parentNode - 자식 엘리먼트를 찾을 DOM 부모 노드.
 * @param {string} key - `data-key` 또는 `id`에서 가져온 key 값.
 * @returns {Element | null} 일치하는 자식 엘리먼트. 없으면 `null`.
 */
function findChildNodeByKey(parentNode, key) {
  return Array.from(parentNode.children).find((child) => {
    return child.getAttribute('data-key') === key || child.id === key;
  }) || null;
}
