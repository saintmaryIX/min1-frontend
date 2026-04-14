import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ListaService } from '../../../../services/lista.service';
import { OfertaService } from '../../../../services/oferta.service';
import { Lista } from '../../../../models/lista.model';
import { Oferta } from '../../../../models/oferta.model';

@Component({
  selector: 'app-lista-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lista-form.component.html',
  styleUrl: './lista-form.component.css',
})
export class ListaFormComponent {
  private fb = inject(FormBuilder);
  private listaService = inject(ListaService);
  private ofertaService = inject(OfertaService);

  lista = input<Lista | null>(null);
  isOpen = input<boolean>(false);
  saved = output<Lista>();
  closed = output<void>();

  isSaving = signal<boolean>(false);
  saveError = signal<string | null>(null);
  ofertas = signal<Oferta[]>([]);

  form = this.fb.group({
    name: ['', [Validators.required]],
    tagsText: [''],
    offerIds: [[] as string[]],
  });

  constructor() {
    effect(() => {
      const lista = this.lista();
      if (lista) {
        const offerIds = lista.offerIds.map((item) =>
          typeof item === 'string' ? item : item._id!
        );

        this.form.patchValue({
          name: lista.name,
          tagsText: lista.tags.join(', '),
          offerIds,
        });
      } else {
        this.form.reset({
          name: '',
          tagsText: '',
          offerIds: [],
        });
      }

      this.saveError.set(null);
    });
  }

  ngOnInit(): void {
    this.cargarOfertas();
  }

  get modoCrear(): boolean { return !this.lista(); }
  get titulo(): string { return this.modoCrear ? 'Añadir Lista' : 'Editar Lista'; }
  get f() { return this.form.controls; }

  cargarOfertas(): void {
    this.ofertaService.getOfertas().subscribe({
      next: (data) => {
        this.ofertas.set(data);
      },
      error: (err) => console.error('Error cargando ofertas:', err)
    });
  }

  cerrar(): void {
    this.form.reset({
      name: '',
      tagsText: '',
      offerIds: [],
    });
    this.closed.emit();
  }

  estaSeleccionada(id: string): boolean {
    return (this.form.value.offerIds ?? []).includes(id);
  }

  toggleOferta(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const actuales = this.form.value.offerIds ?? [];

    if (checked) {
      if (!actuales.includes(id)) {
        this.form.patchValue({
          offerIds: [...actuales, id]
        });
      }
      return;
    }

    this.form.patchValue({
      offerIds: actuales.filter((currentId) => currentId !== id)
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const payload: Omit<Lista, '_id'> = {
      name: (this.form.value.name ?? '').trim(),
      tags: (this.form.value.tagsText ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      offerIds: this.form.value.offerIds ?? [],
    };

    if (this.modoCrear) {
      this.listaService.createLista(payload).subscribe({
        next: (nueva) => {
          this.isSaving.set(false);
          this.saved.emit(nueva);
          this.cerrar();
        },
        error: (err) => {
          console.error(err);
          this.saveError.set('Error al crear la lista.');
          this.isSaving.set(false);
        },
      });
    } else {
      const id = this.lista()!._id!;
      this.listaService.updateLista(id, payload).subscribe({
        next: (actualizada) => {
          this.isSaving.set(false);
          this.saved.emit(actualizada);
          this.cerrar();
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
