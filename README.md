# FitTrack — Gestión de Rutinas de Entrenamiento

Aplicación web full-stack para la gestión de rutinas de entrenamiento físico. Permite a administradores, coaches, usuarios y apoderados interactuar con planes de entrenamiento, seguimiento de progreso y supervisión de alumnos.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Roles y permisos](#roles-y-permisos)
- [Funcionalidades por rol](#funcionalidades-por-rol)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Cambio de servidor](#cambio-de-servidor)
- [API REST](#api-rest)
- [Seguridad](#seguridad)

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 18 | UI |
| TypeScript | 5.4 | Tipado estático |
| TailwindCSS | 3.4 | Estilos |
| Vite | 5.2 | Build tool |
| React Router | 6.22 | Navegación SPA |
| Axios | 1.6 | HTTP client |

### Backend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js + Express | 4.18 | API REST |
| TypeScript | 5.4 | Tipado estático |
| Prisma ORM | 5.10 | Acceso a base de datos |
| MySQL | 8.0 | Base de datos |
| JWT | — | Autenticación (access 15min + refresh 7d) |
| bcryptjs | — | Hash de contraseñas |
| Zod | 3.22 | Validación de esquemas |
| Multer | — | Subida de archivos (videos) |

### Infraestructura
| Componente | Descripción |
|-----------|-------------|
| Docker + Docker Compose | Orquestación de servicios |
| Nginx | Servidor web + proxy inverso al backend |

---

## Arquitectura

```
Cliente (navegador)
       │ :80
       ▼
  ┌─────────┐
  │  Nginx  │  Sirve el frontend React + hace proxy de /api/* y /uploads/*
  └────┬────┘
       │ :3001 (red interna Docker)
       ▼
  ┌──────────┐
  │ Backend  │  Express + Prisma
  │ (Node.js)│
  └────┬─────┘
       │ :3306 (red interna Docker)
       ▼
  ┌─────────┐
  │  MySQL  │
  └─────────┘
```

**Puertos expuestos al exterior:** solo el **80** (HTTP). Los puertos 3001 y 3306 permanecen cerrados al exterior.

---

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `ADMINISTRADOR` | Acceso total. Gestiona usuarios, ejercicios y logs del sistema |
| `COACH` | Crea y gestiona rutinas, hace seguimiento de sus alumnos asignados |
| `USUARIO` | Visualiza y registra el progreso de su propia rutina |
| `APODERADO` | Supervisa el progreso de uno o más usuarios a su cargo |

### Flujo de primer ingreso

1. El administrador crea el usuario → se genera una **contraseña temporal**
2. El usuario inicia sesión → es redirigido obligatoriamente a **cambiar la contraseña**
3. Si el perfil está incompleto (nombre, apellido, RUT, teléfono) → es redirigido a **completar el perfil**
4. Recién entonces accede al dashboard

---

## Funcionalidades por rol

### Administrador
- CRUD completo de usuarios (crear, editar, bloquear/activar, resetear contraseña)
- Importación masiva de usuarios desde Excel/CSV
- Asignación de coaches a usuarios
- Asignación de apoderados a usuarios supervisados
- Gestión de ejercicios (crear, editar, activar/desactivar)
- **Log de intentos de login fallidos** (últimos 30 días): correo, IP, motivo, fecha

### Coach
- Creación y gestión de rutinas semanales/mensuales para sus alumnos
- Asignación de ejercicios por día con repeticiones u objetivos de tiempo
- Seguimiento del progreso de cada alumno
- Calificación de rutinas (nota 1.0 – 7.0)
- Reportes de avance

### Usuario
- Visualización de su rutina activa
- Registro de progreso por ejercicio (repeticiones realizadas / tiempo)
- Historial de avance

### Apoderado
- Visualización del progreso de sus supervisados
- Actualización de lesiones o condiciones físicas del supervisado

---

## Estructura del proyecto

```
NewAPPFitness/
├── docker-compose.yml          # Orquestación: mysql + backend + frontend
├── .env                        # Variables de entorno (no subir a git)
├── .env.example                # Plantilla de variables
├── data/                       # Volumen de datos MySQL (generado en runtime)
├── uploads/                    # Videos de ejercicios subidos
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos de base de datos
│   │   └── seed.ts             # Seed: crea el admin inicial
│   └── src/
│       ├── app.ts              # Entry point, rutas y middlewares
│       ├── controllers/        # Manejo de requests HTTP
│       ├── services/           # Lógica de negocio
│       ├── routes/             # Definición de endpoints
│       ├── middlewares/        # Auth, roles, errores, uploads
│       ├── validators/         # Esquemas Zod
│       ├── utils/              # JWT, password, response helpers
│       ├── types/              # Tipos TypeScript compartidos
│       └── lib/
│           └── prisma.ts       # Cliente Prisma singleton
│
└── frontend/
    ├── nginx.conf              # Configuración Nginx (producción)
    └── src/
        ├── App.tsx             # Rutas SPA
        ├── context/
        │   └── AuthContext.tsx # Estado global de autenticación
        ├── pages/
        │   ├── auth/           # Login, registro, cambio de clave, completar perfil
        │   ├── admin/          # Usuarios, importación, logs de acceso
        │   ├── exercises/      # Gestión de ejercicios
        │   ├── routines/       # Rutinas (manager, seguimiento, reporte)
        │   ├── user/           # Rutina del usuario
        │   ├── apoderado/      # Supervisados
        │   └── profile/        # Perfil propio
        ├── components/
        │   ├── layout/         # Layout, Sidebar, ProtectedRoute
        │   └── common/         # Modal, Alert, LoadingSpinner, RoleBadge
        ├── services/           # Clientes HTTP (api.ts + servicios por dominio)
        └── types/              # Interfaces TypeScript
```

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```env
# ── MySQL ─────────────────────────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=           # Contraseña root de MySQL
MYSQL_DATABASE=fitness_app     # Nombre de la base de datos
MYSQL_USER=fittrack            # Usuario de la aplicación
MYSQL_PASSWORD=                # Contraseña del usuario

# ── Base de datos (solo para desarrollo local sin Docker) ─────────────────────
DATABASE_URL="mysql://fittrack:PASSWORD@localhost:3306/fitness_app"

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET=                    # Secreto para access token (generar valor largo y aleatorio)
JWT_REFRESH_SECRET=            # Secreto para refresh token (diferente al anterior)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Servidor ──────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URL=http://IP_DEL_SERVIDOR:80   # ← IP o dominio del servidor

# ── Uploads ───────────────────────────────────────────────────────────────────
UPLOAD_DIR=uploads

# ── Frontend ──────────────────────────────────────────────────────────────────
VITE_API_URL=                  # Dejar vacío en producción con Docker (Nginx hace el proxy)

# ── Seed: admin inicial ───────────────────────────────────────────────────────
SEED_ADMIN_CORREO=admin@tudominio.cl
SEED_ADMIN_PASSWORD=           # Cambiar después del primer login
SEED_ADMIN_NOMBRE=Administrador
SEED_ADMIN_APELLIDO=Principal
SEED_ADMIN_RUT=12345678-9
SEED_ADMIN_TELEFONO=+56912345678

# ── Ejecutar seed al arrancar (true solo en el primer deploy) ─────────────────
RUN_SEED=true
```

> **Importante:** `VITE_API_URL` es leído en tiempo de build por Vite. En producción con Docker y Nginx como proxy se deja vacío — el frontend usa rutas relativas `/api/...` que Nginx redirige al backend.

---

## Instalación y ejecución

### Requisitos previos
- Docker Desktop instalado y corriendo
- Puerto **80** abierto en el firewall del servidor

### Primer deploy (inicio limpio)

```bash
# 1. Clonar o copiar el proyecto al servidor
# 2. Crear el archivo de variables de entorno
cp .env.example .env
# Editar .env con los valores reales (especialmente IP del servidor y contraseñas)

# 3. Asegurarse de que la carpeta data/ esté vacía
rm -rf data/*

# 4. Levantar los contenedores (construye las imágenes y arranca)
docker compose up --build -d

# 5. Verificar que los contenedores estén corriendo
docker compose ps
```

Al arrancar por primera vez, el backend ejecuta automáticamente:
1. `prisma db push` — crea todas las tablas en MySQL
2. Seed — crea el usuario administrador con los datos del `.env`

### Después del primer arranque

```bash
# En .env, cambiar:
RUN_SEED=false

# Reiniciar solo el backend para aplicar el cambio
docker compose restart backend
```

### Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Reiniciar todos los servicios
docker compose restart

# Detener todo
docker compose down

# Detener y eliminar volúmenes (¡borra la base de datos!)
docker compose down -v

# Reconstruir imágenes sin usar caché
docker compose build --no-cache
```

---

## Cambio de servidor

**Solo modificar en `.env`:**

```env
FRONTEND_URL=http://NUEVA_IP:80
```

`VITE_API_URL` puede dejarse vacío si se usa el mismo setup con Nginx.

Luego reconstruir el frontend para que tome la nueva URL:

```bash
docker compose build frontend
docker compose up -d frontend
```

El archivo [nginx.conf](frontend/nginx.conf) y el resto del código **no requieren cambios** — usan nombres internos de Docker (`http://backend:3001`) que no dependen de la IP del servidor.

---

## API REST

Base URL: `http://IP_SERVIDOR/api`

### Autenticación (`/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/register` | Registrarse | No |
| POST | `/auth/refresh` | Renovar access token | No |
| POST | `/auth/change-password` | Cambiar contraseña | Sí |
| GET | `/auth/me` | Obtener usuario autenticado | Sí |

### Usuarios (`/users`)

| Método | Endpoint | Descripción | Rol requerido |
|--------|----------|-------------|---------------|
| GET | `/users` | Listar usuarios | ADMINISTRADOR |
| POST | `/users` | Crear usuario | ADMINISTRADOR |
| POST | `/users/import` | Importar usuarios masivo | ADMINISTRADOR |
| GET | `/users/:id` | Obtener usuario | ADMINISTRADOR |
| PUT | `/users/:id` | Actualizar usuario | ADMINISTRADOR |
| PATCH | `/users/:id/toggle-activo` | Bloquear / activar | ADMINISTRADOR |
| POST | `/users/:id/reset-password` | Resetear contraseña | ADMINISTRADOR |
| GET | `/users/:id/supervisados` | Ver supervisados | ADMINISTRADOR |
| PUT | `/users/:id/supervisados` | Asignar supervisados | ADMINISTRADOR |
| GET | `/users/coaches` | Listar coaches activos | ADMINISTRADOR, COACH |
| GET | `/users/my-users` | Usuarios del coach | COACH |
| PUT | `/users/profile/complete` | Completar perfil | Autenticado |
| PUT | `/users/profile` | Actualizar perfil | Autenticado |
| PUT | `/users/profile/password` | Cambiar contraseña | Autenticado |
| PUT | `/users/:id/lesiones` | Actualizar lesiones | APODERADO |

### Ejercicios (`/exercises`)

| Método | Endpoint | Descripción | Rol requerido |
|--------|----------|-------------|---------------|
| GET | `/exercises` | Listar ejercicios | ADMINISTRADOR, COACH |
| POST | `/exercises` | Crear ejercicio | ADMINISTRADOR, COACH |
| PUT | `/exercises/:id` | Actualizar ejercicio | ADMINISTRADOR, COACH |
| PATCH | `/exercises/:id/toggle` | Activar / desactivar | ADMINISTRADOR, COACH |
| POST | `/exercises/:id/video` | Subir video | ADMINISTRADOR, COACH |

### Rutinas (`/routines`)

| Método | Endpoint | Descripción | Rol requerido |
|--------|----------|-------------|---------------|
| GET | `/routines` | Listar rutinas | COACH |
| POST | `/routines` | Crear rutina | COACH |
| GET | `/routines/:id` | Obtener rutina | COACH, USUARIO |
| PUT | `/routines/:id` | Actualizar rutina | COACH |
| DELETE | `/routines/:id` | Eliminar rutina | COACH |
| GET | `/routines/my` | Rutina activa del usuario | USUARIO |

### Progreso (`/progress`)

| Método | Endpoint | Descripción | Rol requerido |
|--------|----------|-------------|---------------|
| GET | `/progress/:rutinaId` | Progreso de una rutina | Autenticado |
| POST | `/progress` | Registrar progreso | USUARIO |

### Logs de acceso (`/admin/login-logs`)

| Método | Endpoint | Descripción | Rol requerido |
|--------|----------|-------------|---------------|
| GET | `/admin/login-logs` | Listar intentos fallidos | ADMINISTRADOR |

Parámetros opcionales: `correo`, `motivo`, `pagina`

---

## Seguridad

### Autenticación JWT
- **Access token:** expira en 15 minutos
- **Refresh token:** expira en 7 días, se usa para renovar el access token automáticamente
- Los tokens se almacenan en `localStorage` del navegador

### Protección de rutas
- Todas las rutas del backend verifican el JWT en el header `Authorization: Bearer <token>`
- Las rutas de admin verifican adicionalmente que el rol sea `ADMINISTRADOR`
- El frontend redirige automáticamente si el token expira

### Bloqueo por intentos fallidos
- Después de **10 intentos de contraseña incorrecta**, la cuenta se bloquea automáticamente (`activo = false`)
- El contador se resetea al iniciar sesión correctamente
- El administrador puede desbloquear la cuenta desde el panel de usuarios

### Log de intentos
- Cada intento fallido queda registrado en la tabla `error_login_logs` con: correo, IP de origen, motivo y timestamp
- Los registros se eliminan automáticamente después de **30 días**
- Motivos registrados: `USUARIO_NO_EXISTE`, `CONTRASENA_INCORRECTA`, `CUENTA_BLOQUEADA`, `BLOQUEADO_POR_INTENTOS`

### Contraseñas temporales
- Al crear un usuario, se genera una contraseña temporal aleatoria
- Se muestra **una sola vez** al administrador
- El usuario está obligado a cambiarla en su primer ingreso

### Perfil incompleto
- Un usuario sin nombre, apellido, RUT y teléfono no puede acceder a la aplicación hasta completar su perfil
- Solo tiene acceso a la página `/complete-profile`

### Medidas implementadas (auditoría marzo 2026)
- **Helmet:** headers de seguridad HTTP en todas las respuestas (CSP, X-Frame-Options, NOSNIFF, etc.)
- **Rate limiting global:** 300 requests / 15 min por IP
- **Rate limiting en login:** 20 intentos / 15 min por IP (además del bloqueo por cuenta)
- **CORS estricto:** solo orígenes de la whitelist configurada en `FRONTEND_URL`
- **JWT con algoritmo explícito:** HS256 forzado en firma y verificación
- **Uploads:** extensión AND mime type deben coincidir (antes era OR); límite reducido a 50 MB; nombre de archivo generado aleatoriamente en el servidor
- **Contraseñas:** mínimo 8 caracteres, requiere mayúscula y número
- **Importación masiva:** límite de 500 usuarios por petición
- **Body size:** limitado a 1 MB en JSON

### Aspectos conocidos a mejorar en futuras versiones
- **Tokens en localStorage:** los JWT se guardan en `localStorage`, vulnerable a XSS. La alternativa segura es usar `HttpOnly cookies`, lo que requiere un refactor de la autenticación.
- **Rotación de refresh token:** el refresh token actual no se invalida tras su uso. Implementar token rotation requiere persistencia en base de datos.
- **Paginación en listado de usuarios:** el endpoint `GET /users` retorna todos los usuarios sin límite.
