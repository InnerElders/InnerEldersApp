import * as SQLite from 'expo-sqlite';


let instance: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!instance) {
    instance = SQLite.openDatabaseSync('innerCoreStructData.db');
  }
  return instance;
}

export function resetDBInstance(): void {
  if (instance) {
    instance.closeAsync();
    instance = null;
  }
}
