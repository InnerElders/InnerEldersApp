// db/types.ts (shared types for all database models and controllers)

export interface User {
  rut: string;
  psswd_hash: string;
  role: 'adulto_mayor' | 'cuidador' | 'medico';
  genero?: string;
}

export interface AdultoMayor {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  nacimiento: string;
  residencia: string;
  telefono_emergencia: number;
  latitud_segura: number;
  longitud_segura: number;
  radio_seguro: number;
}

export interface Cuidador {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  nacimiento: string;
  residencia: string;
  tipo_cuidador: string;
  pacientes: string; // Serialized JSON string array e.g. '["12345678-9"]'
}

export interface Medico {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  nacimiento: string;
  residencia: string;
  pacientes: string; // Serialized JSON string array e.g. '["12345678-9"]'
}

export interface RegistroGPS {
  id?: number;
  adulto_rut: string;
  latitud: number;
  longitud: number;
  timestamp: string; // ISO 8601
}

export interface RegistroActividad {
  id?: number;
  adulto_rut: string;
  estado: 'En movimiento' | 'Sedentario';
  timestamp: string; // ISO 8601
  duracion_segundos: number | null;
}

export interface DispositivoBLE {
  adulto_rut: string;
  device_id: string;
  device_name: string | null;
  vinculado_en: string; // ISO 8601
}

export interface FrecuenciaCardiaca {
  id?: number;
  adulto_rut: string;
  bpm: number;
  fuente: 'ble' | 'simulado';
  timestamp: string; // ISO 8601
}

export interface RegistroOxigeno {
  id?: number;
  adulto_rut: string;
  porcentaje: number;
  timestamp: string; // ISO 8601
}

export interface RegistroEstres {
  id?: number;
  adulto_rut: string;
  nivel: number;
  timestamp: string; // ISO 8601
}

export interface RegistroClinico {
  id?: number;
  adulto_rut: string;
  sistolica: number;
  diastolica: number;
  glucosa: number;
  temperatura: number;
  notas: string | null;
  timestamp: string; // ISO 8601
}
