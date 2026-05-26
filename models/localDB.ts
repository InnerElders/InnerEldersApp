// @ts-nocheck
import * as SQLITE from 'expo-sqlite';

const db: SQLite.SQLiteDatabase = SQLite.openDatabase('innerCoreStructData.db');

export const initLocalDB = async (): Promise<void> => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS adulto_mayor (
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        telfono_emergencia INT NOT NULL,
        latitud_segura FLOAT NOT NULL,
        longitud_sergura FLOAT NOT NULL,
        radio_seguro FLOAT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medico(
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        pacientes TEXT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cuidador(
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        tipo_cuidador TEXT NOT NULL,
        pacientes TEXT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS adulto_medico(
        adulto_rut TEXT NOT NULL,
        medico_rut TEXT NOT NULL,
        PRIMARY KEY (adulto_rut, medico_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut),
        FOREIGN KEY (medico_rut) REFERENCES medico(rut)
      );

      CREATE TABLE IF NOT EXISTS adulto_cuidador(
        adulto_rut TEXT NOT NULL,
        cuidador_rut TEXT NOT NULL,
        PRIMARY KEY (adulto_rut, cuidador_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut),
        FOREIGN KEY (cuidador_rut) REFERENCES cuidador(rut)
      );

      `);
    console.log('Base de datos inicializada correctamente!');
  } catch (error){
    console.error('Error en inicializar base de datos: ', error);
    throw error;
  }
};

//Se exporta db para controladores externos.
export default db;
