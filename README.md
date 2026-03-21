# FitTrack — Gestión de Rutinas de Entrenamiento

Aplicación web full-stack para gestión de rutinas entre administradores, coaches, usuarios y apoderados.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + TailwindCSS + Vite |
| Backend | Node.js + TypeScript + Express.js |
| ORM | Prisma v5 |
| Base de datos | MySQL |
| Auth | JWT (access + refresh tokens) |
| Validación | Zod |
| Hash de contraseñas | bcryptjs |

---

## Estructura del proyecto

```
NewAPPFitness/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       ← Modelos de base de datos
│   │   └── seed.ts             ← Datos iniciales de prueba
│   ├── src/
│   │   ├── app.ts              ← Entry point + Express setup
│   │   ├── lib/prisma.ts       ← Singleton de PrismaClient
│   │   ├── controllers/        ← Lógica de request/response
│   │   ├── services/           ← Lógica de negocio
│   │   ├── routes/             ← Definición de endpoints
│   │   ├── middlewares/        ← Auth, roles, errores, upload
│   │   ├── validators/         ← Schemas Zod
│   │   └── utils/              ← JWT, password, response helpers
│   ├── .env                    ← Variables de entorno
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx             ← Rutas principales
    │   ├── context/            ← AuthContext
    │   ├── pages/              ← Páginas por rol
    │   ├── components/         ← Layout, común
    │   ├── services/           ← Clientes API (axios)
    │   └── types/              ← TypeScript types
    ├── index.html
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## Instrucciones para levantar el proyecto

### Requisitos previos
- Node.js 18+
- MySQL 8+ (corriendo localmente o Docker)
- npm 9+

---

### 1. Configurar base de datos MySQL

Crea la base de datos:
```sql
CREATE DATABASE fitness_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de MySQL:
# DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/fitness_app"

# Generar cliente Prisma
npm run prisma:generate

# Aplicar migraciones (crea las tablas)
npm run prisma:migrate

# Cargar datos de prueba (usuarios, ejercicios, rutina)
npm run prisma:seed

# Iniciar servidor de desarrollo
npm run dev
```

El backend queda disponible en: `http://localhost:3001`

---

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend queda disponible en: `http://localhost:5173`

---

### 4. Build para producción

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Los archivos estáticos quedan en dist/
```

---

## Usuarios de prueba

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | admin@fitness.cl | Admin123! |
| Coach | coach@fitness.cl | Coach123! |
| Usuario | usuario@fitness.cl | User123! |
| Apoderado | apoderado@fitness.cl | Apod123! |

---

## API Endpoints

### Autenticación (`/api/auth`)
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | /login | Iniciar sesión | No |
| POST | /register | Registrar usuario | No |
| POST | /refresh | Renovar tokens | No |
| POST | /change-password | Cambiar contraseña | Sí |
| GET | /me | Datos del usuario autenticado | Sí |

### Usuarios (`/api/users`)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| PUT | /profile/complete | Completar perfil | Todos |
| PUT | /profile | Actualizar perfil | Todos |
| GET | / | Listar usuarios | Admin |
| POST | / | Crear usuario | Admin |
| GET | /:id | Obtener usuario | Admin |
| PUT | /:id | Actualizar usuario | Admin |
| POST | /:id/reset-password | Resetear contraseña | Admin |
| GET | /coaches | Listar coaches | Admin, Coach |
| GET | /my-users | Usuarios del coach | Coach |

### Ejercicios (`/api/exercises`)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| GET | / | Listar ejercicios | Todos |
| GET | /:id | Obtener ejercicio | Todos |
| POST | / | Crear ejercicio | Admin, Coach |
| PUT | /:id | Actualizar ejercicio | Admin, Coach |
| DELETE | /:id | Eliminar (soft) ejercicio | Admin, Coach |

### Rutinas (`/api/routines`)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| GET | / | Listar rutinas | Todos |
| GET | /:id | Obtener rutina | Todos |
| POST | / | Crear rutina | Coach, Admin |
| PUT | /:id/dias/:diaId | Actualizar día | Coach, Admin |
| DELETE | /:id | Eliminar rutina | Coach, Admin |

### Progreso (`/api/progress`)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | / | Registrar progreso | Usuario |
| GET | /rutina/:rutinaId | Ver progreso de rutina | Todos |

---

## Decisiones de diseño

- **RUT**: Solo editable hasta que se asigna por primera vez desde `/complete-profile`. Una vez guardado, es de solo lectura (campo único identificador de negocio).
- **Coach-Usuario**: Relación 1:1 desde el lado del Usuario (un usuario solo puede tener un coach a la vez).
- **Contraseña temporal**: Al resetear, se genera una contraseña aleatoria de 8 caracteres que se muestra en texto plano **una sola vez** al administrador. El usuario debe cambiarla al próximo login.
- **Soft delete en ejercicios**: Los ejercicios se marcan como `activo = false` para preservar la integridad de rutinas y progresos existentes.
- **JWT dual**: Access token corto (15min) + Refresh token largo (7d). El interceptor de Axios renueva automáticamente el access token.

---

## Solución de problemas

**Error de conexión a MySQL:**
Verifica que MySQL esté corriendo y que `DATABASE_URL` en `.env` sea correcto.

**Prisma Client no generado:**
```bash
cd backend && npm run prisma:generate
```

**Puerto ocupado:**
Cambia `PORT` en `backend/.env` o ajusta el proxy en `frontend/vite.config.ts`.
