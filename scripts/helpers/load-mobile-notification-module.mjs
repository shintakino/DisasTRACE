import { build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';

/** Execute mobile auth/badge code with simulated native and network IO. */
export async function loadMobileNotificationModule(entry, dependencies) {
  const mocks = {
    './supabase': 'export const supabase = globalThis.dependencies.supabase;',
    '../lib/supabase': 'export const supabase = globalThis.dependencies.supabase;',
    './mobile-device': 'export const getMobileDeviceId = () => "test-device";',
    './api-base-url': 'export const getMobileApiBaseUrl = () => "https://test";',
    '../lib/api-base-url': 'export const getMobileApiBaseUrl = () => "https://test";',
    '../lib/network-timeout': 'export const fetchWithTimeout = (...args) => globalThis.dependencies.fetch(...args);',
    react: 'export const useEffect = globalThis.dependencies.useEffect; export const useState = globalThis.dependencies.useState; export const useRef = value => ({current:value}); export const useCallback = callback => callback;',
    'react-native': 'export const AppState = globalThis.dependencies.appState;',
    'expo-router': 'export const useFocusEffect = globalThis.dependencies.useFocusEffect;',
    'expo-notifications': 'export const addNotificationReceivedListener = globalThis.dependencies.onNotification;',
  };
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
    plugins: [{ name: 'mobile-notification-io', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'test' } : null);
      builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: mocks[args.path] }));
    } }],
  });
  const exports = {};
  const context = vm.createContext({ dependencies, exports, module: { exports }, require: createRequire(import.meta.url),
    fetch: (...args) => dependencies.fetch(...args), AbortController, setTimeout, clearTimeout, console, process,
  });
  vm.runInContext(result.outputFiles[0].text, context);
  return context.module.exports;
}
