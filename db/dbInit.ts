import { getDB } from './dbInstance';

// Pure JS SHA-256 implementation to hash default passwords in the seeder safely
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let asciiBitLength = asciiLength * 8;
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength & 3) * 8);
  words[(((asciiLength + 8) >> 6) << 4) + 15] = asciiBitLength;
  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i & 3) * 8);
  }
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[j] + (w[j] || 0)) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    const val = hash[i];
    for (j = 3; j >= 0; j--) {
      const byte = (val >> (j * 8)) & 0xff;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

export async function initDBSchema(): Promise<void> {
  const db = getDB();

  try {
    // Enable WAL and foreign keys
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Verify if old table exists with psswd column and migrate/recreate if so
    const tableInfo = (await db.getAllAsync('PRAGMA table_info(adulto_mayor);')) as { name: string }[];
    const hasOldPsswd = tableInfo.some((col) => col.name === 'psswd');

    if (hasOldPsswd) {
      console.log('Old database schema detected with psswd column. Dropping tables to migrate...');
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync('DROP TABLE IF EXISTS registro_clinico;');
      await db.execAsync('DROP TABLE IF EXISTS frecuencia_cardiaca;');
      await db.execAsync('DROP TABLE IF EXISTS oxigeno_sangre;');
      await db.execAsync('DROP TABLE IF EXISTS estres;');
      await db.execAsync('DROP TABLE IF EXISTS dispositivo_ble;');
      await db.execAsync('DROP TABLE IF EXISTS actividad_registro;');
      await db.execAsync('DROP TABLE IF EXISTS gps_registro;');
      await db.execAsync('DROP TABLE IF EXISTS adulto_cuidador;');
      await db.execAsync('DROP TABLE IF EXISTS adulto_medico;');
      await db.execAsync('DROP TABLE IF EXISTS medico;');
      await db.execAsync('DROP TABLE IF EXISTS cuidador;');
      await db.execAsync('DROP TABLE IF EXISTS adulto_mayor;');
      await db.execAsync('DROP TABLE IF EXISTS users;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      console.log('Old tables dropped successfully.');
    }

    // Verify if old estres table exists and recreate it if it has the old column 'adulto_rut'
    try {
      const estresTableInfo = (await db.getAllAsync('PRAGMA table_info(estres);')) as { name: string }[];
      const hasOldEstres = estresTableInfo.some((col) => col.name === 'adulto_rut');
      if (hasOldEstres) {
        console.log('Old estres schema detected with adulto_rut column. Dropping estres table to migrate...');
        await db.execAsync('DROP TABLE IF EXISTS estres;');
      }
    } catch (e) {
      console.warn('Could not check or drop old estres table, it might not exist yet:', e);
    }

    // 1. Unified users table for roles & credentials mapping
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        rut TEXT PRIMARY KEY,
        psswd_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('adulto_mayor', 'cuidador', 'medico')),
        genero TEXT
      );
    `);

    // Migration to add 'genero' column if table already existed without it
    const usersTableInfo = (await db.getAllAsync('PRAGMA table_info(users);')) as { name: string }[];
    const hasGenero = usersTableInfo.some((col) => col.name === 'genero');
    if (!hasGenero) {
      console.log('Adding column "genero" to "users" table...');
      try {
        await db.execAsync('ALTER TABLE users ADD COLUMN genero TEXT;');
      } catch (e) {
        console.error('Failed to add column "genero":', e);
      }
    }

    // 2. Adulto Mayor profiles
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS adulto_mayor (
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento TEXT NOT NULL,
        residencia TEXT NOT NULL,
        telefono_emergencia INTEGER NOT NULL,
        latitud_segura REAL NOT NULL DEFAULT 0.0,
        longitud_segura REAL NOT NULL DEFAULT 0.0,
        radio_seguro REAL NOT NULL DEFAULT 0.0,
        FOREIGN KEY (rut) REFERENCES users(rut) ON DELETE CASCADE
      );
    `);

    // 3. Cuidador profiles
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cuidador (
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento TEXT NOT NULL,
        residencia TEXT NOT NULL,
        tipo_cuidador TEXT NOT NULL,
        pacientes TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (rut) REFERENCES users(rut) ON DELETE CASCADE
      );
    `);

    // 4. Medico profiles
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medico (
        rut TEXT PRIMARY KEY,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT,
        nacimiento TEXT NOT NULL,
        residencia TEXT NOT NULL,
        pacientes TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (rut) REFERENCES users(rut) ON DELETE CASCADE
      );
    `);

    // 5. Intermediary tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS adulto_medico (
        adulto_rut TEXT NOT NULL,
        medico_rut TEXT NOT NULL,
        PRIMARY KEY (adulto_rut, medico_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE,
        FOREIGN KEY (medico_rut) REFERENCES medico(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS adulto_cuidador (
        adulto_rut TEXT NOT NULL,
        cuidador_rut TEXT NOT NULL,
        vinculado_en TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (adulto_rut, cuidador_rut),
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE,
        FOREIGN KEY (cuidador_rut) REFERENCES cuidador(rut) ON DELETE CASCADE
      );
    `);

    // Migration to add 'vinculado_en' column if table already existed without it
    const linkTableInfo = (await db.getAllAsync('PRAGMA table_info(adulto_cuidador);')) as { name: string }[];
    const hasVinculadoEn = linkTableInfo.some((col) => col.name === 'vinculado_en');
    if (!hasVinculadoEn) {
      console.log('Adding column "vinculado_en" to "adulto_cuidador" table...');
      try {
        await db.execAsync("ALTER TABLE adulto_cuidador ADD COLUMN vinculado_en TEXT NOT NULL DEFAULT '';");
      } catch (e) {
        console.error('Failed to add column "vinculado_en":', e);
      }
    }

    // 6. Sensor History & Logs
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS gps_registro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adulto_rut TEXT NOT NULL,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_gps_registro_adulto_ts
      ON gps_registro(adulto_rut, timestamp DESC);
    `);


    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS actividad_registro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adulto_rut TEXT NOT NULL,
        estado TEXT NOT NULL CHECK(estado IN ('En movimiento', 'Sedentario')),
        timestamp TEXT NOT NULL,
        duracion_segundos INTEGER,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dispositivo_ble (
        adulto_rut TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        device_name TEXT,
        vinculado_en TEXT NOT NULL,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS frecuencia_cardiaca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adulto_rut TEXT NOT NULL,
        bpm INTEGER NOT NULL,
        fuente TEXT NOT NULL CHECK(fuente IN ('ble', 'simulado')),
        timestamp TEXT NOT NULL,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS oxigeno_sangre (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adulto_rut TEXT NOT NULL,
        porcentaje INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS estres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        valor INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS alertas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        pacienteId TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (pacienteId) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS registro_medico_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        bpm INTEGER NOT NULL,
        spo2 INTEGER NOT NULL,
        estres INTEGER,
        actividad TEXT NOT NULL,
        comentarios TEXT,
        FOREIGN KEY (userId) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    // 7. Manual Clinical Records (for pressure, glucose, temperature)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS registro_clinico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adulto_rut TEXT NOT NULL,
        sistolica INTEGER NOT NULL,
        diastolica INTEGER NOT NULL,
        glucosa INTEGER NOT NULL,
        temperatura REAL NOT NULL,
        notas TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (adulto_rut) REFERENCES adulto_mayor(rut) ON DELETE CASCADE
      );
    `);

    console.log('InnerElders Database schema initialized successfully.');

    // 8. DATABASE SEEDER (Triggered on very first app load if database is empty)
    await seedDefaultData(db);

  } catch (error) {
    console.error('Fatal error during database schema initialization:', error);
    throw error;
  }
}

async function seedDefaultData(db: any): Promise<void> {
  const usersCount = (await db.getFirstAsync('SELECT COUNT(*) as count FROM users')) as { count: number } | null;

  if (usersCount && usersCount.count > 0) {
    console.log('Database already populated. Skipping seeder.');
    return;
  }

  console.log('Empty database detected. Starting seeder with realistic test profiles...');
  const defaultPasswordHash = sha256('Password1!'); // Default password is "Password1!" for all roles

  await db.withTransactionAsync(async () => {
    // 1. Insert seed credential records
    await db.runAsync(
      "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', defaultPasswordHash, 'adulto_mayor', 'Masculino']
    );
    await db.runAsync(
      "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
      ['98.765.432-1', defaultPasswordHash, 'cuidador', 'Femenino']
    );
    await db.runAsync(
      "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
      ['11.111.111-1', defaultPasswordHash, 'medico', 'Prefiero no decirlo']
    );

    // 2. Insert profile details
    await db.runAsync(
      `INSERT INTO adulto_mayor (rut, nombres, apellidos, email, nacimiento, residencia, telefono_emergencia, latitud_segura, longitud_segura, radio_seguro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '12.345.678-9',
        'Acdiel',
        'Bombin',
        'acdiel@innercore.cl',
        '1948-04-25',
        'Metropolitana, Santiago',
        912345678,
        -33.4489,
        -70.6693,
        150.0 // 150m safe radius
      ]
    );

    await db.runAsync(
      `INSERT INTO cuidador (rut, nombres, apellidos, email, nacimiento, residencia, tipo_cuidador, pacientes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '98.765.432-1',
        'María',
        'Vega',
        'maria.cuidadora@innercore.cl',
        '1985-08-15',
        'Metropolitana, Providencia',
        'Profesional',
        '["12.345.678-9"]'
      ]
    );

    await db.runAsync(
      `INSERT INTO medico (rut, nombres, apellidos, email, nacimiento, residencia, pacientes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        '11.111.111-1',
        'Juan',
        'Pérez Rossi',
        'juan.medico@innercore.cl',
        '1975-11-20',
        'Metropolitana, Las Condes',
        '["12.345.678-9"]'
      ]
    );

    // 3. Link records in intermediary tables
    const baseTime = Date.now();
    const days = (d: number) => d * 24 * 60 * 60 * 1000;
    await db.runAsync(
      "INSERT INTO adulto_cuidador (adulto_rut, cuidador_rut, vinculado_en) VALUES (?, ?, ?)",
      ['12.345.678-9', '98.765.432-1', new Date(baseTime - days(10)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO adulto_medico (adulto_rut, medico_rut) VALUES (?, ?)",
      ['12.345.678-9', '11.111.111-1']
    );

    // 4. Seed GPS coordinates logs (around their safe center -33.4489, -70.6693)
    const minutes = (m: number) => m * 60 * 1000;

    await db.runAsync(
      "INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', -33.4489, -70.6693, new Date(baseTime - minutes(60)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', -33.4488, -70.6691, new Date(baseTime - minutes(45)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', -33.4490, -70.6695, new Date(baseTime - minutes(30)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO gps_registro (adulto_rut, latitud, longitud, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', -33.4489, -70.6693, new Date(baseTime - minutes(15)).toISOString()]
    );

    // 5. Seed Activity Logs
    await db.runAsync(
      "INSERT INTO actividad_registro (adulto_rut, estado, timestamp, duracion_segundos) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 'Sedentario', new Date(baseTime - minutes(300)).toISOString(), 7200]
    );
    await db.runAsync(
      "INSERT INTO actividad_registro (adulto_rut, estado, timestamp, duracion_segundos) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 'En movimiento', new Date(baseTime - minutes(180)).toISOString(), 1800]
    );
    await db.runAsync(
      "INSERT INTO actividad_registro (adulto_rut, estado, timestamp, duracion_segundos) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 'Sedentario', new Date(baseTime - minutes(150)).toISOString(), 9000]
    );

    // 6. Seed Heart Rate Logs (including an elevated reading of 89 bpm to trigger caregiver warning!)
    await db.runAsync(
      "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 72, 'ble', new Date(baseTime - minutes(120)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 75, 'ble', new Date(baseTime - minutes(90)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 70, 'ble', new Date(baseTime - minutes(60)).toISOString()]
    );
    await db.runAsync(
      "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 89, 'ble', new Date(baseTime - minutes(15)).toISOString()] // Elevated bpm!
    );
    await db.runAsync(
      "INSERT INTO frecuencia_cardiaca (adulto_rut, bpm, fuente, timestamp) VALUES (?, ?, ?, ?)",
      ['12.345.678-9', 72, 'ble', new Date(baseTime).toISOString()]
    );

    // 7. Seed Clinical Records (Manual entries for weekly historical charts)

    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 118, 76, 102, 36.4, 'Me siento excelente hoy', new Date(baseTime - days(6)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 120, 78, 105, 36.5, 'Todo normal en reposo', new Date(baseTime - days(5)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 122, 80, 108, 36.6, 'Ligera fatiga por la tarde', new Date(baseTime - days(4)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 119, 75, 100, 36.4, 'Estable después de caminar', new Date(baseTime - days(3)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 125, 81, 112, 36.7, 'Consumo de azúcar en almuerzo', new Date(baseTime - days(2)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 128, 82, 118, 36.8, 'Presión y glucosa un poco elevadas', new Date(baseTime - days(1)).toISOString()]
    );
    await db.runAsync(
      `INSERT INTO registro_clinico (adulto_rut, sistolica, diastolica, glucosa, temperatura, notas, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['12.345.678-9', 120, 78, 106, 36.5, 'Mediciones en ayunas perfectas', new Date(baseTime).toISOString()]
    );
  });

  console.log('Database seeded successfully with default test data!');
}
