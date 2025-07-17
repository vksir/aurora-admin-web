import type { Control, DontStarveArchive, DontStarveConfig, Status, } from '@vben/types';

import { requestClient } from '#/api/request';
import { ElNotification } from "element-plus";


export async function getStatus() {
  return requestClient.get<Status>('/dontstarve/status');
}

export interface CreateControlRequest extends Control {
}

export async function createControl(data: CreateControlRequest) {
  return requestClient.post('/dontstarve/control', data).then((response) => {
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
        msg = '安装服务器成功';
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
  return requestClient.get<DontStarveConfig>('/dontstarve/config');
}

export async function updateConfig(data: UpdateConfigRequest) {
  return requestClient.put<DontStarveConfig>('/dontstarve/config', data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '更新设置成功',
        type: 'success',
      })
      return response;
    })
}

export interface ListArchiveRequest {
}

export interface CreateArchiveRequest {
}

export interface UpdateArchiveRequest extends DontStarveArchive {
}

export async function getArchive(id: string) {
  return requestClient.get<DontStarveArchive>(`/dontstarve/archive/${id}`);
}

export async function listArchive(data: ListArchiveRequest) {
  return requestClient.get<DontStarveArchive[]>('/dontstarve/archive', {
    params: data,
  });
}

export async function createArchive(data: CreateArchiveRequest) {
  return requestClient.post<DontStarveArchive>('/dontstarve/archive', data);
}

export async function updateArchive(id: string, data: UpdateArchiveRequest) {
  return await requestClient.put<DontStarveArchive>(`/dontstarve/archive/${id}`, data)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '更新存档成功',
        type: 'success',
      })
      return response;
    })
}

export async function deleteArchive(id: string) {
  return requestClient.delete(`/dontstarve/archive/${id}`)
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '删除存档成功',
        type: 'success',
      })
      return response;
    });
}

export function uploadArchive() {
  return '/api/dontstarve/archive/upload';
}

export interface ListModRequest {
}

export async function listMod(data: ListModRequest) {
  return requestClient.get<any[]>('/dontstarve/mod', {
    params: data,
  });
}

export async function updateMod(id: string, data: any) {
  return requestClient.put<any>(`/dontstarve/mod/${id}`, data)
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
  return requestClient.delete('/dontstarve/mod', {
    data: ids
  }).then((response) => {
    ElNotification({
      title: '成功',
      message: '删除模组成功',
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
  return requestClient.get<DontStarveAdmin[]>('/dontstarve/admin');
}

export async function createAdmin(data: Partial<DontStarveAdmin>) {
  return requestClient.post<DontStarveAdmin>('/dontstarve/admin', data)
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
  return requestClient.delete(`/dontstarve/admin/${id}`)
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
  return requestClient.post('/dontstarve/announce', { message })
    .then((response) => {
      ElNotification({
        title: '成功',
        message: '发送公告成功',
        type: 'success',
      });
      return response;
    });
}

export async function listPlayer() {
  return requestClient.get<any[]>('/dontstarve/player');
}

export async function regenerate() {
  return requestClient.post('/dontstarve/regenerate')
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
  return requestClient.post('/dontstarve/rollback', { days })
    .then((response) => {
      ElNotification({
        title: '成功',
        message: `回滚 ${days} 天成功`,
        type: 'success',
      });
      return response;
    });
}
