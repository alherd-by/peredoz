<template>
    <el-dialog v-model="addingDialog"
               width="var(--dialog-width)"
               center
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
                               accept=".rctrk"
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
                        <el-radio :label="'spectrum'" v-show="false">Спектр</el-radio>
                        <el-radio :label="'generic'">Медиа-файлы/Cпектр</el-radio>
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
                    <span class="pdng-l-10px txt-size-11px txt-color-danger" v-show="currentLocation.error">
                        Произошла ошибка при запросе текущей геолокации, укажите ее вручную
                    </span>
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
</template>

<script setup>
import {ElMessage}                       from "element-plus";
import {onMounted, reactive, ref, watch} from "vue";
import {xml2js}                          from "../xml2js";
import Geolocation            from "ol/Geolocation";
import radiocode              from '../radiacode'
import {supabase}             from "../supabase";
import {getUser}              from "../user";

const user               = ref({email: ''});
const emits = defineEmits(
    ['new-track', 'new-objects', 'request-point-locating']
)
const save  = async () => {
    try {
        if (adding.point_type === 'generic') {
            if (adding.attachment.length === 0) {
                ElMessage.error('Прикрепите пожалуйста минимум один файл');
                return
            }
            if (adding.comment.length < 8) {
                ElMessage.error(
                    'Укажите короткий комментарий (не менее 8 символов)'
                );
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
            emits('new-track')
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
            emits('new-track')
        }
    } catch (e) {
        ElMessage.error('Произошла неожиданная ошибка')
        throw e
    } finally {
        emits('new-objects');
        loading.value = false;
    }
}

const initialAdding     = {
    category     : '',
    track_type   : '',
    point_type   : '',
    location_type: '',
    name         : '',
    atomfast_url : '',
    comment      : '',
    location     : null,
    attachment   : []
}
let adding              = reactive({...initialAdding});
const addingDialog      = ref(false)
const loading           = ref(false)
const file              = ref(null);
const currentTrackPoint = ref(null)
const drawingEnabled    = ref(false)

const geolocation = new Geolocation({
    trackingOptions: {
        enableHighAccuracy: true,
        timeout           : 30000
    },
    projection     : 'EPSG:4326',
});

const requestCurrentLocation = () => {
    if (adding.location) {
        return
    }
    currentLocation.waiting = true;
    geolocation.setTracking(true);
}

geolocation.on('change', function () {
    onReceivingLocation(geolocation.getPosition())
});
geolocation.on('error', function (error) {
    onReceivingLocationError(error)
});

const addAtomfastTrack = async () => {
    const response = await fetch('/atomfast', {
        method : 'POST',
        headers: {
            'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token
        },
        body   : JSON.stringify({url: adding.atomfast_url, name: adding.name})
    })

    return await response.json()
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
    adding.point_type  = 'generic'

    currentTrackPoint.value = trackPointId
}

const uploadRadiocode                = async () => {
    let response;
    response = await supabase
        .from('track')
        .insert([
            {name: adding.name, user_id: user.value.id}
        ]).select().single()
    if (response.error) {
        throw response.error
    }
    console.log(response)
    const points = radiocode.parse(adding.attachment[0]).points.map(i => {
        i.track_id = response.data.id;
        i.user_id  = user.value.id
        return i;
    });
    response     = await supabase
        .from('point')
        .insert(points)
    if (response.error) {
        throw response.error
    }
    addingDialog.value = false;
    ElMessage.success({'message': 'Добавлено'})
}
const uploadSpectrum                 = async () => {
    let response;
    if (!currentTrackPoint.value) {
        response = await supabase
            .from('point')
            .insert([
                {
                    geometry: {
                        type       : 'Point',
                        coordinates: adding.location
                    },
                    user_id : user.value.id
                }
            ]).select().single()
        if (response.error) {
            throw response.error
        }
        currentTrackPoint.value = response.data.id
    }
    response = await supabase
        .from('point')
        .update({
            spectrum: {
                name: adding.name,
                data: adding.attachment[0],
            },
        })
        .match({id: currentTrackPoint.value, user_id: user.value.id})
    if (response.error) {
        throw response.error;
    }
    addingDialog.value = false;
    ElMessage.success({'message': 'Добавлено'})
}
const addGenericPoint                = async () => {
    let body       = JSON.stringify(adding);
    const response = await fetch(
        '/point',
        {
            method : 'POST',
            headers: {
                'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token
            },
            body
        }
    )
    let payload;
    if (!response.ok) {
        let tmp = await response.text()
        try {
            payload = JSON.parse(tmp)
            ElMessage.error(payload.error || 'Произошла ошибка при загрузке')
            return
        } catch (e) {
            throw new Error(tmp || e)
        }
    }
    addingDialog.value = false;
    ElMessage.success({'message': 'Добавлено'})
    Object.assign(adding, initialAdding);
}
const handleRadiocodeTrackFileUpload = async () => {
    adding.attachment.length = 0;
    adding.attachment.push(await readFileAsText(file.value.files[0]))
}

const handleSpectrumFileUpload = async () => {
    adding.attachment.length = 0;
    const element            = xml2js(await readFileAsText(file.value.files[0]));
    adding.name              = file.value.files[0].name.replace('.xml', '')
    adding.attachment.push(element)
}
const handleMediaFileUpload    = async () => {
    if (Array.from(file.value.files).reduce((a, i) => a + i.size, 0) > (130 * 1024 * 1024)) {
        ElMessage.error('Общий размер файлов не должен превышать 130 МБ')
        file.value.value = null
        return
    }
    adding.attachment.length = 0;
    for (let elem of file.value.files) {
        adding.attachment.push(await readMediaFile(elem))
    }
}

const currentLocation = reactive({
    error  : null,
    waiting: false,
});

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
    geolocation.setTracking(false);
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
const open                = () => {
    addingDialog.value = true;
}
defineExpose(
    {
        attachSpectrum,
        onPointLocated,
        open
    }
)

onMounted(async () => {
    user.value = await getUser()
})
watch(() => adding.location_type,
    () => {
        if (adding.location_type !== 'specifying') {
            return
        }
        addingDialog.value   = false
        drawingEnabled.value = true;
        emits('request-point-locating')
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

<style scoped>

</style>
