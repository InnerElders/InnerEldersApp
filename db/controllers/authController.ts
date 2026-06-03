import { getDB } from '../dbInstance';
import { AdultoMayor, Cuidador, Medico, User } from '../types';

// Pure JS SHA-256 implementation
export function sha256(ascii: string): string {
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

export const authController = {
  /**
   * Register a new Adulto Mayor (RUT, profile + password).
   */
  async registerAdult(adulto: Omit<AdultoMayor, 'latitud_segura' | 'longitud_segura' | 'radio_seguro'> & { psswd: string; genero: string }): Promise<void> {
    const db = getDB();
    const psswdHash = sha256(adulto.psswd);

    await db.withTransactionAsync(async () => {
      // 1. Insert credentials in users
      await db.runAsync(
        "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
        [adulto.rut, psswdHash, 'adulto_mayor', adulto.genero]
      );

      // 2. Insert profile in adulto_mayor
      await db.runAsync(
        `INSERT INTO adulto_mayor (
          rut, nombres, apellidos, email, nacimiento, residencia,
          telefono_emergencia, latitud_segura, longitud_segura, radio_seguro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0)`,
        [
          adulto.rut,
          adulto.nombres,
          adulto.apellidos,
          adulto.email,
          adulto.nacimiento,
          adulto.residencia,
          adulto.telefono_emergencia
        ]
      );
    });
  },

  /**
   * Register a new Cuidador.
   */
  async registerCaregiver(cuidador: Omit<Cuidador, 'pacientes'> & { psswd: string; genero: string }): Promise<void> {
    const db = getDB();
    const psswdHash = sha256(cuidador.psswd);

    await db.withTransactionAsync(async () => {
      // 1. Insert credentials in users
      await db.runAsync(
        "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
        [cuidador.rut, psswdHash, 'cuidador', cuidador.genero]
      );

      // 2. Insert profile in cuidador
      await db.runAsync(
        `INSERT INTO cuidador (
          rut, nombres, apellidos, email, nacimiento, residencia,
          tipo_cuidador, pacientes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`,
        [
          cuidador.rut,
          cuidador.nombres,
          cuidador.apellidos,
          cuidador.email,
          cuidador.nacimiento,
          cuidador.residencia,
          cuidador.tipo_cuidador
        ]
      );
    });
  },

  /**
   * Register a new Médico.
   */
  async registerDoctor(medico: { rut: string; nombres: string; apellidos: string; psswd: string; genero: string }): Promise<void> {
    const db = getDB();
    const psswdHash = sha256(medico.psswd);

    await db.withTransactionAsync(async () => {
      // 1. Insert credentials in users
      await db.runAsync(
        "INSERT INTO users (rut, psswd_hash, role, genero) VALUES (?, ?, ?, ?)",
        [medico.rut, psswdHash, 'medico', medico.genero]
      );

      // 2. Insert profile in medico
      await db.runAsync(
        `INSERT INTO medico (
          rut, nombres, apellidos, email, nacimiento, residencia, pacientes
        ) VALUES (?, ?, ?, NULL, '1980-01-01', 'Metropolitana, Santiago', '[]')`,
        [
          medico.rut,
          medico.nombres,
          medico.apellidos
        ]
      );
    });
  },

  /**
   * Authenticate a user by RUT and Password.
   * Returns `{ rut, role, nombres }` on success, or `null` if credentials are invalid.
   */
  async authenticateUser(rut: string, psswd: string): Promise<{ rut: string; role: 'adulto_mayor' | 'cuidador' | 'medico'; nombres: string } | null> {
    const db = getDB();
    const psswdHash = sha256(psswd);

    // 1. Find user credential
    const user = await db.getFirstAsync<User>(
      "SELECT * FROM users WHERE rut = ?",
      [rut]
    );

    if (!user || user.psswd_hash !== psswdHash) {
      return null;
    }

    // 2. Load names from corresponding profile table
    let nombres = '';
    if (user.role === 'adulto_mayor') {
      const profile = await db.getFirstAsync<Pick<AdultoMayor, 'nombres'>>(
        "SELECT nombres FROM adulto_mayor WHERE rut = ?",
        [rut]
      );
      nombres = profile ? profile.nombres : 'Adulto Mayor';
    } else if (user.role === 'cuidador') {
      const profile = await db.getFirstAsync<Pick<Cuidador, 'nombres'>>(
        "SELECT nombres FROM cuidador WHERE rut = ?",
        [rut]
      );
      nombres = profile ? profile.nombres : 'Cuidador';
    } else if (user.role === 'medico') {
      const profile = await db.getFirstAsync<Pick<Medico, 'nombres'>>(
        "SELECT nombres FROM medico WHERE rut = ?",
        [rut]
      );
      nombres = profile ? profile.nombres : 'Médico';
    }

    return {
      rut: user.rut,
      role: user.role,
      nombres: nombres
    };
  }
};
