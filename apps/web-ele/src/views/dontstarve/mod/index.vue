<script lang="ts" setup>
import type { UploadInstance, UploadUserFile } from 'element-plus';

import type { DontStarveMod } from '@vben/types';

import type { ModUpdateStatus } from '#/api/dontstarve';

import { computed, onMounted, reactive, ref, toRaw } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import { UploadFilled } from '@element-plus/icons-vue';
import {
  ElMessage,
  ElMessageBox,
  ElNotification,
  type FormInstance,
  type FormRules,
} from 'element-plus';

import {
  checkModUpdate,
  createMod,
  deleteMod,
  listMod,
  updateMod,
  updateMods,
  uploadModOverrides,
} from '#/api/dontstarve';

import ModCard from '../components/ModCard.vue';

// ===== 模组列表 =====
const modListRef = ref<DontStarveMod[]>([]);
const loading = ref(false);
const keyword = ref('');

// ===== 模组更新检测结果（workshop_id -> 是否需要更新） =====
const updateMap = ref<Record<string, boolean>>({});
const updateStatuses = ref<ModUpdateStatus[]>([]);
const checking = ref(false);
const updating = ref(false);
const updateResultVisible = ref(false);

const outdatedMods = computed(() =>
  updateStatuses.value.filter((item) => item.need_update),
);

const filteredMods = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  if (!key) return modListRef.value;
  return modListRef.value.filter((item) =>
    [item.name, item.workshop_id, item.id]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(key)),
  );
});

// ===== 模组设置（配置弹窗） =====
const settingsDialogVisible = ref(false);
const saveLoading = ref(false);
const currentMod = ref<DontStarveMod | null>(null);

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
  loading.value = true;
  try {
    modListRef.value = (await listMod({})) ?? [];
    // 列表刷新后更新标记保持有效（已删除的模组自动丢弃）
    const existed = new Set(modListRef.value.map((item) => item.workshop_id));
    updateMap.value = Object.fromEntries(
      Object.entries(updateMap.value).filter(([workshopId]) =>
        existed.has(workshopId),
      ),
    );
  } finally {
    loading.value = false;
  }
}

async function innerDeleteMod(id: string) {
  await deleteMod([id]);
  await initialize();
}

function openModSettings(mod: DontStarveMod) {
  // 注意：mod 是 Vue 响应式 Proxy，structuredClone 直接克隆 Proxy 会抛 DataCloneError，需先 toRaw
  currentMod.value = structuredClone(toRaw(mod));
  settingsDialogVisible.value = true;
}

async function saveModSettings() {
  if (!currentMod.value) return;

  saveLoading.value = true;
  try {
    await updateMod(currentMod.value.id, {
      raw_config: currentMod.value.raw_config,
    });
    settingsDialogVisible.value = false;
    await initialize();
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留对话框供修改后重试
    ElMessage.error('保存模组设置失败');
  } finally {
    saveLoading.value = false;
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

// ===== 检查更新 =====
async function innerCheckUpdate() {
  checking.value = true;
  try {
    const res = (await checkModUpdate()) ?? [];
    updateStatuses.value = res;
    updateMap.value = Object.fromEntries(
      res.map((item) => [String(item.workshop_id), item.need_update]),
    );
    if (outdatedMods.value.length === 0) {
      ElMessage.success('所有模组均为最新版本');
      return;
    }
    updateResultVisible.value = true;
  } catch {
    // 错误提示由 request 拦截器统一弹出
  } finally {
    checking.value = false;
  }
}

// ===== 触发更新 =====
async function innerUpdateMods() {
  try {
    await ElMessageBox.confirm(
      '将检测并下载所有已启用模组的最新版本，必要时重启服务器，确认继续？',
      '更新模组',
      { type: 'warning' },
    );
  } catch {
    return;
  }

  updating.value = true;
  try {
    await updateMods();
    updateMap.value = {};
    updateStatuses.value = [];
  } catch {
    // 错误提示由 request 拦截器统一弹出
  } finally {
    updating.value = false;
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
1. 完整配置块 ['workshop-xxx']={ configuration_options={...}, enabled=true }
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
            <el-button
              type="primary"
              :loading="addLoading"
              @click="submitAddMod"
            >
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

      <!-- 更新检测结果 -->
      <el-dialog v-model="updateResultVisible" title="模组更新" width="60%">
        <el-alert
          :closable="false"
          type="warning"
          :title="`检测到 ${outdatedMods.length} 个模组有新版本`"
          class="mb-4"
        />
        <el-table :data="outdatedMods" style="width: 100%">
          <el-table-column prop="name" label="模组名称" min-width="160" />
          <el-table-column prop="workshop_id" label="创意工坊 ID" width="140" />
          <el-table-column label="当前版本时间" min-width="170">
            <template #default="scope">
              {{ formatTime(scope.row.current_time) }}
            </template>
          </el-table-column>
          <el-table-column label="最新版本时间" min-width="170">
            <template #default="scope">
              {{ formatTime(scope.row.latest_time) }}
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="updateResultVisible = false">关闭</el-button>
            <el-button
              type="primary"
              :loading="updating"
              @click="innerUpdateMods"
            >
              立即更新
            </el-button>
          </span>
        </template>
      </el-dialog>

      <div class="flex items-center space-x-2">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索模组名称 / 创意工坊 ID"
          style="width: 240px"
        />
        <el-button-group>
          <el-button type="primary" @click="openAddDialog">添加模组</el-button>
          <el-button @click="openUploadDialog">导入模组</el-button>
          <el-button :loading="checking" @click="innerCheckUpdate">
            检查更新
          </el-button>
          <el-button :loading="updating" @click="innerUpdateMods">
            更新模组
          </el-button>
        </el-button-group>
      </div>
    </template>

    <el-row v-loading="loading" :gutter="16">
      <el-col
        v-for="item in filteredMods"
        :key="item.id"
        :xs="24"
        :sm="24"
        :md="12"
        :lg="12"
        class="mb-4"
      >
        <ModCard
          :item="item"
          :need-update="!!updateMap[item.workshop_id]"
          @setting="openModSettings"
          @delete="(mod) => innerDeleteMod(mod.id)"
        />
      </el-col>
    </el-row>
    <el-empty
      v-if="!loading && filteredMods.length === 0"
      :description="keyword ? '没有匹配的模组' : '暂无模组，先添加或导入一个吧'"
    />

    <el-dialog
      v-model="settingsDialogVisible"
      :title="`模组设置 - ${currentMod?.name || currentMod?.id || ''}`"
      width="60%"
    >
      <div v-if="currentMod">
        <div class="mb-2 text-xs text-gray-400">
          模组配置（modoverrides.lua
          中该模组的配置项），保存后对所有启用该模组的存档生效
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
  </Page>
</template>
