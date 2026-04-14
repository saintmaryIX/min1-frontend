import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lista } from '../models/lista.model';

@Injectable({
  providedIn: 'root',
})
export class ListaService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:4000/api/listas';

  getListas(): Observable<Lista[]> {
    return this.http.get<Lista[]>(this.apiUrl);
  }

  createLista(data: Omit<Lista, '_id'>): Observable<Lista> {
    return this.http.post<Lista>(this.apiUrl, data);
  }

  updateLista(id: string, data: Partial<Lista>): Observable<Lista> {
    return this.http.put<Lista>(`${this.apiUrl}/${id}`, data);
  }

  deleteLista(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
