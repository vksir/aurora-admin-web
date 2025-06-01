import type { Model } from './common';

interface DontStarveConfig {
  enabled_archive_id: string;
  token: string;
}

interface DontStarveMod extends Model {
  current_config: string;
}

interface DontStarveWorld extends Model {
  type: string;
  server_config: string;
  world_override: string;
}

interface DontStarveArchive extends Model {
  cluster_name: string;
  cluster_password: string;
  cluster_description: string;
  max_players: number;
  pvp: boolean;
  worlds: DontStarveWorld[];
  mods: DontStarveMod[];
}

export type {
  DontStarveArchive,
  DontStarveConfig,
  DontStarveMod,
  DontStarveWorld,
};
