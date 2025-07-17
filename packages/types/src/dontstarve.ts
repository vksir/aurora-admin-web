import type {Model} from './common'

interface DontStarveConfig {
  enabled_archive_id: string
  token: string
}

interface DontStarveModConfigOption extends Model {
  description: string
  hover: string
  default: boolean
  type: string
  string: string
}

interface DontStarveModConfig extends Model {
  name: string
  label: string
  hover: string
  option: DontStarveModConfigOption[]
}

interface DontStarveMod extends Model {
  workshop_id: string
  name: string
  time_created: number
  time_updated: number
  image: string
  description: string
  author: string
  version: string
  config: DontStarveModConfig[]
  download: boolean
}

interface DontStarveModConfigInArchive extends Model {
  name: string
  type: string
  string: string
  mod_config: DontStarveModConfig
  mod_config_option: DontStarveModConfigOption
}

interface DontStarveModInArchive extends Model {
  config_in_archive: DontStarveModConfigInArchive[]
  mod: DontStarveMod
}


interface DontStarveWorld extends Model {
  type: string
  server_config: string
  world_override: string
}

interface DontStarveArchive extends Model {
  remark: string
  cluster_name: string
  cluster_password: string
  cluster_description: string
  max_players: number
  pvp: boolean
  world: DontStarveWorld[]
  mod_in_archive: DontStarveModInArchive[]
}

export type {
  DontStarveConfig,
  DontStarveModConfigOption,
  DontStarveModConfig,
  DontStarveMod,
  DontStarveModConfigInArchive,
  DontStarveModInArchive,
  DontStarveWorld,
  DontStarveArchive,
}
