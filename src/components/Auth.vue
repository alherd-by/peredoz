<template>
    <el-dialog v-model="authModal" width="300px" @opened="focusElement('signin-login')" center>
        <el-form :model="form"
                 ref="ruleFormRef"
                 :rules="rules"
                 @submit.prevent
                 v-loading="loading"
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Имя пользователя" prop="username">
                <el-input :tabindex="0" v-model="form.username"
                          id="signin-login"
                          ref="login"
                          autofocus="autofocus"/>
            </el-form-item>
            <el-form-item label="Пароль">
                <el-input v-model="form.password" type="password"/>
            </el-form-item>
            <el-form-item>
                <el-button type="success"
                           native-type="submit"
                           @click="submitForm(ruleFormRef)">
                    Авторизация
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog v-model="registerModal" width="300px" @opened="focusElement('signup-login')" center>
        <el-form :model="form"
                 ref="registerFormRef"
                 :rules="rules"
                 v-loading="loading"
                 @submit.prevent
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Имя пользователя" prop="username">
                <el-input v-model="form.username" id="signup-login"/>
            </el-form-item>
            <el-form-item label="Пароль">
                <el-input v-model="form.password" type="password"/>
            </el-form-item>
            <el-form-item>
                <el-button type="success"
                           @click="submitRegisterForm(registerFormRef)" :autofocus="true">
                    Зарегистрироваться
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
</template>

<script setup>
import {ElMessage} from 'element-plus';
import {reactive, ref} from "vue";
import {initializeApp} from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    inMemoryPersistence,
    createUserWithEmailAndPassword
} from "firebase/auth";

import {getUser} from "../user";


const emit = defineEmits(['auth', 'logout'])

const firebaseConfig = {
    apiKey: "AIzaSyBFVs0GdKnG_3qKeTe0xnxEMybaFmu7UhY",
    authDomain: "peredoz-by.firebaseapp.com",
    projectId: "peredoz-by",
    storageBucket: "peredoz-by.appspot.com",
    messagingSenderId: "408847871523",
    appId: "1:408847871523:web:d62f4308993d449b54cb96"
};

const ruleFormRef     = ref()
const form            = reactive({
    username: '',
    password: '',
})
const user            = ref(getUser())
const loading         = ref(false)
const registerFormRef = ref()
const app             = initializeApp(firebaseConfig);
const auth            = getAuth(app);

const authModal     = ref(false);
const registerModal = ref(false)

const openSignIn = () => {
    authModal.value = true;
}
const openSignUp = () => {
    registerModal.value = true;
}

const logout = async () => {
    const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
    const payload  = await response.json()
    user.value     = payload.user;
    emit('logout', {user: {email: ''}})
}

defineExpose({
    openSignIn,
    openSignUp,
    logout
})

const focusElement       = (id) => {
    document.getElementById(id).focus()
}
const submitRegisterForm = async (formEl) => {
    if (!formEl) {
        return
    }
    await formEl.validate(async (valid, fields) => {
        if (!valid) {
            console.log('error submit!', fields)
            return;
        }
        try {
            loading.value = true;
            await setPersistence(auth, inMemoryPersistence)
            const credentials = await createUserWithEmailAndPassword(auth, form.username, form.password)
            //todo не сразу добавляется custom claim нужно думать над флоу
            const idToken     = await credentials.user.getIdToken()
            const response    = await fetch(
                '/session?signup=true',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: idToken
                    })
                }
            )
            const result      = await response.json();
            user.value        = result.user;
            ElMessage.success('Успешная регистрация')
            authModal.value = false;
            emit('auth', result.user)
            form.password = '';
            form.username = '';
        } catch (error) {
            ElMessage.error('Произошла ошибка')
            throw error;
        } finally {
            loading.value = false;
        }
    })
}
const submitForm         = async (formEl) => {
    if (!formEl) {
        return
    }
    await formEl.validate(async (valid, fields) => {
        if (!valid) {
            console.log('error submit!', fields)
            return;
        }
        try {
            loading.value = true
            await setPersistence(auth, inMemoryPersistence)
            const credentials = await signInWithEmailAndPassword(auth, form.username, form.password)
            //todo перехват ошибок
            const idToken     = await credentials.user.getIdToken()
            const response    = await fetch(
                '/session',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: idToken
                    })
                }
            )
            const result      = await response.json();
            user.value        = result.user;
            ElMessage.success('Успешная авторизация')
            authModal.value = false;
            emit('auth', result.user)
            form.password = '';
            form.username = '';
        } catch (error) {
            loading.value = false
            ElMessage.error('Произошла ошибка')
            throw error;
        } finally {
            loading.value = false
        }
    })
}

const rules = reactive({
    username: [
        {
            required: true,
            message: 'Введите логин',
            trigger: 'change',
        },
    ]
})
</script>

<style scoped>

</style>
