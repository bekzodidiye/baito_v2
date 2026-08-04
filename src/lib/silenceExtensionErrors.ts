// Suppress third-party extension/wallet errors (e.g. MetaMask, Trezor, Brave, etc.)
// that throw unhandled exceptions within sandboxed iframes.
if (typeof window !== 'undefined') {
  const isExtensionError = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('failed to get initial state') ||
      lower.includes('metamask') ||
      lower.includes('trezor') ||
      lower.includes('sender') ||
      lower.includes('brave') ||
      lower.includes('wallet') ||
      lower.includes('initial state') ||
      lower.includes('failed to get') ||
      lower.includes('extension') ||
      lower.includes('rpc') ||
      lower.includes('please report this bug') ||
      lower.includes('sender wallet')
    );
  };

  const safeStringify = (val: any, visited?: WeakSet<any>, depth = 0): string => {
    visited = visited || new WeakSet();
    if (depth > 5) return '';
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'symbol') return val.toString();
    if (typeof val !== 'object') return '';
    
    if (visited.has(val)) return '';
    visited.add(val);
    
    const parts: string[] = [];
    if (val instanceof Error) {
      parts.push(val.name || 'Error');
      parts.push(val.message || '');
      parts.push(val.stack || '');
    } else if (val === window || val === document) {
      return '';
    } else if (typeof Event !== 'undefined' && val instanceof Event) {
      parts.push(val.type);
      if ((val as any).message) parts.push(String((val as any).message));
      if ((val as any).error) parts.push(safeStringify((val as any).error, visited, depth + 1));
      if ((val as any).reason) parts.push(safeStringify((val as any).reason, visited, depth + 1));
    } else {
      if (val.message) parts.push(String(val.message));
      if (val.stack) parts.push(String(val.stack));
      for (const key in val) {
        try {
          if (key === 'window' || key === 'document' || key === 'location' || key === 'view') continue;
          const propVal = val[key];
          if (typeof propVal === 'function') continue;
          parts.push(key);
          parts.push(safeStringify(propVal, visited, depth + 1));
        } catch (e) {}
      }
    }
    return parts.join(' ');
  };

  // Monkeypatch Error constructors to sanitize error messages at creation
  const OriginalError = (window as any).Error;
  const CustomError = function(this: any, message?: string, options?: any) {
    let msg = message;
    if (msg && isExtensionError(msg)) {
      msg = 'Benign extension warning';
    }
    if (typeof Reflect !== 'undefined' && Reflect.construct && (new.target || (this && this.constructor === CustomError))) {
      return Reflect.construct(OriginalError, [msg, options], new.target || this.constructor);
    }
    const instance = new OriginalError(msg, options);
    instance.name = OriginalError.name;
    return instance;
  } as any;
  CustomError.prototype = OriginalError.prototype;
  Object.getOwnPropertyNames(OriginalError).forEach(prop => {
    if (prop !== 'prototype' && prop !== 'name') {
      try {
        Object.defineProperty(CustomError, prop, Object.getOwnPropertyDescriptor(OriginalError, prop) as PropertyDescriptor);
      } catch (e) {}
    }
  });
  (window as any).Error = CustomError;

  const OriginalTypeError = (window as any).TypeError;
  const CustomTypeError = function(this: any, message?: string, options?: any) {
    let msg = message;
    if (msg && isExtensionError(msg)) {
      msg = 'Benign extension warning';
    }
    if (typeof Reflect !== 'undefined' && Reflect.construct && (new.target || (this && this.constructor === CustomTypeError))) {
      return Reflect.construct(OriginalTypeError, [msg, options], new.target || this.constructor);
    }
    const instance = new OriginalTypeError(msg, options);
    instance.name = OriginalTypeError.name;
    return instance;
  } as any;
  CustomTypeError.prototype = OriginalTypeError.prototype;
  Object.getOwnPropertyNames(OriginalTypeError).forEach(prop => {
    if (prop !== 'prototype' && prop !== 'name') {
      try {
        Object.defineProperty(CustomTypeError, prop, Object.getOwnPropertyDescriptor(OriginalTypeError, prop) as PropertyDescriptor);
      } catch (e) {}
    }
  });
  (window as any).TypeError = CustomTypeError;

  // Monkeypatch Promise.reject
  const OriginalPromiseReject = Promise.reject;
  Promise.reject = function(this: any, reason: any) {
    if (reason) {
      const reasonStr = safeStringify(reason);
      if (isExtensionError(reasonStr)) {
        return OriginalPromiseReject.call(this, new Error('Benign extension warning'));
      }
    }
    return OriginalPromiseReject.call(this, reason);
  };

  const getErrorString = (event: any): string => {
    if (!event) return '';
    const parts: string[] = [];
    
    if (typeof event === 'string') {
      return event;
    }
    
    if (event.message) {
      parts.push(String(event.message));
    }
    if (event.filename) {
      parts.push(String(event.filename));
    }
    
    if (event.error) {
      const err = event.error;
      if (typeof err === 'string') {
        parts.push(err);
      } else if (err && typeof err === 'object') {
        if (err.message) parts.push(String(err.message));
        if (err.stack) parts.push(String(err.stack));
      }
    }
    
    if (event.reason) {
      const reason = event.reason;
      if (typeof reason === 'string') {
        parts.push(reason);
      } else if (reason && typeof reason === 'object') {
        if (reason.message) parts.push(String(reason.message));
        if (reason.stack) parts.push(String(reason.stack));
        try {
          for (const k in reason) {
            try {
              if (typeof reason[k] !== 'function') {
                parts.push(k + ':' + String(reason[k]));
              }
            } catch (err) {}
          }
        } catch (e) {}
      }
    }
    
    try {
      parts.push(safeStringify(event));
    } catch (e) {}
    
    return parts.join(' ');
  };

  const handleError = (msg: string, event?: Event) => {
    if (isExtensionError(msg)) {
      if (event) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
      }
      return true;
    }
    return false;
  };

  // EventTarget prototype event listener interception
  const errorListenersMap = new WeakMap();

  const origAddEventListener = EventTarget.prototype.addEventListener;

  // Register early capturing listeners to intercept error and unhandledrejection events before anyone else
  origAddEventListener.call(window, 'error', (event: any) => {
    const msg = getErrorString(event);
    if (isExtensionError(msg)) {
      if (event) {
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
      }
    }
  }, true);

  origAddEventListener.call(window, 'unhandledrejection', (event: any) => {
    const msg = getErrorString(event);
    if (isExtensionError(msg)) {
      if (event) {
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
      }
    }
  }, true);

  EventTarget.prototype.addEventListener = function(this: any, type: string, listener: any, options?: any) {
    if ((type === 'error' || type === 'unhandledrejection') && typeof listener === 'function') {
      const wrappedListener = function(this: any, event: any) {
        const msg = getErrorString(event);
        if (isExtensionError(msg)) {
          if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
          if (typeof event.stopPropagation === 'function') event.stopPropagation();
          if (typeof event.preventDefault === 'function') event.preventDefault();
          return;
        }
        return listener.call(this, event);
      };
      errorListenersMap.set(listener, wrappedListener);
      return origAddEventListener.call(this, type, wrappedListener, options);
    }
    return origAddEventListener.call(this, type, listener, options);
  };

  const origRemoveEventListener = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.removeEventListener = function(this: any, type: string, listener: any, options?: any) {
    if ((type === 'error' || type === 'unhandledrejection') && typeof listener === 'function') {
      const wrappedListener = errorListenersMap.get(listener);
      if (wrappedListener) {
        return origRemoveEventListener.call(this, type, wrappedListener, options);
      }
    }
    return origRemoveEventListener.call(this, type, listener, options);
  };

  const origDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function(this: any, event: Event) {
    if (event && (event.type === 'error' || event.type === 'unhandledrejection')) {
      const msg = getErrorString(event);
      if (isExtensionError(msg)) {
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
        return false;
      }
    }
    return origDispatchEvent.call(this, event);
  };

  // Window onerror dynamic getter/setter to catch and block any downstream overrides
  let currentOnError = window.onerror;
  try {
    Object.defineProperty(window, 'onerror', {
      get() {
        return (message: any, source?: string, lineno?: number, colno?: number, error?: Error) => {
          const msg = String(message || '') + ' ' + String(error ? (error.message || error.stack || error) : '');
          if (isExtensionError(msg)) {
            return true;
          }
          if (typeof currentOnError === 'function') {
            return currentOnError.call(window, message, source, lineno, colno, error);
          }
        };
      },
      set(callback) {
        currentOnError = callback;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    window.onerror = (message, source, lineno, colno, error) => {
      const msg = String(message || '') + ' ' + String(error ? (error.message || error.stack || error) : '');
      if (isExtensionError(msg)) {
        return true;
      }
      if (typeof currentOnError === 'function') {
        return currentOnError.call(window, message, source, lineno, colno, error);
      }
    };
  }

  // Window onunhandledrejection dynamic getter/setter
  let currentOnUnhandledRejection = (window as any).onunhandledrejection;
  try {
    Object.defineProperty(window, 'onunhandledrejection', {
      get() {
        return (event: PromiseRejectionEvent) => {
          const msg = getErrorString(event);
          if (isExtensionError(msg)) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
            return true;
          }
          if (typeof currentOnUnhandledRejection === 'function') {
            return currentOnUnhandledRejection.call(window, event);
          }
        };
      },
      set(callback) {
        currentOnUnhandledRejection = callback;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    (window as any).onunhandledrejection = (event: PromiseRejectionEvent) => {
      const msg = getErrorString(event);
      if (isExtensionError(msg)) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        return true;
      }
      if (typeof currentOnUnhandledRejection === 'function') {
        return currentOnUnhandledRejection.call(window, event);
      }
    };
  }

  // Bulletproof console wrapping using Proxy
  const originalConsole = window.console;
  const consoleProxy = new Proxy(originalConsole, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      if (typeof originalMethod === 'function') {
        return (...args: any[]) => {
          const argStr = args.map(arg => {
            try {
              return typeof arg === 'object' ? safeStringify(arg) : String(arg);
            } catch (e) {
              return String(arg);
            }
          }).join(' ');
          if (isExtensionError(argStr)) {
            return;
          }
          return originalMethod.apply(target, args);
        };
      }
      return originalMethod;
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    }
  });
  try {
    Object.defineProperty(window, 'console', {
      value: consoleProxy,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    (window as any).console = consoleProxy;
  }

  // Wrap window.reportError if available
  if (typeof (window as any).reportError === 'function') {
    const origReportError = (window as any).reportError;
    (window as any).reportError = function(this: any, error: any) {
      const msg = safeStringify(error);
      if (isExtensionError(msg)) {
        return;
      }
      return origReportError.call(this, error);
    };
  }

  // Wrap Worker and SharedWorker constructors to catch background worker-triggered errors
  if (typeof (window as any).Worker === 'function') {
    const OriginalWorker = (window as any).Worker;
    const CustomWorker = function(this: any, scriptURL: string, options?: any) {
      const worker = new OriginalWorker(scriptURL, options);
      const origAdd = worker.addEventListener;
      worker.addEventListener = function(this: any, type: string, listener: any, opt?: any) {
        if (type === 'error' || type === 'unhandledrejection') {
          const wrapped = function(this: any, event: any) {
            const msg = getErrorString(event);
            if (isExtensionError(msg)) {
              if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
              if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
              if (event && typeof event.preventDefault === 'function') event.preventDefault();
              return;
            }
            return listener.call(this, event);
          };
          return origAdd.call(this, type, wrapped, opt);
        }
        return origAdd.call(this, type, listener, opt);
      };
      let currentOnError: any = null;
      Object.defineProperty(worker, 'onerror', {
        get() { return currentOnError; },
        set(cb) {
          if (typeof cb === 'function') {
            currentOnError = function(this: any, event: any) {
              const msg = getErrorString(event);
              if (isExtensionError(msg)) {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
                return true;
              }
              return cb.call(this, event);
            };
          } else {
            currentOnError = cb;
          }
        },
        configurable: true,
        enumerable: true
      });
      return worker;
    };
    CustomWorker.prototype = OriginalWorker.prototype;
    (window as any).Worker = CustomWorker;
  }

  if (typeof (window as any).SharedWorker === 'function') {
    const OriginalSharedWorker = (window as any).SharedWorker;
    const CustomSharedWorker = function(this: any, scriptURL: string, options?: any) {
      const sw = new OriginalSharedWorker(scriptURL, options);
      const origAdd = sw.addEventListener;
      sw.addEventListener = function(this: any, type: string, listener: any, opt?: any) {
        if (type === 'error' || type === 'unhandledrejection') {
          const wrapped = function(this: any, event: any) {
            const msg = getErrorString(event);
            if (isExtensionError(msg)) {
              if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
              if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
              if (event && typeof event.preventDefault === 'function') event.preventDefault();
              return;
            }
            return listener.call(this, event);
          };
          return origAdd.call(this, type, wrapped, opt);
        }
        return origAdd.call(this, type, listener, opt);
      };
      let currentOnError: any = null;
      Object.defineProperty(sw, 'onerror', {
        get() { return currentOnError; },
        set(cb) {
          if (typeof cb === 'function') {
            currentOnError = function(this: any, event: any) {
              const msg = getErrorString(event);
              if (isExtensionError(msg)) {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
                return true;
              }
              return cb.call(this, event);
            };
          } else {
            currentOnError = cb;
          }
        },
        configurable: true,
        enumerable: true
      });
      return sw;
    };
    CustomSharedWorker.prototype = OriginalSharedWorker.prototype;
    (window as any).SharedWorker = CustomSharedWorker;
  }
}
