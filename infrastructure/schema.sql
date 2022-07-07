CREATE OR REPLACE FUNCTION public.placeholder_feature_type(point_row public.point)
    RETURNS text
    LANGUAGE sql
    STABLE
AS $function$
SELECT 'Feature'
$function$;

CREATE OR REPLACE FUNCTION public.placeholder_feature_collection_type(track_row track)
    RETURNS text
    LANGUAGE sql
    STABLE
AS $function$
SELECT 'FeatureCollection'
$function$;

CREATE OR REPLACE FUNCTION public.merged_properties(point_row public.point)
    RETURNS jsonb
    LANGUAGE sql
    STABLE
AS $function$
SELECT point_row.properties || jsonb_build_object('track_id', point_row.track_id, 'spectrum_id', point_row.spectrum_id, 'point_id', point_row.id)
$function$;

