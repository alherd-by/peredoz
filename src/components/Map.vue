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
            <el-popover
                placement="bottom"
                :width="200"
                trigger="click"
                content="this is content, this is content, this is content"
            >
                <template #reference>
                    <el-button :icon="Filter"
                               @click="toolbarDialog = true"
                               size="large"
                               type="warning"
                               circle/>
                </template>
                <template #default>
                    <h3>Схемы</h3>
                    <template v-if="list">
                        <el-radio-group v-model="colorScheme">
                            <el-radio :label="key"
                                      v-for="(track, key) in schemes"
                                      style="width: 600px; float: left">
                                {{ track }} {{ key }}
                            </el-radio>
                        </el-radio-group>
                    </template>
                </template>
            </el-popover>
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
import {Circle, Fill, Style} from 'ol/style';
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


let SCHEME_RED_GREEN = 0, SCHEME_RED_BLUE_16 = 1, SCHEME_RED_BLUE_32 = 2;

const schemes = {
    [SCHEME_RED_GREEN]: 0,
    [SCHEME_RED_BLUE_16]: 16,
    [SCHEME_RED_BLUE_32]: 32
}

const currentTrack     = ref(0);
const colorScheme      = ref();
const listTracksDialog = ref(false);
const toolbarDialog    = ref(false);


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

let styleCache = {};

function interpolate(val, y0, x0, y1, x1) {
    return (val - x0) * (y1 - y0) / (x1 - x0) + y0;
}

function blue(grayscale) {
    if (grayscale < -0.33) return 1.0;
    else if (grayscale < 0.33) return interpolate(grayscale, 1.0, -0.33, 0.0, 0.33);
    else return 0.0;
}

function green(grayscale) {
    if (grayscale < -1.0) return 0.0; // unexpected grayscale value
    if (grayscale < -0.33) return interpolate(grayscale, 0.0, -1.0, 1.0, -0.33);
    else if (grayscale < 0.33) return 1.0;
    else if (grayscale <= 1.0) return interpolate(grayscale, 1.0, 0.33, 0.0, 1.0);
    else return 1.0; // unexpected grayscale value
}

function red(grayscale) {
    if (grayscale < -0.33) return 0.0;
    else if (grayscale < 0.33) return interpolate(grayscale, 0.0, -0.33, 1.0, 0.33);
    else return 1.0;
}

const calcColor = (value, color_scheme) => {
    if (value > 1.0) value = 1.0;
    if (value < 0) value = 0;

    var r, g;
    var q = 1;
    if (color_scheme == SCHEME_RED_GREEN) {
        if (value < 0.5) {
            g = 255;
            value /= 0.5;
            r = (value * 255) | 0;
        } else {
            value -= 0.5;
            value /= 0.5;
            g = ((1 - value) * 255) | 0;
            r = 255;
        }
        return {
            r: r | 0,
            g: g | 0,
            b: 0
        };
    } else if (color_scheme == SCHEME_RED_BLUE_16) {
        q = 16;
    } else if (color_scheme == SCHEME_RED_BLUE_32) {
        q = 32;
    }
    let gray = (((value * q) | 0) / q) * 2 - 1;
    return {
        r: (255 * red(gray)) | 0,
        g: (255 * green(gray)) | 0,
        b: (255 * blue(gray)) | 0
    };
}


let featureLayer = new VectorLayer({
    source: featuresSource,
    style(feature) {
        let size;

        const props  = feature.getProperties();
        size         = props['d'] + '_' + colorScheme.value
        const colors = calcColor(props['d'], colorScheme.value)

        let style = styleCache[size];
        if (style) {
            return style
        }

        style = new Style({
            image: new Circle({
                radius: 5,
                fill: new Fill({
                    color: `rgba(${colors.r},${colors.g}, ${colors.b},0.7)`,
                }),
            }),
        });

        styleCache[size] = style;

        return style;
    }
})

watch(colorScheme, () => {
    setInterval(() => {
        styleCache = {};
        featureLayer.getSource().dispatchEvent('change');
    }, 1000);
})

const colorLegend = () => {

    var maxIntensity = 0.1141;
    var minIntensity = 0.041;
    var colors_count = color_scheme == SCHEME_RED_BLUE_16 ? 16 : 32;
    var diff         = maxIntensity - minIntensity;
    for (var i = 0; i < colors_count; i++) {
        var v               = 1 - i / (colors_count - 1);
        var li              = document.createElement("li");
        var color           = calcColor(v, color_scheme);
        li.style.background = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
        if (i == 0 || i == colors_count - 1 || i == colors_count / 2 || i == colors_count / 4 || i == 3 * colors_count / 4) {
            var d        = minIntensity + diff * v;
            li.innerText = d.toFixed(2);
        }
        if (i == 1) {
            li.innerText = "uSv/h";
        }
        this.ul.appendChild(li);
    }
}

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
