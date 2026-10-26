<script lang="ts" setup>
import type { DontStarveArchive, DontStarveMod } from '@vben/types';

import { computed, onMounted, ref, toRaw } from 'vue';

import { ElMessage } from 'element-plus';

import { listMod, updateMod } from '#/api/dontstarve';

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

const loading = ref(false);
const allMods = ref<DontStarveMod[]>([]);
const keyword = ref('');

// ===== 已启用模组（存档关联的模组） =====
const enabledIds = computed(
  () => new Set((archiveRef.value?.mods ?? []).map((mod) => mod.id)),
);
const enabledCount = computed(() => enabledIds.value.size);

/**
 * 展示全部模组：模组库 + 存档关联但模组库中已不存在的模组
 * （后者保留展示，避免保存时被静默丢弃）
 * 已启用的模组排在前面，组内保持原有顺序。
 */
const rows = computed<DontStarveMod[]>(() => {
  const archivedOnly = (archiveRef.value?.mods ?? []).filter(
    (mod) => !allMods.value.some((item) => item.id === mod.id),
  );
  const list = [...allMods.value, ...archivedOnly];
  const key = keyword.value.trim().toLowerCase();
  const matched = key
    ? list.filter((mod) =>
        [mod.name, mod.workshop_id, mod.id]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(key)),
      )
    : list;

  const enabled: DontStarveMod[] = [];
  const disabled: DontStarveMod[] = [];
  for (const mod of matched) {
    (enabledIds.value.has(mod.id) ? enabled : disabled).push(mod);
  }
  return [...enabled, ...disabled];
});

function isEnabled(mod: DontStarveMod) {
  return enabledIds.value.has(mod.id);
}

/** 开关切换：为存档添加 / 删除模组 */
function toggleMod(mod: DontStarveMod, enabled: boolean) {
  if (!archiveRef.value) return;
  if (!Array.isArray(archiveRef.value.mods)) {
    archiveRef.value.mods = [];
  }
  const mods = archiveRef.value.mods;
  const index = mods.findIndex((item) => item.id === mod.id);
  if (enabled && index === -1) {
    // 存档关联的模组项独立于模组库，拷贝一份避免互相影响
    mods.push(structuredClone(toRaw(mod)));
  } else if (!enabled && index > -1) {
    mods.splice(index, 1);
  } else {
    return;
  }
  emit('has-changed');
}

// ===== 模组配置弹窗 =====
const settingsDialogVisible = ref(false);
const saveLoading = ref(false);
const currentMod = ref<DontStarveMod | null>(null);

function openModSettings(mod: DontStarveMod) {
  // mod 是 Vue 响应式 Proxy，structuredClone 直接克隆 Proxy 会抛 DataCloneError，需先 toRaw
  currentMod.value = structuredClone(toRaw(mod));
  settingsDialogVisible.value = true;
}

async function saveModSettings() {
  const mod = currentMod.value;
  if (!mod) return;

  saveLoading.value = true;
  try {
    // 模组配置存放在模组库（dont_starve_mods）中，按模组维度持久化
    await updateMod(mod.id, { raw_config: mod.raw_config });
    const inLib = allMods.value.find((item) => item.id === mod.id);
    if (inLib) inLib.raw_config = mod.raw_config;
    const inArchive = archiveRef.value?.mods?.find(
      (item) => item.id === mod.id,
    );
    if (inArchive) inArchive.raw_config = mod.raw_config;
    settingsDialogVisible.value = false;
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留对话框供修改后重试
    ElMessage.error('保存模组设置失败');
  } finally {
    saveLoading.value = false;
  }
}

function formatTime(timestamp?: number) {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

onMounted(initialize);

async function initialize() {
  loading.value = true;
  try {
    allMods.value = (await listMod({})) ?? [];
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div class="text-sm text-gray-500">
      已启用
      <span class="font-semibold text-primary">{{ enabledCount }}</span>
      / {{ rows.length }} 个模组
      <span class="ml-2 text-xs text-gray-400">
        （开关变更后点击右上角「保存」才会写入存档）
      </span>
    </div>
    <el-input
      v-model="keyword"
      clearable
      placeholder="搜索模组名称 / 创意工坊 ID"
      style="width: 260px"
    />
  </div>

  <el-table v-loading="loading" :data="rows" row-key="id" style="width: 100%">
    <el-table-column label="启用" width="90" fixed="left">
      <template #default="scope">
        <el-switch
          :model-value="isEnabled(scope.row)"
          inline-prompt
          active-text="开"
          inactive-text="关"
          :disabled="!archiveRef"
          @change="(value: any) => toggleMod(scope.row, !!value)"
        />
      </template>
    </el-table-column>
    <el-table-column label="图片" width="80">
      <template #default="scope">
        <el-image
          v-if="scope.row.image"
          :src="scope.row.image"
          style="width: 50px; height: 50px; border-radius: 4px"
          fit="cover"
        />
        <span v-else class="text-xs text-gray-400">无</span>
      </template>
    </el-table-column>
    <el-table-column prop="name" label="模组名称" min-width="180">
      <template #default="scope">
        <span>{{ scope.row.name || scope.row.id }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="workshop_id" label="创意工坊 ID" width="140">
      <template #default="scope">
        <el-link
          v-if="scope.row.workshop_id"
          :href="`https://steamcommunity.com/sharedfiles/filedetails/?id=${scope.row.workshop_id}`"
          target="_blank"
          type="primary"
          :underline="false"
        >
          {{ scope.row.workshop_id }}
        </el-link>
      </template>
    </el-table-column>
    <el-table-column
      prop="time_created"
      label="创建时间"
      min-width="170"
      sortable
    >
      <template #default="scope">
        {{ formatTime(scope.row.time_created) }}
      </template>
    </el-table-column>
    <el-table-column
      prop="time_updated"
      label="更新时间"
      min-width="170"
      sortable
    >
      <template #default="scope">
        {{ formatTime(scope.row.time_updated) }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="100" fixed="right">
      <template #default="scope">
        <el-button
          link
          type="primary"
          :disabled="!isEnabled(scope.row)"
          @click="openModSettings(scope.row)"
        >
          设置
        </el-button>
      </template>
    </el-table-column>
  </el-table>

  <el-dialog
    v-model="settingsDialogVisible"
    :title="`模组设置 - ${currentMod?.name || currentMod?.id || ''}`"
    width="60%"
  >
    <div v-if="currentMod">
      <div class="mb-2 text-xs text-gray-400">
        模组配置（modoverrides.lua
        中该模组的配置项），按模组维度保存，对该模组的所有存档生效
      </div>
      <el-input
        v-model="currentMod.raw_config"
        type="textarea"
        :rows="15"
        placeholder="如 ['workshop-1392778117']={ configuration_options={}, enabled=true }"
        class="font-mono text-sm"
      />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="settingsDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="saveLoading"
          @click="saveModSettings"
        >
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
