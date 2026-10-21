import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { StackActions, StackRouter, TabRouter } from '../mobile/node_modules/@react-navigation/routers/lib/module/index.js';
import { openNotificationRoute } from '../mobile/lib/open-notification-route.ts';

// Exercise the installed native stack reducer, not only returned route strings.
const router = StackRouter({ initialRouteName: '(tabs)' });
const config = {
  routeNames: ['(tabs)', 'notifications', 'help/response-status'],
  routeParamList: {},
  routeGetIdList: {},
};
const initial = () => router.getInitialState(config);
const act = (state, action) => router.getStateForAction(state, action, config);
for (const origin of ['notifications', 'help/response-status']) {
  const home = initial();
  const opened = act(home, StackActions.push(origin));
  const returned = act(opened, StackActions.popTo('(tabs)'));
  assert.equal(returned.routes.length, 1);
  assert.equal(returned.routes[0].key, home.routes[0].key, 'Home must retain its mounted tab shell.');
  const repeated = act(returned, StackActions.popTo('(tabs)'));
  assert.equal(repeated.routes.length, 1, 'Rapid repeated returns must not duplicate Home.');
}
const coldStart = { ...initial(), routes: [{ key: 'cold', name: 'notifications' }], index: 0 };
const coldHome = act(coldStart, StackActions.popTo('(tabs)'));
assert.deepEqual(coldHome.routes.map(route => route.name), ['(tabs)']);
const opened = act(initial(), StackActions.push('notifications'));
const dispatch = act(opened, StackActions.popTo('(tabs)', { dispatchOfferId: 'offer-1' }));
assert.equal(dispatch.routes.length, 1);
assert.equal(dispatch.routes[0].params.dispatchOfferId, 'offer-1');
console.log('PASS warm/cold notification, report completion, repeated Back, and dispatch stack transitions');

// Load Expo's installed action builder without importing the native RN runtime.
// Fail explicitly on an upstream layout change rather than testing a copied implementation.
const require = createRequire(import.meta.url);
const routing = fs.readFileSync(new URL('../mobile/node_modules/expo-router/build/global-state/routing.js', import.meta.url), 'utf8');
const start = routing.indexOf('function getNavigateAction(');
const end = routing.indexOf('//# sourceMappingURL');
assert.ok(start >= 0 && end > start, 'Update the Expo action-builder harness after a router upgrade.');
const getAction = new Function('matchers_1', 'navigationParams_1', `${routing.slice(start, end)}; return getNavigateAction;`)(
  require('../mobile/node_modules/expo-router/build/matchers.js'),
  require('../mobile/node_modules/expo-router/build/navigationParams.js'),
);
const tabsRouter = require('../mobile/node_modules/expo-router/build/layouts/TabRouter.js').tabRouterOverride(
  TabRouter({ initialRouteName: 'index' }),
);
const tabsConfig = { routeNames: ['index', 'reports', 'profile', 'map'], routeParamList: {}, routeGetIdList: {} };
const tabs = tabsRouter.getInitialState(tabsConfig);
const shell = { ...initial(), routes: [{ ...initial().routes[0], state: tabs }] };
const targetState = (name, params, child) => ({ routes: [{ name: '(tabs)', state: { routes: [{ name, params, state: child }] } }] });
const chooseAction = (state, destination, target) => {
  let action;
  openNotificationRoute({
    navigate: href => { assert.deepEqual(href, destination); action = getAction(target, state, 'NAVIGATE'); },
    dismissTo: href => { assert.deepEqual(href, destination); action = getAction(target, state, 'POP_TO'); },
  }, state, destination);
  assert.ok(action, 'Every notification must dispatch a navigation action.');
  return action;
};

for (const origin of ['index', 'profile', 'reports']) {
  const currentTabs = { ...tabs, index: tabs.routes.findIndex(route => route.name === origin) };
  const currentRoot = { ...shell, routes: [{ ...shell.routes[0], state: currentTabs }] };
  for (const name of ['index', 'reports', 'profile', 'map']) {
    const params = name === 'index' ? { dispatchOfferId: 'exact-offer-1' } : undefined;
    const destination = { pathname: name === 'index' ? '/(tabs)' : `/(tabs)/${name}`, params };
    const target = targetState(name, params);
    // Negative control: this is the previously swallowed action, including same-tab taps.
    assert.equal(tabsRouter.getStateForAction(currentTabs, getAction(target, currentRoot, 'POP_TO'), tabsConfig), null);
    const action = chooseAction(currentRoot, destination, target);
    assert.equal(action.target, currentTabs.key);
    const result = tabsRouter.getStateForAction(currentTabs, action, tabsConfig);
    assert.ok(result);
    assert.equal(result.routes[result.index].name, name);
    assert.equal(result.key, tabs.key);
    assert.equal(result.routes.length, tabs.routes.length);
    if (params) assert.equal(result.routes[result.index].params.dispatchOfferId, 'exact-offer-1');
  }
}

const reportsRouter = StackRouter({ initialRouteName: 'index' });
const reportsConfig = { routeNames: ['index', '[id]'], routeParamList: {}, routeGetIdList: {} };
const reports = reportsRouter.getInitialState(reportsConfig);
const reportTarget = targetState('reports', undefined, { routes: [{ name: '[id]', params: { id: 'request-42' } }] });
const reportHref = '/(tabs)/reports/request-42';
const reportAction = chooseAction(shell, reportHref, reportTarget);
const reportTabs = tabsRouter.getStateForAction(tabs, reportAction, tabsConfig);
assert.equal(reportTabs.routes[reportTabs.index].params.screen, '[id]');
assert.equal(reportTabs.routes[reportTabs.index].params.params.id, 'request-42');
const inReports = { ...shell, routes: [{ ...shell.routes[0], state: {
  ...reportTabs, routes: reportTabs.routes.map(route => route.name === 'reports' ? { ...route, state: reports } : route),
} }] };
const nestedAction = chooseAction(inReports, reportHref, reportTarget);
assert.equal(nestedAction.target, reports.key);
const detail = reportsRouter.getStateForAction(reports, nestedAction, reportsConfig);
assert.equal(detail.routes[detail.index].params.id, 'request-42');

for (const current of [act(shell, StackActions.push('notifications')), coldStart]) {
  const action = chooseAction(current, { pathname: '/(tabs)', params: { dispatchOfferId: 'exact-offer-2' } }, targetState('index', { dispatchOfferId: 'exact-offer-2' }));
  assert.equal(action.type, 'POP_TO');
  const result = act(current, action);
  assert.equal(result.routes.length, 1);
  assert.equal(result.routes[0].params.params.dispatchOfferId, 'exact-offer-2');
  if (current !== coldStart) assert.equal(result.routes[0].key, shell.routes[0].key);
}
const inboxAction = chooseAction(shell, '/notifications', { routes: [{ name: 'notifications' }] });
const inbox = act(shell, inboxAction);
assert.equal(inbox.routes.length, 2, 'Opening the inbox from a tab must preserve the mounted Home underneath.');
assert.equal(inbox.routes[0].key, shell.routes[0].key);
console.log('PASS installed Expo nested-tab actions, exact dispatch/report IDs, and warm/cold notification routing');
