/**
 * Filter changes should refresh the existing report list in place. Only the
 * first load is allowed to replace the list with a blocking loading state.
 */
export function shouldKeepReportsVisibleWhileFetching(input: {
  hasLoadedOnce: boolean;
  isFetching: boolean;
}) {
  return input.hasLoadedOnce && input.isFetching;
}
