/** Auth refreshes and same-account SIGNED_IN events must not discard a response. */
export function shouldResetResponderSession(previousId: string | null, nextId: string | null, hasHydrated: boolean) {
  return !hasHydrated || previousId !== nextId;
}
