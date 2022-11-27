import {supabase} from './supabase'

async function getUser() {
    try {
        let {data, error} = await supabase.auth.getUser()
        if (error) {
            throw error;
        }
        return data.user ? data.user : {email: ''}
    } catch(error) {
        console.error(error);
        return {email: ''}
    }
}

export {getUser}
