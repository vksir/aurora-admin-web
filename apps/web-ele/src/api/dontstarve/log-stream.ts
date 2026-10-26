import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const LOG_STREAM_PATH = '/v1/dst/service/log/stream';
const MAX_RETRY_DELAY = 10_000;
const BASE_RETRY_DELAY = 1000;

/** 连接状态：连接中 / 已连接 / 重连中 / 已断开（不再重试） */
export type ServiceLogState = 'closed' | 'connecting' | 'open' | 'reconnecting';

export interface ServiceLogMeta {
  /** 各分片日志文件是否存在 */
  shards: Record<string, boolean>;
}

export interface ServiceLogLine {
  line: string;
  shard: string;
}

export interface ServiceLogHandlers {
  /** 日志文件被清空（新一轮启动），应清空已有内容 */
  onReset?: () => void;
  onLine: (line: ServiceLogLine) => void;
  onMeta?: (meta: ServiceLogMeta) => void;
  onState?: (state: ServiceLogState) => void;
}

interface ServiceLogEvent {
  line?: string;
  shard?: string;
  shards?: Record<string, boolean>;
  type?: 'line' | 'meta' | 'ping' | 'reset';
}

/**
 * 订阅服务日志流（SSE）。
 *
 * 后端只接受 `Authorization` 请求头鉴权，原生 `EventSource` 无法设置请求头，
 * 因此这里用 fetch + ReadableStream 自己解析事件流。
 *
 * 返回取消订阅函数。
 */
export function streamServiceLog(handlers: ServiceLogHandlers) {
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const scheduleReconnect = () => {
    if (closed) {
      return;
    }
    handlers.onState?.('reconnecting');
    const delay = Math.min(MAX_RETRY_DELAY, BASE_RETRY_DELAY * 2 ** retry);
    retry += 1;
    timer = setTimeout(connect, delay);
  };

  const handleBlock = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const raw of block.split('\n')) {
      const line = raw.trimEnd();
      if (line.startsWith(':')) {
        continue; // 注释行（心跳）
      }
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).trimStart());
      }
    }
    if (event === 'ping' || data.length === 0) {
      return;
    }

    let payload: ServiceLogEvent;
    try {
      payload = JSON.parse(data.join('\n')) as ServiceLogEvent;
    } catch {
      return;
    }

    if (payload.type === 'line' && payload.line !== undefined) {
      handlers.onLine({ line: payload.line, shard: payload.shard ?? '' });
    } else if (payload.type === 'meta') {
      handlers.onMeta?.({ shards: payload.shards ?? {} });
    } else if (payload.type === 'reset') {
      handlers.onReset?.();
    }
  };

  const readStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf('\n\n');
      while (idx >= 0) {
        handleBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        idx = buffer.indexOf('\n\n');
      }
    }
  };

  async function connect() {
    if (closed) {
      return;
    }
    controller = new AbortController();
    handlers.onState?.(retry === 0 ? 'connecting' : 'reconnecting');

    const accessStore = useAccessStore();
    const token = accessStore.accessToken;
    try {
      const response = await fetch(`${apiURL}${LOG_STREAM_PATH}`, {
        headers: {
          Accept: 'text/event-stream',
          Authorization: token ? `Bearer ${token}` : '',
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        // token 失效：清掉本地 token 交给路由守卫，不无限重连
        accessStore.setAccessToken(null);
        handlers.onState?.('closed');
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`unexpected response: ${response.status}`);
      }

      retry = 0;
      handlers.onState?.('open');
      await readStream(response.body);
      scheduleReconnect();
    } catch (error) {
      if (closed || (error as Error).name === 'AbortError') {
        return;
      }
      scheduleReconnect();
    }
  }

  connect();

  return () => {
    closed = true;
    if (timer) {
      clearTimeout(timer);
    }
    controller?.abort();
  };
}
