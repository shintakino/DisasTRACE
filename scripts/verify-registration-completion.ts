import assert from 'node:assert/strict';
import { completeRegistration } from '../mobile/lib/complete-registration';

async function main() {
  for (const failure of [null, 'bind', 'upload', 'publish']) {
    const calls: string[] = [];
    const step = async (name: string) => {
      calls.push(name);
      if (failure === name) throw new Error(`${name} failed`);
    };
    const run = completeRegistration({
      bindSession: () => step('bind'),
      uploadId: () => step('upload'),
      publishSession: () => step('publish'),
    });
    if (failure === 'bind' || failure === 'publish') {
      await assert.rejects(run);
    } else {
      assert.equal((await run).documentSubmitted, failure !== 'upload');
    }
    assert.deepEqual(calls, failure === 'bind' ? ['bind'] : ['bind', 'upload', 'publish']);
  }
  const calls: string[] = [];
  let finishUpload!: () => void;
  const upload = new Promise<void>(resolve => { finishUpload = resolve; });
  const run = completeRegistration({
    bindSession: async () => { calls.push('bind'); },
    uploadId: async () => { calls.push('upload'); await upload; },
    publishSession: async () => { calls.push('publish'); },
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, ['bind', 'upload'], 'Auth must not see an in-progress upload.');
  finishUpload();
  await run;
  assert.deepEqual(calls, ['bind', 'upload', 'publish']);
  console.log('PASS registration ordering, upload recovery, binding rejection, and delayed publication');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
