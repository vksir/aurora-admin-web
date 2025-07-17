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
        name: 'Donstarve Dashboard',
        path: '/donstarve/dashboard',
        component: () => import('#/views/dontstarve/dashboard/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '控制台',
        },
      },
      {
        name: 'Donstarve Mod',
        path: '/donstarve/mod',
        component: () => import('#/views/dontstarve/mod/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '模组设置',
        },
      },
      {
        name: 'Donstarve Archive',
        path: '/donstarve/archive',
        meta: {
          icon: 'lucide:area-chart',
          title: '存档管理',
        },
        children: [
          {
            name: 'Donstarve Archive Manage',
            path: '/donstarve/archive',
            component: () => import('#/views/dontstarve/archive/index.vue'),
            meta: {
              icon: 'lucide:area-chart',
              title: '存档管理',
              hideInMenu: true,
              hideInBreadcrumb: true,
            },
          },
          {
            name: 'Donstarve Archive Setting',
            path: '/donstarve/archive/setting',
            component: () => import('#/views/dontstarve/archive/ArchiveSetting.vue'),
            meta: {
              icon: 'lucide:area-chart',
              title: '存档设置',
              hideInMenu: true,
            },
          },
        ]
      },
    ],
  },
];

export default routes;
