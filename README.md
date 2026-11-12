# Micro-prototipo offline-first

Validación de una arquitectura **offline-first**: la PWA guarda los datos
localmente (IndexedDB con Dexie.js) y los sincroniza con el backend cuando
recupera la red, en orden FIFO y de forma idempotente.

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Base de datos | PostgreSQL local |
| Frontend (PWA) | React + Vite + Tailwind CSS + Dexie.js |

---

## Estructura del proyecto

```
Proyecto de título app/
├── README.md
├── .gitignore
├── backend/                              # ← Etapa 1
│   ├── package.json
│   ├── .env.example                      # plantilla de variables de entorno
│   ├── .env                              # valores locales (no se commitea)
│   ├── scripts/
│   │   ├── 001_create_registros_prueba.sql        # esquema inicial
│   │   ├── 002_add_operation_uuid_registros_prueba.sql  # idempotencia
│   │   └── migrate.js                            # aplica los .sql en orden
│   └── src/
│       ├── server.js                     # arranque y apagado limpio
│       ├── app.js                        # ensamblado de Express + CORS
│       ├── config/
│       │   ├── env.js                    # variables de entorno (.env)
│       │   └── db.js                     # pool de conexión a PostgreSQL
│       ├── shared/errors.js              # ApiError (errores con código HTTP)
│       ├── middleware/
│       │   ├── notFound.js               # 404
│       │   └── errorHandler.js           # errores -> JSON consistente
│       └── modules/registros/
│           ├── registros.routes.js       # rutas
│           ├── registros.controller.js   # puente HTTP <-> servicio
│           ├── registros.service.js      # validación / reglas de negocio
│           └── registros.repository.js   # acceso a datos (SQL parametrizado)
└── frontend/                             # ← Etapa 2 (PWA)
    ├── package.json
    ├── vite.config.js                    # React + Tailwind (puerto 5173)
    ├── index.html
    ├── .env.example                      # VITE_API_URL
    ├── public/
    │   ├── manifest.webmanifest          # manifiesto PWA
    │   ├── icon.svg
    │   └── sw.js                         # service worker (solo producción)
    └── src/
        ├── main.jsx                      # arranque React + registro del SW
        ├── App.jsx                       # pantalla principal
        ├── index.css                     # @import "tailwindcss"
        ├── db/dexie.js                   # PrototipoOfflineDB (IndexedDB)
        ├── services/sync.js              # sincronización FIFO + idempotente
        ├── hooks/useOnline.js            # estado Online / Offline
        └── components/
            ├── EstadoRed.jsx             # indicador de red
            ├── FormularioRegistro.jsx    # alta instantánea en IndexedDB
            ├── BotonSincronizar.jsx      # botón + resumen de sincronización
            └── ListaRegistros.jsx        # lista con badges de estado
```

## Requisitos

- **Node.js 18.17+** (probado con Node 24)
- **PostgreSQL 14+** corriendo en local (puerto 5432)

## Puesta en marcha

### 1. Base de datos (una sola vez)

```powershell
# crear la base (ajusta credenciales a las tuyas)
$env:PGPASSWORD='tu_contraseña'; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE prototipo_db;"
```

### 2. Backend (terminal 1)

```powershell
cd backend
Copy-Item .env.example .env   # ajusta PGUSER / PGPASSWORD / PGDATABASE
npm install
npm run db:migrate            # crea registros_prueba + operation_uuid
npm run dev                   # http://localhost:3001
```

### 3. Frontend / PWA (terminal 2)

```powershell
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

## Cómo probar el flujo offline-first

1. Abre `http://localhost:5173`.
2. Agrega varios registros: aparecen al instante con badge **Pendiente**
   (se guardaron en IndexedDB, no viajaron a la red).
3. En DevTools → **Network** → marca **Offline**:
   - el indicador pasa a **Offline** (ámbar, pulsante);
   - puedes seguir agregando registros;
   - el botón *Sincronizar ahora* queda deshabilitado.
4. Desmarca **Offline**: el indicador pasa a **Online** y la app dispara la
   sincronización automática (o usa *Sincronizar ahora*).
5. Los badges cambian a **Sincronizado** y los registros llegan a PostgreSQL:

```sql
SELECT id, operation_uuid, contenido, estado, creado_en FROM registros_prueba ORDER BY id;
```

6. Recarga la página: la lista se reconstruye desde IndexedDB
   (`PrototipoOfflineDB`) sin depender de la red.

**Probar idempotencia:** si la sincronización se interrumpe (apaga el
backend con la cola a mitad) y la repites, el servidor responde
`200 duplicado: true` y no crea filas repetidas.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y de la conexión a la BD (`200` / `503`) |
| `POST` | `/api/registros` | Crea un registro. Cuerpo: `{ "operation_uuid"?: uuid_v4, "contenido": "...", "estado"?: "pendiente" }` → `201` creado · `200` si el `operation_uuid` ya existía (`duplicado: true`) |
| `GET` | `/api/registros` | Lista registros (query: `estado`, `limite`) |

Respuesta exitosa del `POST`:

```json
{
  "ok": true,
  "duplicado": false,
  "registro": {
    "id": "1",
    "operation_uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "contenido": "Primer registro sincronizado desde la PWA",
    "estado": "pendiente",
    "creado_en": "2026-11-12T20:52:36.026Z"
  }
}
```

Errores (siempre con esta forma):

```json
{ "ok": false, "error": "mensaje descriptivo" }
```

## Modelos de datos

### PostgreSQL · tabla `registros_prueba`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | `BIGSERIAL` | PRIMARY KEY (autogenerado) |
| `operation_uuid` | `UUID` | Úndice único parcial → idempotencia (Etapa 2) |
| `contenido` | `TEXT` | NOT NULL |
| `estado` | `TEXT` | NOT NULL, DEFAULT `'pendiente'`, CHECK ∈ (`pendiente`, `procesado`, `error`) |
| `creado_en` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |

### IndexedDB · base `PrototipoOfflineDB`, tabla `registros`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number (`++id`) | clave local autoincremental (orden FIFO) |
| `operation_uuid` | string | UUID v4 único por registro (idempotencia) |
| `contenido` | string | texto del registro |
| `estado` | string | estado local: `pendiente` · `error` · `sincronizado` |
| `creado_offline_en` | string (ISO) | fecha de creación en el cliente |
| `sincronizado` | boolean | `false` = en cola; no se indexa (IndexedDB no admite booleanos como clave) |

## Decisiones de diseño

**Backend**

- **Capas** `ruta → controlador → servicio → repositorio`: el SQL queda
  aislado y las reglas de negocio son fáciles de extender en la Etapa 3.
- **Idempotencia** con `ON CONFLICT (operation_uuid) DO NOTHING`: un reintento
  devuelve el registro existente (`200` + `duplicado: true`) en vez de duplicar.
- **Consultas parametrizadas** (`$1`, `$2`) en todo el repositorio.
- **CORS abierto** (`cors()` en `app.js`): la PWA corre en otro origen
  (Vite `5173`); verificado con preflight `OPTIONS → 204`.
- **`.env` + `env.js`**: configuración fuera del código; logs sin contraseña.
- **Migraciones idempotentes**: los `.sql` usan `IF NOT EXISTS` y se aplican
  con `npm run db:migrate` en orden alfabético.

**Frontend**

- **Escritura siempre local**: el formulario solo toca Dexie.js; nunca espera
  a la red, por eso funciona igual con `Offline` marcado.
- **Cola FIFO** por `id` local ascendente, enviada **secuencialmente** para
  preservar el orden.
- **Corte de cola**: si la red se cae a mitad del envío, se detiene y lo
  restante queda `pendiente` (sin marcar `error`).
- **Disparo automático** al recuperar la conexión (evento `online`) y al
  abrir la app; con candado para evitar sincronizaciones simultáneas.
- **UI reactiva** con `useLiveQuery` de `dexie-react-hooks`: cada cambio en
  IndexedDB re-renderiza la lista.
- **Service worker** (solo producción) cachea el shell de la app; los datos
  viven en IndexedDB, no en el caché.

## Roadmap

- **Etapa 1** ✅ — backend, esquema y endpoint de recepción.
- **Etapa 2** ✅ — PWA con Dexie.js, indicador de red, cola FIFO e idempotente.
- **Etapa 3** — reconciliación de estados, métricas de la sincronización y
  casos borde (conflictos, reintentos con backoff).
