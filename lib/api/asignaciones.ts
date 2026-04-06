import { http } from './http';
import { AsignacionesResponse } from '../../types/models';

export const asignacionesApi = {
  listar: async () => {
    const response = await http<AsignacionesResponse>('GET', '/asignaciones');
    return response;
  }
};
