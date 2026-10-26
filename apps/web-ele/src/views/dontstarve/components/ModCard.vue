<script lang="ts" setup>
import { copyToClipboard } from '#/util';

defineProps<{
  item: any;
  /** 是否检测到有新版本 */
  needUpdate?: boolean;
  showStatus?: boolean;
}>();

const emit = defineEmits<{
  (e: 'setting', mod: any): void;
  (e: 'delete', mod: any): void;
}>();
</script>

<template>
  <el-card>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="font-bold">{{ item.name ? item.name : item.id }}</span>
          <el-tooltip :content="`${item.id}`" placement="top">
            <el-tag
              type="info"
              class="cursor-pointer"
              @click="copyToClipboard(item.id)"
            >
              UID
            </el-tag>
          </el-tooltip>
          <el-link
            :href="`https://steamcommunity.com/sharedfiles/filedetails/?id=${item.workshop_id}`"
            target="_blank"
            :underline="false"
          >
            <el-tag type="primary" class="cursor-pointer"> Steam 社区 </el-tag>
          </el-link>
          <el-tag v-if="showStatus && item.download" type="success">
            已下载
          </el-tag>
          <el-tag v-if="needUpdate" type="warning">可更新</el-tag>
        </div>
        <el-button-group>
          <el-button @click="emit('setting', item)">设置</el-button>
          <el-popconfirm title="确认操作？" @confirm="emit('delete', item)">
            <template #reference>
              <el-button type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </el-button-group>
      </div>
    </template>

    <div class="flex">
      <el-image
        style="flex-shrink: 0; width: 100px; height: 100px"
        :src="item.image"
        fit="cover"
        class="mr-4 rounded"
      />
      <div class="flex flex-col justify-center space-y-2 text-sm text-gray-600">
        <div v-if="item.workshop_id">
          <span class="font-semibold">创意工坊 ID:</span>
          {{ item.workshop_id }}
        </div>
        <div v-if="item.author">
          <span class="font-semibold">作者:</span>
          {{ item.author }}
        </div>
        <div v-if="item.version">
          <span class="font-semibold">版本:</span>
          {{ item.version }}
        </div>
        <div v-if="item.time_created">
          <span class="font-semibold">创建时间:</span>
          {{ new Date(item.time_created * 1000).toLocaleString() }}
        </div>
        <div v-if="item.time_updated">
          <span class="font-semibold">更新时间:</span>
          {{ new Date(item.time_updated * 1000).toLocaleString() }}
        </div>
      </div>
    </div>
  </el-card>
</template>
