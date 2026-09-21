import { setWorkerUrl } from 'maplibre-gl';

let configured = false;

export function configureMapLibreWorker() {
  if (configured || typeof window === 'undefined') return;

  setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
  configured = true;
}
