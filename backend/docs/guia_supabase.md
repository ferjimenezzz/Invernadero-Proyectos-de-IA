# Guía: crear el Supabase del equipo y conectarlo

Paso a paso para dejar funcionando el backend contra un proyecto **Supabase Free** propio. Cada paso termina con una comprobación; no avances si la comprobación falla. Todos los comandos se corren dentro de `backend/`.

> **Regla de oro:** contraseñas, llaves y cadenas de conexión van **solo** en `backend/.env`. Nunca en el repo, en un chat, en un documento ni en una captura de pantalla.

Tiempo estimado: 20–30 minutos.

---

## 0. Antes de empezar

| Necesitas | Cómo comprobarlo |
|---|---|
| Node.js 22 o superior | `node -v` |
| Dependencias instaladas | `npm install` (una vez) |
| Cliente `psql` de PostgreSQL 18 (para instalar el SQL y respaldar) | `"C:\Program Files\PostgreSQL\18\bin\psql.exe" --version` |
| Una cuenta en [supabase.com](https://supabase.com) (puede ser con GitHub) | — |

Sin `psql` también se puede instalar el SQL desde el navegador (ver 4-B), pero el respaldo (`npm run respaldo`) sí lo necesita.

## 1. Crear el proyecto

1. En el panel de Supabase: **New project**.
2. **Name:** `invernadero-albahaca` (o el que quieran). **Plan:** Free.
3. **Database Password:** pulsa *Generate a password* y **guárdala en un gestor de contraseñas**; la vas a necesitar en el paso 3 y Supabase no la vuelve a mostrar. Si la escribes tú, usa solo letras y números: los símbolos (`@ # / ? %`) rompen la cadena de conexión.
4. **Region:** la más cercana, por ejemplo *East US (North Virginia)*.
5. **Create new project** y espera 1–2 minutos a que diga *Healthy*.

✅ El proyecto aparece en el panel sin el aviso de "Setting up project".

## 2. Copiar el `.env`

```powershell
Copy-Item .env.example .env
```

Abre `backend/.env` en el editor; los siguientes pasos lo van llenando.

### Atajo: pasos 3, 5 y 6 con un script

Si no quieres copiar cada valor a mano:

1. Crea un token personal en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). Dale acceso **solo al proyecto** del invernadero, permisos de lectura y escritura y la caducidad más corta.
2. En `backend/.env` llena `SUPABASE_ACCESS_TOKEN` con el token y `SUPABASE_DB_PASSWORD` con la contraseña del paso 1.
3. Corre:

   ```powershell
   node scripts/configurar_supabase.js
   ```

   Espera a que el proyecto esté listo y escribe en `.env` `SUPABASE_URL`, las dos llaves y `SUPABASE_DB_URL` (Session pooler). Además expone `inv` (paso 5) y desactiva el registro público (paso 6). No imprime ningún secreto. Si el proyecto no se llama `invernadero-albahaca`, pasa el nombre como argumento.
4. Borra el token del `.env` y **revócalo** en la misma página donde lo creaste.

Luego sigue con la comprobación del final del paso 3 y con el paso 4.

## 3. Llaves y cadena de conexión

### 3.1 URL y llaves de la API

En **Project Settings → API Keys**:

| Variable del `.env` | De dónde sale |
|---|---|
| `SUPABASE_URL` | **Project Settings → Data API → Project URL** (`https://<ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | La llave **publishable** (`sb_publishable_...`), o en la pestaña *Legacy API keys* la `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | La llave **secret** (`sb_secret_...`, pulsa *Reveal*), o en *Legacy API keys* la `service_role` |

Cualquiera de los dos juegos (nuevo o *legacy*) sirve. La `secret`/`service_role` se salta todos los permisos: solo la usa el suscriptor y nunca va en una app.

### 3.2 Cadena de conexión para `psql` y `pg_dump`

Botón **Connect** (arriba en el panel) → pestaña **Connection string** → tipo **URI** → **Session pooler**. Copia la cadena:

```
postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Pégala en `SUPABASE_DB_URL` y **reemplaza `[YOUR-PASSWORD]` (con todo y corchetes)** por la contraseña del paso 1.

- Usa **Session pooler** (puerto 5432). La *Direct connection* solo funciona por IPv6 y falla en casi todas las redes de casa y escuela; el *Transaction pooler* (6543) no sirve para `pg_dump`.
- Si la contraseña tiene símbolos, codifícalos: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `?` → `%3F`, `%` → `%25`.

### 3.3 PostgreSQL local (opcional)

`LOCAL_DB_URL` y `PG_BIN` solo se usan para `npm run test:bd` y para restaurar el respaldo. Pon la contraseña de tu PostgreSQL local en lugar de `CAMBIA_ESTO`.

✅ Comprueba que la cadena funciona (no imprime la contraseña):

```powershell
node -e "process.loadEnvFile('.env'); const u=new URL(process.env.SUPABASE_DB_URL); console.log(u.hostname, u.port, u.username, u.password ? 'con contraseña' : 'SIN CONTRASEÑA')"
```

Debe mostrar algo como `aws-0-us-east-1.pooler.supabase.com 5432 postgres.<ref> con contraseña`.

## 4. Instalar el esquema `inv`

### 4-A. Con `psql` (recomendado)

```powershell
node scripts/psql.js --supabase bd/invernadero_bd.sql bd/supabase.sql
```

Debe terminar con:

```
OK    bd/invernadero_bd.sql
OK    bd/supabase.sql
```

- Si `pg_cron` no estuviera disponible verás un `NOTICE` y la purga de 7 días habrá que correrla a mano (ver README, *Operación*). No es un error.
- `invernadero_bd.sql` **no se puede correr dos veces**. Si falló a la mitad, su transacción ya se deshizo: corrige la causa y vuelve a correrlo. Si ya había terminado y quieres empezar de cero, en el *SQL Editor*: `DROP SCHEMA inv CASCADE;` (borra **todos** los datos del esquema).
- `supabase.sql` sí se puede repetir sin problema.
- **Nunca** corras `bd/pruebas/stub_supabase.sql` en Supabase.

### 4-B. Sin `psql` (SQL Editor del navegador)

1. **SQL Editor → New query**, pega el contenido completo de `bd/invernadero_bd.sql` y pulsa **Run**. Debe decir *Success. No rows returned*.
2. Nueva query con `bd/supabase.sql` → **Run**.

✅ En el *SQL Editor*:

```sql
SELECT count(*) AS tablas FROM pg_tables WHERE schemaname = 'inv';   -- 18
SELECT codigo FROM inv.nodo;                                         -- invernadero_albahaca_01
SELECT jobname, schedule FROM cron.job;                              -- purgar-payload-inv | 0 9 * * *
```

## 5. Exponer el esquema `inv` a la API

**Project Settings → Data API → Exposed schemas** → agrega `inv` (deja `public`) → **Save**.

Sin esto todo lo que pase por la API responde `PGRST106` ("The schema must be one of the following...").

✅ Desde PowerShell, con la llave publishable/anon:

```powershell
node -e "process.loadEnvFile('.env'); fetch(process.env.SUPABASE_URL+'/rest/v1/nodo?select=codigo',{headers:{apikey:process.env.SUPABASE_ANON_KEY,'Accept-Profile':'inv'}}).then(r=>r.text()).then(console.log)"
```

- `"code":"42501"` (*permission denied for schema inv*): **correcto**. El esquema está expuesto y `anon` no tiene acceso, como debe ser.
- `"code":"PGRST106"`: el esquema no está expuesto; revisa este paso.

## 6. Cerrar el registro público

**Authentication → Sign In / Providers → User Signups** → desactiva **Allow new users to sign up** → **Save**.

Así nadie puede crearse una cuenta con la llave pública. Las cuentas de equipo del paso 7 se crean con la API de administración y no se ven afectadas.

## 7. Crear las cuentas de equipo

```powershell
npm run usuarios
```

Crea `eq-app` (OPERADOR), `eq-automatizacion`, `eq-conectividad`, `eq-hardware` y `prueba-lector` (LECTOR) con correos `@invernadero.test`, les asigna su rol y **escribe correos y contraseñas en tu `.env`** (no las imprime). Volver a correrlo no cambia contraseñas; `npm run usuarios -- --reset` las regenera todas.

✅ **Authentication → Users** muestra las 5 cuentas, y en el *SQL Editor*:

```sql
SELECT email, rol FROM inv.usuario ORDER BY email;
```

## 8. Arrancar y probar

```powershell
npm run api
```

En otra terminal:

```powershell
curl.exe http://localhost:3000/
curl.exe http://localhost:3000/dispositivos
curl.exe http://localhost:3000/api/v1/telemetry/live
```

- `/` responde `{"ok":true}`.
- `/dispositivos` responde una lista JSON (sin lecturas todavía).
- Si responde **503**, revisa la tabla de *Solución de problemas* del README.

### Prueba de punta a punta sin hardware

Tres terminales:

```powershell
npm run broker
```

```powershell
npm run suscriptor
```

```powershell
npm run simular -- --validos 12 --invalidos --intervalo 1000
```

✅ El suscriptor imprime una línea por mensaje y en el *SQL Editor*:

```sql
SELECT count(*) FROM inv.paquete;     -- 15 (12 válidos + 3 inválidos)
SELECT count(*) FROM inv.medicion;    -- > 0
SELECT id, error_procesamiento FROM inv.paquete
 WHERE error_procesamiento IS NOT NULL;   -- los mensajes con error de formato, registrados
```

Ahora `curl.exe http://localhost:3000/mediciones/actual` ya trae valores.

## 9. Primer respaldo

```powershell
npm run respaldo
```

Hace `pg_dump` del esquema a `backups/`, lo restaura en tu PostgreSQL local y compara conteos (necesita `LOCAL_DB_URL`). Copia el archivo de `backups/` al Google Drive del equipo: Supabase Free no tiene respaldos automáticos.

## 10. Dar acceso a los otros equipos

Cada equipo recibe, **por mensaje privado** (no en el grupo, no en el repo):

| Equipo | Recibe |
|---|---|
| Aplicación | La IP de la laptop con el adaptador: `EXPO_PUBLIC_API_URL=http://<IP>:3000`. No necesita llaves. |
| Automatización, Conectividad, Hardware | `SUPABASE_URL`, la llave **publishable/anon** y el correo y contraseña de su cuenta `eq-*` (están en tu `.env`). **Nunca** la `secret`/`service_role`. |

Cómo usan PostgREST está en [`API.md`](API.md).

## Si algo sale mal

| Síntoma | Causa |
|---|---|
| `password authentication failed` | Quedó `[YOUR-PASSWORD]` en la cadena, la contraseña es otra o tiene símbolos sin codificar. Se puede cambiar en **Project Settings → Database → Reset database password**. |
| `could not translate host name` o se queda colgado | Usaste la *Direct connection* (IPv6). Cambia a **Session pooler**. |
| `Tenant or user not found` | El usuario de la cadena debe ser `postgres.<ref>`, no solo `postgres`. |
| `relation "..." already exists` al instalar | `invernadero_bd.sql` ya estaba instalado. Ver 4-A. |
| `PGRST106` | Falta el paso 5. |
| `npm run usuarios` falla con `Invalid API key` | `SUPABASE_SERVICE_ROLE_KEY` tiene la llave pública en vez de la secreta, o le sobran espacios. |
| El proyecto no responde tras unos días | Supabase Free pausa tras 1 semana sin uso: **Restore project** en el panel. |
