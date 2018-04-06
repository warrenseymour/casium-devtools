import { SerializedMessage } from './instrumenter';

export interface DependencyTrace {
  model: string[][];
  message: string[][];
  relay: string[][];
}

/**
 * This function is designed to be stringified and evaluated in the context of
 * the client window; so we can't rely on any imported modules as Webpack
 * generated code will be executed in the context of the application being
 * inspected.
 */
export const dependencyTrace = (context: string, name: string, model: {}, message = {}, relay = {}) => {

  /**
   * Symbols cannot cross the `eval` boundary, so they need to be coerced to
   * their string equivalent.
   */
  const sanitizeKey = (key: any) =>
    typeof key === 'symbol' ? key.toString() : key;

  const deepGetProxy = <T extends { [key: string]: any }>(obj: T, onRead: (path: string[]) => void, parents: string[] = []): T =>
    new Proxy(obj, {
      get<K extends keyof T>(target: T, key: K) {
        const value = target[key];
        const fullPath = parents.concat(sanitizeKey(key));
        onRead(fullPath);

        // JS, you crack me up (typeof null === 'object')
        if (value !== null && typeof value === 'object') {
          return deepGetProxy(value, onRead, fullPath);
        }

        return value;
      },

      ownKeys<K extends keyof T>(target: T) {
        const keys = Reflect.ownKeys(target) as K[];

        keys.forEach(key => onRead(parents.concat(sanitizeKey(key))));

        return keys;
      }
    });

  const arrayEq = (a: any[], b: any[]) => {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  };

  const path = (path: string[], obj: { [key: string]: any }) => {
    let val = obj;
    let idx = 0;
    while (idx < path.length) {
      if (val == null) {
        return;
      }
      val = val[path[idx]];
      idx += 1;
    }
    return val;
  }

  const storedContext = window.__CASIUM_DEV_TOOLS_INSTRUMENTER__.contexts[context];
  if (!storedContext) {
    throw Error(`Context '${context}' does not exist`);
  }

  if (!storedContext.container) {
    throw Error(`Context '${context}' does not have a container`);
  }

  const key = Array.from(storedContext.container.update.keys())
    .find(updater => updater.name === name);

  if (!key) {
    throw Error(`Context '${context}' does not contain an Updater of type '${name}'`);
  }

  const updater = storedContext.container.update.get(key);

  if (!updater) {
    throw Error(`Context '${context}' contains an Updater of type '${key}', but it could not be retrieved`);
  }

  const modelPaths: string[][] = [];
  const messagePaths: string[][] = [];
  const relayPaths: string[][] = [];

  // R.path can safely handle symbols despite type definition
  const modelProxy = deepGetProxy(path(storedContext.path as string[], model) || {}, path => {
    if (!modelPaths.find(existingPath => arrayEq(existingPath, path))) {
      modelPaths.push(path);
    }
  }, storedContext.path as string[]);

  const messageProxy = deepGetProxy(message, path => {
    if (!messagePaths.find(existingPath => arrayEq(existingPath, path))) {
      messagePaths.push(path);
    }
  });

  const relayProxy = deepGetProxy(relay, path => {
    if (!relayPaths.find(existingPath => arrayEq(existingPath, path))) {
      relayPaths.push(path);
    }
  });

  updater(modelProxy, messageProxy, relayProxy);

  return {
    model: modelPaths,
    message: messagePaths,
    relay: relayPaths
  };
};

/**
 * Stringifies a call to `dependencyTrace` on `msg` so that it can be evaluated
 * in the context of the application being inspected. A `sourceURL` hint is also
 * given so that the evaluated code can be viewed and debugged in 'Sources' pane
 * of the *inspected* application.
 */
export const runDependencyTrace = (msg: SerializedMessage) => {
  const evalString = `(${dependencyTrace.toString()})(` +
    `'${msg.context}', ` +
    `'${msg.message}', ` +
    `${JSON.stringify(msg.prev)} ,` +
    `${JSON.stringify(msg.data)} ,` +
    `${JSON.stringify(msg.relay)})` +
    `//# sourceURL=casium-devtools/run-dependency-trace.js`;

  return new Promise<DependencyTrace>((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(evalString, (result: DependencyTrace, error) => {
      error ? reject(error) : resolve(result);
    });
  });
};
