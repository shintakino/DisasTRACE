import type { Href, Router } from 'expo-router';

interface RootNavigationState {
  index: number;
  routes: readonly { name: string }[];
}

/** Use the current navigator state after asynchronous notification consumption. */
export function openNotificationRoute(
  router: Pick<Router, 'navigate' | 'dismissTo'>,
  state: RootNavigationState,
  destination: Href,
): void {
  if (state.routes[state.index]?.name === '(tabs)') {
    // Expo targets the divergent child navigator. Bottom tabs cannot handle
    // dismissTo's POP_TO; NAVIGATE also preserves Home when opening a root screen.
    router.navigate(destination);
  } else {
    // Pop an overlay back to the existing tab shell instead of mounting a
    // second Home/map. Expo replaces the top screen if the destination is absent.
    router.dismissTo(destination);
  }
}
