import {supabase} from './supabase'

function getUser() {
    try {
        let user = supabase.auth.getUser()
        return user ? user : {email: ''}
    } catch {
        return {email: ''}
    }
}

export {getUser}
