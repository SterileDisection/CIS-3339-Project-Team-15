import { createRouter, createWebHistory } from 'vue-router'
import { useLoggedInUserStore } from '../store/loggedInUser'

// make all paths and names lowercase for consistency
const routes = [
  {
    path: '/',
    // S1: the dashboard reads events and clients, and every read requires a logged-in user
    meta: { requiresAuth: true },
    component: () => import('../views/home.vue')
  },
  {
    path: "/login",
    name: "login",
    component: () => import('../views/login.vue')
  },
  {
    path: '/clientform',
    name: 'clientform',
    // only authenticated users can create clients
    // F4: editor-only page; the global guard below redirects viewers who type this URL
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/clientform.vue')
  },
  {
    path: '/findclient',
    name: 'findclient',
    meta: { requiresAuth: true },
    component: () => import('../views/findclient.vue')
  },
  {
    path: '/clientdetails/:id',
    name: 'clientdetails',
    meta: { requiresAuth: true },
    component: () => import('../views/clientdetails.vue')
  },
  {
    path: '/eventform',
    name: 'eventform',
    // F4: editor-only page; the global guard below redirects viewers who type this URL
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/eventform.vue')
  },
  {
    path: '/findevents',
    name: 'findevents',
    meta: { requiresAuth: true },
    component: () => import('../views/findevents.vue')
  },
  {
    path: '/eventdetails/:id',
    name: 'eventdetails',
    meta: { requiresAuth: true },
    component: () => import('../views/eventDetails.vue') 
    // fixed: file is eventDetails.vue, the lowercase name 
    // broke the build on Mac/Linux
  },
  {
    path: '/serviceform',
    name: 'serviceform',
    // F4: editor-only page; the global guard below redirects viewers who type this URL
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/serviceform.vue')
  },
  {
    path: '/findservice',
    name: 'findservice',
    meta: { requiresAuth: true },
    component: () => import('../views/findservice.vue')
  },
  {
    path: '/servicedetails/:id',
    name: 'servicedetails',
    meta: { requiresAuth: true },
    component: () => import('../views/servicedetails.vue')
  }
]
const router = createRouter({
  history: createWebHistory(),
  routes
})

// protecting the routes (one global guard for every route)
router.beforeEach((to) => {
  const store = useLoggedInUserStore()
  // F4: requiresEditor implies requiresAuth, so check either flag here
  if ((to.meta.requiresAuth || to.meta.requiresEditor) && !store.isLoggedIn) {
    return {
      path: '/login',
      // save the location we were at to come back later
      query: { redirect: to.fullPath },
    }
  }
  // F4: a logged-in user who isn't an editor (a viewer, or any unknown role) can't open
  // editor-only pages by typing the URL; send them to the dashboard instead.
  // This is an allow-list: only the exact role 'editor' gets through (store.isEditor).
  if (to.meta.requiresEditor && !store.isEditor) {
    return { path: '/' }
  }
})

export default router

