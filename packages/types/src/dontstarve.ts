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

/** 世界角色：主世界 / 地表 / 洞穴 */
type DontStarveWorldRole = 'primary' | 'surface' | 'caves';

/** 世界生成大小 */
type DontStarveWorldSize = 'small' | 'medium' | 'default' | 'huge';

/** 世界连接类型：洞穴（洞口↔绳梯）/ 传送门（地表之间） */
type DontStarveLinkKind = 'caves' | 'portal';

/**
 * 一个世界（= 一个分片进程承载的地图）。
 * type 是旧版本字段，仅为兼容历史数据保留；新代码用 role/name。
 */
interface DontStarveWorld {
  type?: string;
  /** 分片名 = 存档目录名与 -shard 参数，创建后不可修改 */
  name: string;
  /** 备注名：纯展示，可随意修改（支持中文） */
  alias?: string;
  role: DontStarveWorldRole;
  shard_id: string;
  port: number;
  enabled: boolean;
  world_size: DontStarveWorldSize;
  remark?: string;
  server_config: string;
  world_override: string;
}

/** 世界之间的通行关系 */
interface DontStarveLink {
  kind: DontStarveLinkKind;
  from: string;
  to: string;
  order: number;
}

/** 运行期：一个迁移门的现状 */
interface DontStarvePortal {
  guid: string;
  prefab: string;
  id: string;
  linked_world: string;
  received: string;
  auto: boolean;
  x: number;
  z: number;
}

/** 运行期：单个世界的拓扑状态 */
interface DontStarveWorldTopology {
  world: string;
  alias?: string;
  role: DontStarveWorldRole;
  portals: DontStarvePortal[];
  pending: number;
  warnings?: string[];
}

/** 运行期：拓扑检查/应用结果 */
interface DontStarveTopologyResult {
  applied: boolean;
  ops: number;
  worlds: DontStarveWorldTopology[];
  warnings?: string[];
}

/** 运行期：单个世界的进程状态 */
interface DontStarveWorldStatus {
  name: string;
  alias?: string;
  role: DontStarveWorldRole;
  enabled: boolean;
  port: number;
  shard_id: string;
  status: string;
  pid?: number;
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
  links?: DontStarveLink[];
  mods?: DontStarveMod[];
}

/** 服务器上的存档备份（zip 快照） */
interface DontStarveArchiveBackup {
  /** 备份文件名，如 2026-11-24_13-50-00.zip */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 备份创建时间 */
  created_at: string;
}

export type {
  DontStarveConfig,
  DontStarveMod,
  DontStarveWorld,
  DontStarveWorldRole,
  DontStarveWorldSize,
  DontStarveLink,
  DontStarveLinkKind,
  DontStarvePortal,
  DontStarveWorldTopology,
  DontStarveTopologyResult,
  DontStarveWorldStatus,
  DontStarveArchive,
  DontStarveArchiveBackup,
};
