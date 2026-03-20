<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { listMod } from '#/api/dontstarve';
import type { DontStarveMod } from '#/api/dontstarve';

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

const settingsDialogVisible = ref(false);
const currentMod = ref<DontStarveMod | null>(null);
const allMods = ref<DontStarveMod[]>([]);
const loading = ref(false);

onMounted(() => {
  loadAllMods();
});

function openModSettings(mod: DontStarveMod) {
  currentMod.value = JSON.parse(JSON.stringify(mod));
  settingsDialogVisible.value = true;
}

function saveModSettings() {
  const index = archiveRef.value?.edges?.mods?.findIndex(
    (m) => m.workshop_id === currentMod.value.workshop_id,
  );
  if (
    index !== undefined &&
    index > -1 &&
    archiveRef.value &&
    archiveRef.value.edges?.mods
  ) {
    archiveRef.value.edges.mods[index].raw_config = currentMod.value.raw_config;
    ElMessage.success('保存模组设置成功');
    emit('has-changed');
  } else {
    // If not in archive yet, just update the local mod config so it gets added properly when checked
    const modInAll = allMods.value.find(
      (m) => m.workshop_id === currentMod.value.workshop_id,
    );
    if (modInAll) {
      modInAll.raw_config = currentMod.value.raw_config;
      ElMessage.success('暂存模组设置成功');
    }
  }
  settingsDialogVisible.value = false;
}

import { nextTick } from 'vue';

const modTable = ref<any>(null);

function handleSelectionChange(selection: DontStarveMod[]) {
  if (archiveRef.value) {
    if (!archiveRef.value.edges) {
      archiveRef.value.edges = {};
    }
    // Only update if selection is initiated by user, not initial load
    // But since it's hard to distinguish, we'll just update it
    archiveRef.value.edges.mods = JSON.parse(JSON.stringify(selection));
    emit('has-changed');
  }
}

const getRowKey = (row: DontStarveMod) => {
  return row.workshop_id;
};

async function loadAllMods() {
  loading.value = true;
  try {
    const res = await listMod({});
    allMods.value = res || [];

    // Set initial selection
    await nextTick();
    if (archiveRef.value?.edges?.mods && modTable.value) {
      const rowsToSelect: DontStarveMod[] = [];
      archiveRef.value.edges.mods.forEach((mod: any) => {
        // Use Number conversion to match strictly in case of string vs number
        const row = allMods.value.find(
          (m) => String(m.workshop_id) === String(mod.workshop_id),
        );
        if (row) {
          // Restore raw_config from archive to allMods so settings reflect current state
          row.raw_config = mod.raw_config;
          rowsToSelect.push(row);
        }
      });

      rowsToSelect.forEach((row) => {
        modTable.value.toggleRowSelection(row, true);
      });
    }
  } catch (error) {
    ElMessage.error('加载模组列表失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="allMods"
    style="width: 100%"
    :row-key="getRowKey"
    @selection-change="handleSelectionChange"
    ref="modTable"
  >
    <el-table-column type="selection" width="55" :reserve-selection="true" />
    <el-table-column label="图片" width="80">
      <template #default="scope">
        <el-image
          :src="scope.row.image"
          style="width: 50px; height: 50px; border-radius: 4px"
          fit="cover"
        />
      </template>
    </el-table-column>
    <el-table-column prop="name" label="模组名称" min-width="150" />
    <el-table-column prop="time_created" label="创建时间" min-width="150">
      <template #default="scope">
        {{
          new Date(scope.row.time_created * 1000)
            .toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            .replace(/\//g, '/')
        }}
      </template>
    </el-table-column>
    <el-table-column prop="time_updated" label="更新时间" min-width="150">
      <template #default="scope">
        {{
          new Date(scope.row.time_updated * 1000)
            .toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            .replace(/\//g, '/')
        }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="120" fixed="right">
      <template #default="scope">
        <el-button link type="primary" @click="openModSettings(scope.row)">
          设置
        </el-button>
      </template>
    </el-table-column>
  </el-table>

  <el-dialog v-model="settingsDialogVisible" title="模组设置" width="60%">
    <div v-if="currentMod">
      <el-input
        v-model="currentMod.raw_config"
        type="textarea"
        :rows="15"
        placeholder="Input raw config for the mod..."
        class="font-mono text-sm"
      />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="settingsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveModSettings">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>
