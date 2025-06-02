<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types/src';

import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { getArchive, updateArchive } from '#/api/dontstarve';

const archiveRef = ref<DontStarveArchive>();
const archiveHasChangedRef = ref(false);
const worldTypeToString = {
  Master: '地上世界服务设置',
  Caves: '地下世界服务设置',
};

onMounted(async () => {
  archiveRef.value = await getArchive('3b58fc09-fbe5-410d-96b5-a6de211ad99e');
  createWatch();
});

function createWatch() {
  watch(
    archiveRef,
    async () => {
      archiveHasChangedRef.value = true;
    },
    { deep: true, once: true },
  );
}

async function innerUpdateArchive() {
  archiveRef.value = await updateArchive(archiveRef.value.id, archiveRef.value);
  archiveHasChangedRef.value = false;
  createWatch();
  ElMessage({ message: '更新存档成功', type: 'success' });
}
</script>

<template>
  <Page title="服务设置" v-loading="!archiveRef">
    <template #extra>
      <el-button
        type="primary"
        :disabled="!archiveHasChangedRef"
        @click="innerUpdateArchive"
      >
        保存
      </el-button>
    </template>
    <el-row>
      <el-col :span="12" v-for="world in archiveRef.worlds" v-if="archiveRef">
        <el-card style="margin: 5px">
          <template #header> {{ worldTypeToString[world.type] }}</template>
          <el-input v-model="world.server_config" type="textarea" rows="19" />
        </el-card>
      </el-col>
    </el-row>
  </Page>
</template>
