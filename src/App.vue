<script setup>
import Map from './components/Map.vue'
import Auth from "./components/Auth.vue";

import {onMounted, reactive, ref, watch} from "vue";
import {ElMessage} from 'element-plus';
import {xml2js} from "./xml2js";
import {colorSchemes, SCHEME_RED_BLUE_16} from "./colors";
import {getUser} from "./user";

const toolbarDialog      = ref(false);
const currentTrack       = ref();
const filterDialog       = ref(false);
const currentColorScheme = ref(SCHEME_RED_BLUE_16 + '');
const filter             = reactive({
    created_at: '',
    user_id: '',
    track_id: []
})

const initialAdding = {
    category: '',
    track_type: '',
    point_type: '',
    location_type: '',
    name: '',
    atomfast_url: '',
    comment: '',
    location: null,
    attachment: []
}

let adding = reactive({...initialAdding});

const addAtomfastTrack = async () => {
    const response = await fetch('/atomfast', {
        method: 'POST',
        body: JSON.stringify({url: adding.atomfast_url, name: adding.name})
    })

    return await response.json()
}

const list = ref();

const fetchTracks = async () => {
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

const readFileAsText = (raw) => {
    return new Promise((resolve, reject) => {
        const reader   = new FileReader();
        reader.onload  = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsText(raw);
    });
}
const readMediaFile  = (raw) => {
    return new Promise((resolve, reject) => {
        const reader   = new FileReader();
        reader.onload  = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(raw);
    });
}

const map               = ref()
const file              = ref(null);
const addingDialog      = ref(false)
const currentTrackPoint = ref(null)
const drawingEnabled    = ref(false)
const auth              = ref();
const loading           = ref(false)

const user = ref(getUser())

const attachSpectrum = (trackPointId) => {
    addingDialog.value = true
    adding.category    = 'point'
    adding.point_type  = 'spectrum'

    currentTrackPoint.value = trackPointId
}

const handleRadiocodeTrackFileUpload = async () => {
    adding.attachment.length = 0;
    adding.attachment.push(await readFileAsText(file.value.files[0]))
}


const handleSpectrumFileUpload = async () => {
    adding.attachment.length = 0;
    adding.attachment.push(xml2js(await readFileAsText(file.value.files[0])))
}
const handleMediaFileUpload    = async () => {
    adding.attachment.length = 0;
    for (let elem of file.value.files) {
        adding.attachment.push(await readMediaFile(elem))
    }
}

const uploadRadiocode = async () => {
    const response = await fetch(
        '/radiocode',
        {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({
                name: adding.name,
                track: adding.attachment[0],
            })
        }
    )
    let payload;
    try {
        payload = await response.json()
    } catch (e) {
        ElMessage.error('Произошла ошибка')
        throw e;
    }
    if (payload.error) {
        ElMessage.error(payload.error)
        return
    }
    addingDialog.value = false;
    ElMessage.success({'message': 'Добавлено'})
}
const uploadSpectrum  = async () => {
    let body = {
        point_id: currentTrackPoint.value,
        spectrum: adding.attachment[0],
    }
    if (currentTrackPoint.value) {
        body['point_id'] = currentTrackPoint.value;
    } else {
        body['name']     = adding.name
        body['location'] = adding.location
    }

    const response = await fetch(
        '/spectrum',
        {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify(body)
        }
    )
    let payload;
    try {
        payload = await response.json()
    } catch (e) {
        ElMessage.error('Произошла ошибка')
        throw e;
    }
    if (payload.error) {
        ElMessage.error(payload.error)
        return
    }
    addingDialog.value = false;
    // trackPointHash.value[result.data.spectrum.track_point_id] = [{
    //     id: result.data.spectrum.id,
    //     name: result.data.spectrum.name,
    //     data: result.data.spectrum.data
    // }]
    ElMessage.success({'message': 'Добавлено'})
}
const addGenericPoint = async () => {
    const response = await fetch(
        '/point',
        {
            method: 'POST',
            body: JSON.stringify(adding)
        }
    )
    const payload  = await response.json()
    if (!response.ok) {
        ElMessage.error(payload.error || 'Произошла ошибка')
        return
    }
    if (!payload.error) {
        addingDialog.value = false;
        ElMessage.success({'message': 'Добавлено'})
        Object.assign(adding, initialAdding);
        return
    }
    ElMessage.error({'message': payload.error})
}

const onAuth   = (value) => {
    console.log(value)
    user.value = value;
    fetchTracks()
}
const onLogout = (value) => {
    user.value = value
}
onMounted(() => {
    fetchTracks()
})

const save = async () => {
    if (adding.point_type === 'generic') {
        loading.value = true;
        await addGenericPoint()
        loading.value = false;
        return
    }
    if (adding.point_type === 'spectrum') {
        loading.value = true;
        await uploadSpectrum()
        loading.value = false;
        return
    }
    if (adding.track_type === 'radiocode') {
        loading.value = true;
        await uploadRadiocode()
        loading.value = false;
        return
    }
    if (adding.track_type === 'atomfast') {
        loading.value = true;
        try {
            const payload = await addAtomfastTrack()
            if (payload.error) {
                ElMessage.error(payload.error)
                return
            }
            ElMessage.success('Трек с Atomfast успешно добавлен')
            addingDialog.value = false
        } catch (e) {
            ElMessage.error('Произошла ошибка')
            throw e;
        } finally {
            loading.value = false;
        }
    }
}

const currentLocation = reactive({
    error: null,
    waiting: false,
});

const requestCurrentLocation = () => {
    if (adding.location) {
        return
    }
    currentLocation.waiting = true;
    map.value.requestCurrentLocation()
}

watch(
    currentTrack,
    () => {
        filterDialog.value = false;
        map.value.refreshMap()
    }
)


const onReceivingLocation      = (value) => {
    currentLocation.waiting = false;
    if (!adding.location) {
        adding.location = value;
    }
}
const onPointLocated           = (coordinates) => {
    drawingEnabled.value = false
    addingDialog.value   = true;
    adding.location      = coordinates
}
const onReceivingLocationError = (error) => {
    currentLocation.waiting = false;
    currentLocation.error   = error
    adding.location_type    = '';
}

const onAddingDialogClose = () => {
    if (drawingEnabled.value) {
        return
    }
    currentTrackPoint.value = null;
    adding.category         = ''
}

watch(() => adding.location_type,
    () => {
        if (adding.location_type !== 'specifying') {
            return
        }
        addingDialog.value   = false
        drawingEnabled.value = true;
        map.value.enableDrawing()
    }
)
watch(() => adding.category,
    (category) => {
        if (currentTrackPoint.value) {
            return;
        }
        Object.assign(adding, {
            ...initialAdding,
            category
        });
    })
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
                <a href="#" @click="filterDialog = true">Показать</a>
                <a href="#" @click="addingDialog = true">Добавить</a>
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
                    <a href="#" @click="auth.openSignIn()">Авторизация</a>
                    <a href="#" @click="auth.openSignUp()">Регистрация</a>
                </template>
                <template v-else>
                    <span style="padding-left: 10px">{{ user.email }}</span>
                    <a href="#" @click="auth.logout"> Выход</a>
                </template>
            </div>
            <!-- mobile nav -->
            <div class="section toolbar notdisplay mil-show">
                <input id="brgrbtn" class="notdisplay mil-show" type="checkbox">
                <label for="brgrbtn" class="notdisplay burger-button mil-show">
                    <div class="burger-button-line"></div>
                    <div class="burger-button-line"></div>
                    <div class="burger-button-line"></div>
                </label>
                <div class="brgr-nav notdisplay mil-show">
                    <div class="header-links pdng-l-20px pdng-r-20px">
                        <div class="pdng-t-5px">
                            <a href="#" @click="filterDialog = true">Список треков</a>
                        </div>
                        <div class="pdng-t-5px">
                            <a href="#" @click="addingDialog = true">Добавить</a>
                        </div>
                        <div class="pdng-t-5px">
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
                        </div>
                        <template v-if="! user.email">
                            <div class="pdng-t-5px">
                                <a href="#" @click="authModal = true">Авторизация</a>
                            </div>
                            <div class="pdng-t-5px">
                                <a href="#" @click="registerModal = true">Регистрация</a>
                            </div>
                        </template>
                        <template v-else>
                            <div class="pdng-t-5px">
                                <span style="color:black">{{ user.email }}</span>
                                <a href="#" @click="logout"> Выход</a>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <Map ref="map"
         :filter="filter"
         @get-location="onReceivingLocation"
         @get-location-error="onReceivingLocationError"
         @point-located="onPointLocated"
         :color-scheme="currentColorScheme"
         @attachspectrum="attachSpectrum"/>
    <el-dialog v-model="addingDialog" @close="onAddingDialogClose">
        <h3>Добавить...</h3>
        <el-form class="pdng-t-10px" label-width="180px"
                 v-loading="loading"
                 :model="adding"
                 @submit.prevent="save">
            <el-form-item label="Категория">
                <el-radio-group v-model="adding.category" size="large" :disabled="currentTrackPoint">
                    <el-radio-button :label="'track'">Трек</el-radio-button>
                    <el-radio-button :label="'point'">Точка</el-radio-button>
                </el-radio-group>
            </el-form-item>
            <template v-if="adding.category === 'track'">
                <el-form-item label="Тип">
                    <el-radio-group v-model="adding.track_type" size="large">
                        <el-radio-button :label="'atomfast'">Atomfast</el-radio-button>
                        <el-radio-button :label="'radiocode'">RadioCode</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <template v-if="adding.track_type === 'atomfast'">
                    <el-form-item label="Ссылка на трек" required prop="atomfast_url">
                        <el-input placeholder="http://atomfast" v-model="adding.atomfast_url"></el-input>
                    </el-form-item>
                    <el-form-item label="Название" required prop="name">
                        <el-input placeholder="" v-model="adding.name"></el-input>
                    </el-form-item>
                </template>
                <template v-if="adding.track_type === 'radiocode'">
                    <el-form-item label="RadioCode">
                        <input type="file"
                               class="pdng-t-5px"
                               name="spectrum"
                               v-on:change="handleRadiocodeTrackFileUpload"
                               ref="file">
                    </el-form-item>
                    <el-form-item label="Название" prop="name" required>
                        <el-input type="textarea" placeholder="Название" v-model="adding.name"></el-input>
                    </el-form-item>
                </template>

            </template>
            <template v-if="adding.category === 'point'">
                <el-form-item label="Тип">
                    <el-radio-group v-model="adding.point_type" size="large" :disabled="currentTrackPoint">
                        <el-radio-button :label="'spectrum'">Спектр</el-radio-button>
                        <el-radio-button :label="'generic'">Комментарий/файл</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="Локация" v-if="adding.point_type && !currentTrackPoint">
                    <el-radio-group v-model="adding.location_type" size="large" v-loading="currentLocation.waiting">
                        <el-radio-button :label="'current'"
                                         :disabled="!!currentLocation.error"
                                         @click="requestCurrentLocation">
                            Текущее местоположение
                        </el-radio-button>
                        <el-radio-button :label="'specifying'">Указать на карте</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <template v-if="adding.point_type === 'spectrum'">
                    <el-form-item label="Спектр">
                        <input type="file"
                               class="pdng-t-5px"
                               accept="text/xml"
                               name="spectrum" ref="file"
                               v-on:change="handleSpectrumFileUpload()">
                    </el-form-item>
                    <el-form-item label="Название">
                        <el-input placeholder="Название" v-model="adding.name"></el-input>
                    </el-form-item>
                </template>

                <template v-if="adding.point_type === 'generic'">
                    <el-form-item label="Комментарий" required prop="comment">
                        <el-input type="textarea"
                                  v-model="adding.comment"
                                  placeholder="Комментарий"></el-input>
                    </el-form-item>
                    <el-form-item label="Медиа-файлы">
                        <input type="file" class="pdng-t-5px"
                               ref="file"
                               accept="image/*,video/*"
                               multiple
                               v-on:change="handleMediaFileUpload()">
                    </el-form-item>
                </template>
            </template>
            <template v-if="adding.track_type || adding.point_type">
                <el-form-item>
                    <el-button native-type="submit">Сохранить</el-button>
                </el-form-item>
            </template>
        </el-form>
    </el-dialog>
    <el-dialog v-model="filterDialog" fullscreen :show-close="false">
        <el-row>
            <span class="pdng-t-10px pdng-r-10px">
                <b>Объекты добавлены:</b>
            </span>
            <el-radio-group v-model="filter.user_id">
                <el-radio-button :label="''">Всеми</el-radio-button>
                <el-radio-button :label="JSON.stringify({user_id: {_eq: user.uid}})">
                    Мною
                </el-radio-button>
                <el-radio-button :label="JSON.stringify({user_id: {_neq: user.uid}})">
                    Не мною
                </el-radio-button>
            </el-radio-group>
        </el-row>
        <div class="pdng-t-10px">
            <h4>Выберите треки (не больше трех)</h4>
            <el-checkbox-group v-model="filter.track_id" :min="0" :max="3">
                <el-checkbox :label="track.id"
                             :key="track.id"
                             v-for="track of list">
                    {{ track.id }} - {{ track.name }}
                    <template v-if="track.atomfast_id"> (Atomfast)</template>
                </el-checkbox>
            </el-checkbox-group>
        </div>
    </el-dialog>
    <Auth ref="auth" @auth="onAuth" @logout="onLogout"/>
</template>

<style scoped>
@media (max-width: 820px) {
    .toolbar {
        margin-left: 100px;
    }
}

.toolbar {
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
