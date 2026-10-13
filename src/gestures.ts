// スワイプ・タップ・長押しの判定

export type Gesture =
  | { type: 'swipe'; direction: 'left' | 'right' | 'up' | 'down'; x: number; y: number }
  | { type: 'tap'; x: number; y: number }
  | { type: 'none' };

export const SWIPE_THRESHOLD = 40;
export const TAP_SLOP = 10;
export const LONG_PRESS_MS = 550;

/** 指を離した時点の移動量から操作を分類する（長押しはタイマー側で判定） */
export function classifyGesture(dx: number, dy: number, x: number, y: number): Gesture {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < TAP_SLOP && ay < TAP_SLOP) return { type: 'tap', x, y };
  if (Math.max(ax, ay) < SWIPE_THRESHOLD) return { type: 'none' };
  if (ax > ay) return { type: 'swipe', direction: dx < 0 ? 'left' : 'right', x, y };
  return { type: 'swipe', direction: dy < 0 ? 'up' : 'down', x, y };
}

export interface GestureHandlers {
  onSwipe(direction: 'left' | 'right' | 'up' | 'down', x: number, y: number): void;
  onTap(x: number, y: number): void;
  onLongPress(x: number, y: number): void;
  /** 何らかの操作が始まった（スリープ解除タイマーのリセット用） */
  onActivity(): void;
}

/** 要素にポインター操作のハンドラを取り付ける。戻り値で解除できる */
export function attachGestures(el: HTMLElement, handlers: GestureHandlers): () => void {
  let start: { id: number; x: number; y: number } | null = null;
  let longPressTimer: number | undefined;

  const cancelLongPress = () => {
    if (longPressTimer !== undefined) window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };

  const onDown = (e: PointerEvent) => {
    handlers.onActivity();
    if (!e.isPrimary) return;
    // 前回の操作の pointerup を取りこぼしていても、新しい操作で上書きする
    start = { id: e.pointerId, x: e.clientX, y: e.clientY };
    cancelLongPress();
    longPressTimer = window.setTimeout(() => {
      if (!start) return;
      const { x, y } = start;
      // 長押しで開いたシートの上で指が離されることがあるので、ここで操作を終わらせる
      start = null;
      handlers.onLongPress(x, y);
    }, LONG_PRESS_MS);
  };

  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP) cancelLongPress();
  };

  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    cancelLongPress();
    const g = classifyGesture(e.clientX - start.x, e.clientY - start.y, start.x, start.y);
    start = null;
    if (g.type === 'swipe') handlers.onSwipe(g.direction, g.x, g.y);
    else if (g.type === 'tap') handlers.onTap(g.x, g.y);
  };

  const onCancel = () => {
    cancelLongPress();
    start = null;
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  // 長押しでブラウザのコンテキストメニューが出ないようにする
  const onContext = (e: Event) => e.preventDefault();
  el.addEventListener('contextmenu', onContext);
  return () => {
    cancelLongPress();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
    el.removeEventListener('contextmenu', onContext);
  };
}
