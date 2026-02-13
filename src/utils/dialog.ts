import { registerHotkey, unregisterHotkey, pushScope, popScope, Scopes } from './hotkeys';

export interface DialogContext<T> {
  dialog: HTMLDivElement;
  overlay: HTMLDivElement;
  resolve: (value: T) => void;
  cancel: () => void;
}

export interface DialogOptions<T> {
  content: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  focusSelector?: string;
  onMount: (ctx: DialogContext<T>) => void;
  onCleanup?: () => void;
  clickOutsideToCancel?: boolean;
}

export function showDialog<T>(options: DialogOptions<T>): Promise<T | null> {
  const {
    content,
    className,
    style,
    focusSelector,
    onMount,
    onCleanup,
    clickOutsideToCancel = true,
  } = options;

  return new Promise((rawResolve) => {
    let settled = false;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = className ? `import-dialog ${className}` : 'import-dialog';

    if (style) {
      for (const key of Object.keys(style) as Array<keyof CSSStyleDeclaration>) {
        const value = style[key];
        if (value !== undefined) {
          (dialog.style as any)[key] = value;
        }
      }
    }

    dialog.innerHTML = content;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cleanup = () => {
      if (settled) return;
      settled = true;
      onCleanup?.();
      unregisterHotkey('escape', Scopes.MODAL);
      popScope();
      dialog.classList.remove('import-dialog--visible');
      overlay.classList.remove('modal-overlay--visible');
      setTimeout(() => overlay.remove(), 200);
    };

    const resolve = (value: T) => {
      cleanup();
      rawResolve(value);
    };

    const cancel = () => {
      cleanup();
      rawResolve(null);
    };

    onMount({ dialog, overlay, resolve, cancel });

    if (clickOutsideToCancel) {
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) cancel();
      });
    }

    pushScope(Scopes.MODAL);
    registerHotkey('escape', Scopes.MODAL, cancel);

    requestAnimationFrame(() => {
      overlay.classList.add('modal-overlay--visible');
      dialog.classList.add('import-dialog--visible');
      if (focusSelector) {
        const el = dialog.querySelector(focusSelector) as HTMLElement | null;
        el?.focus();
      }
    });
  });
}
