<script lang="ts" setup>
import type {
  DontStarveArchive,
  DontStarveWorld,
  DontStarveWorldRole,
} from '@vben/types';

const worldRoleToString: Record<DontStarveWorldRole, string> = {
  primary: '主世界',
  surface: '地上世界',
  caves: '地下世界',
};

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

function roleOf(world: DontStarveWorld): DontStarveWorldRole | undefined {
  if (world.role) {
    return world.role;
  }
  if (world.type === 'Caves') {
    return 'caves';
  }
  if (world.type === 'Master') {
    return 'primary';
  }
  return undefined;
}

function title(world: DontStarveWorld) {
  const role = roleOf(world);
  const roleText = role ? worldRoleToString[role] : '未知世界';
  return `${roleText} · ${world.name || world.type || ''} 服务设置`;
}
</script>

<template>
  <el-row>
    <el-col :span="12" v-for="world in archiveRef?.world" :key="world.name">
      <el-card style="margin: 0 4px" shadow="never">
        <template #header>
          <div style="display: flex; gap: 8px; align-items: center">
            <span>{{ title(world) }}</span>
            <span style="margin-left: auto; font-size: 12px; opacity: 0.6">
              端口 {{ world.port || '自动' }}
            </span>
          </div>
        </template>
        <el-input
          v-model="world.server_config"
          type="textarea"
          :rows="30"
          placeholder="留空表示由面板按角色自动生成（端口、分片 id、是否主世界都会自动写入）"
          @change="emit('has-changed')"
        />
      </el-card>
    </el-col>
  </el-row>
</template>
