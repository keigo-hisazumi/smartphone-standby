import type { Component } from '../dom';

/** スタンバイの 3 画面（ウィジェット・写真・時計）の共通インターフェース */
export interface StandbyView extends Component {
  onVerticalSwipe(direction: 'up' | 'down', x: number): void;
  onLongPress(): void;
  /** 画面が表示された・隠れた */
  setVisible?(visible: boolean): void;
}

export interface ViewActions {
  openSettings(): void;
  exit(): void;
}
