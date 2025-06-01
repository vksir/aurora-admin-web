import type {
  Control,
  DontStarveArchive,
  DontStarveConfig,
  Status,
} from '@vben/types';

import { requestClient } from '#/api/request';

export async function getStatus() {
  return requestClient.get<Status>('/dontstarve/status');
}

export interface CreateControlRequest extends Control {}

export async function createControl(data: CreateControlRequest) {
  return requestClient.post('/dontstarve/control', data);
}

export interface UpdateConfigRequest extends DontStarveConfig {}

export async function getConfig() {
  return requestClient.get<DontStarveConfig>('/dontstarve/config');
}

export async function updateConfig(data: UpdateConfigRequest) {
  return requestClient.put<DontStarveConfig>('/dontstarve/config', data);
}

export interface ListArchiveRequest {}

export interface CreateArchiveRequest {}

export interface UpdateArchiveRequest extends DontStarveArchive {}

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
  return requestClient.put<DontStarveArchive>(
    `/dontstarve/archive/${id}`,
    data,
  );
}

export async function deleteArchive(id: string) {
  return requestClient.delete(`/dontstarve/archive/${id}`);
}
