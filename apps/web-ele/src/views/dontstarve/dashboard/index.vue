<script lang="ts" setup>
import type { DontStarveArchive, DontStarveConfig } from '@vben/types';
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  deleteArchive,
  getConfig,
  listArchive,
  updateConfig,
} from '#/api/dontstarve';
import { convertTime } from '#/util';
import { useRoute, useRouter } from 'vue-router';

const configRef = ref<DontStarveConfig>();
const archiveListRef = ref<DontStarveArchive[]>();
const route = useRoute();
const router = useRouter();

onMounted(initialize);

async function initialize() {
  configRef.value = await getConfig();
  archiveListRef.value = await listArchive({});
}

async function innerCreateArchive() {}

async function enableArchive(id: string) {
  if (configRef.value) {
    configRef.value.enabled_archive_id = id;
    await updateConfig(configRef.value);
  }
}

async function innerDeleteArchive(id: string) {
  await deleteArchive(id);
  await initialize();
}

async function settingArchive(id: string) {
  await router.push({
    path: route.path + '/setting',
    query: {
      id: id,
    },
  });
}
</script>

<template>
  <Page title="存档管理">
    <template #extra>
      <el-button type="primary" @click="innerCreateArchive">创建存档</el-button>
    </template>

    <el-space
      v-if="configRef && archiveListRef"
      style="width: 100%"
      :fill="true"
      direction="vertical"
    >
      <el-card v-for="item in archiveListRef">
        <el-descriptions
          :title="item.remark ? item.remark : item.id"
          :column="2"
          :border="true"
        >
          <template #title>
            {{ item.remark ? item.remark : item.id }}
            <el-tag
              size="large"
              v-if="configRef.enabled_archive_id == item.id"
              type="success"
              >已启用
            </el-tag>
          </template>

          <template #extra>
            <el-popconfirm
              title="确认删除存档？"
              @confirm="innerDeleteArchive(item.id)"
            >
              <template #reference>
                <el-button
                  type="danger"
                  :disabled="configRef.enabled_archive_id == item.id"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
            <el-button @click="settingArchive(item.id)">设置</el-button>
            <el-button
              type="primary"
              :disabled="configRef.enabled_archive_id == item.id"
              @click="enableArchive(item.id)"
            >
              启用
            </el-button>
          </template>

          <el-descriptions-item label="名称" :span="2">
            {{ item.cluster_name }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ item.cluster_description }}
          </el-descriptions-item>
          <el-descriptions-item label="最大玩家数">
            {{ item.max_players }}
          </el-descriptions-item>
          <el-descriptions-item label="PVP">
            {{ item.pvp ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item label="ID" :span="2">
            {{ item.id }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ convertTime(item.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ convertTime(item.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-space>
    <el-skeleton v-else v-loading="true" />
  </Page>
</template>
