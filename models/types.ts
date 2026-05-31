// models/types.ts (shared types for all controllers)
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
  psswd: string;
}

export interface Medico {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  nacimiento: string;
  residencia: string;
  pacientes: string;
  psswd: string;
}

export interface Cuidador {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  nacimiento: string;
  residencia: string;
  tipo_cuidador: string;
  pacientes: string;
  psswd: string;
}
