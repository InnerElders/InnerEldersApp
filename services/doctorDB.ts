import { getDB } from '@/models/dbInstance';
import { Medico } from '@/models/types';

export const doctorController = {
  async create(medico: Omit<Medico, 'rut'> & { rut: string }): Promise<void> {
    const db = getDB();
    await db.transactionAsync((tx: any) => {
      tx.executeAsync(
        `INSERT INTO medico (rut, nombres, apellidos, email, nacimiento, residencia, pacientes, psswd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [medico.rut, medico.nombres, medico.apellidos, medico.email,
         medico.nacimiento, medico.residencia, medico.pacientes, medico.psswd]
      );
    });
  },

  async getByRut(rut: string): Promise<Medico | null> {
    const db = getDB();
    return db.getFirstAsync<Medico>('SELECT * FROM medico WHERE rut = ?', [rut]);
  },

  async getAll(): Promise<Medico[]> {
    const db = getDB();
    return db.getAllAsync<Medico>('SELECT * FROM medico');
  },

  async update(rut: string, data: Partial<Medico>): Promise<void> {
    const db = getDB();
    const keys = Object.keys(data);
    const values = keys.map(k => (data as any)[k]);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    values.push(rut);
    await db.executeAsync(
      `UPDATE medico SET ${setClause} WHERE rut = ?`, values
    );
  },

  async delete(rut: string): Promise<void> {
    const db = getDB();
    await db.executeAsync('DELETE FROM medico WHERE rut = ?', [rut]);
  },

};
