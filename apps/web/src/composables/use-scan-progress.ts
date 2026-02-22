// Composable for watching scan progress via SSE and refreshing scans on completion
import { ref } from 'vue';
import { apiUrl } from './use-api.js';
import { useSse } from './use-sse.js';

export interface ScanProgressEvent {
  status: string;
  percent?: number;
  message?: string;
}

export function useScanProgress(onDone: () => void) {
  const progressScanId = ref<string | null>(null);
  const progressStatus = ref('');
  const progressPct = ref<number | undefined>(undefined);

  let activeSse: ReturnType<typeof useSse> | null = null;

  function watchScanProgress(scanId: string): void {
    // Close any existing SSE before starting a new one
    activeSse?.close();

    progressScanId.value = scanId;
    progressStatus.value = 'starting';
    progressPct.value = undefined;

    const sseUrl = apiUrl(`/scans/${scanId}/progress`);
    let finished = false;
    activeSse = useSse<ScanProgressEvent>(sseUrl, {
      onMessage(data) {
        if (finished) return; // guard against double-fire from buffered events
        progressStatus.value = data.status;
        progressPct.value = data.percent;
        if (data.status === 'completed' || data.status === 'failed') {
          finished = true;
          activeSse?.close();
          activeSse = null;
          progressScanId.value = null;
          onDone();
        }
      },
    });
  }

  return { progressScanId, progressStatus, progressPct, watchScanProgress };
}
