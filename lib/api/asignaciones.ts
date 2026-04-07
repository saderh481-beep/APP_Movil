import { http } from './http';
import { getToken } from './auth';
import { AsignacionesResponse } from '../../types/models';

export const asignacionesApi = {
  listar: async () => {
    const token = await getToken();
    if (!token) {
      throw new Error('No autenticado: Token no disponible');
    }
    const response = await http<AsignacionesResponse>('GET', '/asignaciones', undefined, token);
    return response;
  }
};
