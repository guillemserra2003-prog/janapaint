# JANAPAINT — janapaint.com

Generador de paletas de colores + blog.

## Cómo funciona

- `src/home.html` → la página principal (generador). Solo se toca para cambiar el diseño.
- `posts/` → **un archivo `.md` por artículo**. Es lo único que se añade para publicar.
- `public/` → logo, iconos y estilos.
- `build.mjs` → convierte todo en la web final (carpeta `dist/`). Vercel lo ejecuta solo cada vez que hay un cambio en GitHub.
- `site.config.json` → dirección de la web y código de verificación de Google Search Console.

## Publicar un artículo

Crea un archivo nuevo en `posts/`. El nombre del archivo es la dirección del artículo:
`posts/colores-para-restaurantes.md` → `janapaint.com/blog/colores-para-restaurantes/`

Contenido del archivo:

```
---
title: Título del artículo (máx. ~60 caracteres para Google)
description: Resumen de 1–2 frases (máx. ~155 caracteres). Sale en Google y en la tarjeta del blog.
date: 2026-11-10
tag: Marca personal
colors: ["#1F2A44","#E8C547","#F4EFE6","#C8553D","#6C8EAD"]
---

Primer párrafo del artículo.

## Un subtítulo

Texto con **negrita**, *cursiva* y [un enlace](/blog/otro-articulo/).

- Lista
- de puntos
```

- `date` en el futuro → el artículo queda **programado** y se publica cuando llegue ese día (en la siguiente actualización de la web).
- Añade `draft: true` → queda como **borrador** y no se publica.
- `colors` → siempre 5 códigos HEX. Se usan de portada y como imagen al compartir.

## Imágenes

Guarda las imágenes en `public/blog/img/` (mejor en `.webp` o `.jpg`, máx. ~1600 px de ancho).

Portada del artículo (opcional; si no hay, se usa la paleta de colores):
```
image: /blog/img/mi-foto.webp
imageAlt: Descripción de la imagen para Google y personas ciegas
imageCaption: Pie de foto (opcional)
```

Imagen dentro del texto, con pie de foto:
```
![Descripción de la imagen](/blog/img/mi-foto.webp "Pie de foto")
```

## Probar en local (opcional)

```
node build.mjs
```
