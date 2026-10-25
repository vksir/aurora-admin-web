import type { Model } from './common';

interface DontStarveConfig {
  enabled_archive_id: string;
  token: string;
  tick_rate: number;
  password: string;
}

/**
 * 对齐后端 internal/store/mod.go 的 store.Mod（JSON 响应）
 * name/description/image/time_* /raw_config 均为 omitempty
 */
interface DontStarveMod extends Model {
  workshop_id: string;
  name?: string;
  description?: string;
  image?: string;
  time_created?: number;
  time_updated?: number;
  raw_config?: string;
}

interface DontStarveWorld extends Model {
  type: string;
  server_config: string;
  world_override: string;
}

/**
 * 对齐后端 internal/store/archive.go 的 store.Archive（JSON 响应）
 * mods 为顶层字段（旧 ent 版本为 edges.mods 嵌套，已废弃）
 */
interface DontStarveArchive extends Model {
  remark: string;
  cluster_name: string;
  cluster_password: string;
  cluster_description: string;
  max_players: number;
  pvp: boolean;
  world: DontStarveWorld[];
  mods?: DontStarveMod[];
}

export type {
  DontStarveConfig,
  DontStarveMod,
  DontStarveWorld,
  DontStarveArchive,
};
