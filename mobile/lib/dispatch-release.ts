export type DispatchReleaseDisposition = {
  transferred?: boolean;
  reassignmentRequired?: boolean;
};

export function getDispatchReleaseNotice(disposition: DispatchReleaseDisposition) {
  if (disposition.transferred) {
    return {
      title: 'Dispatch transferred',
      message: 'You did not accept this report in time, so it was transferred to another available responder.',
    };
  }

  if (disposition.reassignmentRequired) {
    return {
      title: 'Dispatch offer expired',
      message: 'This report was released and is now waiting for PACC to assign another responder.',
    };
  }

  return {
    title: 'Dispatch offer expired',
    message: 'This offer was released and is no longer assigned to you.',
  };
}
