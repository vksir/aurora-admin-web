<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';

const pvpOptions = [
  {
    value: true,
    label: '是',
  },
  {
    value: false,
    label: '否',
  },
];

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();
</script>

<template>
  <div v-if="archiveRef">
    <el-space direction="vertical" :fill="true" style="width: 100%">
      <el-card shadow="never">
        <el-descriptions title="存档信息" border :column="2">
          <el-descriptions-item label="ID" :span="2">
            {{ archiveRef.id }}
          </el-descriptions-item>
          <el-descriptions-item label="存档名称">
            <el-input
              v-model="archiveRef.remark"
              @change="emit('has-changed')"
              :minlength="1"
            />
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never">
        <el-descriptions title="房间信息" border :column="2">
          <el-descriptions-item label="房间名">
            <el-input
              v-model="archiveRef.cluster_name"
              @change="emit('has-changed')"
            />
          </el-descriptions-item>
          <el-descriptions-item label="房间密码">
            <el-input
              v-model="archiveRef.cluster_password"
              @change="emit('has-changed')"
            />
          </el-descriptions-item>
          <el-descriptions-item label="最大玩家数">
            <el-input-number
              v-model="archiveRef.max_players"
              :min="1"
              @change="emit('has-changed')"
            />
          </el-descriptions-item>
          <el-descriptions-item label="是否开启 PVP">
            <el-select v-model="archiveRef.pvp" @change="emit('has-changed')">
              <el-option
                v-for="item in pvpOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-descriptions-item>
          <el-descriptions-item label="房间描述">
            <el-input
              v-model="archiveRef.cluster_description"
              type="textarea"
              @change="emit('has-changed')"
            />
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-space>
  </div>
</template>
