import { getDB } from '@/models/dbInstance';
import { Cuidador } from '@/models/types';

export const caregiverController = {
  async create(cuidador: Omit<Cuidador, 'rut'> & { rut: string }): Promise<void> {
    const db = getDB();
    await db.transactionAsync(tx => {
      tx.executeAsync(
        `INSERT INTO cuidador (
          rut, nombres, apellidos, email, nacimiento, residencia,
          tipo_cuidador, pacientes, psswd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cuidador.rut, cuidador.nombres, cuidador.apellidos, cuidador.email,
          cuidador.nacimiento, cuidador.residencia, cuidador.tipo_cuidador,
          cuidador.pacientes, cuidador.psswd
        ]
      );
    });
  },

  async getByRut(rut: string): Promise<Cuidador | null> {
    const db = getDB();
    const result = await db.getFirstAsync<Cuidador>(
      'SELECT * FROM cuidador WHERE rut = ?', [rut]
    );
    return result ?? null;
  },

  async getAll(): Promise<Cuidador[]> {
    const db = getDB();
    return db.getAllAsync<Cuidador>('SELECT * FROM cuidador');
  },

  async update(rut: string, data: Partial<Cuidador>): Promise<void> {
    const db = getDB();
    const keys = Object.keys(data);
    const values = keys.map(k => (data as any)[k]);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    values.push(rut);
    await db.executeAsync(
      `UPDATE cuidador SET ${setClause} WHERE rut = ?`, values
    );
  },

  async delete(rut: string): Promise<void> {
    const db = getDB();
    await db.executeAsync('DELETE FROM cuidador WHERE rut = ?', [rut]);
  },
};
