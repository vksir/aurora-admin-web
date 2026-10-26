<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getArchive, updateArchive } from '#/api/dontstarve';
import { useRoute, useRouter } from 'vue-router';
import SettingRoom from '#/views/dontstarve/archive/SettingRoom.vue';
import SettingWorld from '#/views/dontstarve/archive/SettingWorld.vue';
import SettingMod from '#/views/dontstarve/archive/SettingMod.vue';
import SettingServer from '#/views/dontstarve/archive/SettingServer.vue';

enum SettingTapType {
  Room = 'Room',
  World = 'World',
  Mod = 'Mod',
  Server = 'Server',
}

const archiveRef = ref<DontStarveArchive>();
const archiveHasChanged = ref(false);
const route = useRoute();
const router = useRouter();
const settingTabRef = ref<SettingTapType>(SettingTapType.Room);

onMounted(initialize);

async function initialize() {
  const archiveId = route.query['id'];
  if (!archiveId || typeof archiveId != 'string') {
    await router.push({
      path: route.path.split('/').slice(0, -1).join('/'),
    });
    return;
  }
  archiveRef.value = normalizeArchive(await getArchive(archiveId.toString()));
}

/**
 * 旧存档兼容：更早的 ent 版本接口把模组关联嵌在 edges.mods 里返回，
 * 且旧数据可能没有写入关联。这里把 edges.mods 归一到顶层 mods，
 * 避免模组设置页把所有模组都显示为未启用。
 * 若两边都没有数据，后端会在读取存档时按存档目录里的 modoverrides.lua 回填。
 */
function normalizeArchive(archive: DontStarveArchive): DontStarveArchive {
  if (archive.mods?.length) {
    return archive;
  }
  const legacyMods = (archive as any)?.edges?.mods;
  if (Array.isArray(legacyMods) && legacyMods.length > 0) {
    archive.mods = legacyMods.filter((mod: any) => mod?.enabled !== false);
  }
  return archive;
}

// 保存存档按钮
async function innerUpdateArchive() {
  if (archiveRef.value) {
    archiveRef.value = await updateArchive(
      archiveRef.value.id,
      archiveRef.value,
    );
    archiveHasChanged.value = false;
  }
}

// 取消保存按钮
async function resetArchive() {
  await initialize();
  archiveHasChanged.value = false;
}
</script>

<template>
  <Page title="存档设置">
    <template #description>
      <el-tabs v-model="settingTabRef" class="bg-card">
        <el-tab-pane label="详细信息" :name="SettingTapType.Room"></el-tab-pane>
        <el-tab-pane
          label="世界设置"
          :name="SettingTapType.World"
        ></el-tab-pane>
        <el-tab-pane label="模组设置" :name="SettingTapType.Mod"></el-tab-pane>
        <el-tab-pane
          label="服务设置"
          :name="SettingTapType.Server"
        ></el-tab-pane>
      </el-tabs>
    </template>

    <template #extra>
      <div class="page-extra">
        <el-button :disabled="!archiveHasChanged" @click="resetArchive">
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!archiveHasChanged"
          @click="innerUpdateArchive"
        >
          保存
        </el-button>
      </div>
    </template>

    <div v-if="archiveRef">
      <div v-if="settingTabRef == SettingTapType.Room">
        <SettingRoom
          v-model="archiveRef"
          @has-changed="archiveHasChanged = true"
        />
      </div>
      <div v-else-if="settingTabRef == SettingTapType.World">
        <SettingWorld
          v-model="archiveRef"
          @has-changed="archiveHasChanged = true"
        />
      </div>
      <div v-else-if="settingTabRef == SettingTapType.Mod">
        <SettingMod
          v-model="archiveRef"
          @has-changed="archiveHasChanged = true"
        />
      </div>
      <div v-else-if="settingTabRef == SettingTapType.Server">
        <SettingServer
          v-model="archiveRef"
          @has-changed="archiveHasChanged = true"
        />
      </div>
    </div>
    <el-skeleton v-else v-loading="true" />
  </Page>
</template>

<style scoped>
/* 使 tap 下划线更贴近 page title 下边缘 */
:deep(.el-tabs__header) {
  margin-bottom: 0;
}

/* 使 tap 下划线更贴近 page title 下边缘 */
:deep(.py-4) {
  padding-bottom: 0;
}

/* 同时保持 extra 在原来位置 */
.page-extra {
  padding-bottom: 1rem;
}

/* 使 tap 下划线背景和原背景一致 */
:deep(.el-tabs__nav-wrap::after) {
  background-color: transparent;
}
</style>
