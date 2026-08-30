import { createBrowserRouter, type RouteObject } from "react-router-dom";

import MarketPage from './public/MarketPage';
import CarritoPage from "./public/CarritoPage";
import CheckoutPage from "./public/CheckoutPage";
import OrdenPage from "./public/OrdenPage";
import SuccessPage from "./public/SuccessPage";
import FailurePage from "./public/FailurePage";
import PendingPage from "./public/PendingPage";
import DashboardRedirect from "./public/DashboardRedirect";
import PrivacidadPage from "./public/PrivacidadPage";
import SolicitudesPage from "./public/SolicitudesPage";

import AdminLayout from "./admin/components/AdminLayout";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminOrders from "./admin/pages/AdminOrders";
import AdminML from "./admin/pages/AdminML";
import AdminCatalog from "./admin/pages/AdminCatalog";
import AdminExport from "./admin/pages/AdminExport";
import AdminPublicaciones from "./admin/pages/AdminPublicaciones";
import AdminProfile from "./admin/pages/AdminProfile";
import AdminImport from "./admin/pages/AdminImport";
import AdminArticulos from "./admin/pages/AdminArticulos";
import AdminBiblioteca from "./admin/pages/AdminBiblioteca";
import AdminTiendas from "./admin/pages/AdminTiendas";
import AdminAplicaciones from "./admin/pages/AdminAplicaciones";
import AdminDefiniciones from "./admin/pages/AdminDefiniciones";
import AdminEditor from "./admin/editor/EditorPage";
import AdminApiVault from "./admin/pages/AdminApiVault";
import AdminMetaSocial from "./admin/pages/AdminMetaSocial";

// 👉 NUEVA PÁGINA
// 👉 EDITOR PRO
import AdminToolEditor from "./admin/pages/AdminToolEditor";

export const TODAS_LAS_RUTAS: (RouteObject & { id: string })[] = [
  { id: "storefront",          path: "/",           Component: MarketPage },
  { id: "tienda",              path: "/tienda",     Component: MarketPage },
  { id: "carrito",             path: "/carrito",    Component: CarritoPage },
  { id: "checkout",            path: "/checkout",   Component: CheckoutPage },
  { id: "orden",               path: "/orden/:id",  Component: OrdenPage },
  { id: "success",             path: "/success",    Component: SuccessPage },
  { id: "failure",             path: "/failure",    Component: FailurePage },
  { id: "pending",             path: "/pending",    Component: PendingPage },
  /* Pública y sin sesión: la abren los rastreadores de Meta, no una persona
     con cuenta. Meta la exige para aprobar la app. */
  { id: "privacidad",          path: "/privacidad", Component: PrivacidadPage },
  { id: "solicitudes",         path: "/solicitudes", Component: SolicitudesPage },
  { id: "dashboard-redirect",  path: "/dashboard",  Component: DashboardRedirect },
  { id: "dashboard-redirect2", path: "/dashboard/*",Component: DashboardRedirect },

  {
    id: "admin",
    path: "/admin",
    Component: AdminLayout,
    children: [
      { id: "admin-dashboard",      path: "",              Component: AdminDashboard },
      { id: "admin-orders",         path: "orders",        Component: AdminOrders },
      { id: "admin-publicaciones",  path: "publicaciones", Component: AdminPublicaciones },
      { id: "admin-tiendas",        path: "tiendas",       Component: AdminTiendas },
      { id: "admin-definiciones",   path: "definiciones",  Component: AdminDefiniciones },
      { id: "admin-aplicaciones",   path: "aplicaciones",  Component: AdminAplicaciones },
      { id: "admin-export",         path: "export",        Component: AdminExport },
      { id: "admin-import",         path: "import",        Component: AdminImport },

      // 👉 NUEVA RUTA DE CARGA MASIVA

      { id: "admin-profile",        path: "profile",       Component: AdminProfile },
      { id: "admin-publicacion-nueva", path: "publicaciones/nueva", Component: AdminArticulos },
      { id: "admin-biblioteca",     path: "biblioteca",    Component: AdminBiblioteca },
      { id: "admin-tool-editor", path: "tool-editor", Component: AdminToolEditor },
      { id: "admin-editor",         path: "editor",        Component: AdminEditor },
      { id: "admin-catalog",        path: "catalog",       Component: AdminCatalog },
      { id: "admin-ml",             path: "ml",            Component: AdminML },
      { id: "admin-api-vault",      path: "api-vault",     Component: AdminApiVault },
      { id: "admin-meta",           path: "meta",          Component: AdminMetaSocial },
    ] as RouteObject[],
  },
];

export const router = createBrowserRouter(TODAS_LAS_RUTAS);

