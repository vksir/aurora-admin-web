import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录（后端 POST /api/v1/login，返回 data.accessToken）
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/v1/login', data);
}

/**
 * 刷新 accessToken
 * 后端未提供 refresh 端点（token 有效期 24h）。
 * 保持函数以兼容 request.ts 的拦截器签名，实际不会被调用
 * （preferences 的 enableRefreshToken 为 false）。
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/v1/login', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 * 后端无会话状态，登出为纯前端行为（清除本地 token）。
 */
export async function logoutApi() {
  return Promise.resolve();
}

/**
 * 获取用户权限码
 * 后端无 RBAC（单用户 JWT 认证），返回空数组，前端路由不做权限控制。
 */
export async function getAccessCodesApi() {
  return Promise.resolve([] as string[]);
}
