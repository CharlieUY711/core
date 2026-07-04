-- Marca Gourmet (curaduría premium de Market). NO es tabla aparte.
alter table articulos        add column if not exists gourmet boolean not null default false;
alter table productos_market add column if not exists gourmet boolean not null default false;

-- Ejemplo: marcar productos como gourmet
-- update articulos set gourmet = true where id in ('<uuid1>', '<uuid2>');
