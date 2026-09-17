export function guestAllowanceCopy(remaining: number) {
  const safeRemaining = Math.max(0, Math.floor(remaining));
  if (safeRemaining === 0) {
    return {
      headline: 'No guest reports remaining',
      reminder: 'Your Guest Mode allowance is used up. Register or sign in before submitting another report.',
      exhausted: true,
    };
  }
  if (safeRemaining === 1) {
    return {
      headline: '1 guest report remaining',
      reminder: 'Only one Guest Mode report remains. Register now to avoid losing access during a future emergency.',
      exhausted: false,
    };
  }
  return {
    headline: `${safeRemaining} guest reports remaining`,
    reminder: 'Register before your Guest Mode allowance runs out.',
    exhausted: false,
  };
}
