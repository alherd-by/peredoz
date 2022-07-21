import {createClient} from "@supabase/supabase-js";

const getToken = (headers: any) => {
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
const supabase = createClient(
    supabaseUrl,
    process.env.VITE_SUPABASE_KEY
)

export {supabase, getToken}
