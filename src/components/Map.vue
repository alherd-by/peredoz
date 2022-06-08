<template>
    <div class="toolbar">
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
            <el-button :icon="Filter"
                       size="large"
                       type="warning"
                       circle/>
        </div>
    </div>
    <div id="map" style="height: 100%;width: 100%"></div>
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
<script setup>
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import {OSM} from "ol/source";
import View from "ol/View";
import {fromLonLat} from "ol/proj";
import {useQuery} from "@urql/vue";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON"
import {Style} from 'ol/style';
import 'ol/ol.css'
import {ref, onMounted, watch} from 'vue'
import {Filter, User, List} from '@element-plus/icons-vue'

import {
    ElMessageBox,
    ElButton,
    ElDialog,
    ElMessage,
    ElRadioGroup,
    ElRadio
} from "element-plus";

const currentTrack     = ref(0);
const listTracksDialog = ref(false);


const loadFeatures = async function (source, projection) {
    // const response = await fetch(
    //     'https://peredoz.hasura.app/api/rest/track',
    //     {
    //         method: 'GET',
    //     }
    // )
    const response = await fetch(
        import.meta.env.VITE_API_BASE_URL + '/api/rest/points/track/' + currentTrack.value,
        {
            method: 'GET',
        }
    )
    const payload  = await response.json()

    if (payload.features_by_pk) {
        const temp = (new GeoJSON()).readFeatures(
            payload.features_by_pk.data,
            {featureProjection: projection}
        )
        source.addFeatures(
            temp
        )
    }

    if (payload.track) {
        const temp = (new GeoJSON()).readFeatures(
            payload.track,
            {featureProjection: projection}
        )
        source.addFeatures(temp)
    }
}

let featuresSource = new VectorSource({
    loader: function (extent, resolution, projection) {
        if (currentTrack.value > 0) {
            loadFeatures(this, projection, extent)
        }
    },
    format: new GeoJSON()
})

let featureLayer = new VectorLayer({
    source: featuresSource
})

const refreshMap = () => {
    const newLayer = new VectorSource({
        loader: function (extent, resolution, projection) {
            loadFeatures(this, projection)
        },
        format: new GeoJSON()
    })
    featureLayer.setSource(newLayer)
    featuresSource = newLayer
}
watch(currentTrack, () => {
    refreshMap()
    listTracksDialog.value = false;
})

onMounted(
    () => {
        document.getElementById('map').innerHTML = '';
        let map                                  = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            target: 'map',
            view: new View({
                zoom: 7.3,
                center: fromLonLat([27.7834, 53.7098]),
            })
        });
        map.addLayer(featureLayer)
    }
);
const open         = () => {
    ElMessageBox.prompt(
        'Введите ссылку на atomfast',
        'Новый трек',
        {
            confirmButtonText: 'OK',
            inputType: 'http://www.atomfast.net/maps/show/2849/?lat=54.7274&lng=26.014&z=14',
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
const {data: list} = useQuery({
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

</script>

<style scoped>
#map {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
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
</style>
