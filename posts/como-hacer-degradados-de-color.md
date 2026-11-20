---
title: Cómo hacer un degradado de colores bonito (y por qué algunos se ven sucios)
seoTitle: Degradados de color: cómo hacerlos bonitos y sin gris
description: Por qué algunos degradados se ven grises o sucios en el centro y cómo evitarlo: colores vecinos, un color intermedio o mezcla en OKLCH. Con ejemplos y códigos HEX.
date: 2026-11-20
tag: Diseño web
colors: ["#1F5FD6","#7B4FD6","#E0569A","#F2766B","#F28C28"]
image: /blog/img/degradados-de-color.webp
imageAlt: Tres degradados del mismo azul al mismo naranja: el primero se vuelve grisáceo en el centro, el segundo pasa por un rosa intermedio y el tercero recorre la rueda de color pasando por el violeta
imageCaption: El mismo azul y el mismo naranja, mezclados de tres formas distintas.
---

Los degradados están por todas partes: fondos de webs, botones, portadas, logos, fondos de pantalla y stories de Instagram. Bien hechos, dan sensación de luz, profundidad y modernidad. Mal hechos, tienen un problema muy concreto: **el centro se ve gris, apagado o sucio**.

En esta guía te explicamos por qué pasa y cómo conseguir degradados bonitos, aunque no seas diseñador.

## ¿Qué es un degradado?

Un degradado (o gradiente) es una transición suave entre dos o más colores. Hay varios tipos:

- **Lineal**: de un lado a otro, en línea recta.
- **Radial**: desde un punto central hacia fuera, en círculo.
- **Cónico**: girando alrededor de un punto, como las agujas de un reloj.

El tipo cambia la forma, pero el secreto de que se vea bonito está en **cómo se mezclan los colores**.

## Por qué algunos degradados se ven sucios

Mira la imagen de arriba. Los tres degradados empiezan en el mismo azul y acaban en el mismo naranja, pero el primero tiene un centro grisáceo y apagado. ¿Por qué?

Por defecto, la mayoría de programas y navegadores mezclan los colores **en línea recta dentro del modelo RGB**: van subiendo y bajando poco a poco la cantidad de rojo, verde y azul. Cuando los dos colores están muy separados en la rueda de color (como el azul y el naranja, que son complementarios), ese camino recto pasa justo por el centro, donde los colores **pierden saturación y se acercan al gris**.

Es lo mismo que pasa si mezclas pintura azul y naranja: no sale un color bonito, sale un marrón grisáceo. Si quieres repasar qué son los colores complementarios, te lo explicamos en la [rueda cromática](/blog/rueda-cromatica-colores-complementarios-analogos-triadicos/).

## 4 formas de conseguir un degradado bonito

### 1. Elige colores vecinos

La forma más sencilla de evitar el gris es elegir dos colores **cercanos en la rueda cromática**: azul y violeta, naranja y rosa, amarillo y verde, verde y turquesa. El camino entre ellos no pasa por el centro, así que el degradado se mantiene vivo de principio a fin.

[[paleta: Atardecer (colores vecinos) | #F6C177,#F2994A,#E8746B,#D6577E,#9B4F96]]

[[paleta: Océano (colores vecinos) | #0B3D91,#1F78D1,#2BA8C9,#3FC1B0,#9BE3C6]]

### 2. Añade un color intermedio

Si quieres ir de un color a su opuesto (por ejemplo, de azul a naranja), **añade un tercer color en el medio** que haga de puente. En el ejemplo de arriba, un rosa en el centro convierte un degradado apagado en uno vibrante.

El color intermedio debería estar en la rueda cromática entre los dos extremos, por el lado que más te guste. De azul a naranja puedes pasar por el violeta y el rosa (como un atardecer) o por el verde y el amarillo (como un paisaje).

### 3. Mezcla en un espacio de color moderno (OKLCH)

Existen formas de mezclar los colores que se parecen más a cómo los percibimos. Una de ellas es **OKLCH**, que en lugar de mezclar rojo, verde y azul, mezcla luminosidad, intensidad y tono. Al mezclar en OKLCH, el degradado **recorre la rueda de color** en lugar de atravesarla por el centro, y mantiene la intensidad.

Si diseñas webs, los navegadores modernos ya permiten indicarlo en CSS, por ejemplo: `linear-gradient(in oklch, #1F5FD6, #F28C28)`. En navegadores antiguos que no lo entiendan, conviene dejar también la versión normal como alternativa.

### 4. Cuida la luminosidad

Un degradado se ve más natural cuando **la luminosidad cambia de forma suave**. Si pasas de un color muy oscuro a uno muy claro de golpe, puede verse una «franja» en el medio. Ayuda que los colores tengan una luminosidad parecida o que cambien de forma progresiva.

## Degradados para inspirarte

Cada paleta está ordenada como un degradado: del primer color al último. Haz clic en cualquier color para copiar su código.

[[paleta: Amanecer suave | #FDE2D3,#F9C5BD,#F2A7B5,#D9A3C8,#B9A9D9]]

[[paleta: Menta y cielo | #E3F6EE,#B1F1D1,#8FD8D2,#7CB8E0,#7B9BD8]]

[[paleta: Fuego | #5A0F1E,#A3202B,#E04A2A,#F28C28,#F6C90E]]

[[paleta: Bosque | #0F2A1D,#1E4D35,#3F7D4E,#7DAA5B,#C6D97A]]

[[paleta: Noche violeta | #0B1426,#1F2E66,#4B3A8C,#8C4FA3,#D06FA3]]

## Consejos para usar degradados

- **Menos es más**: dos o tres colores suelen bastar. Con muchos colores, el degradado parece un arcoíris.
- **Úsalos con intención**: en un fondo, un botón importante o una portada. Si todo lleva degradado, ninguno destaca.
- **Cuidado con el texto encima**: un texto tiene que leerse bien en **todo** el degradado, tanto en la parte clara como en la oscura. Si dudas, pon el texto sobre la zona más uniforme o usa blanco con una sombra suave. Te contamos más sobre contraste en [colores para una página web](/blog/colores-para-una-pagina-web/).
- **Inspírate en la naturaleza**: los cielos al amanecer y al atardecer son degradados perfectos. Tienes ideas en [por qué el cielo es azul](/blog/por-que-el-cielo-es-azul/).

## Preguntas frecuentes

### ¿Por qué mi degradado se ve gris en el centro?

Porque los dos colores están muy separados en la rueda cromática y, al mezclarse en RGB, el camino entre ellos pasa por tonos apagados. Se arregla añadiendo un color intermedio, eligiendo colores más cercanos o mezclando en OKLCH.

### ¿Qué colores quedan bien en un degradado?

Los colores vecinos en la rueda cromática, como azul y violeta, rosa y naranja o verde y turquesa. También quedan muy bien las transiciones de un mismo color del claro al oscuro.

### ¿Cuántos colores debe tener un degradado?

Normalmente dos o tres. Más colores pueden funcionar, pero el resultado se vuelve más llamativo y difícil de controlar.

### ¿Qué es OKLCH?

Es una forma moderna de describir los colores por su luminosidad, intensidad y tono, pensada para parecerse a cómo los percibimos. Al mezclar colores en OKLCH, los degradados se mantienen más vivos y uniformes.

## Encuentra los colores de tu degradado

Usa el [generador de JANAPAINT](/) para encontrar colores que combinen: las paletas análogas, con colores vecinos, son perfectas para degradados. Si tienes una foto de un cielo o un paisaje que te encante, puedes [sacar sus colores](/colores-de-una-imagen/) y usarlos como punto de partida.
