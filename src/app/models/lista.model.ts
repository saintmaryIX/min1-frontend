import { Oferta } from './oferta.model';

export interface Lista {
  _id?: string;
  name: string;
  offerIds: Array<string | Oferta>;
  tags: string[];
}
