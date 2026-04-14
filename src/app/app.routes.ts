import { Routes } from '@angular/router';
import { Login } from './components/usuarios/login/login.component';
import { OfertaListComponent } from './components/ofertas/oferta-list/oferta-list.component';
import { OfertaDetalle } from './components/ofertas/oferta-detalle/oferta-detalle.component';
import { UsuariosListComponent } from './components/usuarios/usuarios-list/usuarios-list.component';
import { PerfilComponent } from './components/usuarios/perfil/perfil.component';

// Layouts
import { PublicLayoutComponent } from './components/shared/public-layout/public-layout.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';

// Admin Pages
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { Usuarios as AdminUsuariosComponent } from './components/admin/usuarios/usuarios';
import { Ofertas as OfertasAdminComponent } from './components/admin/ofertas/ofertas';
import { SolicitudesComponent } from './components/admin/solicitudes/solicitudes-list';
import { Listas as ListasAdminComponent } from './components/admin/listas/listas';

export const routes: Routes = [
  // --- MUNDO PÚBLICO ---
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'login', component: Login },
      { path: 'ofertas', component: OfertaListComponent },
      { path: 'ofertas/:id', component: OfertaDetalle },
      { path: 'usuarios', component: UsuariosListComponent },
      { path: 'perfil', component: PerfilComponent },
      
    ]
  },

  // --- MUNDO ADMIN ---
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'usuarios', component: AdminUsuariosComponent },
      { path: 'ofertas', component: OfertasAdminComponent },
      { path: 'solicitudes', component: SolicitudesComponent },
      { path: 'listas', component: ListasAdminComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
