import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: '饥荒',
    },
    name: 'Donstarve',
    path: '/donstarve',
    children: [
      {
        name: 'Room',
        path: '/donstarve/room',
        component: () => import('#/views/dontstarve/room/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '房间设置',
        },
      },
      {
        name: 'World',
        path: '/donstarve/world',
        component: () => import('#/views/dontstarve/world/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '世界设置',
        },
      },
      {
        name: 'Server',
        path: '/donstarve/server',
        component: () => import('#/views/dontstarve/server/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '服务设置',
        },
      },
      {
        name: 'Mod',
        path: '/donstarve/mod',
        component: () => import('#/views/dontstarve/mod/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '模组设置',
        },
      },
    ],
  },
];

export default routes;
