<script setup>
import Map from './components/Map.vue'
import Auth from "./components/Auth.vue";

import {UserFilled, Filter, Plus, Setting, QuestionFilled} from '@element-plus/icons-vue'

import {computed, onMounted, reactive, ref, watch} from "vue";
import {ElMessage} from 'element-plus';
import {xml2js} from "./xml2js";
import {calcColor, colorSchemes, SCHEME_RED_BLUE_16} from "./colors";
import {getUser} from "./user";
import {formatWithTime} from './date'

const toolbarDialog      = ref(false);
const filterDialog       = ref(false);
const currentColorScheme = ref(SCHEME_RED_BLUE_16 + '');
const filter             = reactive({
    created_at: '',
    user_id: '',
    track_id: []
})
const showLegend         = ref(true);
const initialAdding      = {
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
const trackList          = ref();
const trackListLoading   = ref(false)
const trackListSorting   = ref({created_at: 'desc'})
const trackListFilter    = ref('')
const trackListFiltered  = computed(() => {
    if (!trackList.value) {
        return []
    }
    let tmp = trackList.value;
    if (filter.user_id) {
        let uf   = JSON.parse(filter.user_id)
        const ff = uf['user_id']['_neq']
            ? (s) => s.user.id !== uf['user_id']['_neq']
            : (s) => s.user.id === uf['user_id']['_eq']
        tmp      = tmp.filter(ff)
    }
    if (trackListFilter.value.length >= 3) {
        tmp = tmp.filter(s => s.name.toLowerCase().includes(trackListFilter.value.toLowerCase()))
    }
    return tmp;
})

const map               = ref()
const file              = ref(null);
const addingDialog      = ref(false)
const currentTrackPoint = ref(null)
const drawingEnabled    = ref(false)
const auth              = ref();
const loading           = ref(false)
const user              = ref(getUser())
const mobileToolbar     = ref(false)
let adding              = reactive({...initialAdding});

const addAtomfastTrack = async () => {
    const response = await fetch('/atomfast', {
        method: 'POST',
        body: JSON.stringify({url: adding.atomfast_url, name: adding.name})
    })

    return await response.json()
}

const fetchTracks = async () => {
    trackListLoading.value = true
    try {
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
        trackList.value = data.tracks;
    } finally {
        trackListLoading.value = false
    }
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
        '/radiacode',
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
    user.value = value;
    fetchTracks()
}
const onLogout = (value) => {
    user.value = value
}

const maxIntensity = 4.7033;
const minIntensity = 0.0386;
const legend       = computed(() => {
    let colors_count = currentColorScheme.value === SCHEME_RED_BLUE_16 ? 16 : 32;
    let diff         = maxIntensity - minIntensity;
    const items      = [];
    for (let i = 0; i < colors_count; i++) {
        let v     = 1 - i / (colors_count - 1);
        let color = calcColor(v, parseInt(currentColorScheme.value));
        let item  = {
            background: "rgb(" + color.r + "," + color.g + "," + color.b + ")",
            innerHtml: ''
        }
        if (i === 0 || i === colors_count - 1 || i === colors_count / 2 || i === colors_count / 4 || i === 3 * colors_count / 4) {
            let d          = minIntensity + diff * v;
            item.innerHtml = d.toFixed(2);
        } else if (i === 1) {
            item.innerHtml = "uSv/h";
        }
        items.push(item);
    }
    return items
})

onMounted(() => {
    fetchTracks()
})

const save = async () => {
    try {
        if (adding.point_type === 'generic') {
            if (adding.attachment.length === 0) {
                ElMessage.error('Прикрепите пожалуйста минимум один файл');
                return
            }
            if (adding.comment.length < 8) {
                ElMessage.error('Укажите короткий комментарий (не менее 8 символов)');
                return
            }
            loading.value = true;
            await addGenericPoint()
            loading.value = false;
            return
        }
        if (adding.point_type === 'spectrum') {
            if (adding.attachment.length === 0) {
                ElMessage.error('Необходимо прикрепить файл спектра');
                return
            }
            loading.value = true;
            await uploadSpectrum()
            loading.value = false;
            return
        }
        if (adding.track_type === 'radiacode') {
            if (adding.attachment.length === 0) {
                ElMessage.error('Необходимо прикрепить файл');
                return
            }
            loading.value = true;
            await uploadRadiocode()
            loading.value = false;
            return
        }
        if (adding.track_type === 'atomfast') {
            loading.value = true;
            const payload = await addAtomfastTrack()
            if (payload.error) {
                ElMessage.error(payload.error)
                return
            }
            ElMessage.success('Трек с Atomfast успешно добавлен')
            addingDialog.value = false
        }
        if (adding.track_type) {
            await fetchTracks()
        }
    } catch (e) {
        ElMessage.error('Произошла ошибка')
        throw e
    } finally {
        map.value.refreshMap();
        loading.value = false;
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
const saveFilter = () => {
    map.value.refreshMap(filter)
    filterDialog.value = false
}

const trackListTable = ref();

const onRowsSelect = (rows) => {
    if (rows.length === trackListFiltered.value.length || rows.length === 0) {
        return
    }
    if (rows.length > 3) {
        trackListTable.value.toggleRowSelection(rows[0], undefined)
    }
    filter.track_id = rows.map((i) => i.id)
}
const onSelectAll  = () => {
    trackListTable.value.clearSelection()
}
</script>

<template>
    <div class="header-wrp fixedhrd">
        <div class="header flex-row flex-algn-itms-c mil-notdisplay">
            <a href="/" class="section pdng-l-20px">
                <img src="/imgs/logo.png"
                     alt="logo"
                     style="height: 20px"
                     class="zoom-0_75 mil-zoom-0_5">
            </a>
            <div class="header-links flex-grow-all pdng-l-20px">
                <template v-if="! user.email">
                    <el-button :icon="UserFilled" @click="auth.openSignIn()">
                        Авторизация
                    </el-button>
                    <el-button :icon="UserFilled" @click="auth.openSignUp()">
                        Регистрация
                    </el-button>
                </template>
                <template v-else>
                    <el-button :icon="Filter" @click="filterDialog = true" v-show="user.email">
                        Показать
                    </el-button>
                    <el-button :icon="Plus" @click="addingDialog = true" v-show="user.email">
                        Добавить
                    </el-button>
                    <el-popover
                        placement="bottom-end"
                        :width="200"
                        trigger="click"
                        content="this is content, this is content, this is content"
                    >
                        <template #reference>
                            <el-button :icon="Setting" @click="toolbarDialog = true">Настройки</el-button>
                        </template>
                        <template #default>
                            <h3>Схемы</h3>
                            <el-radio-group v-model="currentColorScheme">
                                <el-radio :label="key"
                                          v-for="(track, key) in colorSchemes"
                                          style="width: 600px; float: left">
                                    {{ track.name }}
                                    <div class="bgr_gradient" :style="{'background': track.color}"></div>
                                </el-radio>
                            </el-radio-group>
                            <el-checkbox v-model="showLegend">Показывать легенду</el-checkbox>
                        </template>
                    </el-popover>
                    <span style="padding-left: 10px">{{ user.email }}</span>
                    <el-button @click="auth.logout()" class="mrgn-l-10px">
                        Выход
                    </el-button>
                </template>
            </div>
            <!-- mobile nav -->
        </div>
    </div>
    <div id="legend" v-show="showLegend">
        <ul id="legend-list">
            <li v-for="item of legend" v-html="item.innerHtml ? item.innerHtml : '&nbsp;'"
                :style="{background: item.background}">
            </li>
        </ul>
    </div>
    <div class="toolbar notdisplay mil-show">
        <template v-if="! user.email">
            <div class="pdng-t-15px">
                <el-button :icon="UserFilled" @click="auth.openSignIn()" round>
                    Авторизация
                </el-button>
            </div>
            <div class="pdng-t-15px">
                <el-button :icon="UserFilled" @click="auth.openSignUp()" round>
                    Регистрация
                </el-button>
            </div>
            <div class="pdng-t-15px">
                <el-button :icon="QuestionFilled" round>
                    О проекте &nbsp; &nbsp;
                </el-button>
            </div>
        </template>
        <template v-else>
            <div class="pdng-t-15px">
                <el-button :icon="Filter" circle @click="filterDialog = true;mobileToolbar = false"
                           size="large"></el-button>
            </div>
            <div class="pdng-t-15px">
                <el-button :icon="Plus" circle @click="addingDialog = true" size="large"></el-button>
            </div>
            <div class="pdng-t-15px">
                <el-popover
                    placement="left-end"
                    :width="200"
                    trigger="click"
                    content="this is content, this is content, this is content"
                >
                    <template #reference>
                        <el-button :icon="Setting" @click="toolbarDialog = true" circle size="large"></el-button>
                    </template>
                    <template #default>
                        <h3>Схемы</h3>
                        <el-radio-group v-model="currentColorScheme">
                            <el-radio :label="key"
                                      v-for="(track, key) in colorSchemes">
                                {{ track.name }}
                                <div class="bgr_gradient"
                                     :style="{'background': track.color}"></div>
                            </el-radio>
                        </el-radio-group>
                        <el-checkbox v-model="showLegend">Показывать легенду</el-checkbox>
                    </template>
                </el-popover>
            </div>
            <div class="pdng-t-15px">
                <el-popover
                    placement="left-end"
                    :width="300"
                    trigger="click"
                >
                    <template #reference>
                        <el-button :icon="UserFilled" circle size="large"></el-button>
                    </template>
                    <template #default>
                        <p style="color:black">Ваш аккаунт: {{ user.email }}</p>
                        <el-button @click="auth.logout()">
                            Выход
                        </el-button>
                    </template>
                </el-popover>
            </div>
            <div class="pdng-t-15px">
                <el-button :icon="QuestionFilled" circle size="large"></el-button>
            </div>
        </template>
    </div>
    <Map ref="map"
         @get-location="onReceivingLocation"
         @get-location-error="onReceivingLocationError"
         @point-located="onPointLocated"
         :color-scheme="currentColorScheme"
         @attachspectrum="attachSpectrum"/>
    <el-dialog v-model="addingDialog"
               width="var(--dialog-width)"
               center
               @open="mobileToolbar = false"
               @close="onAddingDialogClose">
        <h3>Добавить...</h3>
        <el-form class="pdng-t-10px"
                 v-loading="loading"
                 label-position="left"
                 label-width="8.5em"
                 :model="adding"
                 @submit.prevent="save">
            <el-form-item label="Категория">
                <el-radio-group v-model="adding.category" size="large" :disabled="!!currentTrackPoint">
                    <el-radio :label="'track'">Трек</el-radio>
                    <el-radio :label="'point'">Точка</el-radio>
                </el-radio-group>
            </el-form-item>
            <template v-if="adding.category === 'track'">
                <el-form-item label="Тип">
                    <el-radio-group v-model="adding.track_type" size="large">
                        <el-radio :label="'atomfast'">Atomfast</el-radio>
                        <el-radio :label="'radiacode'">RadiaCode</el-radio>
                    </el-radio-group>
                </el-form-item>
                <template v-if="adding.track_type === 'atomfast'">
                    <el-form-item label="Ссылка" required prop="atomfast_url">
                        <el-input placeholder="http://atomfast" v-model="adding.atomfast_url"></el-input>
                    </el-form-item>
                    <el-form-item label="Название" required prop="name">
                        <el-input placeholder="" v-model="adding.name"></el-input>
                    </el-form-item>
                </template>
                <template v-if="adding.track_type === 'radiacode'">
                    <el-form-item label="RadiaCode" required>
                        <input type="file"
                               class="pdng-t-5px"
                               name="spectrum"
                               v-on:change="handleRadiocodeTrackFileUpload"
                               ref="file">
                    </el-form-item>
                    <el-form-item label="Название" prop="name" required>
                        <el-input placeholder="Название" v-model="adding.name"></el-input>
                    </el-form-item>
                </template>
            </template>
            <template v-if="adding.category === 'point'">
                <el-form-item label="Тип">
                    <el-radio-group v-model="adding.point_type" size="large" :disabled="!!currentTrackPoint">
                        <el-radio :label="'spectrum'">Спектр</el-radio>
                        <el-radio :label="'generic'">Комментарий/файл</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="Локация" v-if="adding.point_type && !currentTrackPoint">
                    <el-radio-group v-model="adding.location_type" size="large" v-loading="currentLocation.waiting">
                        <el-radio :label="'current'"
                                  :disabled="!!currentLocation.error"
                                  @click="requestCurrentLocation">
                            Текущее местоположение
                        </el-radio>
                        <el-radio :label="'specifying'">Указать на карте</el-radio>
                    </el-radio-group>
                </el-form-item>
                <template v-if="adding.point_type === 'spectrum'">
                    <el-form-item label="Спектр" required>
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
                                  rows="5"
                                  placeholder="Комментарий"></el-input>
                    </el-form-item>
                    <el-form-item label="Медиа-файлы" required>
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
    <el-dialog v-model="filterDialog"
               top="0"
               :show-close="false"
               width="var(--dialog-width)">
        <div class="scene" style="padding-top: 0">
            <div class="flex-column pdng-b-15px" id="filter-actions">
                <el-row class="pdng-l-5px">
                    <el-button @click="saveFilter" type="success">
                        Применить фильтр
                    </el-button>
                    <el-button @click="filterDialog = false" type="danger">
                        Отмена
                    </el-button>
                </el-row>
                <el-row class="pdng-t-25px mil-pdng-t-5px pdng-b-25px pdng-l-5px">
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
                <el-row class="pdng-t-5px pdng-l-5px">
                    <span class="pdng-t-10px pdng-r-10px">
                        <b>Название трека:</b>
                    </span>
                    <el-input v-model="trackListFilter" autofocus></el-input>
                </el-row>
            </div>
            <div class="flex-column">
                <div class="pdng-t-20px" v-loading="trackListLoading" style="overflow-x: auto">
                    <h4 class="pdng-l-5px">Выберите треки (не больше трех)</h4>
                    <el-table :data="trackListFiltered"
                              class="pdng-t-10px"
                              ref="trackListTable"
                              row-key="id"
                              :default-sort="{ prop: Object.keys(trackListSorting)[0], order: Object.values(trackListSorting)[0] + 'ending' }"
                              highlight-current-row
                              @select-all="onSelectAll"
                              @selection-change="onRowsSelect"
                              table-layout="auto">
                        <el-table-column type="selection" width="50" fixed/>
                        <el-table-column label="Название" prop="name" min-width="150" sortable>
                            <template #header>
                                Название (Всего: {{ trackListFiltered.length }})
                                <div class="notdisplay mil-show hint-scroll">
                                    <svg
                                        width="25"
                                        viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-78e17ca8="">
                                        <path fill="currentColor"
                                              d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path>
                                        <path fill="currentColor"
                                              d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path>
                                    </svg>
                                    <svg width="25"
                                         viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-78e17ca8="">
                                        <path fill="currentColor"
                                              d="M511.552 128c-35.584 0-64.384 28.8-64.384 64.448v516.48L274.048 570.88a94.272 94.272 0 0 0-112.896-3.456 44.416 44.416 0 0 0-8.96 62.208L332.8 870.4A64 64 0 0 0 384 896h512V575.232a64 64 0 0 0-45.632-61.312l-205.952-61.76A96 96 0 0 1 576 360.192V192.448C576 156.8 547.2 128 511.552 128zM359.04 556.8l24.128 19.2V192.448a128.448 128.448 0 1 1 256.832 0v167.744a32 32 0 0 0 22.784 30.656l206.016 61.76A128 128 0 0 1 960 575.232V896a64 64 0 0 1-64 64H384a128 128 0 0 1-102.4-51.2L101.056 668.032A108.416 108.416 0 0 1 128 512.512a158.272 158.272 0 0 1 185.984 8.32L359.04 556.8z"></path>
                                    </svg>
                                </div>
                            </template>
                            <template #default="{row}">
                                #{{ row.id }} - <b>{{ row.name }}</b>
                                <template v-if="row.atomfast_id"> (Atomfast)</template>
                            </template>
                        </el-table-column>
                        <el-table-column label="Пользователь" prop="user.id" sortable #default="{row}" min-width="300">
                            <template v-if="row.user">
                                {{ row.user.display_name ? row.user.display_name : row.user.email }}
                            </template>
                        </el-table-column>
                        <el-table-column label="Добавлен" #default="{row}" prop="created_at" sortable min-width="300">
                            {{ formatWithTime(row.created_at) }}
                        </el-table-column>
                    </el-table>
                </div>
            </div>
        </div>
    </el-dialog>
    <Auth ref="auth" @auth="onAuth" @logout="onLogout"/>
</template>

<style>
.el-dialog {
    --dialog-width: 70%;
}

@media (max-width: 820px) {
    .el-dialog {
        --dialog-width: 100%;
    }
}

.committee-view {
    display: flex;
    align-items: flex-start;
}

#legend {
    position: absolute;
    left: 0;
    top: 25px;
    z-index: 3;
}

#legend ul {
    list-style-type: none;
}

@media (min-width: 820px) {
    #legend {
        top: 150px;
        padding-left: 10px;
    }
}

.toolbar {
    position: absolute;
    right: 10px;
    top: 0;
    z-index: 3;
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

#filter-actions {
    position: -webkit-sticky; /* Safari */
    position: sticky;
    top: 0;
    padding-top: 10px;
    background-color: white;
    z-index: 5;
    width: 100%;
}
</style>
