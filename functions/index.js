const functions       = require('firebase-functions');
const {initializeApp} = require('firebase-admin/app');
const {getAuth}       = require('firebase-admin/auth');
const {getDatabase}   = require('firebase-admin/database');

initializeApp();

exports.processSignUp = functions.auth.user().onCreate(async (user) => {
    const customClaims = {
        'https://hasura.io/jwt/claims': {
            'x-hasura-default-role': 'authorized',
            'x-hasura-allowed-roles': ['authorized'],
            'x-hasura-user-id': user.uid
        }
    };

    try {
        await getAuth().setCustomUserClaims(user.uid, customClaims);
        const metadataRef = getDatabase().ref('metadata/' + user.uid);
        await metadataRef.set({refreshTime: new Date().getTime()});
    } catch (error) {
        console.log(error);
    }
});
