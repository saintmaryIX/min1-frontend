import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertaService } from '../../../services/oferta.service';
import { Oferta } from '../../../models/oferta.model';
import { SearchInputComponent } from '../../shared/search-input/search-input.component';
import { OfertaFormComponent } from './oferta-form/oferta-form.component';

@Component({
  selector: 'app-ofertas-admin',
  standalone: true,
  imports: [CommonModule, SearchInputComponent, OfertaFormComponent],
  templateUrl: './ofertas.html',
  styleUrl: './ofertas.css',
})
export class Ofertas implements OnInit {
  private ofertaService = inject(OfertaService);

  // Base data signals
  ofertas = signal<Oferta[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filter signals
  searchQuery = signal<string>('');
  sectorFilter = signal<string>('ALL');

  // SELECTION SIGNALS
  selectedIds = signal<Set<string>>(new Set());

  // DRAWER STATE
  drawerOpen = signal<boolean>(false);
  drawerOferta = signal<Oferta | null>(null);

  // COMPUTEDS
  isAllSelected = computed(() => {
    const visible = this.paginatedOfertas();
    if (visible.length === 0) return false;
    return visible.every(o => this.selectedIds().has(o._id!));
  });

  someSelected = computed(() => this.selectedIds().size > 0);

  filteredOfertas = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.sectorFilter();
    const all = this.ofertas();

    if (!query && filter === 'ALL') {
      return all;
    }

    return all
      .filter(o => {
        const matchesSector = filter === 'ALL' || o.sector === filter;
        const matchesSearch = !query ||
          o.sector.toLowerCase().includes(query) ||
          o.region.toLowerCase().includes(query) ||
          o.companyDescription.toLowerCase().includes(query);

        return matchesSector && matchesSearch;
      })
      .sort((a, b) => {
        if (!query) return 0;
        const aStarts = a.sector.toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = b.sector.toLowerCase().startsWith(query) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return 0;
      });
  });

  // PAGINACIÓN
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedOfertas = computed(() => { //simplemente hago paginación (no muestro todas las ofertas filtradas)
    const all = this.filteredOfertas();
    const page = this.currentPage();
    const size = this.pageSize();
    return all.slice((page - 1) * size, page * size); //me quedo solo con algunas de las ofertas filtradas
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredOfertas().length / this.pageSize()))
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
    this.fetchOfertas();
  }

  fetchOfertas(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.ofertaService.getOfertas().subscribe({
      next: (data) => {
        this.ofertas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching offers:', err);
        this.error.set('Error cargando ofertas.');
        this.isLoading.set(false);
      }
    });
  }

  confirmarEliminar(id: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta oferta?')) {
      this.ofertaService.deleteOferta(id).subscribe({
        next: () => {
          this.ofertas.update(actuales => actuales.filter(o => o._id !== id));
        },
        error: (err) => {
          console.error('Error deleting offer:', err);
          alert('No se pudo eliminar la oferta.');
        }
      });
    }
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  updateSector(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sectorFilter.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  pageStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredOfertas().length);
  }

  toggleSelection(id: string): void {
    this.selectedIds.update(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    const allPageIds = this.paginatedOfertas().map(o => o._id!);
    this.selectedIds.update(prev => {
      if (this.isAllSelected()) {
        const next = new Set(prev);
        allPageIds.forEach(id => next.delete(id));
        return next;
      } else {
        return new Set([...prev, ...allPageIds]);
      }
    });
  }

  borrarSeleccionados(): void {
    const ids = Array.from(this.selectedIds());
    if (confirm(`¿Estás seguro de que quieres eliminar ${ids.length} ofertas?`)) {
      // Nota: En una app real haríamos un delete masivo en el backend.
      this.ofertas.update(actuales => actuales.filter(o => !this.selectedIds().has(o._id!)));
      this.clearSelection();
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  abrirCrear(): void {
    this.drawerOferta.set(null);
    this.drawerOpen.set(true);
  }

  abrirEditar(oferta: Oferta): void {
    this.drawerOferta.set(oferta);
    this.drawerOpen.set(true);
  }

  cerrarDrawer(): void {
    this.drawerOpen.set(false);
  }

  onOfertaGuardada(guardada: Oferta): void {
    this.ofertas.update(actuales => {
      const idx = actuales.findIndex(o => o._id === guardada._id);
      if (idx >= 0) {
        const copia = [...actuales];
        copia[idx] = guardada;
        return copia;
      } else {
        return [guardada, ...actuales];
      }
    });
  }
}
