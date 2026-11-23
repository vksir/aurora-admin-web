<script lang="ts" setup>
import type {
  DontStarveArchive,
  DontStarveLink,
  DontStarveLinkKind,
  DontStarveTopologyResult,
  DontStarveWorldRole,
} from '@vben/types';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { Delete, Plus, RefreshRight } from '@element-plus/icons-vue';
import { applyTopology, checkTopology } from '#/api/dontstarve';

const props = defineProps<{ dirty: boolean }>();
const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

const linkKindText: Record<DontStarveLinkKind, string> = {
  caves: '洞穴',
  portal: '传送门',
};

const roleText: Record<DontStarveWorldRole, string> = {
  primary: '主世界',
  surface: '地上',
  caves: '地下',
};

const topology = ref<DontStarveTopologyResult>();
const topologyError = ref('');
const applying = ref(false);

const links = computed<DontStarveLink[]>(() => archiveRef.value?.links ?? []);

const surfaces = computed(() =>
  (archiveRef.value?.world ?? []).filter(
    (w) => w.role === 'primary' || w.role === 'surface',
  ),
);
const caves = computed(() =>
  (archiveRef.value?.world ?? []).filter((w) => w.role === 'caves'),
);

/** 孤立世界：地上世界没有任何洞穴连接 */
function isOrphan(name: string) {
  return !links.value.some((l) => l.kind === 'caves' && l.from === name);
}

function roleOfLink(l: DontStarveLink) {
  const world = archiveRef.value?.world?.find((w) => w.name === l.from);
  return world?.role;
}

async function refreshTopology() {
  topologyError.value = '';
  if (props.dirty) {
    topology.value = undefined;
    topologyError.value = '有未保存的改动，先点右上角「保存」再看生效状态';
    return;
  }
  try {
    topology.value = await checkTopology();
  } catch {
    topology.value = undefined;
    topologyError.value = '服务未启动，无法读取门的现状';
  }
}

function pendingLinkNames(): string[] {
  return (topology.value?.worlds ?? [])
    .filter((w) => w.pending > 0)
    .map((w) => w.world);
}

async function innerApply() {
  if (props.dirty) {
    ElMessage.warning('请先保存配置');
    return;
  }
  const pending = pendingLinkNames();
  try {
    await ElMessageBox.confirm(
      pending.length > 0
        ? `将把 ${pending.join('、')} 的门重新绑定。在线玩家如果正站在门上，会被送回出生点。`
        : '当前没有待应用的改动，仍要重新下发一遍吗？',
      '应用世界拓扑',
      { type: 'warning', confirmButtonText: '应用', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  applying.value = true;
  try {
    const res = await applyTopology();
    topology.value = res;
    if (res.warnings?.length) {
      ElNotification({
        title: '拓扑已应用（有告警）',
        message: res.warnings.join('；'),
        type: 'warning',
        duration: 8000,
      });
    } else {
      ElNotification({
        title: '拓扑已应用',
        message: res.applied ? '所有连接已生效' : `仍有 ${res.ops} 项待处理`,
        type: res.applied ? 'success' : 'warning',
      });
    }
  } catch {
    ElNotification({
      title: '应用拓扑失败',
      message: '请查看服务日志',
      type: 'error',
    });
  } finally {
    applying.value = false;
  }
}

function addLink() {
  if (!archiveRef.value) {
    return;
  }
  const surface = surfaces.value[0];
  const cave = caves.value[0];
  const kind: DontStarveLinkKind =
    surface && cave
      ? // 优先补洞穴连接：没有洞穴连接的地上世界会变成孤立世界
        surfaces.value.some((w) => isOrphan(w.name))
        ? 'caves'
        : 'portal'
      : 'caves';
  archiveRef.value.links = [
    ...links.value,
    {
      kind,
      from: surface?.name ?? '',
      to: (kind === 'caves' ? cave?.name : surfaces.value[1]?.name) ?? '',
      order: 0,
    },
  ];
  emit('has-changed');
}

function removeLink(link: DontStarveLink) {
  if (!archiveRef.value) {
    return;
  }
  archiveRef.value.links = links.value.filter((l) => l !== link);
  emit('has-changed');
}

onMounted(refreshTopology);
</script>

<template>
  <div
    style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px"
  >
    <el-button type="primary" :icon="Plus" @click="addLink">
      新增连接
    </el-button>
    <el-button
      :icon="RefreshRight"
      :loading="applying"
      :disabled="props.dirty"
      @click="innerApply"
    >
      应用拓扑
    </el-button>
    <el-button :icon="RefreshRight" @click="refreshTopology">
      刷新状态
    </el-button>
    <span style="font-size: 12px; opacity: 0.65">
      山洞连接决定「地上洞口 ↔ 地下绳梯」，传送门连接决定「地上 ↔ 地上」；
      改动保存后点「应用拓扑」才会写进游戏存档
    </span>
  </div>

  <el-alert
    v-if="topologyError"
    type="warning"
    :closable="false"
    show-icon
    :title="topologyError"
    style="margin-bottom: 12px"
  />
  <el-alert
    v-else-if="topology"
    :type="topology.applied ? 'success' : 'warning'"
    :closable="false"
    show-icon
    :title="
      topology.applied
        ? '拓扑已生效：游戏里的门与下面的配置一致'
        : `有 ${topology.ops} 项未生效，点「应用拓扑」写入游戏`
    "
    style="margin-bottom: 12px"
  />

  <el-card shadow="never" style="margin-bottom: 12px">
    <template #header>连接列表</template>
    <el-table :data="links" size="small" empty-text="还没有连接">
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <el-tag
            :type="row.kind === 'caves' ? 'warning' : 'primary'"
            size="small"
          >
            {{ linkKindText[row.kind] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="起点" width="180">
        <template #default="{ row }">
          <el-select
            v-model="row.from"
            size="small"
            @change="emit('has-changed')"
          >
            <el-option
              v-for="w in surfaces"
              :key="w.name"
              :label="`${roleText[w.role]} · ${w.name}`"
              :value="w.name"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="终点" width="180">
        <template #default="{ row }">
          <el-select
            v-model="row.to"
            size="small"
            @change="emit('has-changed')"
          >
            <el-option
              v-for="w in row.kind === 'caves'
                ? caves
                : surfaces.filter((s) => s.name !== row.from)"
              :key="w.name"
              :label="`${roleText[w.role]} · ${w.name}`"
              :value="w.name"
              :disabled="row.kind === 'portal' && w.name === row.from"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="220">
        <template #default="{ row }">
          <span style="font-size: 12px; opacity: 0.7">
            {{
              row.kind === 'caves'
                ? '洞口下去到这个洞穴，绳梯回到这张地表'
                : '两张地表之间直接互通的传送门（双向）'
            }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="right">
        <template #default="{ row }">
          <el-button
            type="danger"
            plain
            size="small"
            :icon="Delete"
            @click="removeLink(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-alert
      v-if="surfaces.some((w) => isOrphan(w.name))"
      type="warning"
      :closable="false"
      show-icon
      style="margin-top: 12px"
      :title="`孤立世界：${surfaces
        .filter((w) => isOrphan(w.name))
        .map((w) => w.name)
        .join('、')} 没有洞穴连接，它们的地表洞口会被封闭`"
    />
  </el-card>

  <el-card v-if="topology" shadow="never">
    <template #header>游戏里的门（现状）</template>
    <el-table :data="topology.worlds" size="small">
      <el-table-column prop="world" label="世界" width="160">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ roleText[row.role] }}</el-tag>
          {{ row.world }}
        </template>
      </el-table-column>
      <el-table-column label="待应用" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.pending > 0" type="warning" size="small">
            {{ row.pending }} 项
          </el-tag>
          <el-tag v-else type="success" size="small">已同步</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="门" min-width="420">
        <template #default="{ row }">
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            <el-tag
              v-for="p in row.portals"
              :key="p.guid"
              size="small"
              :type="
                p.linked_world && p.linked_world !== '0' ? 'success' : 'info'
              "
              effect="plain"
            >
              {{ p.prefab }} #{{ p.id }} → {{ p.linked_world || '未绑定' }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
