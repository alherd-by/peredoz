CREATE OR REPLACE FUNCTION public.placeholder_feature_type(point_row track_point)
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
