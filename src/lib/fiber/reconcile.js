import { cloneVNode, getVNodeKey } from '../vdom.js';
import {
  ChildDeletion,
  NoFlags,
  Placement,
  Update,
  getFlagNames,
} from './flags.js';

// 이전/다음 virtual DOM 트리를 비교해 실제 DOM은 건드리지 않고 work-in-progress fiber와 effect 큐를 만든다.

/**
 * 이전 트리와 다음 트리를 비교해, commit에 필요한 work-in-progress fiber와 effect queue를 생성한다.
 *
 * 이 단계에서는 실제 DOM을 수정하지 않고 어떤 변경이 필요한지만 계산한다.
 * 반환값의 `effects`는 삽입, 삭제, 이동, 속성 변경, 텍스트 변경 같은 연산 목록이고,
 * `rootFiber`는 commit 단계에서 참조할 연결 구조와 flag 정보를 함께 담는다.
 * 즉, 이 함수는 "무엇이 바뀌어야 하는가"를 계산하는 reconciliation 진입점이다.
 *
 * @param {object} previousTree - 현재 화면에 commit되어 있다고 가정하는 이전 Virtual DOM 트리.
 * @param {object} nextTree - 새로 반영하고 싶은 다음 Virtual DOM 트리.
 * @returns {{rootFiber: object, effects: object[]}} commit 준비가 끝난 루트 fiber와 선형 effect 큐.
 */
export function reconcileTrees(previousTree, nextTree) {
  const rootFiber = createFiber(nextTree, null, previousTree, 0, []);
  const effects = [];

  rootFiber.effects = effects;
  reconcileNode(rootFiber, previousTree, nextTree, effects);
  bubbleSubtreeFlags(rootFiber);

  return {
    rootFiber,
    effects,
  };
}

/**
 * 현재 reconciliation 단계에서 사용할 새 fiber 노드를 만든다.
 *
 * @param {object} vnode - 이 fiber가 표현하는 virtual DOM 노드.
 * @param {object | null} parent - 부모 fiber. 루트인 경우 `null`.
 * @param {object | null} alternate - 현재 위치에 매칭된 이전 commit vnode.
 * @param {number} index - 부모 자식 목록에서의 위치.
 * @param {number[]} path - 루트 컨테이너부터 현재 fiber까지의 인덱스 경로.
 * @returns {object} reconciliation과 commit 준비에 사용하는 가변 fiber 레코드.
 */
function createFiber(vnode, parent, alternate, index, path) {
  return {
    type: vnode.type,
    tag: vnode.tag,
    value: vnode.value,
    attrs: vnode.attrs ? { ...vnode.attrs } : undefined,
    vnode: cloneVNode(vnode),
    key: getVNodeKey(vnode),
    parent,
    child: null,
    sibling: null,
    alternate: alternate ? cloneVNode(alternate) : null,
    index,
    path,
    flags: NoFlags,
    subtreeFlags: NoFlags,
    effects: null,
    deletions: [],
  };
}

/**
 * 하나의 fiber를 이전 vnode와 비교해 flags와 자식 연결 정보를 채운다.
 *
 * @param {object} fiber - flags와 child/sibling 링크가 채워질 fiber.
 * @param {object | null} previousNode - 같은 위치에 있던 이전 commit vnode.
 * @param {object} nextNode - 같은 위치의 새 vnode.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function reconcileNode(fiber, previousNode, nextNode, effects) {
  if (nextNode.type === 'root') {
    reconcileChildren(fiber, previousNode?.children || [], nextNode.children || [], effects);
    return;
  }

  if (nextNode.type === 'text') {
    if (previousNode?.value !== nextNode.value) {
      markTextUpdate(fiber, nextNode.value, effects);
    }
    return;
  }

  const payload = diffProps(previousNode?.attrs || {}, nextNode.attrs || {});

  if (payload.set || payload.remove.length) {
    markPropsUpdate(fiber, payload, effects);
  }

  reconcileChildren(fiber, previousNode?.children || [], nextNode.children || [], effects);
}

/**
 * 현재 자식 목록에 대해 keyed 비교와 index 기반 비교 중 하나를 선택한다.
 *
 * @param {object} parentFiber - child 링크와 subtree flag를 받을 부모 fiber.
 * @param {object[]} previousChildren - 이전에 commit된 자식 vnode 목록.
 * @param {object[]} nextChildren - 다음 자식 vnode 목록.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function reconcileChildren(parentFiber, previousChildren, nextChildren, effects) {
  if (canUseKeyedDiff(previousChildren, nextChildren)) {
    reconcileKeyedChildren(parentFiber, previousChildren, nextChildren, effects);
  } else {
    reconcileIndexedChildren(parentFiber, previousChildren, nextChildren, effects);
  }
}

/**
 * 안정적인 key가 없을 때 자식들을 index 순서대로만 비교한다.
 *
 * @param {object} parentFiber - 직접 자식들을 비교할 부모 fiber.
 * @param {object[]} previousChildren - 이전 자식 vnode 목록.
 * @param {object[]} nextChildren - 다음 자식 vnode 목록.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function reconcileIndexedChildren(parentFiber, previousChildren, nextChildren, effects) {
  let previousSibling = null;
  const sharedLength = Math.min(previousChildren.length, nextChildren.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const previousChild = previousChildren[index];
    const nextChild = nextChildren[index];
    const nextPath = parentFiber.path.concat(index);
    let childFiber;

    if (canReuseNode(previousChild, nextChild)) {
      childFiber = createFiber(nextChild, parentFiber, previousChild, index, nextPath);
      reconcileNode(childFiber, previousChild, nextChild, effects);
    } else {
      scheduleDeletion(parentFiber, previousChild, index, effects);
      childFiber = createFiber(nextChild, parentFiber, null, index, nextPath);
      markPlacement(childFiber, 'INSERT_CHILD', {
        parentPath: parentFiber.path,
        index,
        node: cloneVNode(nextChild),
      }, effects);
    }

    previousSibling = appendChildFiber(parentFiber, previousSibling, childFiber);
  }

  for (let index = sharedLength; index < nextChildren.length; index += 1) {
    const nextChild = nextChildren[index];
    const childFiber = createFiber(
      nextChild,
      parentFiber,
      null,
      index,
      parentFiber.path.concat(index),
    );

    markPlacement(childFiber, 'INSERT_CHILD', {
      parentPath: parentFiber.path,
      index,
      node: cloneVNode(nextChild),
    }, effects);

    previousSibling = appendChildFiber(parentFiber, previousSibling, childFiber);
  }

  for (let index = previousChildren.length - 1; index >= nextChildren.length; index -= 1) {
    scheduleDeletion(parentFiber, previousChildren[index], index, effects);
  }
}

/**
 * 안정적인 key를 기준으로 자식을 비교해, 기존 노드를 재생성하지 않고 이동으로 처리할 수 있게 한다.
 *
 * @param {object} parentFiber - 직접 자식들을 비교할 부모 fiber.
 * @param {object[]} previousChildren - 이전 keyed 자식 vnode 목록.
 * @param {object[]} nextChildren - 다음 keyed 자식 vnode 목록.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 *
 * @remarks 양쪽 형제 목록의 모든 노드는 `data-key` 또는 `id` 기반의 유일한 key를 가져야 한다.
 */
function reconcileKeyedChildren(parentFiber, previousChildren, nextChildren, effects) {
  const previousByKey = new Map(
    previousChildren.map((child, index) => [getVNodeKey(child), { child, index }]),
  );
  const usedKeys = new Set();
  let lastPlacedIndex = 0;
  let previousSibling = null;

  for (let nextIndex = 0; nextIndex < nextChildren.length; nextIndex += 1) {
    const nextChild = nextChildren[nextIndex];
    const key = getVNodeKey(nextChild);
    const match = previousByKey.get(key);
    const nextPath = parentFiber.path.concat(nextIndex);
    let childFiber;

    if (!match) {
      childFiber = createFiber(nextChild, parentFiber, null, nextIndex, nextPath);
      markPlacement(childFiber, 'INSERT_CHILD', {
        parentPath: parentFiber.path,
        index: nextIndex,
        node: cloneVNode(nextChild),
        key,
      }, effects);
    } else if (!canReuseNode(match.child, nextChild)) {
      usedKeys.add(key);
      scheduleDeletion(parentFiber, match.child, match.index, effects);
      childFiber = createFiber(nextChild, parentFiber, null, nextIndex, nextPath);
      markPlacement(childFiber, 'INSERT_CHILD', {
        parentPath: parentFiber.path,
        index: nextIndex,
        node: cloneVNode(nextChild),
        key,
      }, effects);
    } else {
      usedKeys.add(key);
      childFiber = createFiber(nextChild, parentFiber, match.child, nextIndex, nextPath);

      if (match.index < lastPlacedIndex) {
        markPlacement(childFiber, 'MOVE_CHILD', {
          parentPath: parentFiber.path,
          fromIndex: match.index,
          toIndex: nextIndex,
          key,
        }, effects);
      } else {
        lastPlacedIndex = match.index;
      }

      reconcileNode(childFiber, match.child, nextChild, effects);
    }

    previousSibling = appendChildFiber(parentFiber, previousSibling, childFiber);
  }

  for (let index = previousChildren.length - 1; index >= 0; index -= 1) {
    const previousChild = previousChildren[index];
    const key = getVNodeKey(previousChild);

    if (!usedKeys.has(key)) {
      scheduleDeletion(parentFiber, previousChild, index, effects);
    }
  }
}

/**
 * 부모 fiber의 linked sibling 리스트에 자식 fiber를 연결한다.
 *
 * @param {object} parentFiber - 새 child 링크를 받을 부모 fiber.
 * @param {object | null} previousSibling - 같은 목록에서 직전에 연결된 sibling.
 * @param {object} childFiber - 추가할 자식 fiber.
 * @returns {object} 방금 연결한 child fiber. 호출부에서 최신 sibling 추적에 사용한다.
 */
function appendChildFiber(parentFiber, previousSibling, childFiber) {
  if (!parentFiber.child) {
    parentFiber.child = childFiber;
  } else if (previousSibling) {
    previousSibling.sibling = childFiber;
  }

  return childFiber;
}

/**
 * 부모 fiber에 자식 제거 effect를 예약한다.
 *
 * @param {object} parentFiber - 자식이 제거될 부모 fiber.
 * @param {object} child - 삭제 대상인 이전 vnode.
 * @param {number} index - 이전 자식 인덱스.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function scheduleDeletion(parentFiber, child, index, effects) {
  parentFiber.flags |= ChildDeletion;

  const effect = {
    opType: 'REMOVE_CHILD',
    flags: ChildDeletion,
    flagNames: getFlagNames(ChildDeletion),
    path: parentFiber.path.concat(index),
    parentPath: parentFiber.path,
    index,
    key: getVNodeKey(child),
    node: cloneVNode(child),
  };

  parentFiber.deletions.push(effect);
  effects.push(effect);
}

/**
 * fiber에 DOM 배치 작업이 필요하다고 표시하고 placement effect를 기록한다.
 *
 * @param {object} fiber - 삽입 또는 이동 대상으로 표시할 fiber.
 * @param {string} opType - placement 계열 연산 이름.
 * @param {object} payload - 해당 effect에 필요한 세부 메타데이터.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function markPlacement(fiber, opType, payload, effects) {
  fiber.flags |= Placement;
  effects.push({
    opType,
    flags: Placement,
    flagNames: getFlagNames(Placement),
    path: fiber.path,
    ...payload,
  });
}

/**
 * fiber에 props 업데이트가 필요하다고 표시하고 update effect를 기록한다.
 *
 * @param {object} fiber - 엘리먼트 속성이 바뀐 fiber.
 * @param {{set: object | null, remove: string[]}} payload - 추가/교체할 속성과 제거할 속성 목록.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function markPropsUpdate(fiber, payload, effects) {
  fiber.flags |= Update;
  fiber.updatePayload = payload;
  effects.push({
    opType: 'UPDATE_PROPS',
    flags: Update,
    flagNames: getFlagNames(Update),
    path: fiber.path,
    payload,
  });
}

/**
 * 텍스트 fiber에 textContent 업데이트가 필요하다고 표시하고 update effect를 기록한다.
 *
 * @param {object} fiber - 텍스트 값이 바뀐 fiber.
 * @param {string} value - 다음 텍스트 노드 값.
 * @param {object[]} effects - 현재 렌더 패스 전체에서 공유되는 effect 큐.
 * @returns {void}
 */
function markTextUpdate(fiber, value, effects) {
  fiber.flags |= Update;
  effects.push({
    opType: 'UPDATE_TEXT',
    flags: Update,
    flagNames: getFlagNames(Update),
    path: fiber.path,
    value,
  });
}

/**
 * 현재 fiber의 자식과 하위 손자들의 flag를 위로 끌어올려 subtreeFlags를 다시 계산한다.
 *
 * @param {object} fiber - subtree flag를 재계산할 fiber.
 * @returns {void}
 */
function bubbleSubtreeFlags(fiber) {
  let subtreeFlags = NoFlags;
  let child = fiber.child;

  while (child) {
    bubbleSubtreeFlags(child);
    subtreeFlags |= child.flags;
    subtreeFlags |= child.subtreeFlags;
    child = child.sibling;
  }

  fiber.subtreeFlags = subtreeFlags;
}

/**
 * 두 vnode 속성 맵을 비교해 추가/교체/제거해야 할 props를 계산한다.
 *
 * @param {Record<string, string>} previousAttrs - 이전 엘리먼트 속성.
 * @param {Record<string, string>} nextAttrs - 다음 엘리먼트 속성.
 * @returns {{set: Record<string, string> | null, remove: string[]}} 정규화된 prop diff payload.
 */
function diffProps(previousAttrs, nextAttrs) {
  const set = {};
  const remove = [];
  const names = new Set([...Object.keys(previousAttrs), ...Object.keys(nextAttrs)]);

  for (const name of names) {
    if (!(name in nextAttrs)) {
      remove.push(name);
      continue;
    }

    if (previousAttrs[name] !== nextAttrs[name]) {
      set[name] = nextAttrs[name];
    }
  }

  return {
    set: Object.keys(set).length ? set : null,
    remove,
  };
}

/**
 * 두 vnode가 reconciliation 중 같은 host node를 재사용할 수 있는지 판단한다.
 *
 * @param {object | null} previousNode - 이전 vnode 후보.
 * @param {object | null} nextNode - 다음 vnode 후보.
 * @returns {boolean} 같은 DOM 노드를 재사용하며 제자리 업데이트할 수 있으면 `true`.
 */
function canReuseNode(previousNode, nextNode) {
  if (!previousNode || !nextNode) {
    return false;
  }

  if (previousNode.type !== nextNode.type) {
    return false;
  }

  if (previousNode.type === 'text') {
    return true;
  }

  return previousNode.tag === nextNode.tag;
}

/**
 * 양쪽 형제 목록이 keyed diff를 사용할 수 있는 조건을 만족하는지 검사한다.
 *
 * @param {object[]} previousChildren - 이전 자식 vnode 목록.
 * @param {object[]} nextChildren - 다음 자식 vnode 목록.
 * @returns {boolean} 모든 자식이 유일하고 안정적인 key를 가지면 `true`.
 */
function canUseKeyedDiff(previousChildren, nextChildren) {
  if (!previousChildren.length || !nextChildren.length) {
    return false;
  }

  const previousKeys = previousChildren.map((child) => getVNodeKey(child));
  const nextKeys = nextChildren.map((child) => getVNodeKey(child));

  if (!previousKeys.every(Boolean) || !nextKeys.every(Boolean)) {
    return false;
  }

  return new Set(previousKeys).size === previousKeys.length
    && new Set(nextKeys).size === nextKeys.length;
}
