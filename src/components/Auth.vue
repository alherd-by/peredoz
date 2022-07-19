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
import {ElMessage}     from 'element-plus';
import {reactive, ref} from "vue";
import {getUser}       from "../user";
import {supabase}      from "../supabase";

const emit = defineEmits(['auth', 'logout'])

const ruleFormRef     = ref()
const form            = reactive({
    username: '',
    password: '',
})
const account         = ref(getUser())
const loading         = ref(false)
const registerFormRef = ref()

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
    if (error) {
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
                email   : form.username,
                password: form.password
            })
            if (error) {
                ElMessage.error('Произошла ошибка')
                console.log(error);
            } else {
                account.value = user;
                ElMessage.success('Успешная регистрация')
                authModal.value = false;
                emit('auth', user)
                form.password = '';
                form.username = '';
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

const rules = reactive({
    username: [
        {
            required: true,
            message : 'Введите логин',
            trigger : 'change',
        },
    ]
})
</script>

<style scoped>

</style>
