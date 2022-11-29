import {supabase} from './supabase'

async function getUser() {
    try {
        let session = await supabase.auth.getSession()
        if (session.data.session === null) {
            return {email: ''}
        }
        let {data, error} = await supabase.auth.getUser();
        if (error) {
            throw error;
        }
        return data.user ? data.user : {email: ''}
    } catch (error) {
        console.error(error);
        return {email: '', error: true}
    }
}

export {getUser}
