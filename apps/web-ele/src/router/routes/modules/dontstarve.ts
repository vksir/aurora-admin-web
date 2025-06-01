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
        path: '/room',
        component: () => import('#/views/dontstarve/room/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:area-chart',
          title: '房间设置',
        },
      },
    ],
  },
];

export default routes;
