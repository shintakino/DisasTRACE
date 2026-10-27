import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Execute the real Zustand store, replacing only native IO and authentication.
const bundle = await build({
  entryPoints: ['mobile/stores/useResponderStore.ts'], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['zustand'],
  plugins: [{ name: 'native-test-io', setup(builder) {
    builder.onResolve({ filter: /^(expo-secure-store|expo-file-system\/legacy)$|\/supabase$|^\.\.\/lib\/supabase$/ },
      args => ({ path: args.path.includes('supabase') ? 'auth' : 'native', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'auth'
      ? 'export const supabase = { auth: { getSession: async () => { await globalThis.authGate; return { data: { session: { user: { id: "owner" }, access_token: "test" } } }; } } };'
      : 'export const documentDirectory = "/test/"; export const setItemAsync = async () => {}; export const getItemAsync = async () => null; export const deleteItemAsync = async () => {}; export const getInfoAsync = async () => ({exists:false}); export const readAsStringAsync = async () => "[]"; export const writeAsStringAsync = async () => {};',
    }));
  } }],
});
let pendingResponse;
let entered;
const exports = {};
const context = vm.createContext({ exports, module: { exports }, require: createRequire(new URL('../mobile/package.json', import.meta.url)),
  console, process, setTimeout, clearTimeout, AbortController,
  alert() {}, fetch: async url => {
    if (url.includes('generate_204')) return { ok: true, status: 204 };
    entered?.();
    return pendingResponse;
  },
});
vm.runInContext(bundle.outputFiles[0].text, context);
const store = context.module.exports.useResponderStore;
const incident = id => ({ id, coordinates: { latitude: 14.95, longitude: 120.9 } });
const install = (id, status = 'en_route', ownerUserId = 'owner') => store.setState({
  ownerUserId, activeDispatch: incident(id), status, fieldOutcome: 'HANDLED_ON_SCENE', reportFormSession: null,
});

install('B');
store.getState().completeIncident('A');
store.getState().releaseDispatchOffer({ incidentId: 'A', title: 'Expired', message: 'Old offer' });
store.getState().acceptDispatch('A');
assert.equal(store.getState().activeDispatch.id, 'B');
assert.equal(store.getState().status, 'en_route');
store.getState().releaseDispatchOffer({ incidentId: 'B', title: 'Expired', message: 'Delayed expiry' });
assert.equal(store.getState().activeDispatch.id, 'B', 'An expiry cannot clear an accepted response.');

for (const action of ['arriveAtScene', 'startReport', 'deferDocumentation']) for (const success of [false, true]) for (const accountSwitch of [false, true]) {
  install('A', action === 'arriveAtScene' ? 'en_route' : 'on_scene');
  let finish;
  pendingResponse = new Promise(resolve => { finish = resolve; });
  const requested = new Promise(resolve => { entered = resolve; });
  const operation = store.getState()[action]();
  await requested;
  install(accountSwitch ? 'A' : 'B', 'en_route', accountSwitch ? 'replacement-owner' : 'owner');
  finish({ ok: success, status: success ? 200 : 403, json: async () => success ? {success:true} : ({ code: 'INCIDENT_REASSIGNED', error: 'A reassigned' }) });
  await operation;
  assert.equal(store.getState().activeDispatch.id, accountSwitch ? 'A' : 'B', `${action}: old result cannot clear the newer incident/account`);
  assert.equal(store.getState().status, 'en_route');
}
install('A', 'dispatch_offered');
store.getState().acceptDispatch('A');
assert.equal(store.getState().status, 'en_route');
install('A', 'dispatch_offered');
store.getState().acceptDispatch('A', { status: 'ARRIVED', transportStatus: 'ARRIVED_AT_HOSPITAL', transportHospitalId: 'hospital' });
assert.equal(store.getState().status, 'at_hospital', 'Repeated acceptance applies the returned lifecycle instead of returning to en route.');
install('A', 'idle');
store.setState({ reportFormSession: { source: 'DOCUMENTATION_DRAFT', incident: incident('A') } });
let releaseAuth;
context.authGate = new Promise(resolve => { releaseAuth = resolve; });
const savingOldDraft = store.getState().deferDocumentation({});
install('B');
const newForm = { source: 'ACTIVE_DISPATCH', incident: incident('B') };
store.setState({ reportFormSession: newForm });
releaseAuth();
await savingOldDraft;
assert.equal(store.getState().reportFormSession, newForm, 'Saving an older draft cannot close a newer report form.');
context.authGate = undefined;
console.log('PASS actual responder store: old cleanup, release, acceptance, and delayed HTTP failures preserve newer incidents');
