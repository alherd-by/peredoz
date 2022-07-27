<template>
    <el-dialog title="Авторизация"
               v-model="authModal"
               width="300px"
               @opened="focusElement('signin-login')"
               center>
        <el-form :model="form"
                 ref="ruleFormRef"
                 :rules="rules"
                 @submit.prevent
                 v-loading="loading"
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Имя пользователя" prop="username" required>
                <el-input :tabindex="0" v-model="form.username"
                          id="signin-login"
                          ref="login"
                          autofocus="autofocus"/>
            </el-form-item>
            <el-form-item label="Пароль" prop="password" required>
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
    <el-dialog
        title="Регистрация"
        v-model="registerModal"
        width="300px"
        @opened="focusElement('signup-login')"
        center>
        <el-form :model="form"
                 ref="registerFormRef"
                 :rules="rulesRegister"
                 v-loading="loading"
                 @submit.prevent
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Имя пользователя" prop="username" required>
                <el-input v-model="form.username" id="signup-login"/>
            </el-form-item>
            <el-form-item label="Email" prop="email" required>
                <el-input v-model="form.email" name="email"/>
            </el-form-item>
            <el-form-item label="Пароль" prop="password" required>
                <el-input v-model="form.password" type="password"/>
            </el-form-item>
            <el-form-item label="Повтор пароля" prop="password_confirm" required>
                <el-input v-model="form.password_confirm" type="password"/>
            </el-form-item>
            <el-form-item>
                <el-button type="success"
                           native-type="submit"
                           @click="submitRegisterForm(registerFormRef)">
                    Зарегистрироваться
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
</template>

<script setup>
import {ElMessage}     from 'element-plus';
import {reactive, ref} from "vue";
import {getUser}       from "../user";
import {supabase}      from "../supabase";

const emit = defineEmits(['auth', 'logout'])

const ruleFormRef     = ref()
const registerFormRef = ref()
const form            = reactive({
    username        : '',
    password        : '',
    email           : '',
    password_confirm: ''
})
const account         = ref(getUser())
const loading         = ref(false)


const authModal     = ref(false);
const registerModal = ref(false)

const openSignIn = () => {
    authModal.value = true;
}
const openSignUp = () => {
    registerModal.value = true;
}

const logout = async () => {
    let {error} = await supabase.auth.signOut()
    if (error && error.message !== 'Invalid user') {
        ElMessage.error('Произошла ошибка')
        throw error
    }
    account.value = null;
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
            loading.value     = true;
            let {user, error} = await supabase.auth.signUp({
                email   : form.email,
                password: form.password
            }, {
                redirectTo: 'https://peredoz.netlify.app/?confirmation',
                data: {
                    username: form.username
                }
            })
            if (error) {
                let message = 'Произошла ошибка'
                if (error.message === 'User already registered') {
                    message = 'Пользователь с таким email уже существует'
                }
                ElMessage.error(message)
                console.log(error);
            } else {
                account.value = user;
                ElMessage.success('Успешная регистрация, на почту придет письмо со ссылкой подтверждением')
                registerModal.value = false;
                formEl.resetFields()
                form.password         = '';
                form.password_confirm = '';
                form.email            = '';
                form.username         = '';
            }
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
            loading.value     = true
            let {user, error} = await supabase.auth.signIn({
                email   : form.username,
                password: form.password
            })
            if (error) {
                ElMessage.error('Произошла ошибка')
                console.log(error)
            } else {
                ElMessage.success('Успешная авторизация')
                authModal.value = false;
                emit('auth', user)
                form.password = '';
                form.username = '';
            }
        } catch (error) {
            loading.value = false
            ElMessage.error('Произошла ошибка')
            throw error;
        } finally {
            loading.value = false
        }
    })
}
const validatePass       = (rule, value, callback) => {
    if (value === '') {
        callback(new Error('Пожалуйста, введите пароль'))
        return;
    }
    if (value.length < 8) {
        callback(new Error('Пароль должен быть не менее 8 символов'))
        return;
    }
    if (form.password_confirm !== '') {
        if (!registerFormRef.value) {
            return
        }
        registerFormRef.value.validateField('password_confirm', () => null)
    }
    callback()
}
const validatePass2      = (rule, value, callback) => {
    if (value === '') {
        callback(new Error('Пожалуйста, введите заново пароль'))
    } else if (value !== form.password) {
        callback(new Error("Пароли не совпадают"))
    } else {
        callback()
    }
}

const rules = reactive({
    username: [
        {
            required: true,
            message : 'Введите логин',
            trigger : 'change',
        },
    ],
    password: [
        {required: true, message: 'Пароль обязательно', trigger: 'blur'},
    ],
})

const rulesRegister = reactive({
    username        : [
        {required: true, message: 'Логин обязательно', trigger: 'blur'},
        {min: 3, message: 'минимум 3 символов', trigger: 'blur'},
    ],
    password        : [{validator: validatePass, trigger: 'blur'}],
    password_confirm: [{validator: validatePass2, trigger: 'blur'}],
})
</script>

<style scoped>

</style>
