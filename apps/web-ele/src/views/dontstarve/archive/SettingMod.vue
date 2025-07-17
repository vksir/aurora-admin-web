<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';
import ModCard from '../components/ModCard.vue';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

const settingsDialogVisible = ref(false);
const currentMod = ref<any>(null);

function openModSettings(mod: any) {
  currentMod.value = JSON.parse(JSON.stringify(mod));
  settingsDialogVisible.value = true;
}

function saveModSettings() {
  const index = archiveRef.value?.edges?.mods?.findIndex(
    (m) => m.id === currentMod.value.id,
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
  }
  settingsDialogVisible.value = false;
}

async function deleteModFromArchive(index: number) {
  if (archiveRef.value && archiveRef.value.edges?.mods) {
    archiveRef.value.edges.mods.splice(index, 1);
    emit('has-changed');
  }
}
</script>

<template>
  <el-row :gutter="16" v-if="archiveRef?.edges?.mods">
    <el-col
      :span="12"
      v-for="(mod, index) in archiveRef.edges.mods"
      :key="mod.id"
      class="mb-4"
    >
      <ModCard
        :item="mod"
        :show-status="true"
        @setting="() => openModSettings(mod)"
        @delete="() => deleteModFromArchive(index)"
      />
    </el-col>
  </el-row>

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
