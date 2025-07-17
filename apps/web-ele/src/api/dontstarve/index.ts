import type {Control, DontStarveArchive, DontStarveConfig, Status,} from '@vben/types';

import {requestClient} from '#/api/request';
import {ElNotification} from "element-plus";


export async function getStatus() {
  return requestClient.get<Status>('/dontstarve/status');
}

export interface CreateControlRequest extends Control {
}

export async function createControl(data: CreateControlRequest) {
  return requestClient.post('/dontstarve/control', data);
}

export interface UpdateConfigRequest extends DontStarveConfig {
}

export async function getConfig() {
  return requestClient.get<DontStarveConfig>('/dontstarve/config');
}

export async function updateConfig(data: UpdateConfigRequest) {
  return requestClient.put<DontStarveConfig>('/dontstarve/config', data)
    .then((data) => {
      ElNotification({
        title: '成功',
        message: '更新设置成功',
        type: 'success',
      })
      return data;
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
    .then((data) => {
      ElNotification({
        title: '成功',
        message: '更新存档成功',
        type: 'success',
      })
      return data;
    })
}

export async function deleteArchive(id: string) {
  return requestClient.delete(`/dontstarve/archive/${id}`).then((data) => {
    ElNotification({
      title: '成功',
      message: '删除存档成功',
      type: 'success',
    })
    return data;
  });
}

export function uploadArchive() {
  return '/api/dontstarve/archive/transfer';
}
