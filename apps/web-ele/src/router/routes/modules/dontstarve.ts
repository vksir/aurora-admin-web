import type {RouteRecordRaw} from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: '饥荒',
    },
    name: 'Dontstarve',
    path: '/dontstarve',
    children: [
      {
        name: 'Dontstarve Dashboard',
        path: '/dontstarve/dashboard',
        component: () => import('#/views/dontstarve/dashboard/index.vue'),
        meta: {
          icon: 'lucide:area-chart',
          title: '控制台',
        },
      },
      {
        name: 'Dontstarve Archive',
        path: '/dontstarve/archive',
        meta: {
          icon: 'lucide:area-chart',
          title: '存档管理',
        },
        children: [
          {
            name: 'Dontstarve Archive Manage',
            path: '/dontstarve/archive',
            component: () => import('#/views/dontstarve/archive/index.vue'),
            meta: {
              icon: 'lucide:area-chart',
              title: '存档管理',
              hideInMenu: true,
              hideInBreadcrumb: true,
            },
          },
          {
            name: 'Dontstarve Archive Setting',
            path: '/dontstarve/archive/setting',
            component: () => import('#/views/dontstarve/archive/ArchiveSetting.vue'),
            meta: {
              icon: 'lucide:area-chart',
              title: '存档设置',
              hideInMenu: true,
            },
          },
        ]
      },
      {
        name: 'Dontstarve Mod',
        path: '/dontstarve/mod',
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
