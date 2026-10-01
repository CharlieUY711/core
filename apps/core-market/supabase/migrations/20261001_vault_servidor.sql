-- Vault: guardar y borrar credenciales "Sólo servidor" sin que el valor pase por el navegador.
-- Pegar completo en Supabase > SQL Editor > Run. Se puede correr más de una vez.

create or replace function public.guardar_credencial_servidor(
  p_plataforma text, p_nombre text, p_tipo text, p_valor text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_plataforma <> 'Meta' or p_nombre not in ('META_APP_ID','META_APP_SECRET','META_LOGIN_CONFIG_ID') then
    raise exception 'Credencial de servidor no permitida: % / %', p_plataforma, p_nombre;
  end if;
  if coalesce(trim(p_valor), '') = '' then raise exception 'El valor está vacío'; end if;

  update public.api_vault
     set value = trim(p_valor), updated_at = now()
   where user_id = v_uid and platform = p_plataforma and name = p_nombre and solo_servidor = true;

  if not found then
    if exists (select 1 from public.api_vault
                where platform = p_plataforma and name = p_nombre and solo_servidor = true) then
      raise exception 'Esa credencial ya existe y pertenece a otro usuario';
    end if;
    insert into public.api_vault (user_id, name, platform, type, value, env, tags, solo_servidor)
    values (v_uid, p_nombre, p_plataforma, coalesce(nullif(p_tipo,''),'api_key'),
            trim(p_valor), 'production', array['asistente'], true);
  end if;
end $$;

create or replace function public.borrar_credencial_servidor(
  p_plataforma text, p_nombre text
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if p_plataforma <> 'Meta' or p_nombre not in ('META_APP_ID','META_APP_SECRET','META_LOGIN_CONFIG_ID') then
    raise exception 'Credencial de servidor no permitida: % / %', p_plataforma, p_nombre;
  end if;
  delete from public.api_vault
   where user_id = v_uid and platform = p_plataforma and name = p_nombre and solo_servidor = true;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.guardar_credencial_servidor(text,text,text,text) from public, anon;
revoke all on function public.borrar_credencial_servidor(text,text) from public, anon;
grant execute on function public.guardar_credencial_servidor(text,text,text,text) to authenticated;
grant execute on function public.borrar_credencial_servidor(text,text) to authenticated;

notify pgrst, 'reload schema';
