import type { Component } from '../dom';

/** スタンバイ画面（ウィジェット）のインターフェース */
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
