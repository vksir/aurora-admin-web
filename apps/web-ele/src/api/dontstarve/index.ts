import type {
  Control,
  DontStarveArchive,
  DontStarveConfig,
  Status,
} from '@vben/types';

import { requestClient } from '#/api/request';
import { useAccessStore } from '@vben/stores';
import { ElNotification } from 'element-plus';

// 保持旧导入路径兼容：外部模块从 '#/api/dontstarve' 导入类型
export type { DontStarveArchive, DontStarveMod } from '@vben/types';

// 后端 API v1 路由（baseURL 为 /api）
// 路由结构见后端 internal/api/ 与 internal/app/http.go：
//   /api/v1/login                       公开
//   /api/v1/dst/...                     JWT 保护
//   /api/v1/dst/service/{status|start|stop|...}
//   /api/v1/dst/{config|archives|mods|admins|console}/...

const DST = '/v1/dst';
const SERVICE = `${DST}/service`;

export async function getStatus() {
  return requestClient.get<Status>(`${SERVICE}/status`);
}

export interface CreateControlRequest extends Control {
}

export async function createControl(data: CreateControlRequest) {
  return requestClient.post(`${SERVICE}/${data.action}`).then((response) => {
    let msg = '';
    switch (data.action) {
      case 'restart':
        msg = '重启服务器成功';
        break;
      case 'start':
        msg = '启动服务器成功';
        break;
      case 'stop':
        msg = '停止服务器成功';
        break;
      case 'update':
        msg = '更新服务器成功';
        break;
      case 'install':
        msg = '安装服务器成功';
        break;
      case 'uninstall':
        msg = '卸载服务器成功';
        break;
    }
    ElNotification({
      title: '成功',
      message: msg,
      type: 'success',
    });
    return response;
  });
}

export interface UpdateConfigRequest extends DontStarveConfig {
}

export async function getConfig() {
  return requestClient.get<DontStarveConfig>(`${DST}/config`);
}

export async function updateConfig(data: UpdateConfigRequest) {
  return requestClient
    .put<DontStarveConfig>(`${DST}/config`, data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '更新设置成功',
        type: 'success',
      });
      return response;
    });
}

export interface ListArchiveRequest {
}

export interface CreateArchiveRequest {
}

export interface UpdateArchiveRequest extends DontStarveArchive {
}

export async function getArchive(id: string) {
  return requestClient.get<DontStarveArchive>(`${DST}/archives/${id}`);
}

export async function listArchive(_data?: ListArchiveRequest) {
  return requestClient.get<DontStarveArchive[]>(`${DST}/archives`);
}

export async function createArchive(_data?: CreateArchiveRequest) {
  return requestClient.post<DontStarveArchive>(`${DST}/archives`);
}

export async function updateArchive(id: string, data: UpdateArchiveRequest) {
  return await requestClient
    .put<DontStarveArchive>(`${DST}/archives/${id}`, data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '更新存档成功',
        type: 'success',
      });
      return response;
    });
}

export async function deleteArchive(id: string) {
  return requestClient
    .delete(`${DST}/archives/${id}`)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '删除存档成功',
        type: 'success',
      });
      return response;
    });
}

export async function enableArchive(id: string) {
  return requestClient.post(`${DST}/archives/${id}/enable`);
}

// 上传地址（el-upload 的 action）。el-upload 不走 axios 拦截器，
// 不携带 JWT —— 后端上传接口处于 JWT 保护组，需通过 headers 传入。
export function uploadArchive(id?: string): string {
  if (id) {
    return `/api/v1/dst/archives/${id}/upload`;
  }
  return '/api/v1/dst/archives/upload';
}

// 上传请求方法：更新已有存档为 PUT，新建为 POST（与后端路由一致）
export function uploadArchiveMethod(id?: string): string {
  return id ? 'put' : 'post';
}

// 下载存档（需带 JWT，不能直接 window.open）
export async function downloadArchive(id: string) {
  const accessStore = useAccessStore();
  const resp = await fetch(`/api/v1/dst/archives/${id}/download`, {
    headers: { Authorization: `Bearer ${accessStore.accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`download failed: ${resp.status}`);
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ListModRequest {
}

export interface ModUpdateStatus {
  workshop_id: string;
  name: string;
  current_time: number;
  latest_time: number;
  need_update: boolean;
}

export async function listMod(_data?: ListModRequest) {
  return requestClient.get(`${DST}/mods`);
}

export async function updateMod(id: string, data: any) {
  return requestClient
    .put(`${DST}/mods/${id}`, data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '更新模组成功',
        type: 'success',
      });
      return response;
    });
}

export async function deleteMod(ids: string[]) {
  return Promise.all(
    ids.map((id) => requestClient.delete(`${DST}/mods/${id}`)),
  ).then((response) => {
    ElNotification({
      title: '成功',
      message: '删除模组成功',
      type: 'success',
    });
    return response;
  });
}

// 检测模组更新（对比 Workshop 与本地记录，不执行更新）
export async function checkModUpdate() {
  return requestClient.post<ModUpdateStatus[]>(`${DST}/mods/check-update`);
}

// 触发模组更新流程（异步：检测->下载->安装->无人时重启）
export async function updateMods() {
  return requestClient.post(`${DST}/mods/update`).then((response) => {
    ElNotification({
      title: '成功',
      message: '已触发模组更新流程',
      type: 'success',
    });
    return response;
  });
}

export interface DontStarveAdmin {
  id: string;
  name: string;
  klei_id: string;
  created_at: string;
  updated_at: string;
}

export async function listAdmin() {
  return requestClient.get<DontStarveAdmin[]>(`${DST}/admins`);
}

export async function createAdmin(data: Partial<DontStarveAdmin>) {
  return requestClient
    .post<DontStarveAdmin>(`${DST}/admins`, data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '添加管理员成功',
        type: 'success',
      });
      return response;
    });
}

export async function deleteAdmin(id: string) {
  return requestClient
    .delete(`${DST}/admins/${id}`)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '删除管理员成功',
        type: 'success',
      });
      return response;
    });
}

export async function announce(message: string) {
  return requestClient
    .post(`${DST}/console/announce`, { message })
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '发送公告成功',
        type: 'success',
      });
      return response;
    });
}

// 后端返回各 shard 控制台原始输出（字符串数组，含 KU_ 开头的玩家 ID）
export async function listPlayer() {
  return requestClient.post<string[]>(`${DST}/console/players`);
}

export async function regenerate() {
  return requestClient
    .post(`${DST}/console/regenerate`)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '重置世界成功',
        type: 'success',
      });
      return response;
    });
}

export async function rollback(days: number) {
  return requestClient
    .post(`${DST}/console/rollback`, { days })
    .then((response) => {
      ElNotification({
        title: '成功',
        message: `回滚 ${days} 天成功`,
        type: 'success',
      });
      return response;
    });
}
