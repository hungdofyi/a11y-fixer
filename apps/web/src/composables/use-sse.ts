// Composable for Server-Sent Events with auto-reconnect and cleanup on unmount
import { onUnmounted, ref } from 'vue';

export interface SseOptions<T> {
  /** Called on each parsed event */
  onMessage: (data: T) => void;
  /** Called when SSE connection opens */
  onOpen?: () => void;
  /** Called on error (before reconnect attempt) */
  onError?: (event: Event) => void;
  /** Max reconnect attempts (default 5) */
  maxRetries?: number;
  /** Delay between retries in ms (default 2000) */
  retryDelay?: number;
}

export interface SseHandle {
  connected: ReturnType<typeof ref<boolean>>;
  close: () => void;
}

/** Connect to an SSE endpoint with typed events and auto-reconnect */
export function useSse<T>(url: string, options: SseOptions<T>): SseHandle {
  const connected = ref(false);
  let source: EventSource | null = null;
  let retries = 0;
  let closed = false;
  const maxRetries = options.maxRetries ?? 5;
  const retryDelay = options.retryDelay ?? 2000;

  function connect(): void {
    if (closed) return;
    source = new EventSource(url);

    source.onopen = () => {
      connected.value = true;
      retries = 0;
      options.onOpen?.();
    };

    source.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as T;
        options.onMessage(data);
      } catch {
        // Skip unparseable messages
      }
    };

    source.onerror = (event) => {
      connected.value = false;
      options.onError?.(event);
      source?.close();
      source = null;

      if (!closed && retries < maxRetries) {
        retries++;
        setTimeout(connect, retryDelay);
      }
    };
  }

  function close(): void {
    closed = true;
    source?.close();
    source = null;
    connected.value = false;
  }

  connect();
  onUnmounted(close);

  return { connected, close };
}
