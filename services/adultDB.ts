import { getDB } from '@/models/dbInstance';
import { AdultoMayor } from '@/models/types';

export const adultController = {
  async create(adulto: Omit<AdultoMayor, 'rut'> & { rut: string }): Promise<void> {
    const db = getDB();
    await db.transactionAsync(tx => {
      tx.executeAsync(
        `INSERT INTO adulto_mayor (
          rut, nombres, apellidos, email, nacimiento, residencia,
          telefono_emergencia, latitud_segura, longitud_segura, radio_seguro, psswd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adulto.rut, adulto.nombres, adulto.apellidos, adulto.email,
          adulto.nacimiento, adulto.residencia, adulto.telefono_emergencia,
          adulto.latitud_segura, adulto.longitud_segura, adulto.radio_seguro,
          adulto.psswd
        ]
      );
    });
  },

  async getByRut(rut: string): Promise<AdultoMayor | null> {
    const db = getDB();
    const result = await db.getFirstAsync<AdultoMayor>(
      'SELECT * FROM adulto_mayor WHERE rut = ?', [rut]
    );
    return result ?? null;
  },

  async getAll(): Promise<AdultoMayor[]> {
    const db = getDB();
    return db.getAllAsync<AdultoMayor>('SELECT * FROM adulto_mayor');
  },

  async update(rut: string, data: Partial<AdultoMayor>): Promise<void> {
    const db = getDB();
    const keys = Object.keys(data);
    const values = keys.map(k => (data as any)[k]);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    values.push(rut);
    await db.executeAsync(
      `UPDATE adulto_mayor SET ${setClause} WHERE rut = ?`, values
    );
  },

  async delete(rut: string): Promise<void> {
    const db = getDB();
    await db.executeAsync('DELETE FROM adulto_mayor WHERE rut = ?', [rut]);
  },
};
