<template>
    <div id="map"
         style="height: 100%;width: 100%"
         v-loading="loading"></div>
    <div id="popup" class="ol-popup">
        <a href="#" id="popup-closer" class="ol-popup-closer"></a>
        <div id="popup-content" v-if="feature">
            <p>id: {{ feature.id }}</p>
            <template v-if="feature && feature.properties && feature.properties.d">
                <span>Doserate: {{ feature.properties.d.toFixed(2) }}uSv/h</span>
                <br>
                <span>GPS accuracy: <b>±{{ feature.properties.r }} m</b></span>
                <br>
                <span>Device: <b>  <span v-html="devices[feature.properties.dv]"></span> </b></span>
                <br>
                <span>Search mode: <b> {{ search_modes[feature.properties.sm] }} </b></span>
                <br>
                <p class="pdng-t-5px" v-if="! feature.properties.spectrum">
                    <a class="txt-underline" href="#" @click="attachSpectrum(feature.id)">
                        Прикрепить спектр
                    </a>
                </p>
            </template>
            <template v-if="feature.properties.spectrum">
                <div class="pdng-t-10px">
                    {{ feature.properties.spectrum.name }}
                    <a class="txt-underline" href="#"
                       @click="currentSpectrum = feature.properties.spectrum.data;showSpectrum = true;">
                        Спектр
                        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                             style="width: 15px;height: 15px"
                             data-v-78e17ca8="">
                            <path fill="currentColor"
                                  d="M768 256H353.6a32 32 0 1 1 0-64H800a32 32 0 0 1 32 32v448a32 32 0 0 1-64 0V256z"></path>
                            <path fill="currentColor"
                                  d="M777.344 201.344a32 32 0 0 1 45.312 45.312l-544 544a32 32 0 0 1-45.312-45.312l544-544z"></path>
                        </svg>
                    </a>
                </div>
            </template>
            <template v-if="feature.properties.track_id">
                <div class="pdng-t-10px">
                    <a class="txt-underline" href="#" @click="trackDrawer = true">
                        Трек
                        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                             style="width: 15px;height: 15px"
                             data-v-78e17ca8="">
                            <path fill="currentColor"
                                  d="M768 256H353.6a32 32 0 1 1 0-64H800a32 32 0 0 1 32 32v448a32 32 0 0 1-64 0V256z"></path>
                            <path fill="currentColor"
                                  d="M777.344 201.344a32 32 0 0 1 45.312 45.312l-544 544a32 32 0 0 1-45.312-45.312l544-544z"></path>
                        </svg>
                    </a>
                </div>
            </template>
            <template v-if="feature.properties.attachments && feature.properties.attachments.length > 0">
                <ul class="pdng-t-5px pdng-l-10px pdng-b-10px">
                    <li v-for="(attachment, index) of feature.properties.attachments">
                        <a :href="attachment.url">Файл {{ index + 1 }}</a>
                    </li>
                </ul>
            </template>
            <template v-if="feature.properties.district">
                <span>Населенный пункт: <b>{{ feature.properties.name }}</b></span>
                <br>
                <span>Район: <b>{{ feature.properties.district }}</b></span>
                <br>
                <span>{{ feature.properties.status }}</span>
                <br>
            </template>
            <template v-if="feature.properties.comment">
                <span class="pdng-t-5px pdng-b-5px">
                    <b>Комментарий</b>: <br>{{ feature.properties.comment }}
                </span>
            </template>
            <template v-if="trackPointHash[feature.id]">
                <br>
                <span v-for="(spectrum) in trackPointHash[feature.id]">{{ spectrum.name }}</span>
            </template>
            <template v-if="feature.properties.user_id">
                <p class="pdng-t-5px">
                    <b>От пользователя</b>: {{
                        users[feature.properties.user_id].display_name
                            ? users[feature.properties.user_id].display_name
                            : users[feature.properties.user_id].email
                    }}
                </p>
            </template>
        </div>
    </div>
    <el-drawer
        v-model="trackDrawer"
        :title="'Трек #' + (feature ? feature.properties.track_id : '')"
        :direction="'rtl'"
    >
        <div class="track-drawer" v-if="tracks[feature.properties.track_id]">
           <span>
                <b>Название</b>: {{ tracks[feature.properties.track_id].name }}
            </span>
            <br>
            <span v-if="tracks[feature.properties.track_id].user">
                <b>От пользователя</b>: {{
                    tracks[feature.properties.track_id].user.displayName ? tracks[feature.properties.track_id].user.displayName : tracks[feature.properties.track_id].user.email
                }}
            </span>
            <br>
            <span>
                <b>Дата</b>:
                <span :title="tracks[feature.properties.track_id].created_at">
                    {{ format(tracks[feature.properties.track_id].created_at) }}
                </span>
            </span>
        </div>
    </el-drawer>
    <el-dialog v-model="showSpectrum" @open="generateChart" width="var(--chart-dialog-width)">
        <div class="pdng-t-30px">
            <div ref="chart" style="width: 600px;height:400px;"></div>
        </div>
    </el-dialog>
</template>
<script setup>
import {format} from '../date'

import Map          from "ol/Map";
import TileLayer    from "ol/layer/Tile";
import {OSM}        from "ol/source";
import View         from "ol/View";
import {fromLonLat} from "ol/proj";

import VectorLayer                                        from "ol/layer/Vector";
import VectorSource                                       from "ol/source/Vector";
import ClusterSource                                      from "ol/source/Cluster";
import GeoJSON                                            from "ol/format/GeoJSON"
import {Circle as CircleStyle, Fill, Style, Text, Stroke} from 'ol/style';
import 'ol/ol.css'
import Overlay                                            from 'ol/Overlay';
import Draw                                               from 'ol/interaction/Draw';
import {init}                                             from 'echarts'

import {ref, onMounted, watch, toRefs, computed} from 'vue'
import {calcColor}                               from "../colors";
import {supabase}                                from "../supabase";

const devices = [
    "",
    "<a href=\"https://kbradar.org/p50432064-dozimetr-radiatsii-atom.html\" target=\"_blank\">AtomTag</a>",
    "<a href=\"https://kbradar.org/p167558602-brelok-dozimetr-radiatsii.html\" target=\"_blank\">AtomSwift</a>",
    "<a href=\"https://kbradar.org/p223290497-dozimetr-radiatsii-atom.html\" target=\"_blank\">AtomFast</a>",
    "<a href=\"http://youratom.com/\" target=\"_blank\">AtomStart</a>",
    "<a href=\"http://youratom.com/\" target=\"_blank\">AtomGamma</a>"
];

const search_modes = ["Fast", "Medium", "Slow", "-"];

const emit = defineEmits([
    'spectrum-attached',
    'point-located'
])

const attachSpectrum                     = (id) => {
    emit('spectrum-attached', id)
}
const props                              = defineProps({
    colorScheme: String,
    trackList  : Array,
    userList   : Array
})
const trackDrawer                        = ref(false)
const {colorScheme, trackList, userList} = toRefs(props)
const filter                             = ref({})
const spectrums                          = ref({})

const showSpectrum    = ref(false)
const currentSpectrum = ref();
const users           = computed(() => {
    let tmp = {};
    for (let i of userList.value) {
        tmp[i.id] = i
    }
    return tmp
})
const tracks          = computed(() => {
    let tmp = {};
    for (let i of trackList.value) {
        tmp[i.id] = i
    }
    return tmp
})
const loading         = ref(false)
const drawingEnabled  = ref(false);
const chart           = ref();
let trackPointHash    = ref({})

const generateChart = () => {
    setTimeout(() => {
        if (!currentSpectrum.value.ResultDataList) {
            return
        }
        const {
                  MeasurementTime: BackgroundMeasurementTime,
                  Spectrum       : BackgroundSpectrum
              } = currentSpectrum.value.ResultDataList.ResultData.BackgroundEnergySpectrum
        const {
                  MeasurementTime,
                  Spectrum
              } = currentSpectrum.value.ResultDataList.ResultData.EnergySpectrum

        let myChart = init(chart.value);
        myChart.setOption({
            legend: {
                data: ['sales']
            },
            xAxis : {
                data: Array.from(Array(Spectrum.DataPoint.length).keys())
            },
            yAxis : {},
            series: [
                {
                    name: 'Spectrum',
                    type: 'bar',
                    data: Spectrum.DataPoint
                },
                {
                    name: 'BackgroundSpectrum',
                    type: 'bar',
                    data: BackgroundSpectrum.DataPoint
                }
            ]
        });
    }, 1)

}
const view          = new View({
    zoom  : 7.3,
    center: fromLonLat([27.7834, 53.7098]),
})

const loadFeatures = async (source, projection) => {
    try {
        loading.value = true
        let params    = ['track_id.is.null']
        let query     = supabase.from("features").select(`*`).order('track_id', {
            ascending : true,
            nullsFirst: false
        })
        let hasTracks = Array.isArray(filter.value.track_id) && filter.value.track_id.length > 0;
        if (hasTracks) {
            params.push(`track_id.in.(${filter.value.track_id.join(',')})`)
        }
        query = query.or(params.join(','))
        if (filter.value.user_id) {
            query = query.filter(...filter.value.user_id.split('.'))
        }
        let {data, error} = await query
        if (error) {
            throw error
        }
        const temp = (new GeoJSON()).readFeatures(
            {
                type    : 'FeatureCollection',
                features: data
            },
            {featureProjection: projection}
        )
        source.addFeatures(temp)
        if (!hasTracks || data.length === 0 || !data[0].geometry) {
            return
        }
        view.setCenter(fromLonLat(data[0].geometry.coordinates))
        view.setZoom(10)
    } finally {
        loading.value = false
    }
}

let featuresSource = new VectorSource({
    loader: function (extent, resolution, projection) {
        loadFeatures(this, projection, extent)
    },
    format: new GeoJSON()
})

let clusterSource = new ClusterSource({
    source  : featuresSource,
    distance: 5
})

let styleCache = {};


let placesLayer   = new VectorLayer(
    {
        source: new VectorSource(
            {
                url   : '/places.json',
                format: new GeoJSON()
            }
        ),
    }
)
let drawingSource = new VectorSource()
let drawingLayer  = new VectorLayer({
        source: drawingSource,
    }
)
let featureLayer  = new VectorLayer({
    source: clusterSource,
    style(feature) {
        let size                      = feature.get('features').length;
        const length                  = size;
        let colors, hasSpectre, color = '#7c7676';

        let features = feature.get('features');
        hasSpectre   = features.some(i => i.getProperties().spectrum);
        let style    = styleCache[size + '_' + hasSpectre ? 'true' : 'false'];
        if (style) {
            return style
        }
        let maxDoserate = features.reduce((previousValue, currentValue) => {
            let d = currentValue.getProperties().d
            return d > previousValue ? d : previousValue
        }, null)
        if (maxDoserate) {
            colors = calcColor(maxDoserate, parseInt(colorScheme.value))
            color  = `rgba(${colors.r},${colors.g}, ${colors.b},0.7)`;
        }
        if (hasSpectre) {
            color = '#b62bda'
        }
        style                               = [new Style({
            image: new CircleStyle({
                radius: 14,
                stroke: new Stroke({
                    color: '#fff',
                }),
                fill  : new Fill({color}),
            }),
            text : new Text({
                text: length === 1 ? '' : length.toString(),
                fill: new Fill({
                    color: '#fff',
                }),
            }),
        })];
        styleCache[size + '_' + hasSpectre] = style;
        return style;
    }
})
watch(
    colorScheme,
    () => {
        setInterval(() => {
            styleCache = {};
            featureLayer.getSource().dispatchEvent('change');
        }, 1000);
    }
)

const refresh = (input) => {
    if (input) {
        filter.value = input
    }
    const refreshSource = new VectorSource({
        loader: function (extent, resolution, projection) {
            loadFeatures(this, projection)
        },
        format: new GeoJSON()
    })
    featureLayer.setSource(new ClusterSource({source: refreshSource, distance: 13}))
    featuresSource = refreshSource
}

const feature = ref();
let map;
const draw    = new Draw({
    type           : 'Point',
    source         : drawingSource,
    finishCondition: function () {
        return true;
    }
})
draw.on('drawend', function (e) {
    map.removeInteraction(draw)
    emit(
        'point-located',
        e.feature.getGeometry().transform('EPSG:3857', 'EPSG:4326').getCoordinates()
    )
    drawingSource.clear()
    drawingEnabled.value = false
});


onMounted(
    () => {
        document.getElementById('map').innerHTML = '';
        let container                            = document.getElementById('popup');
        let closer                               = document.getElementById('popup-closer');
        closer.onclick                           = function () {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };
        const overlay                            = new Overlay({
            element         : container,
            autoPan         : true,
            autoPanAnimation: {
                duration: 250,
            },
        });

        map = new Map({
            layers  : [
                new TileLayer({
                    source: new OSM(),
                }),
                drawingLayer,
                placesLayer
            ],
            target  : 'map',
            overlays: [overlay],
            view
        });
        map.addLayer(featureLayer)
        map.on('singleclick', (evt) => {
            let coordinate = evt.coordinate;
            if (map.getFeaturesAtPixel(evt.pixel).length === 0) {
                overlay.setPosition(undefined);
                closer.blur();
                return
            }
            map.forEachFeatureAtPixel(evt.pixel, baseFeature => {
                let f = baseFeature.getProperties();
                if (f.features) {
                    if (f.features.length === 0) {
                        return;
                    }
                    let t = (f.features.find(i => i.getProperties().spectrum)) || f.features[0];
                    if (!t) {
                        return
                    }
                    feature.value = {
                        id        : t.getId(),
                        properties: t.getProperties()
                    };
                } else {
                    feature.value = {
                        id        : baseFeature.getId(),
                        properties: baseFeature.getProperties()
                    };
                }

                overlay.setPosition(coordinate);
            })
        });
    }
);

const enableDrawing = () => {
    drawingEnabled.value = true;
    map.addInteraction(draw);
}

defineExpose({
    enableDrawing,
    refresh
})


</script>

<style>

.el-dialog {
    --chart-dialog-width: 70%;
}

@media (max-width: 820px) {
    .el-dialog {
        --chart-dialog-width: 100%;
    }
}

.track-drawer {
    font-size: 20px;
}

#map {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
}

@media (min-width: 820px) {
    #map {
        padding-top: 40px;
    }
}

.ol-popup {
    position: absolute;
    background-color: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid #cccccc;
    bottom: 12px;
    left: -50px;
    min-width: 280px;
}

.ol-popup:after, .ol-popup:before {
    top: 100%;
    border: solid transparent;
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
}

.ol-popup:after {
    border-top-color: white;
    border-width: 10px;
    left: 48px;
    margin-left: -10px;
}

.ol-popup:before {
    border-top-color: #cccccc;
    border-width: 11px;
    left: 48px;
    margin-left: -11px;
}

.ol-popup-closer {
    text-decoration: none;
    position: absolute;
    top: 2px;
    right: 8px;
}

.ol-popup-closer:after {
    content: "✖";
}

@media (max-width: 820px) {
    .ol-zoom.ol-unselectable.ol-control {
        display: none;
    }
}

.ol-zoom.ol-unselectable.ol-control {
    margin-top: 10px;
}

</style>
