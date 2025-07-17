<script lang="ts" setup>
import type { DontStarveArchive } from '@vben/types';

const emit = defineEmits(['has-changed']);
const archiveRef = defineModel<DontStarveArchive>();

async function settingMod() {}

async function deleteModFromArchive(index: number) {
  archiveRef.value!.mod_in_archive.slice(index, 1);
  emit('has-changed');
}
</script>

<template>
  <el-row style="width: 1600px; margin: auto">
    <el-col
      :span="12"
      v-for="(mod_in_archive, index) in archiveRef.mod_in_archive"
      v-if="archiveRef"
    >
      <el-card style="margin: 12px" shadow="hover">
        <el-descriptions border direction="vertical" :column="5">
          <template #title>
            {{ mod_in_archive.mod.name }}
            <el-tag
              size="large"
              :type="mod_in_archive.mod.download ? 'success' : 'danger'"
            >
              <span v-if="mod_in_archive.mod.download">已下载</span>
              <span v-else>未下载</span>
            </el-tag>
          </template>

          <template #extra>
            <el-button-group>
              <el-button @click="settingMod()">设置</el-button>
              <el-popconfirm
                title="确认将模组从存档里删除？"
                @confirm="deleteModFromArchive(index)"
              >
                <template #reference>
                  <el-button type="danger"> 删除 </el-button>
                </template>
              </el-popconfirm>
            </el-button-group>
          </template>

          <el-descriptions-item
            :span="1"
            :rowspan="2"
            :width="140"
            label="封面"
            align="center"
          >
            <el-image
              style="width: 120px; height: 120px"
              :src="mod_in_archive.mod.image"
            />
          </el-descriptions-item>
          <el-descriptions-item label="作者" :span="2">{{
            mod_in_archive.mod.author
          }}</el-descriptions-item>
          <el-descriptions-item label="版本" :span="1">{{
            mod_in_archive.mod.version
          }}</el-descriptions-item>
          <el-descriptions-item label="Workshop" :span="1">{{
            mod_in_archive.mod.workshop_id
          }}</el-descriptions-item>
          <el-descriptions-item label="发布时间" :span="2">{{
            mod_in_archive.mod.time_created
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{
            mod_in_archive.mod.time_updated
          }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-col>
  </el-row>
</template>
