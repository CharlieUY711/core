# CORE-TAX

Motor de clasificación fiscal. **v0.1 — MVP.**

Recibe un producto y sugiere qué tasa de IVA le corresponde, con el fundamento
a la vista. No sustituye criterio profesional: sugiere para que una persona
decida más rápido.

```ts
import { clasificarProducto } from "@core/tax";

clasificarProducto({ nombre: "Arroz blanco 1 kg", categoria: "Alimentos" });
// {
//   pais: "UY",
//   codigoTasa: "minima",
//   estado: "SUGGESTED",
//   confianza: "ALTA",
//   reglas: ["FOOD_ARROZ"],
//   razon: "Producto identificado como arroz",
//   fuente: { referencia: "Título 10…", verificado: false },
//   versionMotor: "0.1.0"
// }
```

## Tres cosas que hay que saber antes de usarlo

**Devuelve un código, no un número.** `basica | minima | exento`, nunca
`22 | 10 | 0`. El número vive en la tabla `tax_rates` por país, que es donde se
puede cambiar sin tocar código. Y hay una razón fiscal además de una de tipos:
**exento no es 0%** — son cosas legalmente distintas, cambia el crédito fiscal
del comprador, y `0` las unifica.

**Las fuentes normativas están sin verificar.** `verificado: false` en todas.
Indican el cuerpo normativo correcto, pero el artículo exacto no lo confirmó un
profesional. La interfaz tiene que mostrarlo — *"fundamento pendiente de
verificación"* — en vez de presentarlo como un hecho. Una cita legal inventada
es peor que ninguna, porque se ve igual de sólida. Confirmarlas es trabajo de
un contador; el día que pase, se cambia el `false` y nada más.

**Clasifica el producto, no la operación.** Qué impuesto lleva una venta
concreta depende además del territorio —una venta a zona franca es exenta sin
importar el producto— y del tipo de comprador. Si alguien le pide al motor la
tasa de una venta, está haciendo la pregunta equivocada al componente
equivocado.

## Cómo decide

1. Se prueban todas las reglas. Una aplica si coincide alguna de sus señales
   (nombre, categoría) y **ninguno** de sus descartes.
2. Dos reglas con tasas distintas → `REVIEW_REQUIRED`. El motor no elige entre
   dos respuestas contradictorias.
3. Una sola tasa → gana, con la confianza que corresponda.
4. Ninguna regla → tasa básica, que es el default correcto en Uruguay, con
   confianza **MEDIA**. "No coincidió nada" no es evidencia fuerte.

### La confianza ALTA exige dos señales

Nombre **y** categoría. Una sola nunca alcanza: `arroz` también está en
`vinagre de arroz` y en `papel de arroz`, y ALTA es justamente lo que invita a
aplicar sin mirar.

### Los descartes

Es lo que separa el alimento de lo que sólo lo nombra: aceite de motor no es
aceite comestible, pasta dental no es pasta, una cafetera no es café. Sin
descartes, cada regla de alimentos se lleva puesta media docena de productos
que comparten la palabra y no el tratamiento.

## Cómo integrarlo sin romper la herencia de tasas

En MARKET la tasa **se hereda**: `tax_rate_id` es nullable en departamento,
categoría, subcategoría y artículo, y se resuelve de abajo hacia arriba. `NULL`
significa "la que diga arriba"; un valor significa "decidida acá a propósito".
Eso es lo que permite cambiar una tasa por ley tocando una fila, y saber cuáles
son las excepciones reales.

**Si CORE-TAX escribiera la tasa en cada producto, deshace eso**: cada artículo
queda con una copia, y una copia no dice si fue una decisión o el default
congelado — con el agravante de que ahora las copias las escribe una máquina, a
miles.

La integración correcta:

- Si la sugerencia **coincide** con lo que la taxonomía ya dice → el artículo
  queda en `NULL`, heredando. Se guarda igual el rastro de que el motor lo
  confirmó.
- Si **difiere** → ahí sí se materializa la excepción en `tax_rate_id`.

Así el motor sirve para *validar la clasificación de la taxonomía*, que es más
valioso que clasificar producto por producto.

`MANUAL` no se pisa nunca con una corrida nueva. Volver a sugerir es una acción
explícita del usuario.

## Agregar una regla

Una entrada en `src/rules/reglas.ts`. La lógica de cómo se combinan —cuántas
señales hacen falta, qué pasa ante contradicción— vive en `application/` y no
cambia.

**Los casos dudosos no se agregan.** Quedan sin regla y caen en la tasa básica.
Inventar una regla para cubrir un caso que no se conoce bien es exactamente lo
que el principio conservador prohíbe.

## Pendiente para v0.2

- **Re-clasificación y deriva.** Hoy se guarda `versionMotor` con cada
  clasificación, pero no hay operación para volver a correr el motor y reportar
  qué productos quedaron clasificados con reglas viejas. Si mañana se corrige
  `FOOD_ARROZ`, todo lo clasificado con la versión anterior queda mal y nada lo
  sabe.
- **Verificar las fuentes** con un profesional.
- **NCM.** La firma ya lo acepta y el motor todavía no lo lee.

## Comandos

```bash
pnpm test        # 14 casos
pnpm typecheck
```
