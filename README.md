# Como instanciar la applicacion para desarrollo 👋

## Primero 

1. Instalar dependencias con:

   ```bash
   pnpm install
   ```

2. Comenzar la app con> 

   ```bash
   - pnpm run android #Se puede usar el codigo qr o emulacion de android.
   - pnpm run ios # Para mac se necesita un equipo Apple.
   - pnpm run web #Para correr aplicacion en navegador web por defecto.
   ```


## Documentacion general

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

Se puede comenzar a programar desde carpeta **app** . El projecto utilizar por defecto  [file-based routing](https://docs.expo.dev/router/introduction).

## Reinicar projecto

Con este comando se elimina todo lo del projecto para reninicarlo desde cero.

```bash
pnpm run reset-project
```
Esto sirve para generar un ambiente nuevo desde cero, con la pagina por defecto que entrega expo go.


## Aprender mas sobre expo go

- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)

## Commando que pueden servir para el futuro:

```bash
npx expo install --pnpm <package-name>
```
