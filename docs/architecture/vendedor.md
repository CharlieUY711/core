# Spec — El Vendedor

Estado: **propuesta**. Nada de esto está implementado.
Fecha: 2026-08-31.

---

## CONTEXT

### Lo que hay

`stores` + `store_members` modela hoy lo que la aplicación llama "tienda". Pero
lo que realmente modela es otra cosa: **una entidad que vende, con N personas que
la operan**. La vidriera, el nombre comercial y el territorio son atributos de
esa entidad, no su definición.

Medido sobre el esquema el 2026-08-31, de las 22 tablas con dueño:

| Cuelgan de | Cuántas | Cuáles |
|---|---|---|
| La tienda (`tenant_id` / `store_id`) | 6 | `catalog_producto_base`, `catalogo_market`, `catalog_taxonomy`, `catalog_locations`, `tienda_apps`, `zz_deprecated_store_products` |
| La persona (`user_id` / `owner_id`) | 14 | `ordenes`, `addresses`, `user_addresses`, `user_contacts`, `user_preferences`, `cart_items`, `favorites`, `notifications`, `events`, `activities`, `opportunities`, `products`, `media_library`, `stores` |
| Las dos | 2 | `api_vault`, `store_members` |

### El problema concreto

`catalog_producto_base` tiene `tipo = 'market' | 'secondhand'` **y** `tenant_id`
apuntando a la tienda. Es decir: **una persona que publica algo suyo en Second
Hand lo está guardando dentro de la tienda que administra.** No hay ningún lugar
donde puedan vivir las cosas que vende como particular.

El mismo agujero, en chico: `media_library` guarda `user_id` y no `tenant_id`.
Los archivos de la Biblioteca son de la persona que los subió, así que dos
operadores de la misma tienda no comparten las fotos de los artículos de esa
tienda.

---

## OBJECTIVE

Introducir el **Vendedor**: quien vende. Una tienda es un vendedor; una persona
que vende como particular es un vendedor. Un vendedor tiene N usuarios que lo
operan, y un tablero.

**Se reconoce que `stores` ya es el Vendedor.** No se crea una entidad nueva.

### No hay dos clases de vendedor

La primera versión de este spec proponía `stores.tipo = 'tienda' | 'persona'`.
**Está descartado.** Un vendedor es un vendedor. La única diferencia real entre
una empresa y un particular es **con qué documento se identifica**: número de
registro fiscal en un caso, documento de identidad en el otro.

Todo lo demás —miembros, catálogo, medios, órdenes, canales— funciona igual, y
tratarlos distinto obligaría a bifurcar el código en cada punto donde hoy hay uno
solo.

La consecuencia que lo justifica sola: **un particular que se formaliza cambia su
documento y nada más.** No cambia de naturaleza, no migra su catálogo, no pierde
sus publicaciones. Con dos clases, formalizarse sería una migración.

### "Tienda" no es lo que un vendedor ES, es lo que HACE

Y eso ya está implementado. `stores` tiene dos columnas array, pobladas y leídas
en producción:

- **`capacidades`** — qué puede hacer. Hoy: `catalogo_por_marca`,
  `busqueda_ampliada`. Se leen por la RPC `mis_capacidades` y las consume
  `utils/capacidades.ts` en el panel.
- **`vidrieras`** — dónde se muestra. COMITA tiene `['market','secondhand']`;
  CORE Market, `[]`.

**"Tener tienda" es tener la vidriera `market`.** Un particular que sólo vende
usado tiene `['secondhand']`. El que abre negocio agrega `market`. No hay
conversión de nada.

### Por qué "capacidad" y no "rol"

Porque `rol` ya significa otra cosa en este sistema: `store_members.rol` es
`duenio | administrador | operador` — lo que una PERSONA puede hacer dentro de un
vendedor.

Dos sentidos de "rol" en el mismo esquema producen el peor tipo de error: el
código se lee bien y hace otra cosa. Se mantienen las dos palabras que ya están:
**capacidad** (qué puede el vendedor) y **rol** (qué puede la persona).

### Los ejes son independientes

- **Documento** — con qué se identifica.
- **Miembros** — quién lo opera, con qué rol.
- **Capacidades y vidrieras** — qué puede hacer y dónde se muestra.

Ninguno determina a los otros. En particular: **un vendedor identificado con
documento de identidad puede tener varios miembros.** Alguien delega, se vende en
familia, o un tercero le maneja las publicaciones. No hay tope para nadie:
`store_members` ya lo permite y no se le agrega ninguna restricción.

---

## INPUTS

- `stores` (con `capacidades` y `vidrieras` ya poblados; `tipo` en null y sin
  ningún lector), `store_members` (con `rol` e `is_default`).
- El claim `store_id` del JWT, que escribe `custom_access_token_hook` leyendo
  `store_members`.
- Las 6 tablas ya atadas a `tenant_id`.
- `media_library`, hoy atada a `user_id`.
- `mis_capacidades` y `utils/capacidades.ts`, que ya funcionan.

---

## OUTPUTS

1. **La identidad del vendedor**: clase de documento y número. Un solo par de
   campos para todos, no dos caminos.
2. Un vendedor por persona, **creado a demanda**: recién cuando esa persona
   publica algo como particular. Crearlos a todos al registrarse llenaría la base
   de vendedores vacíos.
3. `media_library.tenant_id`, con sus políticas por vendedor.
4. `stores.tipo` **eliminada**: está en null, no la lee nadie, y con este modelo
   no hace falta. Dejarla ahí es dejar una columna que invita a bifurcar.
5. La pantalla dice "Vendedor" donde hoy dice "Tienda". **Las tablas no se
   renombran.**

---

## CONSTRAINTS

### La línea que no se cruza

> **Vender es del vendedor. Comprar es de la persona.**

Órdenes, direcciones, carrito, favoritos, notificaciones y preferencias siguen
siendo de la persona y **no se mueven**. Lo que pasa al vendedor es el catálogo y
los medios.

Si esa línea se borronea, el carrito de alguien pasa a depender de qué vendedor
tenía activo, y eso no se descubre hasta que un cliente pierde una compra.

### `es_plataforma` NO se convierte en capacidad

Es tentador: si "tienda" es una capacidad, "plataforma" también podría serlo.
**No.** `es_plataforma` es un límite de seguridad —`soy_la_plataforma()` decide
quién ve las personas, las tiendas y la configuración de todos— y las capacidades
son un array que edita un configurador.

Una bandera de seguridad no puede vivir donde una edición mal hecha la enciende.

### Las tablas no se renombran

`stores`, `store_members`, `store_id`, `tienda_apps` van a decir "tienda" para
algo más ancho, y eso es deuda de nombre asumida a propósito. Renombrarlas toca
**todas** las políticas RLS y todas las RPC: es la parte cara y riesgosa, y no
agrega ninguna funcionalidad. Se renombra en la pantalla, que es donde el nombre
se lee.

Si algún día se renombra, es un cambio propio con su propio spec, no un efecto
secundario de éste.

### `tipo` se queda en el artículo

`catalog_producto_base.tipo = 'market' | 'secondhand'` no se toca. Dice en qué
vidriera va ese artículo, que es distinto de quién lo vende: **una tienda también
puede vender usado**, y un particular puede tener las dos vidrieras.

---

## ACCEPTANCE CRITERIA

1. Una persona que administra una empresa **y** vende como particular figura en
   dos vendedores, y cambia entre ellos con el intercambiador que ya existe.
2. Un artículo publicado como particular tiene `tenant_id` = el vendedor de esa
   persona, y **no** aparece en el catálogo de la empresa.
3. Un vendedor identificado con documento de identidad acepta un segundo miembro
   sin ninguna restricción especial, con los mismos roles.
4. Un vendedor pasa de vender sólo usado a tener tienda **agregando la vidriera
   `market`**: no se crea nada, no se migra nada, no se pierde ninguna
   publicación.
5. Dos operadores del mismo vendedor ven los mismos archivos en la Biblioteca.
6. Nada de lo que compra una persona cambia al cambiar de vendedor activo.
7. No queda ningún `if` en el código que pregunte si un vendedor es empresa o
   particular.

---

## Plan de migración

Cada paso es seguro por sí solo y deja el sistema funcionando. Ninguno depende de
que el siguiente se haga el mismo día.

### 1 · Verificar la vidriera pública — ANTES DE TOCAR NADA

Confirmar que el catálogo público lee artículos **de muchos vendedores** y no
sólo del activo. Si leyera sólo del activo, los artículos de los particulares no
se verían y este cambio los escondería en vez de ordenarlos.

**Es un bloqueo, no un paso:** si esto no se cumple, el resto no se hace.

### 2 · La identidad

`documento_clase` y `documento_numero` en `stores`, nulos al principio. Nadie los
lee todavía; no cambia ningún comportamiento.

La validación por país (formato de RUT, de cédula) es un cambio aparte: acá sólo
se guarda con qué se identifica.

### 3 · `media_library.tenant_id`

Agregar la columna, llenarla desde `store_members` con el vendedor por defecto de
cada `user_id`, y recién entonces cambiar las políticas de `user_id` a
`tenant_id`.

**Cambia quién ve qué**, así que va con las cuentas hechas antes y después: si
alguien tiene dos vendedores, sus archivos van a caer en uno solo y hay que saber
en cuál.

### 4 · El vendedor de la persona, a demanda

Una función que devuelve el vendedor de una persona, creándolo si no existe, con
la vidriera `secondhand`. Se llama recién al publicar como particular.

### 5 · La pantalla

"Vendedor" donde hoy dice "Tienda", el intercambiador mostrando los dos, y el
tablero del vendedor activo — que ya es lo que el panel hace.

### 6 · Sacar `tipo`

Al final y sola, cuando ya esté claro que nadie la necesitó.

---

## Lo que este spec NO resuelve

- La **validación** del documento por país.
- El **renombre** de las tablas.
- Si `es_plataforma` alguna vez se unifica con algo (hoy: no).
- Las tablas legadas con `owner_id` (`products`, `activities`, `opportunities`),
  que no participan del catálogo actual y hay que decidir si siguen vivas.
