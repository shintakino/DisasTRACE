/** Works whether Android resizes the modal window or overlays its keyboard. */
export function keyboardViewportHeight(top: number, height: number, keyboardTop: number | null) {
  return keyboardTop === null ? height : Math.max(0, Math.min(height, keyboardTop - top));
}

export function updateOtpDigits(previous: string[], index: number, text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 6);
  const next = [...previous];
  if (!digits) next[index] = '';
  else {
    const start = digits.length === 6 ? 0 : index;
    for (let offset = 0; offset < digits.length && start + offset < 6; offset++) next[start + offset] = digits[offset];
  }
  return next;
}
