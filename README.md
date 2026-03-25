# Virtual DOM Diff Lab

`Virtual DOM Diff Lab`은 브라우저 DOM을 직접 읽어 Virtual DOM으로 변환하고, 이전 상태와 다음 상태를 비교해 실제 DOM에 필요한 변경만 반영하는 과정을 시각적으로 확인할 수 있는 학습용 playground입니다.

이 프로젝트는 단순히 결과 화면을 렌더링하는 데서 끝나지 않고, `diff`, `effect queue`, `commit`, `history`, `mutation log`까지 한 번에 확인할 수 있도록 구성되어 있습니다.

## Features

- HTML 문자열 또는 현재 브라우저 DOM을 Virtual DOM 트리로 변환
- 이전 트리와 다음 트리를 비교해 effect queue 생성
- `INSERT_CHILD`, `MOVE_CHILD`, `REMOVE_CHILD`, `UPDATE_PROPS`, `UPDATE_TEXT` 추적
- keyed diff 지원
  - `data-key` 또는 `id`가 있으면 reorder를 `MOVE_CHILD`로 처리
- 실제 DOM 반영 전후 상태를 분리해서 확인 가능
- HTML 편집 모드와 VDOM(JSON) 편집 모드 제공
- Commit history 기반 Undo / Redo 지원
- MutationObserver로 실제 DOM 변경 로그 추적

## How It Works

프로젝트의 흐름은 아래와 같습니다.

1. `Actual DOM` 또는 HTML 입력을 기준으로 Virtual DOM 트리를 만듭니다.
2. 현재 commit된 트리와 작업 중인 트리를 비교합니다.
3. 비교 결과를 Fiber effect queue 형태로 정리합니다.
4. `commitRoot`가 effect queue를 실제 DOM 연산으로 실행합니다.
5. 변경 결과는 History와 Mutation Feed에 기록됩니다.

즉, `계산(reconcile)`과 `반영(commit)`을 분리해서 볼 수 있다는 점이 핵심입니다.

이 프로젝트의 diff 알고리즘은 최소 변경을 다섯 가지 effect 케이스로 나눠서 다룹니다.

- `INSERT_CHILD`
  - 새 노드를 추가해야 하는 경우
- `MOVE_CHILD`
  - 기존 노드를 재생성하지 않고 위치만 바꾸는 경우
- `REMOVE_CHILD`
  - 더 이상 필요 없는 노드를 제거하는 경우
- `UPDATE_PROPS`
  - 노드는 유지한 채 속성만 변경하는 경우
- `UPDATE_TEXT`
  - 텍스트 노드의 내용만 변경하는 경우

이 다섯 케이스는 [`reconcileTrees`](./src/lib/fiber/reconcile.js#L24)가 이전 트리와 다음 트리를 비교하면서 계산합니다. 이 과정에서 삭제는 [`scheduleDeletion`](./src/lib/fiber/reconcile.js#L278), 속성 변경은 [`markPropsUpdate`](./src/lib/fiber/reconcile.js#L324), 텍스트 변경은 [`markTextUpdate`](./src/lib/fiber/reconcile.js#L344)로 effect queue에 기록되고, 삽입과 이동 역시 reconcile 단계에서 함께 생성됩니다.

이후 [`commitRoot`](./src/lib/fiber/commit.js#L22)가 effect queue를 실제 DOM 연산으로 실행합니다. 삭제는 [`commitDeletion`](./src/lib/fiber/commit.js#L140), 이동은 [`commitMove`](./src/lib/fiber/commit.js#L163), 삽입은 [`commitInsertion`](./src/lib/fiber/commit.js#L200), 속성 변경은 [`commitPropsUpdate`](./src/lib/fiber/commit.js#L222), 텍스트 변경은 [`commitTextUpdate`](./src/lib/fiber/commit.js#L245)가 담당합니다.

## UI Overview

- `Actual DOM`
  - 현재 실제로 반영된 DOM 상태
- `Editor + Preview`
  - 다음 상태를 수정하고 실험하는 영역
- `Fiber Effects`
  - commit 예정인 작업을 카드 형태로 표시
- `Effect JSON`
  - raw effect 데이터를 그대로 확인
- `Committed Tree`
  - 현재 기준이 되는 Virtual DOM 트리
- `Working Tree`
  - 사용자가 수정 중인 다음 Virtual DOM 트리
- `Snapshots`
  - commit 단위 이력 이동
- `MutationObserver Feed`
  - 실제 DOM 변경 로그 확인

## Core APIs

- [`parseHtmlToVNode`](./src/lib/vdom.js#L86)
  - HTML 문자열을 내부 Virtual DOM으로 변환
- [`domNodeToVNodeTree`](./src/lib/vdom.js#L143)
  - 현재 브라우저 DOM을 Virtual DOM 스냅샷으로 변환
- [`reconcileTrees`](./src/lib/fiber/reconcile.js#L24)
  - 이전/다음 트리를 비교해 effect queue 생성
- [`commitRoot`](./src/lib/fiber/commit.js#L22)
  - effect queue를 실제 DOM 변경으로 반영
- [`mountVNode`](./src/lib/vdom.js#L299)
  - Virtual DOM을 실제 DOM으로 마운트

## Compared With React

이 프로젝트는 React를 대체하려는 목적의 프레임워크가 아니라, React가 내부적으로 해결하는 문제를 학습하기 위한 작은 실험 환경에 가깝습니다.

- React는 상태 관리, 컴포넌트 모델, 스케줄링, 이벤트 시스템, 생태계까지 포함한 완성도 높은 UI 라이브러리입니다.
- 이 프로젝트는 그중에서도 `Virtual DOM 비교`와 `commit 과정`에 집중해, 내부 동작을 눈으로 확인할 수 있게 단순화한 데모입니다.
- 즉, React가 "사용하는 도구"라면 이 프로젝트는 React의 핵심 아이디어를 "설명하는 도구"에 가깝습니다.

## Important Edge Cases

이 playground에서 가장 중요한 엣지 케이스는 세 가지입니다. 첫째, `auto commit` 타이머가 남아 있는 상태에서 `Undo / Redo`로 히스토리를 이동하면, 이전 입력을 기준으로 예약된 commit이 뒤늦게 실행되어 사용자가 되돌린 상태를 다시 덮어쓸 수 있습니다. React는 이런 종류의 문제를 이벤트 기반 상태 업데이트와 배치 처리, 그리고 렌더 단위의 일관된 스냅샷 보장으로 줄이려 하며, 직접 DOM 타이머를 상태 기준선과 섞어 다루는 패턴을 상대적으로 덜 노출합니다.

둘째, key가 없는 리스트를 재정렬하면 이 프로젝트의 index 기반 diff는 항목의 "이동"이 아니라 같은 위치의 DOM 노드를 재사용하면서 텍스트와 속성만 바꾸게 됩니다. 그 결과 입력값, 포커스, 체크 상태 같은 로컬 DOM 상태가 다른 항목에 잘못 붙을 수 있습니다. React도 key가 없으면 비슷한 문제가 생길 수 있기 때문에, 공식적으로 안정적인 `key`를 사용해 항목 정체성을 유지하도록 강하게 권장합니다.

셋째, `select`와 `option` 같은 form control은 live DOM 상태와 직렬화된 Virtual DOM 표현이 쉽게 어긋납니다. 현재 구현은 주로 `option.selected`를 읽기 때문에 동적 옵션 변경, 다중 선택, `select.value` 중심 제어에서 실제 브라우저 상태와 내부 스냅샷이 불일치할 수 있습니다. React는 `value`와 `defaultValue` 같은 제어 규약을 통해 `select` 전체를 단일 상태 소스로 다루고, 개별 `option`보다 부모 `select`의 값을 기준으로 동기화하는 방식을 사용합니다.

## Project Structure

- [`src/lib/vdom.js`](./src/lib/vdom.js)
  - Virtual DOM 생성, 파싱, 직렬화, DOM 변환
- [`src/lib/fiber/reconcile.js`](./src/lib/fiber/reconcile.js)
  - 트리 비교와 effect queue 생성
- [`src/lib/fiber/commit.js`](./src/lib/fiber/commit.js)
  - effect queue를 실제 DOM 연산으로 반영
- [`src/playground/actions.js`](./src/playground/actions.js)
  - playground 상태 흐름, commit, history, auto-commit 제어
- [`src/ui/renderPanels.js`](./src/ui/renderPanels.js)
  - effect, tree, history, mutation feed 패널 렌더링

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```
