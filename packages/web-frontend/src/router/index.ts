import { createRouter, createWebHistory } from 'vue-router';
import { isSessionExpired } from '../modules/stateManager';
import Download from '../pages/Download.vue';
import Home from '../pages/Home.vue';
import NotFound from '../pages/NotFound.vue';
import LoaderChangelog from '../pages/LoaderChangelog.vue';
import LauncherChangelog from '../pages/LauncherChangelog.vue';
import { setDocumentTitle } from '../utils';
import accountRoutes from './account.routes';
import adminRoutes from './admin.routes';
import legalRoutes from './legal.routes';
import modRoutes from './mods.routes';
import {
  handleAdminOnly,
  handleExistingSession,
  handleMissingSession,
} from './routerHandlers';
import redirectsRoutes from './redirects.routes';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    {
      path: '/download',
      name: 'download',
      component: Download,
    },
    {
      path: '/launcher/:version',
      name: 'launcherChangelog',
      component: LauncherChangelog,
    },
    {
      path: '/loader/:version',
      name: 'loaderChangelog',
      component: LoaderChangelog,
    },
    ...modRoutes,
    ...accountRoutes,
    ...legalRoutes,
    ...adminRoutes,
    ...redirectsRoutes,
    { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFound },
  ],
});

export default router;

router.beforeEach((to, from, next) => {
  document.body.setAttribute('data-route', to.matched[0].name as string);

  if (document.title !== import.meta.env.VITE_TITLE_DEFAULT) {
    setDocumentTitle(import.meta.env.VITE_TITLE_DEFAULT as string, null);
  }

  if (to.meta.sessionRequired && isSessionExpired()) {
    return handleMissingSession(to, from, next);
  } else if (to.meta.prohibitSession && !isSessionExpired()) {
    return handleExistingSession(to, from, next);
  } else if (to.meta.adminOnly) {
    return handleAdminOnly(to, from, next);
  }

  return next();
});
