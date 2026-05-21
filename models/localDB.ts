import * as SQLITE from 'expo-sqlite';

const db: SQLite.SQLiteDatabase = SQLite.openDatabase('innerCoreStructData.db');

export const initLocalDB = async (): Promise<void> => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS adulto_mayor (
        rut INTEGER PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medico(
        rut INTEGER PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        pacientes TEXT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cuidador(
        rut INTEGER PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        nacimiento DATE NOT NULL,
        residencia TEXT NOT NULL,
        pacientes TEXT NOT NULL,
        psswd TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS adulto_medico(
        adulto_rut INTEGER NOT NULL,
        medico_rut INTEGER NOT NULL,
        PRIMARY KEY (adulto_rut, medico_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adult_mayor(rut),
        FOREIGN KEY (medico_rut) REFERENCES medico(rut)
      );

      CREATE TABLE IF NOT EXISTS adulto_cuidador(
        adulto_rut INTEGER NOT NULL,
        cuidador_rut INTEGER NOT NULL,
        PRIMARY KEY (adulto_rut, cuidador_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adult_mayor(rut),
        FOREIGN KEY (cuidador_rut) REFERENCES cuidador(rut)
      );

      `);
    console.log('Base de datos inicializada correctamente!');
  } catch (error){
    console.error('Error en inicializar base de datos: ' error);
    throw error;
  }
};

//Se exporta db para controladores externos.
export default db;
