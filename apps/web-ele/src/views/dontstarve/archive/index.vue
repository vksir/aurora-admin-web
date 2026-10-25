<script lang="ts" setup>
import type { DontStarveArchive, DontStarveConfig } from '@vben/types';
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  createArchive,
  deleteArchive,
  downloadArchive as downloadArchiveApi,
  getConfig,
  listArchive,
  updateConfig,
  uploadArchive,
  uploadArchiveMethod,
} from '#/api/dontstarve';
import { convertTime, copyToClipboard } from '#/util';
import { useRoute, useRouter } from 'vue-router';
import { Eleme, UploadFilled } from '@element-plus/icons-vue';
import {
  ElNotification,
  type UploadInstance,
  type UploadUserFile,
} from 'element-plus';

import { useAccessStore } from '@vben/stores';
import { computed } from 'vue';

const configRef = ref<DontStarveConfig>();
const archiveListRef = ref<DontStarveArchive[]>();
const accessStore = useAccessStore();
// el-upload 不走 axios 拦截器，需手动携带 JWT
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${accessStore.accessToken}`,
}));
const route = useRoute();
const router = useRouter();
const uploadDialogVisibleRef = ref(false);
const uploadDialogLoadingRef = ref(false);
const uploadIdRef = ref<string>();
const uploadRef = ref<UploadInstance>();
const uploadFileListRef = ref<UploadUserFile[]>();
onMounted(initialize);

async function initialize() {
  configRef.value = await getConfig();
  archiveListRef.value = await listArchive({});
}

async function innerCreateArchive() {
  await createArchive({});
  await initialize();
}

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

async function downloadArchive(id: string) {
  try {
    await downloadArchiveApi(id);
  } catch {
    ElNotification({
      title: '失败',
      message: '下载存档失败',
      type: 'error',
    });
  }
}

async function uploadDialogConfirm() {
  uploadDialogLoadingRef.value = true;
  uploadRef.value!.submit();
  uploadDialogVisibleRef.value = false;
}

async function uploadDialogResult(response: any, success: boolean) {
  uploadDialogLoadingRef.value = false;
  await initialize();
  if (success) {
    ElNotification({
      title: '成功',
      message: '上传存档成功',
      type: 'success',
    });
  } else {
    ElNotification({
      title: '失败',
      message: '上传存档失败: ' + response.message,
      type: 'error',
      duration: 0,
    });
  }
}

function openUploadDialog(id?: string) {
  uploadIdRef.value = id;
  uploadFileListRef.value = [];
  uploadDialogVisibleRef.value = true;
}
</script>

<template>
  <Page title="存档管理">
    <template #extra>
      <el-dialog v-model="uploadDialogVisibleRef" title="上传存档">
        <div v-loading="uploadDialogLoadingRef">
          <el-upload
            v-model:file-list="uploadFileListRef"
            drag
            :action="uploadArchive(uploadIdRef)"
            :method="uploadArchiveMethod(uploadIdRef)"
            :headers="uploadHeaders"
            :auto-upload="false"
            ref="uploadRef"
            :on-success="(response) => uploadDialogResult(response, true)"
            :on-error="(response) => uploadDialogResult(response, false)"
          >
            <el-icon class="el-icon--upload">
              <upload-filled />
            </el-icon>
            <div class="el-upload__text">
              Drop file here or <em>click to upload</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">请先压缩成 zip 文件再上传</div>
            </template>
          </el-upload>
        </div>

        <template #footer>
          <div>
            <el-button @click="uploadDialogVisibleRef = false">取消</el-button>
            <el-button
              type="primary"
              @click="uploadDialogConfirm"
              :disabled="!uploadFileListRef || uploadFileListRef!.length == 0"
            >
              上传
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-button-group>
        <el-button
          @click="openUploadDialog()"
          :loading="uploadDialogLoadingRef"
          :loading-icon="Eleme"
          type="primary"
        >
          <span v-if="uploadDialogLoadingRef"> 正在上传 </span>
          <span v-else> 上传存档 </span>
        </el-button>
        <el-button @click="innerCreateArchive">创建存档</el-button>
      </el-button-group>
    </template>

    <el-space
      v-if="configRef && archiveListRef"
      style="width: 100%"
      :fill="true"
      direction="vertical"
    >
      <el-card v-for="item in archiveListRef" shadow="hover">
        <el-descriptions :title="item.remark" :column="2" :border="true">
          <template #title>
            <div class="flex items-center space-x-2">
              <span>{{ item.remark ? item.remark : item.id }}</span>
              <el-tooltip :content="`${item.id}`" placement="top">
                <el-tag
                  type="info"
                  class="cursor-pointer"
                  @click="copyToClipboard(item.id)"
                  >UID</el-tag
                >
              </el-tooltip>
              <el-tag
                v-if="configRef.enabled_archive_id == item.id"
                type="success"
              >
                已启用
              </el-tag>
            </div>
          </template>

          <template #extra>
            <el-button-group>
              <el-popconfirm
                title="确认下载存档？"
                @confirm="downloadArchive(item.id)"
              >
                <template #reference>
                  <el-button>下载</el-button>
                </template>
              </el-popconfirm>
              <el-button @click="openUploadDialog(item.id)">更新</el-button>
              <el-button @click="settingArchive(item.id)">设置</el-button>
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
              <el-button
                type="primary"
                :disabled="configRef.enabled_archive_id == item.id"
                @click="enableArchive(item.id)"
              >
                启用
              </el-button>
            </el-button-group>
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
