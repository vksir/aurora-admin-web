<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';

const worldTypeToString: Record<string, string> = {
  Master: '地上世界设置',
  Caves: '地下世界设置',
};

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();
</script>

<template>
  <el-row>
    <el-col :span="12" v-for="world in archiveRef.world" v-if="archiveRef">
      <el-card style="margin: 0 4px" shadow="never">
        <template #header> {{ worldTypeToString[world.type] }}</template>
        <el-input
          v-model="world.world_override"
          type="textarea"
          :rows="36"
          @change="emit('has-changed')"
        />
      </el-card>
    </el-col>
  </el-row>
</template>
