interface RegistrationCompletion {
  bindSession: () => Promise<unknown>;
  uploadId: () => Promise<unknown>;
  publishSession: () => Promise<unknown>;
}

/** Publish only a bound session. An interrupted ID upload stays resumable. */
export async function completeRegistration(steps: RegistrationCompletion) {
  await steps.bindSession();
  let documentSubmitted = false;
  try {
    await steps.uploadId();
    documentSubmitted = true;
  } catch {
    // The authenticated Pending screen checks the actual server document
    // state and offers upload/retry instead of claiming review has begun.
  }
  await steps.publishSession();
  return { documentSubmitted };
}
