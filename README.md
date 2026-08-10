# Certificados — autom.ensupresencia.eu

Aplicación base para crear certificados editables a partir del diseño de referencia aportado.

## Arquitectura

- **Cloudflare Workers**: backend/API y hosting de los estáticos.
- **Cloudflare D1**: plantillas y certificados.
- **HTML/CSS/JS sin framework**: editor y previsualización A4.
- **Impresión del navegador**: `Imprimir / Guardar PDF` para obtener el certificado final.

## Funcionalidades del MVP

- Editor de todos los textos principales.
- Campos para nombre, fecha, CIF, dirección y texto bíblico.
- Dos firmas configurables.
- Logo/título/colores/tipografías configurables desde la plantilla.
- Guardado de plantillas en D1.
- Guardado de certificados en D1.
- Previsualización A4 en tiempo real.
- Impresión directa a PDF.
- API protegida para escrituras mediante `ADMIN_TOKEN`.

> La fotografía original no se incluye en el repositorio porque contiene datos personales y firmas manuscritas. El diseño se reconstruye como plantilla editable.

## 1. Crear la D1

```bash
npx wrangler login
npx wrangler d1 create certificados-db
```

Copia el `database_id` que devuelve Wrangler en `wrangler.jsonc`.

Después:

```bash
npx wrangler d1 migrations apply certificados-db --remote
```

## 2. Configurar el secreto

```bash
npx wrangler secret put ADMIN_TOKEN
```

Introduce una clave larga y aleatoria.

## 3. Desarrollo local

```bash
npm install
npm run dev
```

## 4. Publicar

```bash
npm run deploy
```

El `wrangler.jsonc` deja preparado el Custom Domain `autom.ensupresencia.eu`.

## Siguiente evolución

1. Añadir login con Cloudflare Access.
2. Subir logos y firmas a R2 en vez de guardar imágenes en D1.
3. Añadir generador PDF server-side si se necesita una descarga PDF automática.
4. Añadir historial, duplicado y búsqueda de certificados.
5. Añadir varios modelos: bautismo, matrimonio, presentación, membresía, etc.
