<script lang="ts" setup>
import type {
  DontStarveArchive,
  DontStarveLink,
  DontStarveLinkKind,
  DontStarveTopologyResult,
  DontStarveWorldRole,
} from '@vben/types';
import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { Delete, Plus, Search, Upload } from '@element-plus/icons-vue';
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
const querying = ref(false);
const checked = ref(false);

const links = computed<DontStarveLink[]>(() => archiveRef.value?.links ?? []);
const worlds = computed(() => archiveRef.value?.world ?? []);
const surfaces = computed(() =>
  worlds.value.filter((w) => w.role === 'primary' || w.role === 'surface'),
);
const caves = computed(() => worlds.value.filter((w) => w.role === 'caves'));

/** 已经占用了洞穴连接的地表（一张地表只能连一个洞穴） */
const cavesLinkOwners = computed(
  () =>
    new Set(links.value.filter((l) => l.kind === 'caves').map((l) => l.from)),
);

function isOrphan(name: string) {
  return !links.value.some((l) => l.kind === 'caves' && l.from === name);
}

function worldLabel(name: string) {
  const w = worlds.value.find((x) => x.name === name);
  return w?.alias ? `${w.alias}（${name}）` : name;
}

function linkKindOptions() {
  return (Object.keys(linkKindText) as DontStarveLinkKind[]).map((k) => ({
    label: linkKindText[k],
    value: k,
  }));
}

/** 某种连接的终点候选 */
function targetOptions(kind: DontStarveLinkKind, from: string) {
  if (kind === 'caves') {
    return caves.value.map((w) => ({
      label: `${roleText[w.role]} · ${w.alias || w.name}`,
      value: w.name,
    }));
  }
  return surfaces.value
    .filter((w) => w.name !== from)
    .map((w) => ({
      label: `${roleText[w.role]} · ${w.alias || w.name}`,
      value: w.name,
    }));
}

function firstTarget(kind: DontStarveLinkKind, from: string) {
  return targetOptions(kind, from)[0]?.value ?? '';
}

/** 起点候选：洞穴连接由地表出边，传送门两端都是地表 */
function sourceOptions(kind: DontStarveLinkKind, self?: DontStarveLink) {
  return surfaces.value.map((w) => {
    const usedByOtherCavesLink =
      kind === 'caves' &&
      cavesLinkOwners.value.has(w.name) &&
      self?.from !== w.name;
    return {
      label: `${roleText[w.role]} · ${w.alias || w.name}`,
      value: w.name,
      disabled: usedByOtherCavesLink,
    };
  });
}

// ---------------- 新增连接（弹窗，显式选类型） ----------------
const dialogVisible = ref(false);
const draft = ref<DontStarveLink>({
  kind: 'caves',
  from: '',
  to: '',
  order: 0,
});

function openAddLink() {
  const hasPortalTarget = surfaces.value.length >= 2;
  const kind: DontStarveLinkKind = hasPortalTarget ? 'portal' : 'caves';
  const primary = surfaces.value.find((w) => w.role === 'primary');
  const from = primary?.name ?? surfaces.value[0]?.name ?? '';
  draft.value = { kind, from, to: firstTarget(kind, from), order: 0 };
  dialogVisible.value = true;
}

function onDraftKindChange() {
  draft.value.to = firstTarget(draft.value.kind, draft.value.from);
}

function onDraftFromChange() {
  if (draft.value.to === draft.value.from) {
    draft.value.to = firstTarget(draft.value.kind, draft.value.from);
  }
}

function confirmAddLink() {
  const link = draft.value;
  if (!link.from || !link.to) {
    ElMessage.warning('请选择起点和终点');
    return;
  }
  if (link.kind === 'portal' && link.from === link.to) {
    ElMessage.warning('传送门的两端不能是同一个世界');
    return;
  }
  if (link.kind === 'caves' && cavesLinkOwners.value.has(link.from)) {
    ElMessage.warning(`${link.from} 已经有一条洞穴连接了`);
    return;
  }
  if (!archiveRef.value) {
    return;
  }
  archiveRef.value.links = [...links.value, { ...link, order: 0 }];
  dialogVisible.value = false;
  emit('has-changed');
}

// ---------------- 行内编辑 ----------------
function onRowKindChange(row: DontStarveLink) {
  row.to = firstTarget(row.kind, row.from);
  emit('has-changed');
}

function onRowFromChange(row: DontStarveLink) {
  if (
    row.to === row.from ||
    !targetOptions(row.kind, row.from).some((o) => o.value === row.to)
  ) {
    row.to = firstTarget(row.kind, row.from);
  }
  emit('has-changed');
}

function removeLink(link: DontStarveLink) {
  if (!archiveRef.value) return;
  archiveRef.value.links = links.value.filter((l) => l !== link);
  emit('has-changed');
}

// ---------------- 查询/应用 ----------------
async function refreshTopology() {
  topologyError.value = '';
  if (props.dirty) {
    topology.value = undefined;
    checked.value = false;
    topologyError.value = '有未保存的改动，先点右上角「保存」再查询';
    return;
  }
  querying.value = true;
  try {
    topology.value = await checkTopology();
    checked.value = true;
  } catch {
    topology.value = undefined;
    checked.value = false;
    topologyError.value =
      '查询失败：服务未启动，或正在启动/收敛中（面板同一时刻只允许一个操作）';
  } finally {
    querying.value = false;
  }
}

async function innerApply() {
  if (props.dirty) {
    ElMessage.warning('请先保存配置');
    return;
  }
  const pending = (topology.value?.worlds ?? [])
    .filter((w) => w.pending > 0)
    .map((w) => w.world);
  try {
    await ElMessageBox.confirm(
      pending.length > 0
        ? `将重新绑定 ${pending.join('、')} 的门；在线玩家如果正站在门上会被送回出生点。`
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
    checked.value = true;
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
      message: '服务可能正在启动/收敛，稍后再试',
      type: 'error',
    });
  } finally {
    applying.value = false;
  }
}
</script>

<template>
  <div
    style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px"
  >
    <el-button type="primary" :icon="Plus" @click="openAddLink">
      新增连接
    </el-button>
    <el-button :icon="Search" :loading="querying" @click="refreshTopology">
      查询状态
    </el-button>
    <el-button
      :icon="Upload"
      :loading="applying"
      :disabled="props.dirty"
      @click="innerApply"
    >
      应用拓扑
    </el-button>
    <span style="font-size: 12px; opacity: 0.65">
      「查询状态」会向每个世界读一次门的现状（不自动查询）；改动保存后点「应用拓扑」才写进游戏
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
    <template #header>
      <div style="display: flex; gap: 8px; align-items: center">
        <span>连接列表</span>
        <span style="font-size: 12px; opacity: 0.6">
          洞穴连接 = 这张地表的洞口通往那个洞穴；传送门连接 =
          两张地表之间直接互通（双向）
        </span>
      </div>
    </template>

    <el-table
      :data="links"
      size="small"
      empty-text="还没有连接，点左上「新增连接」"
    >
      <el-table-column label="类型" width="140">
        <template #default="{ row }">
          <el-select
            v-model="row.kind"
            size="small"
            @change="onRowKindChange(row)"
          >
            <el-option
              v-for="opt in linkKindOptions()"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="起点" width="200">
        <template #default="{ row }">
          <el-select
            v-model="row.from"
            size="small"
            @change="onRowFromChange(row)"
          >
            <el-option
              v-for="opt in sourceOptions(row.kind, row)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
              :disabled="opt.disabled"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="终点" width="200">
        <template #default="{ row }">
          <el-select
            v-model="row.to"
            size="small"
            @change="emit('has-changed')"
          >
            <el-option
              v-for="opt in targetOptions(row.kind, row.from)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="200">
        <template #default="{ row }">
          <span style="font-size: 12px; opacity: 0.7">
            {{
              row.kind === 'caves'
                ? '洞口下去到这个洞穴，绳梯回到这张地表'
                : '两张地表之间直接互通的传送门'
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
      v-if="surfaces.some((w) => isOrphan(w.name)) && caves.length > 0"
      type="warning"
      :closable="false"
      show-icon
      style="margin-top: 12px"
      :title="`孤立世界：${surfaces
        .filter((w) => isOrphan(w.name))
        .map((w) => w.alias || w.name)
        .join('、')} 没有洞穴连接，它们的地表洞口会被封闭`"
    />
  </el-card>

  <el-card v-if="checked && topology" shadow="never">
    <template #header>游戏里的门（上次查询结果）</template>
    <el-table :data="topology.worlds" size="small">
      <el-table-column prop="world" label="世界" width="180">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ roleText[row.role] }}</el-tag>
          {{ row.alias || row.world }}
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

  <el-dialog v-model="dialogVisible" title="新增连接" width="460px">
    <el-form label-width="80px">
      <el-form-item label="类型">
        <el-radio-group v-model="draft.kind" @change="onDraftKindChange">
          <el-radio value="caves">洞穴连接</el-radio>
          <el-radio value="portal" :disabled="surfaces.length < 2"
            >传送门连接</el-radio
          >
        </el-radio-group>
      </el-form-item>
      <el-form-item label="起点">
        <el-select
          v-model="draft.from"
          style="width: 100%"
          @change="onDraftFromChange"
        >
          <el-option
            v-for="opt in sourceOptions(draft.kind)"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
            :disabled="opt.disabled"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="终点">
        <el-select v-model="draft.to" style="width: 100%">
          <el-option
            v-for="opt in targetOptions(draft.kind, draft.from)"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="效果">
        <span style="font-size: 12px; opacity: 0.7">
          {{
            draft.kind === 'caves'
              ? `${worldLabel(draft.from)} 的洞口会通往 ${worldLabel(draft.to)}，${worldLabel(draft.to)} 的绳梯回到 ${worldLabel(draft.from)}`
              : `${worldLabel(draft.from)} 与 ${worldLabel(draft.to)} 之间出现一对互通传送门`
          }}
        </span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddLink">添加</el-button>
    </template>
  </el-dialog>
</template>
