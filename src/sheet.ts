// 長押しで開く編集シート（iOS の編集モードに相当）と設定画面で使うモーダル

import { h } from './dom';

export interface Sheet {
  el: HTMLElement;
  body: HTMLElement;
  close(): void;
}

/** モーダルシートを開く。背景タップか「完了」で閉じる */
export function openSheet(title: string, onClose?: () => void): Sheet {
  const body = h('div', { class: 'sheet-body' });
  const done = h('button', { class: 'sheet-done', text: '完了', attrs: { type: 'button' } });
  const panel = h('div', { class: 'sheet-panel', attrs: { role: 'dialog', 'aria-label': title } }, [
    h('div', { class: 'sheet-header' }, [h('div', { class: 'sheet-title', text: title }), done]),
    body,
  ]);
  const el = h('div', { class: 'sheet' }, [panel]);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.remove('sheet-open');
    window.setTimeout(() => el.remove(), 200);
    onClose?.();
  };
  done.addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => {
    if (e.target === el) close();
  });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('sheet-open'));
  return { el, body, close };
}

export function section(title: string, children: (Node | string)[]): HTMLElement {
  return h('div', { class: 'sheet-section' }, [h('div', { class: 'sheet-section-title', text: title }), ...children]);
}

export function toggleRow(label: string, value: boolean, onChange: (v: boolean) => void, note?: string): HTMLElement {
  const input = h('input', { attrs: { type: 'checkbox', role: 'switch' } });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'row' }, [
    h('div', { class: 'row-text' }, [h('div', { text: label }), note ? h('div', { class: 'row-note', text: note }) : null]),
    input,
  ]);
}

export function selectRow<T extends string | number>(
  label: string,
  value: T,
  options: { value: T; label: string }[],
  onChange: (v: T) => void,
  note?: string,
): HTMLElement {
  const select = h('select');
  for (const o of options) {
    const opt = h('option', { text: o.label, attrs: { value: String(o.value) } });
    if (o.value === value) opt.selected = true;
    select.append(opt);
  }
  select.addEventListener('change', () => {
    const found = options.find((o) => String(o.value) === select.value);
    if (found) onChange(found.value);
  });
  return h('label', { class: 'row' }, [
    h('div', { class: 'row-text' }, [h('div', { text: label }), note ? h('div', { class: 'row-note', text: note }) : null]),
    select,
  ]);
}

export function timeRow(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const input = h('input', { attrs: { type: 'time' } });
  input.value = value;
  input.addEventListener('change', () => {
    if (input.value) onChange(input.value);
  });
  return h('label', { class: 'row' }, [h('div', { class: 'row-text', text: label }), input]);
}

export function buttonRow(label: string, onClick: () => void, variant: 'default' | 'danger' = 'default'): HTMLElement {
  const b = h('button', { class: `row-button row-button-${variant}`, text: label, attrs: { type: 'button' } });
  b.addEventListener('click', onClick);
  return b;
}
