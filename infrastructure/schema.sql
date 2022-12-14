CREATE OR REPLACE FUNCTION public.placeholder_feature_type(point_row public.point)
    RETURNS text
    LANGUAGE sql
    STABLE
AS
$function$
SELECT 'Feature'
$function$;

CREATE OR REPLACE FUNCTION public.placeholder_feature_collection_type(track_row track)
    RETURNS text
    LANGUAGE sql
    STABLE
AS
$function$
SELECT 'FeatureCollection'
$function$;

CREATE OR REPLACE FUNCTION public.merged_properties(point_row public.point)
    RETURNS jsonb
    LANGUAGE sql
    STABLE
AS
$function$
SELECT point_row.properties ||
       jsonb_build_object('track_id', point_row.track_id, 'spectrum_id', point_row.spectrum_id, 'point_id',
                          point_row.id)
$function$;

DROP VIEW IF exists features;
CREATE VIEW features as
SELECT 'Feature'                                                                                         as
                                                                                                            type,
    id,
    user_id,
    track_id,
        properties || jsonb_build_object('spectrum', spectrum, 'track_id', track_id, 'user_id', user_id) as properties,
    geometry
FROM point;
ALTER VIEW features OWNER TO postgres;

create function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
as
$$
begin
    insert into public."user" (id, email, display_name)
    values (new.id, new.email, new.raw_user_meta_data ->> 'username');
    return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
    after insert
    on auth.users
    for each row
execute procedure public.handle_new_user();


create or replace view tracks
      (id, name, created_at, extra, atomfast_id, user_id, first_point, max_doserate, min_doserate, track_id) as
SELECT track.id,
    track.name,
    track.created_at,
    track.extra,
    track.atomfast_id,
    track.user_id,
    track.first_point,
    stat.max_doserate,
    stat.min_doserate,
    stat.track_id
FROM track
     LEFT JOIN (SELECT max((point.properties ->> 'd'::text)::double precision) AS max_doserate,
                    min((point.properties ->> 'd'::text)::double precision)    AS min_doserate,
                    point.track_id
                FROM point
                WHERE point.track_id IS NOT NULL AND
                    (point.properties ->> 'd'::text) IS NOT NULL
                GROUP BY point.track_id) stat ON stat.track_id = track.id;

alter table tracks
    owner to postgres;

grant delete, insert, references, select, trigger, truncate, update on tracks to anon;

grant delete, insert, references, select, trigger, truncate, update on tracks to authenticated;

grant delete, insert, references, select, trigger, truncate, update on tracks to service_role;
