<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types/src';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getArchive } from '#/api/dontstarve';

const archiveRef = ref<DontStarveArchive>();

onMounted(async () => {
  archiveRef.value = await getArchive('559756a9-b204-4912-b2b5-9b6a32664d67');
});
</script>

<template>
  <Page title="房间设置">
    <el-card>
      <el-descriptions title="房间信息" border>
        <el-descriptions-item label="房间名">
          {{ archiveRef?.cluster_name }}
        </el-descriptions-item>
        <el-descriptions-item label="房间密码">
          {{ archiveRef?.cluster_password }}
        </el-descriptions-item>
        <el-descriptions-item label="房间描述">
          {{ archiveRef?.cluster_description }}
        </el-descriptions-item>
        <el-descriptions-item label="最大玩家数">
          {{ archiveRef?.max_players }}
        </el-descriptions-item>
        <el-descriptions-item label="是否开启 PVP">
          {{ archiveRef?.pvp }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </Page>
</template>
