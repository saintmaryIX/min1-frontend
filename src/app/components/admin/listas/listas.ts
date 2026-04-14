import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from '../../shared/search-input/search-input.component';
import { ListaFormComponent } from './lista-form/lista-form.component';
import { ListaService } from '../../../services/lista.service';
import { Lista } from '../../../models/lista.model';

@Component({
  selector: 'app-listas-admin',
  standalone: true,
  imports: [CommonModule, SearchInputComponent, ListaFormComponent], //importo hijos. el component de buscador + form/drawer
  templateUrl: './listas.html',
  styleUrl: './listas.css',
})
export class Listas implements OnInit {
  private listaService = inject(ListaService);

  listas = signal<Lista[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchQuery = signal<string>('');

  drawerOpen = signal<boolean>(false);
  drawerLista = signal<Lista | null>(null);

  filteredListas = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.listas();

    if (!query) {
      return all;
    }

    return all.filter((lista) => {
      const matchesName = lista.name.toLowerCase().includes(query);
      const matchesTags = lista.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesName || matchesTags;
    });
  });

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedListas = computed(() => {
    const all = this.filteredListas();
    const page = this.currentPage();
    const size = this.pageSize();
    return all.slice((page - 1) * size, page * size);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredListas().length / this.pageSize()))
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const result: number[] = [1];
    if (current > 3) result.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 2) result.push(-1);
    result.push(total);
    return result;
  });

  ngOnInit(): void {
    this.fetchListas();
  }

  fetchListas(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.listaService.getListas().subscribe({
      next: (data) => {
        this.listas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching listas:', err);
        this.error.set('Error cargando listas.');
        this.isLoading.set(false);
      }
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  pageStart(): number {
    if (this.filteredListas().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredListas().length);
  }

  abrirCrear(): void {
    this.drawerLista.set(null);
    this.drawerOpen.set(true);
  }

  abrirEditar(lista: Lista): void {
    this.drawerLista.set(lista);
    this.drawerOpen.set(true);
  }

  cerrarDrawer(): void {
    this.drawerOpen.set(false);
  }

  confirmarEliminar(id: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta lista?')) {
      this.listaService.deleteLista(id).subscribe({
        next: () => {
          this.listas.update((actuales) => actuales.filter((lista) => lista._id !== id));
        },
        error: (err) => {
          console.error('Error deleting list:', err);
          alert('No se pudo eliminar la lista.');
        }
      });
    }
  }

  onListaGuardada(guardada: Lista): void {
    this.listas.update((actuales) => { //uso update pero podría ser con set. aprovecho funciones de signal.
      const idx = actuales.findIndex((lista) => lista._id === guardada._id);
      if (idx >= 0) {
        const copia = [...actuales];
        copia[idx] = guardada;
        return copia; 
      }

      return [guardada, ...actuales];
    });
  }
}
