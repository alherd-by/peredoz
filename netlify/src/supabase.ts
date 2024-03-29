import {createClient} from "@supabase/supabase-js";

const getToken = (headers: any) : string => {
    if (!headers.authorization) {
        return '';
    }
    let chunks = (<string>headers.authorization).split(' ', 2)
    if (chunks.length !== 2) {
        return '';
    }
    return chunks.pop()
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseCreate = (accessToken: string) => {
    return createClient(
        supabaseUrl,
        process.env.VITE_SUPABASE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                headers: accessToken ? {
                    Authorization: `Bearer ${accessToken}`,
                } : null,
            },
        }
    )
}

export {supabaseCreate, getToken}
