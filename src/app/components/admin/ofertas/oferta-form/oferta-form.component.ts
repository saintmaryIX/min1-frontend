import {
  Component,
  inject,
  input,
  output,
  effect,
  signal,
  OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { OfertaService } from '../../../../services/oferta.service';
import { UsuarioService } from '../../../../services/usuario.service';
import { ListaService } from '../../../../services/lista.service';
import { Oferta } from '../../../../models/oferta.model';
import { Usuario } from '../../../../models/usuario.model';
import { Lista } from '../../../../models/lista.model';

@Component({
  selector: 'app-oferta-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './oferta-form.component.html',
  styleUrl: './oferta-form.component.css',
})
export class OfertaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ofertaService = inject(OfertaService);
  private usuarioService = inject(UsuarioService);
  private listaService = inject(ListaService);

  oferta = input<Oferta | null>(null);
  isOpen = input<boolean>(false);
  saved = output<Oferta>();
  closed = output<void>();

  isSaving = signal<boolean>(false);
  saveError = signal<string | null>(null);
  usuarios = signal<Usuario[]>([]);
  listas = signal<Lista[]>([]);
  selectedListaIds = signal<string[]>([]);

  form = this.fb.group({
    region: ['', Validators.required],
    sector: ['', Validators.required],
    companyDescription: ['', [Validators.required, Validators.minLength(10)]],
    revenueRange: [''],
    businessAgeYears: [0, [Validators.min(0)]],
    employeeRange: [''],
    owner: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const o = this.oferta();
      const listas = this.listas();

      if (o) {
        this.form.patchValue({
          region: o.region,
          sector: o.sector,
          companyDescription: o.companyDescription,
          revenueRange: o.revenueRange ?? '',
          businessAgeYears: o.businessAgeYears ?? 0,
          employeeRange: o.employeeRange ?? '',
          owner: typeof o.owner === 'string' ? o.owner : (o.owner as any)?._id || '',
        });

        if (o._id) {
          const selectedIds = listas
            .filter((lista) => this.listaContieneOferta(lista, o._id!))
            .map((lista) => lista._id!)
            .filter(Boolean);

          this.selectedListaIds.set(selectedIds);
        }
      } else {
        this.form.reset({
          owner: '',
          businessAgeYears: 0
        });
        this.selectedListaIds.set([]);
      }

      this.saveError.set(null);
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarListas();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        const visibles = data.filter(u => u.visible !== false);
        this.usuarios.set(visibles);
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  cargarListas(): void {
    this.listaService.getListas().subscribe({
      next: (data) => {
        this.listas.set(data);
      },
      error: (err) => console.error('Error cargando listas:', err)
    });
  }

  get modoCrear(): boolean { return !this.oferta(); }
  get titulo(): string { return this.modoCrear ? 'Añadir Oferta' : 'Editar Oferta'; }
  get f() { return this.form.controls; }

  listaContieneOferta(lista: Lista, ofertaId: string): boolean {
    return lista.offerIds.some((item) =>
      typeof item === 'string' ? item === ofertaId : item._id === ofertaId
    );
  }

  estaListaSeleccionada(id: string): boolean {
    return this.selectedListaIds().includes(id);
  }

  toggleLista(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedListaIds.update((actuales) => {
      if (checked) {
        if (actuales.includes(id)) return actuales;
        return [...actuales, id];
      }

      return actuales.filter((currentId) => currentId !== id);
    });
  }

  cerrar(): void {
    this.form.reset();
    this.selectedListaIds.set([]);
    this.closed.emit();
  }

  sincronizarListasConOferta(ofertaId: string): Observable<Lista[] | null> {
    const seleccionadas = new Set(this.selectedListaIds());
    const updates = this.listas()
      .filter((lista) => !!lista._id)
      .filter((lista) => {
        const contains = this.listaContieneOferta(lista, ofertaId);
        const shouldContain = seleccionadas.has(lista._id!);
        return contains !== shouldContain;
      })
      .map((lista) => {
        const currentIds = lista.offerIds.map((item) =>
          typeof item === 'string' ? item : item._id!
        );

        const shouldContain = seleccionadas.has(lista._id!);
        const nextOfferIds = shouldContain
          ? Array.from(new Set([...currentIds, ofertaId]))
          : currentIds.filter((id) => id !== ofertaId);

        return this.listaService.updateLista(lista._id!, {
          name: lista.name,
          tags: lista.tags,
          offerIds: nextOfferIds
        });
      });

    if (updates.length === 0) {
      return of(null);
    }

    return forkJoin(updates);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const payload = this.form.value as Oferta;

    if (this.modoCrear) {
      this.ofertaService.createOferta(payload).subscribe({
        next: (nuevo) => {
          this.sincronizarListasConOferta(nuevo._id!).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.saved.emit(nuevo);
              this.cerrar();
            },
            error: (err) => {
              console.error(err);
              this.isSaving.set(false);
              this.saved.emit(nuevo);
              this.saveError.set('La oferta se ha guardado, pero no se pudieron actualizar las listas.');
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.saveError.set('Error al crear la oferta.');
          this.isSaving.set(false);
        },
      });
    } else {
      const id = this.oferta()!._id!;
      this.ofertaService.updateOferta(id, payload).subscribe({
        next: (actualizada) => {
          this.sincronizarListasConOferta(id).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.saved.emit(actualizada);
              this.cerrar();
            },
            error: (err) => {
              console.error(err);
              this.isSaving.set(false);
              this.saved.emit(actualizada);
              this.saveError.set('La oferta se ha guardado, pero no se pudieron actualizar las listas.');
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.saveError.set('Error al guardar los cambios.');
          this.isSaving.set(false);
        },
      });
    }
  }
}
