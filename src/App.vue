<script setup>
import Map     from './components/Map.vue'
import Auth    from "./components/Auth.vue";
import Adding  from "./components/Adding.vue";
import Filters from "./components/Filters.vue";
import About   from "./components/About.vue";

import {UserFilled, Filter, Plus, Setting, QuestionFilled, Expand} from '@element-plus/icons-vue'

import {computed, ref, onMounted, watch} from "vue";

import {calcColor, colorSchemes, SCHEME_RED_BLUE_16} from "./colors";
import {getUser}                                     from "./user";
import {supabase}                                    from "./supabase";
import {ElMessage}                                   from "element-plus";


const toolbarDialog         = ref(false);
const user                  = ref({email: ''});
const currentColorScheme    = ref(SCHEME_RED_BLUE_16 + '');
const showLegend            = ref(true);
const showPollutionMap      = ref(false);
const adding                = ref();
const map                   = ref();
const pollutionLayerOpacity = ref(0.3)
const maxIntensity          = ref(4.7033);
const minIntensity          = ref(0.0386);
const auth                  = ref();
const filtersRef            = ref();
const userList              = ref([])
const trackList             = ref([])
const params                = (new URL(document.location)).searchParams;
const isNewPassword         = ref(params.get("resetpwd") === null);
const isNewcomer            = ref(!user.value.email && params.get("confirmation") === null && !isNewPassword);
const onAuth                = (v) => {
    user.value = v;
}
const onLogout              = (value) => {
    user.value = value
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && !user.value.email && params.get("confirmation") !== null) {
        ElMessage.success('Успешно подтверждена почта!')
        user.value = session.user
    }
    if (event === 'PASSWORD_RECOVERY') {
        auth.value.openNewPassword()
    }
})

const fetchTracks = async () => {
    let {data, error} = await supabase
        .from("tracks")
        .select(`*,user!user_fk(*)`)
    if (error) {
        throw error
    }
    trackList.value = data;
    map.value.updateTracks();
}

const fetchUsers = async () => {
    let {data, error} = await supabase
        .from("user")
        .select(`*`)
    if (error) {
        throw error
    }
    userList.value = data;
}

const onChange = (event) => {
    if (event.track && event.track.min_doserate && event.track.max_doserate) {
        minIntensity.value = event.track.min_doserate;
        maxIntensity.value = event.track.max_doserate;
    }
    map.value.refresh(event)
}

watch(
    pollutionLayerOpacity,
    (val) => {
        map.value.setPollutionLayerOpacity(val)
    }
)
watch(showPollutionMap, (val) => {
    if (val) {
        map.value.addPollutionLayer()
    } else {
        map.value.removePollutionLayer()
    }
})

const legend = computed(() => {
    let colors_count = currentColorScheme.value === SCHEME_RED_BLUE_16 ? 16 : 32;
    let diff         = maxIntensity.value - minIntensity.value;
    const items      = [];
    for (let i = 0; i < colors_count; i++) {
        let v     = 1 - i / (colors_count - 1);
        let color = calcColor(v, parseInt(currentColorScheme.value));
        let item  = {
            background: "rgb(" + color.r + "," + color.g + "," + color.b + ")",
            innerHtml : ''
        }
        if (i === 0 || i === colors_count - 1 || i === colors_count / 2 || i === colors_count / 4 || i === 3 * colors_count / 4) {
            let d          = minIntensity.value + diff * v;
            item.innerHtml = d.toFixed(2);
        } else if (i === 1) {
            item.innerHtml = "uSv/h";
        }
        items.push(item);
    }
    return items
})

onMounted(async () => {
    user.value = await getUser();
    await fetchTracks()
    await fetchUsers()
})
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
                <el-button :icon="Filter" @click="filtersRef.show()">
                    Показать
                </el-button>
                <el-popover
                    placement="bottom-end"
                    :width="400"
                    trigger="click"
                    content="this is content, this is content, this is content"
                >
                    <template #reference>
                        <el-button :icon="Setting" @click="toolbarDialog = true">Настройки</el-button>
                    </template>
                    <template #default>
                        <h3>Схемы</h3>
                        <div class="pdng-l-5px">
                            <el-radio-group v-model="currentColorScheme">
                                <el-radio :label="key"
                                          v-for="(track, key) in colorSchemes"
                                          style="width: 600px; float: left">
                                    {{ track.name }}
                                    <div class="bgr_gradient" :style="{'background': track.color}"></div>
                                </el-radio>
                            </el-radio-group>
                            <el-checkbox v-model="showLegend">Отображать легенду</el-checkbox>
                            <el-checkbox v-model="showPollutionMap">Отображать карту загрязнений</el-checkbox>
                        </div>
                        <div class="pdng-l-5px">
                            Прозрачность карты загрязнений
                        </div>
                        <div class="pdng-l-10px">
                            <el-slider v-model="pollutionLayerOpacity" :max="1" :min="0.2" :step="0.05"/>
                        </div>
                    </template>
                </el-popover>
                <template v-if="! (user && user.email)">
                    <el-button :icon="UserFilled" @click="auth.openSignIn()">
                        Авторизация
                    </el-button>
                    <el-button :icon="UserFilled" @click="auth.openSignUp()">
                        Регистрация
                    </el-button>
                </template>
                <template v-else>
                    <el-button :icon="Plus" @click="adding.open()" v-show="user && user.email">
                        Добавить
                    </el-button>
                </template>
                <el-button :icon="QuestionFilled" @click="isNewcomer = true">
                    О проекте
                </el-button>
                <span class="pdng-l-50px" v-if="user && user.email">
                    <span class="pdng-l-10px">
                        {{ user.user_metadata && user.user_metadata.username ? user.user_metadata.username : user.email }}
                    </span>
                    <el-button @click="auth.logout()" class="mrgn-l-10px">
                        Выход
                    </el-button>
                </span>
            </div>
        </div>
    </div>
    <div id="legend" v-show="showLegend">
        <ul id="legend-list">
            <li class="legend-list-item" v-for="item of legend" v-html="item.innerHtml ? item.innerHtml : '&nbsp;'"
                :style="{background: item.background}">
            </li>
        </ul>
    </div>
    <!-- mobile nav -->
    <div class="toolbar notdisplay mil-show">
        <div class="pdng-t-15px">
            <el-button :icon="QuestionFilled" circle size="large" @click="isNewcomer = true">
            </el-button>
        </div>
        <div class="pdng-t-15px">
            <el-popover
                placement="bottom-end"
                :width="170"
                trigger="click"
                class="buttons-collection"
                content=""
            >
                <template #reference>
                    <el-button :icon="Expand" @click="toolbarDialog = true" circle size="large"></el-button>
                </template>
                <template #default>
                    <div class="buttons-collection">
                        <div class="pdng-t-15px">
                            <el-button :icon="Filter"
                                       round
                                       @click="filtersRef.show()"
                                       size="large">Показать
                            </el-button>
                        </div>
                        <div class="pdng-t-15px">
                            <el-popover
                                placement="bottom-end"
                                :width="280"
                                trigger="click"
                                content="this is content, this is content, this is content"
                            >
                                <template #reference>
                                    <el-button :icon="Setting"
                                               @click="toolbarDialog = true"
                                               round size="large">
                                        Настройки
                                    </el-button>
                                </template>
                                <template #default>
                                    <h3>Схемы</h3>
                                    <div class="pdng-l-5px">
                                        <el-radio-group v-model="currentColorScheme">
                                            <el-radio :label="key"
                                                      v-for="(track, key) in colorSchemes">
                                                {{ track.name }}
                                                <div class="bgr_gradient" :style="{'background': track.color}"></div>
                                            </el-radio>
                                        </el-radio-group>
                                        <el-checkbox v-model="showLegend">Отображать легенду</el-checkbox>
                                        <el-checkbox v-model="showPollutionMap">Отображать карту загрязнений</el-checkbox>
                                    </div>
                                    <div class="pdng-l-5px">
                                        Прозрачность карты загрязнений
                                    </div>
                                    <div class="pdng-l-10px">
                                        <el-slider v-model="pollutionLayerOpacity" :max="1" :min="0.2" :step="0.05"/>
                                    </div>
                                </template>
                            </el-popover>
                        </div>
                        <template v-if="!(user && user.email)">
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
                        </template>
                        <template v-else>
                            <div class="pdng-t-15px">
                                <el-button :icon="Plus"
                                           round
                                           @click="adding.open()"
                                           size="large">Добавить
                                </el-button>
                            </div>
                            <div class="pdng-t-15px">
                                <el-popover
                                    placement="bottom-end"
                                    :width="300"
                                    trigger="click"
                                >
                                    <template #reference>
                                        <el-button :icon="UserFilled" round size="large">Пользователь</el-button>
                                    </template>
                                    <template #default>
                                        <p style="color:black">
                                            Ваш аккаунт:
                                            {{ user.user_metadata && user.user_metadata.username ? user.user_metadata.username : user.email }}
                                        </p>
                                        <el-button @click="auth.logout()">
                                            Выход
                                        </el-button>
                                    </template>
                                </el-popover>
                            </div>
                        </template>
                    </div>
                </template>
            </el-popover>
        </div>
    </div>
    <Adding @new-track="fetchTracks"
            @new-objects="map.refresh()"
            @request-point-locating="map.enableDrawing()"
            ref="adding"></Adding>
    <Map ref="map"
         :track-list="trackList"
         :user-list="userList"
         @track-requested="filtersRef.addTrack($event)"
         @point-located="adding.onPointLocated($event)"
         @spectrum-attached="adding.attachSpectrum($event)"
         :color-scheme="currentColorScheme"
    />
    <Filters @change="onChange($event)"
             :track-list="trackList"
             ref="filtersRef"/>
    <Auth ref="auth" @auth="onAuth" @logout="onLogout"/>
    <el-dialog v-model="isNewcomer"
               title="Добро пожаловать!"
               width="var(--dialog-newcomer-width)"
               center>
        <about></about>
    </el-dialog>
</template>
<style>
.el-dialog {
    --dialog-width: 70%;
    --dialog--newcomer-width: 70%;
}

.buttons-collection button {
    width: 140px;
}

#legend {
    position: absolute;
    left: 0;
    top: 25px;
    z-index: 3;
    padding-left: 10px;
}

#legend ul {
    list-style-type: none;
}

@media (min-width: 820px) {
    #legend {
        top: 150px;
    }
}

@media (max-width: 820px) {
    .el-dialog {
        --dialog-width: 100%;
        --dialog-newcomer-width: 100%;
    }

    .legend-list-item {
        font-size: 0.8rem;
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
