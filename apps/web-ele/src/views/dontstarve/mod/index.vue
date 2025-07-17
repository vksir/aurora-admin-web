<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { deleteMod, listMod, updateMod } from '#/api/dontstarve';
import { ElMessage } from 'element-plus';
import ModCard from '../components/ModCard.vue';

const modListRef = ref<any[]>();

const settingsDialogVisible = ref(false);
const currentMod = ref<any>(null);

onMounted(initialize);

async function initialize() {
  modListRef.value = await listMod({});
}

async function innerDeleteMod(id: string) {
  await deleteMod([id]);
  await initialize();
}

function openModSettings(mod: any) {
  currentMod.value = JSON.parse(JSON.stringify(mod)); // deep copy to avoid editing original directly
  settingsDialogVisible.value = true;
}

async function saveModSettings() {
  try {
    await updateMod(currentMod.value.id, {
      raw_config: currentMod.value.raw_config,
    });
    ElMessage.success('保存模组设置成功');
    settingsDialogVisible.value = false;
    await initialize();
  } catch (error: any) {
    ElMessage.error(`保存模组设置失败: ${error.message || error}`);
  }
}
</script>

<template>
  <Page title="模组管理">
    <el-row :gutter="16" v-if="modListRef">
      <el-col :span="12" v-for="item in modListRef" :key="item.id" class="mb-4">
        <ModCard
          :item="item"
          @setting="openModSettings"
          @delete="(item) => innerDeleteMod(item.id)"
        />
      </el-col>
    </el-row>
    <el-skeleton v-else v-loading="true" />

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
  </Page>
</template>
