<script setup>
import Map from './components/Map.vue'
import {onMounted, reactive, ref, watch} from "vue";
import {ElLoading as vElLoading, ElMessage} from 'element-plus';
import {xml2js} from "./xml2js";
import {colorSchemes, SCHEME_RED_BLUE_16} from "./colors";
import {List, User, Setting} from '@element-plus/icons-vue'
import {initializeApp} from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    inMemoryPersistence,
    createUserWithEmailAndPassword
} from "firebase/auth";
import Cookies from 'js-cookie'

const toolbarDialog      = ref(false);
const currentTrack       = ref(2);
const listTracksDialog   = ref(false);
const currentColorScheme = ref(SCHEME_RED_BLUE_16 + '');

const firebaseConfig = {
    apiKey: "AIzaSyBFVs0GdKnG_3qKeTe0xnxEMybaFmu7UhY",
    authDomain: "peredoz-by.firebaseapp.com",
    projectId: "peredoz-by",
    storageBucket: "peredoz-by.appspot.com",
    messagingSenderId: "408847871523",
    appId: "1:408847871523:web:d62f4308993d449b54cb96"
};

const app    = initializeApp(firebaseConfig);
const auth   = getAuth(app);
const logout = async () => {
    const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
    const payload  = await response.json()
    user.value     = payload.user;
}

watch(
    currentTrack,
    () => {
        listTracksDialog.value = false;
    }
)

const login = ref()
const open  = () => {
    ElMessageBox.prompt(
        'Введите ссылку на atomfast',
        'Новый трек',
        {
            confirmButtonText: 'OK',
            inputValue: 'http://www.atomfast.net/maps/show/2849/?lat=54.7274&lng=26.014&z=14',
            cancelButtonText: 'Cancel',
        }
    )
        .then(async ({value}) => {
            const response = await fetch('/atomfast', {
                method: 'POST',
                body: JSON.stringify({url: value})
            })
            const payload  = await response.json()
            if (payload.error) {
                ElMessage.error(payload.error)
            }
        })
        .catch((e) => {
            if (e === 'cancel') {
                return
            }
            ElMessage.error('Произошла ошибка')
            throw e;
        })
}

const list = ref();

const fetchTracks         = async () => {
    const response = await fetch(import.meta.env.VITE_GRAPHQL_API_URL + '/api/rest/tracks',
        {
            credentials: 'include'
        }
    )
    if (!response.ok) {
        throw 'Invalid track list http response';
    }
    const data = await response.json();
    if (!data.tracks) {
        throw 'Invalid track list format response';
    }
    list.value = data.tracks;
}
const readFile            = (raw) => {
    return new Promise((resolve, reject) => {
        const reader   = new FileReader();
        reader.onload  = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsText(raw);
    });
}
const loading             = ref(false)
const file                = ref(null);
const attachment          = ref();
const uploadSpectreDialog = ref(false)
const currentTrackPoint   = ref(null)
const ruleFormRef         = ref()
const registerFormRef     = ref()
const user                = ref(getUser())
const authModal           = ref(false)
const registerModal       = ref(false)
const form                = reactive({
    username: '',
    password: '',
})
const attachSpectrum      = (trackPointId) => {
    uploadSpectreDialog.value = true
    currentTrackPoint.value   = trackPointId
}

const handleFileUpload = async () => {
    attachment.value = xml2js(await readFile(file.value.files[0]))
}

const uploadSpectrum = () => {
    fetch('/spectrum', {
        method: 'POST',
        body: JSON.stringify({
            track_point_id: currentTrackPoint.value,
            spectrum: attachment.value
        })
    }).then(r => r.json())
        .then(
            () => {
                uploadSpectreDialog.value = false;
                // trackPointHash.value[result.data.spectrum.track_point_id] = [{
                //     id: result.data.spectrum.id,
                //     name: result.data.spectrum.name,
                //     data: result.data.spectrum.data
                // }]
                ElMessage.success({'message': 'Добавлено'})
            }
        )
        .catch(e => {
            ElMessage.error({'message': 'Произошла ошибка'})
            throw e;
        })
    return false
}


function getUser() {
    try {
        return JSON.parse(Cookies.get('USER'))
    } catch {
        return {email: ''}
    }

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
        } catch (error) {
            loading.value = false;
            ElMessage.error('Произошла ошибка')
            throw error;
        }
        loading.value = false;
        ElMessage.success('Успешная регистрация')
        authModal.value = false;
        await fetchTracks()
        form.password = '';
        form.username = '';
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
        } catch (error) {
            loading.value = false
            ElMessage.error('Произошла ошибка')
            throw error;
        }
        loading.value = false
        ElMessage.success('Успешная авторизация')
        authModal.value = false;
        await fetchTracks()
        form.password = '';
        form.username = '';
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

onMounted(() => {
    fetchTracks()
})
const focusElement = (id) => {
    document.getElementById(id).focus()
}
</script>

<template>
    <div class="header-wrp fixedhrd">
        <div class="header flex-row flex-algn-itms-c">
            <a href="#" class="section pdng-l-20px">
                <img src="/imgs/logo.png"
                     alt="logo"
                     style="height: 20px"
                     class="zoom-0_75 mil-zoom-0_5">
            </a>
            <div class="header-links flex-grow-all pdng-l-20px mil-notdisplay">
                <a href="#" @click="listTracksDialog = true">Список треков</a>
                <a href="#" @click="open">Импорт трека</a>
                <el-popover
                    placement="left-end"
                    :width="200"
                    trigger="click"
                    content="this is content, this is content, this is content"
                >
                    <template #reference>
                        <a href="#" @click="toolbarDialog = true">Цвета</a>
                    </template>
                    <template #default>
                        <h3>Схемы</h3>
                        <template v-if="list">
                            <el-radio-group v-model="currentColorScheme">
                                <el-radio :label="key"
                                          v-for="(track, key) in colorSchemes"
                                          style="width: 600px; float: left">
                                    {{ track.name }}
                                    <div class="bgr_gradient" :style="{'background': track.color}"></div>
                                </el-radio>
                            </el-radio-group>
                        </template>
                    </template>
                </el-popover>
                <template v-if="! user.email">
                    <a href="#" @click="authModal = true">Авторизация</a>
                    <a href="#" @click="registerModal = true">Регистрация</a>
                </template>
                <template v-else>
                    <span style="padding-left: 10px">{{ user.email }}</span>
                    <a href="#" @click="logout"> Выход</a>
                </template>
            </div>
            <!-- mobile nav -->
            <div class="section toolbar notdisplay mil-show">
                <span>&nbsp;</span>
                <div>
                    <el-button :icon="List"
                               @click="listTracksDialog = true"
                               size="large"
                               circle/>
                    <el-button @click="open"
                               :icon="User"
                               size="large"
                               type="warning"
                               circle/>
                    <el-popover
                        placement="bottom"
                        :width="200"
                        trigger="click"
                        content="this is content, this is content, this is content"
                    >
                        <template #reference>
                            <el-button :icon="Setting"
                                       @click="toolbarDialog = true"
                                       size="large"
                                       type="warning"
                                       circle/>
                        </template>
                        <template #default>
                            <h3>Схемы</h3>
                            <template v-if="list">
                                <el-radio-group v-model="currentColorScheme">
                                    <el-radio :label="key"
                                              v-for="(schema, key) in colorSchemes"
                                              style="width: 600px; float: left">
                                        {{ schema.name }}
                                        <div class="bgr_gradient" :style="{'background': schema.color}"></div>
                                    </el-radio>
                                </el-radio-group>
                            </template>
                        </template>
                    </el-popover>
                </div>
            </div>
        </div>
    </div>
    <Map :track-id="currentTrack"
         :color-scheme="currentColorScheme"
         @attachspectrum="attachSpectrum"/>
    <el-dialog v-model="uploadSpectreDialog">
        <h3>Добавить спектр</h3>
        <form @submit.prevent="uploadSpectrum">
            <input type="file" name="spectrum" ref="file" v-on:change="handleFileUpload()">
            <button type="submit">Load</button>
        </form>
    </el-dialog>
    <el-dialog v-model="listTracksDialog">
        <h3>Список треков</h3>
        <template v-if="list">
            <el-radio-group v-model="currentTrack">
                <el-radio :label="track.id" v-for="track of list.tracks" style="width: 600px; float: left">
                    {{ track.id }} - {{ track.name }}
                    <template v-if="track.atomfast_id"> (Atomfast)</template>
                </el-radio>
            </el-radio-group>
        </template>
    </el-dialog>
    <el-dialog v-model="authModal" width="300px" @opened="focusElement('signin-login')" center>
        <el-form :model="form"
                 ref="ruleFormRef"
                 :rules="rules"
                 @submit.prevent="submitForm(ruleFormRef)"
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
                 @submit.prevent="submitRegisterForm(registerFormRef)"
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

<style scoped>
@media (max-width: 820px) {
    .toolbar {
        margin-left: 100px;
    }
}

.toolbar {
    position: absolute;
    left: 0;
    z-index: 1;
    top: 0;
    width: 99%;
    display: flex;
    justify-content: space-between;
    padding: 10px;
}

.bgr_gradient {
    width: 32px;
    height: 16px;
    display: inline-block;
    margin-left: 10px;
    margin-right: 10px;
}
</style>
