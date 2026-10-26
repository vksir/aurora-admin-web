<script lang="ts" setup>
import type { UploadInstance, UploadUserFile } from 'element-plus';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import { UploadFilled } from '@element-plus/icons-vue';
import {
  ElMessage,
  ElNotification,
  type FormInstance,
  type FormRules,
} from 'element-plus';

import {
  createMod,
  deleteMod,
  listMod,
  updateMod,
  uploadModOverrides,
} from '#/api/dontstarve';

import ModCard from '../components/ModCard.vue';

const modListRef = ref<any[]>();

const settingsDialogVisible = ref(false);
const currentMod = ref<any>(null);

// ===== 添加模组（按创意工坊 ID） =====
const addDialogVisible = ref(false);
const addLoading = ref(false);
const addFormRef = ref<FormInstance>();
const addForm = reactive({
  workshop_id: '',
  raw_config: '',
});
const addFormRules: FormRules = {
  workshop_id: [
    { message: '请输入创意工坊 ID', required: true, trigger: 'blur' },
    {
      message: '创意工坊 ID 为纯数字',
      pattern: /^\d+$/,
      trigger: 'blur',
    },
  ],
};

// ===== 导入模组（上传 modoverrides.lua） =====
// el-upload 不走 axios 拦截器，需手动携带 JWT
const accessStore = useAccessStore();
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${accessStore.accessToken}`,
}));
const uploadDialogVisible = ref(false);
const uploadDialogLoading = ref(false);
const uploadRef = ref<UploadInstance>();
const uploadFileListRef = ref<UploadUserFile[]>();

onMounted(initialize);

async function initialize() {
  modListRef.value = await listMod({});
}

async function innerDeleteMod(id: string) {
  await deleteMod([id]);
  await initialize();
}

function openModSettings(mod: any) {
  currentMod.value = structuredClone(mod); // deep copy to avoid editing original directly
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

function openAddDialog() {
  addForm.workshop_id = '';
  addForm.raw_config = '';
  addDialogVisible.value = true;
}

async function submitAddMod() {
  const valid = await addFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  addLoading.value = true;
  try {
    await createMod({ ...addForm });
    addDialogVisible.value = false;
    await initialize();
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留对话框供修改后重试
  } finally {
    addLoading.value = false;
  }
}

function openUploadDialog() {
  uploadFileListRef.value = [];
  uploadDialogVisible.value = true;
}

async function uploadDialogConfirm() {
  uploadDialogLoading.value = true;
  uploadRef.value!.submit();
  uploadDialogVisible.value = false;
}

async function uploadDialogResult(response: any, success: boolean) {
  uploadDialogLoading.value = false;
  if (success) {
    const count = Array.isArray(response?.data) ? response.data.length : 0;
    ElNotification({
      title: '成功',
      message: `导入模组成功，共 ${count} 个`,
      type: 'success',
    });
  } else {
    ElNotification({
      title: '失败',
      message: '导入模组失败: ' + (response?.message ?? ''),
      type: 'error',
      duration: 0,
    });
  }
  await initialize();
}
</script>

<template>
  <Page title="模组管理">
    <template #extra>
      <!-- 添加模组：按创意工坊 ID -->
      <el-dialog v-model="addDialogVisible" title="添加模组" width="60%">
        <el-form
          ref="addFormRef"
          :model="addForm"
          :rules="addFormRules"
          label-width="120px"
        >
          <el-form-item label="创意工坊 ID" prop="workshop_id">
            <el-input
              v-model="addForm.workshop_id"
              placeholder="模组 Steam 详情页地址中的 id，如 1392778117"
            />
          </el-form-item>
          <el-form-item label="模组配置" prop="raw_config">
            <el-input
              v-model="addForm.raw_config"
              type="textarea"
              :rows="12"
              placeholder="可选，留空使用默认配置。支持以下格式：
1. 完整配置块 [&quot;workshop-xxx&quot;]={ configuration_options={...}, enabled=true }
2. 整个 modoverrides.lua 文件内容（自动提取对应模组的配置）
3. 仅内部配置项 configuration_options={...}（自动补全键名与 enabled=true）"
              class="font-mono text-sm"
            />
            <div class="w-full text-xs text-gray-400">
              新模组留空时使用默认配置；已存在的模组留空时保留原配置
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="addDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="addLoading" @click="submitAddMod">
              添加
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 导入模组：上传 modoverrides.lua -->
      <el-dialog v-model="uploadDialogVisible" title="导入模组">
        <div v-loading="uploadDialogLoading">
          <el-upload
            ref="uploadRef"
            v-model:file-list="uploadFileListRef"
            drag
            :action="uploadModOverrides()"
            :headers="uploadHeaders"
            :auto-upload="false"
            :limit="1"
            accept=".lua"
            :on-success="(response: any) => uploadDialogResult(response, true)"
            :on-error="(response: any) => uploadDialogResult(response, false)"
          >
            <el-icon class="el-icon--upload">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                上传 modoverrides.lua，将导入文件中所有启用的模组（enabled =
                true）；已存在的模组会更新配置与元信息
              </div>
            </template>
          </el-upload>
        </div>
        <template #footer>
          <div>
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              :disabled="!uploadFileListRef || uploadFileListRef.length === 0"
              @click="uploadDialogConfirm"
            >
              导入
            </el-button>
          </div>
        </template>
      </el-dialog>

      <el-button-group>
        <el-button type="primary" @click="openAddDialog">添加模组</el-button>
        <el-button @click="openUploadDialog">导入模组</el-button>
      </el-button-group>
    </template>

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
