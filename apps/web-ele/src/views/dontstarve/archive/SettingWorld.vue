<script lang="ts" setup>
import type {
  DontStarveArchive,
  DontStarveWorld,
  DontStarveWorldRole,
  DontStarveWorldSize,
} from '@vben/types';

const worldRoleToString: Record<DontStarveWorldRole, string> = {
  primary: '主世界',
  surface: '地上世界',
  caves: '地下世界',
};

const worldSizeOptions: { label: string; value: DontStarveWorldSize }[] = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'default' },
  { label: '巨大', value: 'huge' },
];

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

function roleOf(world: DontStarveWorld): DontStarveWorldRole | undefined {
  // 旧数据只有 type（Master/Caves），读时兜底一次
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
  return `${roleText} · ${world.name || world.type || ''}`;
}

/**
 * 世界大小写进 leveldataoverride.lua 的 overrides.world_size。
 * 只在世界还没生成时生效，改已有世界需要在存档界面重新生成。
 */
function applyWorldSize(world: DontStarveWorld, size: DontStarveWorldSize) {
  const quoted = `"${size}"`;
  if (/world_size\s*=\s*("[^"]*"|'[^']*')/.test(world.world_override)) {
    world.world_override = world.world_override.replace(
      /world_size\s*=\s*("[^"]*"|'[^']*')/,
      `world_size=${quoted}`,
    );
  } else {
    const hit = world.world_override.search(/overrides\s*=\s*\{/);
    if (hit >= 0) {
      const brace = world.world_override.indexOf('{', hit);
      world.world_override = `${world.world_override.slice(0, brace + 1)}\n    world_size=${quoted},${world.world_override.slice(brace + 1)}`;
    }
  }
  emit('has-changed');
}
</script>

<template>
  <el-row>
    <el-col :span="12" v-for="world in archiveRef?.world" :key="world.name">
      <el-card style="margin: 0 4px" shadow="never">
        <template #header>
          <div style="display: flex; gap: 8px; align-items: center">
            <span>{{ title(world) }}</span>
            <el-tag
              v-if="roleOf(world) === 'primary'"
              type="warning"
              size="small"
            >
              唯一
            </el-tag>
            <el-tag v-if="world.enabled === false" type="info" size="small">
              未启用
            </el-tag>
            <span style="margin-left: auto; font-size: 12px; opacity: 0.6">
              分片 id {{ world.shard_id || '-' }} · 端口 {{ world.port || '-' }}
            </span>
          </div>
        </template>

        <el-form label-width="80px" style="margin-bottom: 8px">
          <el-form-item label="世界大小" style="margin-bottom: 0">
            <el-select
              :model-value="world.world_size || 'default'"
              style="width: 140px"
              @update:model-value="
                (v: DontStarveWorldSize) => applyWorldSize(world, v)
              "
            >
              <el-option
                v-for="opt in worldSizeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <span style="margin-left: 8px; font-size: 12px; opacity: 0.6">
              仅对未生成的世界生效
            </span>
          </el-form-item>
        </el-form>

        <el-input
          v-model="world.world_override"
          type="textarea"
          :rows="30"
          @change="emit('has-changed')"
        />
      </el-card>
    </el-col>
  </el-row>
</template>
