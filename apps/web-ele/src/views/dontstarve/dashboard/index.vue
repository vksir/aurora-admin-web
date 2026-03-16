<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { ElMessage } from 'element-plus';
import {
  createControl,
  getStatus,
  listArchive,
  getConfig,
  listAdmin,
  createAdmin,
  deleteAdmin,
  updateConfig,
  announce,
  regenerate,
  rollback,
  listPlayer,
} from '#/api/dontstarve';
import type { DontStarveArchive, DontStarveConfig } from '@vben/types';
import { computed } from 'vue';
import type { DontStarveAdmin } from '#/api/dontstarve';
import { convertTime, copyToClipboard } from '#/util';
import { ArrowDown } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const status = ref<any>({});
const loading = ref(false);
const archives = ref<DontStarveArchive[]>([]);
const config = ref<DontStarveConfig>();

const admins = ref<DontStarveAdmin[]>([]);
const adminDialogVisible = ref(false);
const adminForm = reactive({
  klei_id: '',
  name: '',
});

const passwordDialogVisible = ref(false);
const advancedDialogVisible = ref(false);

const announceDialogVisible = ref(false);
const announceMsg = ref('');

const rollbackDialogVisible = ref(false);
const rollbackDays = ref(1);

const players = ref<any[]>([]);
const playerDialogVisible = ref(false);

const settingsForm = reactive({
  archive: '',
  token: '',
  tick_rate: 0,
  password: '',
});

const currentArchive = computed(() => {
  return archives.value.find((a) => a.id === settingsForm.archive);
});

async function fetchStatus() {
  try {
    status.value = await getStatus();
  } catch {
    ElMessage.error('获取状态失败');
  }
}

let statusTimer: any = null;

async function fetchArchives() {
  try {
    archives.value = await listArchive({});
  } catch {
    ElMessage.error('获取存档列表失败');
  }
}

async function fetchConfig() {
  try {
    const res = await getConfig();
    config.value = res;
    settingsForm.archive = res.enabled_archive_id || '';
    settingsForm.token = res.token || '';
    settingsForm.tick_rate = res.tick_rate || 0;
    settingsForm.password = res.password || '';
  } catch {
    ElMessage.error('获取配置失败');
  }
}

import { onUnmounted } from 'vue';

onMounted(() => {
  fetchStatus();
  fetchArchives();
  fetchConfig();
  fetchAdmins();
  statusTimer = setInterval(() => {
    fetchStatus();
  }, 5000);
});

onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer);
  }
});

async function handleAction(action: string) {
  try {
    loading.value = true;
    await createControl({ action });
    ElMessage.success(`操作 ${action} 成功`);
    await fetchStatus();
  } catch {
    ElMessage.error(`操作 ${action} 失败`);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  if (config.value) {
    config.value.enabled_archive_id = settingsForm.archive;
    config.value.token = settingsForm.token;
    config.value.tick_rate = settingsForm.tick_rate;
    config.value.password = settingsForm.password;
    await updateConfig(config.value);
  } else {
    ElMessage.error('无法保存，配置信息为空');
  }
}

async function viewPlayers() {
  try {
    players.value = await listPlayer();
    playerDialogVisible.value = true;
  } catch {
    ElMessage.error('获取玩家列表失败');
  }
}

async function handleAnnounce() {
  if (!announceMsg.value) {
    ElMessage.warning('请输入公告内容');
    return;
  }
  await announce(announceMsg.value);
  announceMsg.value = '';
  announceDialogVisible.value = false;
}

async function handleRegenerate() {
  await regenerate();
}

async function handleRollback() {
  await rollback(rollbackDays.value);
  rollbackDialogVisible.value = false;
}

async function fetchAdmins() {
  try {
    admins.value = await listAdmin();
  } catch {
    ElMessage.error('获取管理员列表失败');
  }
}

async function viewAdmins() {
  await fetchAdmins();
  adminDialogVisible.value = true;
}

async function handleAddAdmin() {
  if (!adminForm.klei_id) {
    ElMessage.warning('请输入Klei ID');
    return;
  }
  try {
    await createAdmin({ klei_id: adminForm.klei_id, name: adminForm.name });
    adminForm.klei_id = '';
    adminForm.name = '';
    await fetchAdmins();
  } catch {
    ElMessage.error('添加管理员失败');
  }
}

async function handleDeleteAdmin(id: string) {
  try {
    await deleteAdmin(id);
    await fetchAdmins();
  } catch {
    ElMessage.error('删除管理员失败');
  }
}

function navigateToArchive() {
  router.push('/dontstarve/archive');
}
</script>

<template>
  <Page title="饥荒控制台">
    <template #extra>
      <el-button-group>
        <el-button
          type="primary"
          @click="handleAction('start')"
          :loading="loading"
          >启动服务器</el-button
        >
        <el-button
          type="danger"
          @click="handleAction('stop')"
          :loading="loading"
          >停止服务器</el-button
        >
        <el-button @click="handleAction('restart')" :loading="loading"
          >重启服务器</el-button
        >
        <el-button @click="handleAction('update')" :loading="loading"
          >更新服务器</el-button
        >
        <el-dropdown>
          <el-button :loading="loading">
            更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleAction('install')"
                >安装服务器</el-dropdown-item
              >
              <el-dropdown-item @click="handleAction('uninstall')"
                >卸载服务器</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-button-group>
    </template>

    <div class="space-y-4 p-4">
      <el-card header="服务状态">
        <div class="flex items-center space-x-2">
          <span class="font-bold">当前状态:</span>
          <el-tag
            :type="
              status.status === 'Active'
                ? 'success'
                : status.status === 'Inactive' || status.status === 'Abnormal'
                  ? 'danger'
                  : status.status === 'Starting' ||
                      status.status === 'Stopping' ||
                      status.status === 'WaitingActive'
                    ? 'warning'
                    : 'info'
            "
          >
            {{ status.status || '未知' }}
          </el-tag>
        </div>
      </el-card>

      <el-card header="存档信息">
        <template #header>
          <div class="flex items-center justify-between">
            <span>存档信息</span>
            <el-button type="primary" @click="navigateToArchive"
              >切换存档</el-button
            >
          </div>
        </template>

        <div v-if="currentArchive" class="space-x-2">
          <el-descriptions :column="2" :border="true">
            <template #title>
              <div class="flex items-center space-x-2">
                <span>{{
                  currentArchive.remark
                    ? currentArchive.remark
                    : currentArchive.id
                }}</span>
                <el-tooltip :content="`${currentArchive.id}`" placement="top">
                  <el-tag
                    type="info"
                    class="cursor-pointer"
                    @click="copyToClipboard(currentArchive.id)"
                    >UID</el-tag
                  >
                </el-tooltip>
                <el-tag size="large" type="success">已启用</el-tag>
              </div>
            </template>
            <el-descriptions-item label="名称" :span="2">
              {{ currentArchive.cluster_name }}
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ currentArchive.cluster_description }}
            </el-descriptions-item>
            <el-descriptions-item label="最大玩家数">
              {{ currentArchive.max_players }}
            </el-descriptions-item>
            <el-descriptions-item label="PVP">
              {{ currentArchive.pvp ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ convertTime(currentArchive.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ convertTime(currentArchive.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div
          v-else
          class="rounded-md border border-dashed border-gray-300 p-8 text-center"
        >
          <el-button type="primary" @click="navigateToArchive"
            >选择存档</el-button
          >
        </div>
      </el-card>

      <el-card header="额外控制">
        <div class="space-x-2">
          <el-button @click="viewPlayers">查看当前玩家</el-button>
          <el-button type="primary" plain @click="announceDialogVisible = true"
            >发送公告</el-button
          >
          <el-popconfirm title="确定要重置世界吗？" @confirm="handleRegenerate">
            <template #reference>
              <el-button type="danger" plain>重置世界</el-button>
            </template>
          </el-popconfirm>
          <el-button type="warning" plain @click="rollbackDialogVisible = true"
            >回滚世界</el-button
          >
        </div>
      </el-card>

      <el-card header="服务设置">
        <div class="space-x-2">
          <el-button @click="passwordDialogVisible = true">密码设置</el-button>
          <el-button @click="viewAdmins">管理员设置</el-button>
          <el-button @click="advancedDialogVisible = true">高级设置</el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="adminDialogVisible" title="管理员设置" width="600px">
      <div class="mb-4">
        <el-form :inline="true" :model="adminForm">
          <el-form-item label="Klei ID" required>
            <el-input v-model="adminForm.klei_id" placeholder="KU_xxxxxxx" />
          </el-form-item>
          <el-form-item label="备注名称">
            <el-input v-model="adminForm.name" placeholder="名称(可选)" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleAddAdmin">添加</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-table :data="admins" border style="width: 100%">
        <el-table-column prop="klei_id" label="Klei ID" />
        <el-table-column prop="name" label="名称" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-popconfirm
              title="确定要删除该管理员吗？"
              @confirm="handleDeleteAdmin(row.id)"
            >
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="passwordDialogVisible" title="密码设置" width="500px">
      <el-form :model="settingsForm" label-width="120px">
        <el-form-item label="密码">
          <el-input
            v-model="settingsForm.password"
            type="password"
            show-password
            placeholder="密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="advancedDialogVisible" title="高级设置" width="500px">
      <el-form :model="settingsForm" label-width="120px">
        <el-form-item label="Token">
          <el-input
            v-model="settingsForm.token"
            type="password"
            show-password
            placeholder="输入 Token"
          />
        </el-form-item>
        <el-form-item label="Tick Rate">
          <el-input-number
            v-model="settingsForm.tick_rate"
            :min="15"
            :max="60"
            :step="5"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="advancedDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="announceDialogVisible" title="发送公告" width="400px">
      <el-input
        v-model="announceMsg"
        type="textarea"
        :rows="3"
        placeholder="输入公告内容..."
      />
      <template #footer>
        <el-button @click="announceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAnnounce">发送</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rollbackDialogVisible" title="回滚世界" width="400px">
      <el-form>
        <el-form-item label="回滚天数">
          <el-input-number v-model="rollbackDays" :min="1" :max="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handleRollback">回滚</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="playerDialogVisible" title="当前在线玩家" width="600px">
      <el-table :data="players" border style="width: 100%">
        <el-table-column label="名称">
          <template #default="{ row }">
            {{ row }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </Page>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
