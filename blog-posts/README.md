# Cómo publicar un artículo en el blog

Los artículos se escriben en archivos **Markdown** (`.md`) dentro de esta carpeta.
Un generador los convierte en páginas HTML con el estilo de la web y con todo el SEO
(título, descripción, URL canónica, Open Graph, datos estructurados y sitemap).

## 1. Crea el archivo

Nombre recomendado: `AAAA-MM-DD-titulo-corto.md` (p. ej. `2026-11-02-hifu-facial.md`).

Empieza siempre con esta cabecera:

```
---
title: HIFU facial en Badajoz: qué es y para quién está indicado
slug: hifu-facial-badajoz
date: 2026-11-02
description: Frase de 140-160 caracteres que aparecerá en Google bajo el título.
image: equipo-hifu-facial.jpg
imageAlt: Equipo de HIFU facial en el gabinete de DietaStética
category: Estética facial
author: Equipo DietaStética
---
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `title` | Sí | Título visible del artículo (H1). Incluye la palabra clave y, si encaja, "Badajoz". |
| `seoTitle` | No | Título para Google (`<title>`, máx. 60 caracteres). Si no se pone, se usa `title` + "· Blog DietaStética Badajoz". |
| `whatsapp` | No | Mensaje prerrellenado del botón final "Reservar por WhatsApp" (p. ej. `Hola, me gustaría información sobre la depilación láser.`). |
| `review` | No | Frase que invita a dejar reseña. Se muestra con el botón "Dejar mi opinión en Google" cuando `REVIEWS_URL` está rellenado en `build-blog.mjs`. |
| `slug` | No | Dirección de la página: `blog/<slug>.html`. Si no se pone, se crea a partir del título. **No lo cambies una vez publicado.** |
| `date` | Sí | Fecha de publicación, formato `AAAA-MM-DD`. |
| `updated` | No | Fecha de la última actualización importante. |
| `description` | Sí | Resumen para Google y para la tarjeta del listado (140-160 caracteres). |
| `image` | Sí | Nombre de una foto de `dietastetica/assets/img/` (o una URL completa). |
| `imageAlt` | No | Descripción de la foto (accesibilidad y SEO de imágenes). |
| `category` | Sí | Usa siempre las mismas: `Estética facial`, `Estética corporal`, `Depilación`, `Nutrición`. |
| `author` | No | Por defecto "Equipo DietaStética". |
| `draft` | No | `draft: true` para guardar el borrador sin publicarlo. |

## 2. Escribe el texto

- `## Subtítulo` y `### Sub-subtítulo` (el título principal ya lo pone la cabecera; no uses `#`).
- Párrafos separados por una línea en blanco.
- `**negrita**`, `*cursiva*`.
- Listas con `- ` o `1. `.
- Enlaces: `[reserva tu cita](contacto.html)` o `[texto](https://...)`.
  Enlazar a `tratamientos.html` o a otros artículos (`blog/otro-slug.html`) ayuda al SEO.
- Imágenes: `![Descripción de la foto](nombre-foto.jpg)` (la foto en `dietastetica/assets/img/`).
- Citas: `> Texto destacado`.
- El primer párrafo se muestra destacado como entradilla.
- Preguntas frecuentes: una sección `## Preguntas frecuentes` con cada pregunta como `### ¿Pregunta?`
  y la respuesta debajo. Se genera automáticamente el marcado FAQ para Google.

## 3. Genera y publica

```
node dietastetica/tools/build-blog.mjs
```

Después haz commit y push: Vercel publica automáticamente.

Consejos SEO: un tema por artículo; la palabra clave en el título, en la descripción y
en el primer párrafo; 600–1.200 palabras; subtítulos claros y enlaces a los tratamientos.
