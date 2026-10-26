<script lang="ts" setup>
import type { ServiceLogState } from '#/api/dontstarve/log-stream';

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getStatus } from '#/api/dontstarve';
import { streamServiceLog } from '#/api/dontstarve/log-stream';

/** 页面最多保留的行数，超出丢弃最旧的 */
const MAX_LINES = 5000;
/** 判定「滚到底部」的像素阈值 */
const FOLLOW_THRESHOLD = 40;

interface LogLine {
  id: number;
  shard: string;
  text: string;
}

const lines = ref<LogLine[]>([]);
const connection = ref<ServiceLogState>('connecting');
const serviceStatus = ref('');
const logShards = ref<Record<string, boolean>>({});
const follow = ref(true);
const viewport = ref<HTMLDivElement>();

let seq = 0;
let stopStream: (() => void) | undefined;
let statusTimer: ReturnType<typeof setInterval> | undefined;

const running = computed(() => serviceStatus.value === 'Active');
const hasLogFile = computed(() => Object.values(logShards.value).some(Boolean));

const statusTagType = computed(() => {
  switch (serviceStatus.value) {
    case 'Abnormal':
    case 'Inactive': {
      return 'danger';
    }
    case 'Active': {
      return 'success';
    }
    case 'Starting':
    case 'Stopping':
    case 'WaitingActive': {
      return 'warning';
    }
    default: {
      return 'info';
    }
  }
});

const connectionLabel = computed(() => {
  switch (connection.value) {
    case 'closed': {
      return '已断开';
    }
    case 'connecting': {
      return '连接中';
    }
    case 'open': {
      return '已连接';
    }
    default: {
      return '重连中';
    }
  }
});

const connectionTagType = computed(() => {
  switch (connection.value) {
    case 'closed': {
      return 'danger';
    }
    case 'open': {
      return 'success';
    }
    default: {
      return 'warning';
    }
  }
});

const emptyText = computed(() => {
  if (connection.value !== 'open') {
    return '正在连接服务日志…';
  }
  if (!hasLogFile.value) {
    return '还没有产生服务日志：服务从未启动过，或当前平台不走 relay 模式（服务日志只在 Linux 生产环境落盘）。';
  }
  if (!running.value) {
    return '服务未运行。启动服务后，这里会实时显示服务端输出。';
  }
  return '已连接，等待服务端输出…';
});

function scrollToBottom() {
  nextTick(() => {
    const el = viewport.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function handleScroll() {
  const el = viewport.value;
  if (!el) {
    return;
  }
  follow.value =
    el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD;
}

function resumeFollow() {
  follow.value = true;
  scrollToBottom();
}

function appendLine(payload: { line: string; shard: string }) {
  lines.value.push({ id: seq++, shard: payload.shard, text: payload.line });
  if (lines.value.length > MAX_LINES) {
    lines.value.splice(0, lines.value.length - MAX_LINES);
  }
  if (follow.value) {
    scrollToBottom();
  }
}

function clearLines() {
  lines.value = [];
}

function connect() {
  stopStream?.();
  stopStream = streamServiceLog({
    onLine: appendLine,
    onMeta: (meta) => {
      logShards.value = meta.shards;
    },
    onReset: clearLines,
    onState: (state) => {
      connection.value = state;
    },
  });
}

function reconnect() {
  clearLines();
  connect();
}

async function fetchStatus() {
  try {
    const res = await getStatus();
    serviceStatus.value = res.status;
  } catch {
    serviceStatus.value = '';
  }
}

onMounted(() => {
  connect();
  fetchStatus();
  statusTimer = setInterval(fetchStatus, 5000);
});

onUnmounted(() => {
  stopStream?.();
  stopStream = undefined;
  if (statusTimer) {
    clearInterval(statusTimer);
  }
});
</script>

<template>
  <Page title="服务日志">
    <template #extra>
      <div class="flex items-center gap-2">
        <el-tag size="large" :type="statusTagType">
          服务 {{ serviceStatus || '未知' }}
        </el-tag>
        <el-tag size="large" :type="connectionTagType" effect="plain">
          {{ connectionLabel }}
        </el-tag>
        <el-button v-if="!follow" type="primary" @click="resumeFollow">
          回到底部
        </el-button>
        <el-button @click="reconnect">重新连接</el-button>
      </div>
    </template>

    <div class="p-4">
      <div
        ref="viewport"
        class="service-log"
        style="height: calc(100vh - 180px)"
        @scroll="handleScroll"
      >
        <template v-if="lines.length > 0">
          <div v-for="line in lines" :key="line.id" class="service-log__line">
            <span
              class="service-log__shard"
              :class="line.shard === 'Master' ? 'is-master' : 'is-caves'"
            >
              {{ line.shard }}
            </span>
            <span class="service-log__text">{{ line.text }}</span>
          </div>
        </template>
        <div v-else class="service-log__empty">{{ emptyText }}</div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.service-log {
  overflow-y: auto;
  padding: 8px 12px;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.7;
  color: #d4d4d4;
  background: #1e1e1e;
  border-radius: 6px;
}

.service-log__line {
  display: flex;
  gap: 10px;
}

.service-log__shard {
  flex: none;
  width: 52px;
  text-align: right;
  user-select: none;
  opacity: 0.85;
}

.service-log__shard.is-master {
  color: #4ec9b0;
}

.service-log__shard.is-caves {
  color: #dcdcaa;
}

.service-log__text {
  white-space: pre-wrap;
  word-break: break-word;
}

.service-log__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 24px;
  color: #9ca3af;
  text-align: center;
}
</style>
