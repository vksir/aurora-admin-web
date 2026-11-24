<script lang="ts" setup>
import type {
  DontStarveArchive,
  DontStarveWorld,
  DontStarveWorldRole,
  DontStarveWorldSize,
} from '@vben/types';
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';

const worldRoleToString: Record<DontStarveWorldRole, string> = {
  primary: '主世界',
  surface: '地上世界',
  caves: '地下世界',
};

const worldRoleTag: Record<
  DontStarveWorldRole,
  'danger' | 'primary' | 'warning'
> = {
  primary: 'danger',
  surface: 'primary',
  caves: 'warning',
};

const worldSizeOptions: { label: string; value: DontStarveWorldSize }[] = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'default' },
  { label: '巨大', value: 'huge' },
];

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

const selectedName = ref<string>('');

const worlds = computed<DontStarveWorld[]>(() => archiveRef.value?.world ?? []);

const selected = computed<DontStarveWorld | undefined>(() =>
  worlds.value.find((w) => w.name === selectedName.value),
);

watch(
  worlds,
  (list) => {
    if (!list.some((w) => w.name === selectedName.value)) {
      selectedName.value = list[0]?.name ?? '';
    }
  },
  { immediate: true, deep: false },
);

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

function nextName(prefix: string) {
  const used = new Set(worlds.value.map((w) => w.name));
  for (let i = 1; i < 100; i++) {
    const name = `${prefix}${i}`;
    if (!used.has(name)) {
      return name;
    }
  }
  return `${prefix}${Date.now()}`;
}

function addWorld(role: DontStarveWorldRole) {
  if (!archiveRef.value) {
    return;
  }
  // 新世界只需要角色与大小：分片 id / 端口 / 世界生成模板都由后端补齐，
  // 地表模板从现有地表复制，洞穴模板从现有洞穴复制（没有就留空用内置模板）。
  const source = worlds.value.find((w) => roleOf(w) === role);
  const world: DontStarveWorld = {
    name: nextName(role === 'caves' ? 'Caves' : 'Surface'),
    role,
    shard_id: '',
    port: 0,
    enabled: true,
    world_size: source?.world_size ?? 'small',
    world_override: source?.world_override ?? '',
    server_config: '',
  };
  archiveRef.value.world.push(world);
  // 新世界默认接入同类型的洞穴世界（一张地表对应一个洞穴）
  if (role === 'surface') {
    const caves = worlds.value.find((w) => roleOf(w) === 'caves');
    if (caves) {
      archiveRef.value.links = [
        ...(archiveRef.value.links ?? []),
        { kind: 'caves', from: world.name, to: caves.name, order: 0 },
      ];
    }
  }
  selectedName.value = world.name;
  emit('has-changed');
}

async function removeWorld(world: DontStarveWorld) {
  if (!archiveRef.value) {
    return;
  }
  const role = roleOf(world);
  if (role === 'primary') {
    ElMessage.warning('主世界不能删除');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除世界「${world.name}」？该世界的存档数据会从配置中移除（磁盘目录不会立即删除），玩家如果正停在这个世界，下次进服可能需要重选人物。`,
      '删除世界',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  archiveRef.value.world = worlds.value.filter((w) => w.name !== world.name);
  archiveRef.value.links = (archiveRef.value.links ?? []).filter(
    (l) => l.from !== world.name && l.to !== world.name,
  );
  emit('has-changed');
}

function applyWorldSize(world: DontStarveWorld, size: DontStarveWorldSize) {
  world.world_size = size;
  const quoted = `"${size}"`;
  if (/world_size\s*=\s*("[^"]*"|'[^']*')/.test(world.world_override)) {
    world.world_override = world.world_override.replace(
      /world_size\s*=\s*("[^"]*"|'[^']*')/,
      `world_size=${quoted}`,
    );
  } else if (world.world_override) {
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
  <div
    style="
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 4px;
    "
  >
    <el-button type="primary" :icon="Plus" @click="addWorld('surface')">
      新增地上世界
    </el-button>
    <el-button :icon="Plus" @click="addWorld('caves')">
      新增地下世界
    </el-button>
    <span style="font-size: 12px; opacity: 0.65">
      一个存档恰好一个主世界；地上/地下世界可以有多张。新增后点右上角「保存」，
      分片 id 与端口由面板自动分配。
    </span>
  </div>

  <el-row :gutter="8">
    <el-col :span="8">
      <el-card shadow="never">
        <template #header>
          <span>世界列表</span>
        </template>

        <div
          v-for="world in worlds"
          :key="world.name"
          style="
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
          "
          :style="{
            background:
              world.name === selectedName
                ? 'var(--el-fill-color)'
                : 'transparent',
          }"
          @click="selectedName = world.name"
        >
          <el-tag
            :type="worldRoleTag[roleOf(world) ?? 'surface']"
            size="small"
            effect="dark"
          >
            {{ worldRoleToString[roleOf(world) ?? 'surface'] }}
          </el-tag>
          <span style="flex: 1">
            {{ world.alias || world.name }}
            <span
              v-if="world.alias"
              style="font-size: 12px; opacity: 0.55; margin-left: 4px"
            >
              {{ world.name }}
            </span>
          </span>
          <el-switch
            v-model="world.enabled"
            size="small"
            :disabled="roleOf(world) === 'primary'"
            @change="emit('has-changed')"
            @click.stop
          />
        </div>
      </el-card>
    </el-col>

    <el-col :span="16">
      <el-card v-if="selected" shadow="never">
        <template #header>
          <div style="display: flex; gap: 8px; align-items: center">
            <span>
              {{ worldRoleToString[roleOf(selected) ?? 'surface'] }} ·
              {{ selected.alias || selected.name }}
              <span
                v-if="selected.alias"
                style="font-size: 12px; opacity: 0.55; margin-left: 4px"
              >
                （{{ selected.name }}）
              </span>
            </span>
            <el-tag v-if="selected.enabled === false" type="info" size="small">
              未启用（不参与启动）
            </el-tag>
            <el-tooltip
              :content="
                roleOf(selected) === 'primary'
                  ? '主世界是集群入口，不能删除'
                  : '只从配置里移除；磁盘存档不会立即删除，玩家若停留在该世界需注意重选人物'
              "
              placement="top"
            >
              <span style="margin-left: auto">
                <el-button
                  type="danger"
                  plain
                  :icon="Delete"
                  :disabled="roleOf(selected) === 'primary'"
                  @click="removeWorld(selected)"
                >
                  删除
                </el-button>
              </span>
            </el-tooltip>
          </div>
        </template>

        <el-form label-width="110px">
          <el-row>
            <el-col :span="12">
              <el-form-item label="世界名">
                <el-tooltip
                  content="世界名是存档目录名与 -shard 参数，创建后不可修改；想换称呼请改备注名"
                  placement="top"
                >
                  <el-input :model-value="selected.name" disabled />
                </el-tooltip>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注名">
                <el-input
                  v-model="selected.alias"
                  placeholder="随便起，支持中文，仅面板展示"
                  @change="emit('has-changed')"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row>
            <el-col :span="12">
              <el-form-item label="世界大小">
                <el-select
                  :model-value="selected.world_size || 'default'"
                  style="width: 100%"
                  @update:model-value="
                    (v: DontStarveWorldSize) => applyWorldSize(selected!, v)
                  "
                >
                  <el-option
                    v-for="opt in worldSizeOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row>
            <el-col :span="12">
              <el-form-item label="分片 id">
                <el-input
                  :model-value="selected.shard_id || '保存后自动分配'"
                  disabled
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="端口">
                <el-input
                  :model-value="selected.port || '保存后自动分配'"
                  disabled
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
            title="世界名、分片 id、端口都不可改：世界名是存档目录与 -shard 参数，分片 id 会写进玩家存档与传送门绑定。想换称呼用备注名。世界大小只对还没生成的世界生效。"
          />

          <el-form-item label="世界生成">
            <el-input
              v-model="selected.world_override"
              type="textarea"
              :rows="22"
              placeholder="留空表示保存时用内置模板（地表用森林预设、洞穴用洞穴预设）"
              @change="emit('has-changed')"
            />
          </el-form-item>
        </el-form>
      </el-card>
      <el-card v-else shadow="never">
        <el-empty description="请选择或新增一个世界" />
      </el-card>
    </el-col>
  </el-row>
</template>
