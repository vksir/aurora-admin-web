import type { UserInfo } from '@vben/types';

/**
 * 获取用户信息
 * 后端（单用户 JWT，无 /user/info 端点）不提供用户信息查询，
 * JWT payload 中仅含 username，此处返回本地构造的固定信息。
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  return {
    userId: '0',
    username: 'admin',
    realName: 'Admin',
    avatar: '',
    roles: [],
    desc: 'aurora-admin 内置管理员',
    homePath: '/',
    token: '',
  };
}
