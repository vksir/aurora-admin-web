<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types/src';

import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { getArchive, updateArchive } from '#/api/dontstarve';

const archiveRef = ref<DontStarveArchive>();
const archiveHasChangedRef = ref(false);
const pvpOptions = [
  {
    value: true,
    label: '是',
  },
  {
    value: false,
    label: '否',
  },
];

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
  <Page title="房间设置" v-loading="!archiveRef">
    <template #extra>
      <el-button
        type="primary"
        :disabled="!archiveHasChangedRef"
        @click="innerUpdateArchive"
      >
        保存
      </el-button>
    </template>
    <el-card v-if="archiveRef">
      <el-descriptions title="房间信息" border column="2">
        <el-descriptions-item label="房间名">
          <el-input v-model="archiveRef.cluster_name" />
        </el-descriptions-item>
        <el-descriptions-item label="房间密码">
          <el-input v-model="archiveRef.cluster_password" />
        </el-descriptions-item>
        <el-descriptions-item label="最大玩家数">
          <el-input-number v-model="archiveRef.max_players" :min="1" />
        </el-descriptions-item>
        <el-descriptions-item label="是否开启 PVP">
          <el-select v-model="archiveRef.pvp">
            <el-option
              v-for="item in pvpOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-descriptions-item>
        <el-descriptions-item label="房间描述">
          <el-input v-model="archiveRef.cluster_description" type="textarea" />
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </Page>
</template>
