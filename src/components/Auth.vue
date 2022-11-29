<template>
    <el-dialog title="Авторизация"
               v-model="authModal"
               width="300px"
               @opened="focusElement('signin-login')"
               center>
        <el-form :model="form"
                 ref="signInFormRef"
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
                           @click="submitForm(signInFormRef, signInAction)">
                    Авторизация
                </el-button>
            </el-form-item>
            <el-form-item>
                <a @click="authModal = false;restorePasswordModal = true">Восстановление пароля</a>
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
                           @click="submitForm(registerFormRef, registerAction)">
                    Зарегистрироваться
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog title="Восстановление пароля"
               v-model="restorePasswordModal"
               width="300px"
               @opened="focusElement('restore-login')"
               center>
        <el-form :model="form"
                 ref="ruleFormRef"
                 :rules="rules"
                 @submit.prevent
                 v-loading="loading"
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Email" prop="username" required>
                <el-input :tabindex="0" v-model="form.username"
                          id="restore-login"
                          ref="login"
                          autofocus="autofocus"/>
            </el-form-item>
            <el-form-item>
                <el-button type="success"
                           native-type="submit"
                           @click="submitForm(ruleFormRef, restorePasswordAction)">
                    Отправить
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog
        title="Новый пароль"
        v-model="newPasswordModal"
        width="300px"
        @opened="focusElement('newpwd-login')"
        center>
        <el-form :model="form"
                 ref="newPasswordFormRef"
                 :rules="rulesNewPassword"
                 v-loading="loading"
                 @submit.prevent
                 label-width="150px"
                 label-position="top">
            <el-form-item label="Пароль" prop="password" required>
                <el-input v-model="form.password" type="password" id="newpwd-login"/>
            </el-form-item>
            <el-form-item label="Повтор пароля" prop="password_confirm" required>
                <el-input v-model="form.password_confirm" type="password"/>
            </el-form-item>
            <el-form-item>
                <el-button type="success"
                           native-type="submit"
                           @click="submitForm(newPasswordFormRef, newPasswordAction)">
                    Сохранить
                </el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
</template>

<script setup>
import {ElMessage}     from 'element-plus';
import {reactive, ref} from "vue";
import {supabase}      from "../supabase";

const emit = defineEmits(['auth', 'logout', 'new-password'])

const ruleFormRef        = ref()
const signInFormRef      = ref()
const newPasswordFormRef = ref()
const registerFormRef    = ref()

const form    = reactive({
    username        : '',
    password        : '',
    email           : '',
    password_confirm: ''
})
const loading = ref(false)

const authModal            = ref(false);
const registerModal        = ref(false)
const restorePasswordModal = ref(false)
const newPasswordModal     = ref(false)

const openSignIn      = () => {
    authModal.value = true;
}
const openSignUp      = () => {
    registerModal.value = true;
}
const openNewPassword = () => {
    newPasswordModal.value = true;
}

const logout = async () => {
    let {error} = await supabase.auth.signOut()
    if (error && error.message !== 'Invalid user') {
        ElMessage.error('Произошла ошибка')
        throw error
    }
    emit('logout', {user: {email: ''}})
}

defineExpose({
    openSignIn,
    openSignUp,
    logout,
    openNewPassword
})

const focusElement = (id) => {
    document.getElementById(id).focus()
}

const registerAction        = async (formEl) => {
    loading.value     = true;
    let {user, error} = await supabase.auth.signUp({
        email   : form.email,
        password: form.password
    }, {
        redirectTo: location.protocol + '//' + location.host + '/?confirmation',
        data      : {
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
        ElMessage.success(
            'Успешная регистрация, на почту придет письмо со ссылкой подтверждением. Возможно потребуется проверить папку со спамом'
        )
        registerModal.value = false;
        formEl.resetFields()
        form.password         = '';
        form.password_confirm = '';
        form.email            = '';
        form.username         = '';
    }
}
const signInAction          = async () => {
    loading.value     = true
    let {user, error} = await supabase.auth.signInWithPassword({
        email   : form.username,
        password: form.password
    })
    if (error) {
        console.log(error)
        let text = 'Произошла ошибка';
        if (error.message === 'Invalid login credentials') {
            text = 'Неправильный логин или пароль'
        }
        ElMessage.error(text)
    } else {
        ElMessage.success('Успешная авторизация')
        authModal.value = false;
        emit('auth', user)
        form.password = '';
        form.username = '';
    }
}
const restorePasswordAction = async () => {
    loading.value = true
    let {error}   = await supabase.auth.resetPasswordForEmail(
        form.username,
        {
            redirectTo: location.protocol + '//' + location.host + '/?resetpwd'
        }
    )
    if (error) {
        ElMessage.error('Произошла ошибка')
    } else {
        ElMessage.success('Было отправлено письмо для восстановления пароля')
        restorePasswordModal.value = false;
        form.password              = '';
        form.username              = '';
    }
}
const newPasswordAction     = async () => {
    loading.value       = true
    const {data, error} = await supabase.auth.updateUser({password: form.password})
    if (error) {
        ElMessage.error('Произошла ошибка')
        console.error(error)
    } else {
        emit('auth', data.user)
        ElMessage.success('Успешная смена пароля')
        newPasswordModal.value = false;
        window.history.pushState('object', document.title, location.href.split("?")[0]);
        form.password         = '';
        form.password_confirm = '';
    }
}

const submitForm = async (formEl, action) => {
    if (!formEl) {
        return
    }
    await formEl.validate(async (valid) => {
        if (!valid) {
            console.log('Not valid')
            return;
        }
        try {
            await action(formEl)
        } catch (error) {
            ElMessage.error('Произошла ошибка')
            throw error;
        } finally {
            loading.value = false;
        }
    })
}

const validatePass  = (rule, value, callback) => {
    if (value === '') {
        callback(new Error('Пожалуйста, введите пароль'))
        return;
    }
    if (value.length < 8) {
        callback(new Error('Пароль должен быть не менее 8 символов'))
        return;
    }
    if (form.password_confirm !== '') {
        if (!registerFormRef.value && !newPasswordFormRef.value) {
            return
        }
        if (!registerFormRef.value) {
            newPasswordFormRef.value.validateField('password_confirm', () => null)
        } else {
            registerFormRef.value.validateField('password_confirm', () => null)
        }
    }
    callback()
}
const validatePass2 = (rule, value, callback) => {
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

const rulesNewPassword = reactive({
    password        : [{validator: validatePass, trigger: 'blur'}],
    password_confirm: [{validator: validatePass2, trigger: 'blur'}],
})
</script>

<style scoped>

</style>
