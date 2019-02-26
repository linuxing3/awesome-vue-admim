export const activity = {
  path: '/activity',
  name: 'activity',
  meta: { breadcrumb: true },
  component: () =>
    import(/* webpackChunkName: "routes" */
    /* webpackMode: "lazy" */
      `@/views/Activity.vue`)
}

export const editActivity = {
  path: '/activity_id',
  name: 'activity_id',
  meta: { breadcrumb: true, edit: true },
  component: () =>
    import(/* webpackChunkName: "routes" */
    /* webpackMode: "lazy" */
      `@/views/Activity.vue`)
}

export default activity
