<script setup>
import Map from './components/Map.vue'
import {
    ElButton,
    ElDialog,
    ElRadioGroup,
    ElRadio, ElMessageBox, ElMessage
} from "element-plus";
import {ref, watch} from "vue";
import {useQuery} from "@urql/vue";
import {xml2js} from "./xml2js";
import {colorSchemes, SCHEME_RED_BLUE_16} from "./colors";
import {List, User, Setting} from '@element-plus/icons-vue'

const toolbarDialog      = ref(false);
const currentTrack       = ref(2);
const listTracksDialog   = ref(false);
const currentColorScheme = ref(SCHEME_RED_BLUE_16 + '');

watch(
    currentTrack,
    () => {
        listTracksDialog.value = false;
    }
)

const open                = () => {
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
const {data: list}        = useQuery({
        // language=GraphQL
        query: `
         query {
            tracks: track {
                id
                name
                atomfast_id
                extra
            }
        }
      `,
    }
)
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
const file                = ref(null);
const attachment          = ref();
const uploadSpectreDialog = ref(false)
const currentTrackPoint   = ref(null)

const attachSpectrum = (trackPointId) => {
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
</script>

<template>
    <div class="header-wrp fixedhrd">
        <div class="header flex-row flex-algn-itms-c">
            <div class="header-links flex-grow-all pdng-l-20px pdng-r-20px mil-notdisplay">
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
                                        <div class="bgr_gradient" :style="{'background': track.color}"></div>
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
