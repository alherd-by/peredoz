import Cookies from "js-cookie";

function getUser() {
    try {
        return JSON.parse(Cookies.get('USER'))
    } catch {
        return {email: ''}
    }

}
export {getUser}
