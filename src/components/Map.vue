<template>
    <div id="map" style="height: 100%;width: 100%"></div>
    <div id="popup" class="ol-popup">
        <a href="#" id="popup-closer" class="ol-popup-closer"></a>
        <div id="popup-content">
            <template v-if="feature">
                <p>id: {{ feature.id }}</p>
                <span>Doserate: {{ feature.properties.d.toFixed(2) }}uSv/h</span>
                <br>
                <span>GPS accuracy: <b>±{{ feature.properties.r }} m</b></span>
                <br>
                <span>Device: <b>  <span v-html="devices[feature.properties.dv]"></span> </b></span>
                <br>
                <span>Search mode: <b> {{ search_modes[feature.properties.sm] }} </b></span>
                <br>
                <p class="pdng-t-5px">
                    <a href="#" @click="attachSpectrum(feature.id)">
                        Прикрепить спектр
                    </a>
                </p>
            </template>
            <template v-if="feature && trackPointHash[feature.id]">
                <br>
                <span v-for="(spectrum) in trackPointHash[feature.id]">{{ spectrum.name }}</span>
            </template>
        </div>
    </div>
</template>
<script setup>
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import {OSM} from "ol/source";
import View from "ol/View";
import {fromLonLat} from "ol/proj";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON"
import {Circle, Fill, Style} from 'ol/style';
import 'ol/ol.css'
import Overlay from 'ol/Overlay';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';

import {ref, onMounted, watch, toRefs} from 'vue'
import {calcColor} from "../colors";

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
    'attachspectrum',
    'get-location',
    'get-location-error',
    'point-located'
])

const attachSpectrum         = (id) => {
    emit('attachspectrum', id)
}
const props                  = defineProps({
    trackId: Number,
    colorScheme: String
})
const {trackId, colorScheme} = toRefs(props)

const drawingEnabled = ref(false);
let trackPointHash   = ref({})

const loadFeatures = async function (source, projection) {
    // const response = await fetch(
    //     'https://peredoz.hasura.app/api/rest/track',
    //     {
    //         method: 'GET',
    //     }
    // )
    const response = await fetch(
        import.meta.env.VITE_GRAPHQL_API_URL + '/api/rest/points/track/' + trackId.value,
        {
            method: 'GET',
            credentials: 'include',
        }
    )
    if (!response.ok) {
        throw 'Invalid http response for fetching track'
    }
    const payload = await response.json()

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
        trackPointHash.value = {}
        const tmp            = payload.track.features.filter(i => i.spectrums.length > 0)
        for (let item of tmp) {
            trackPointHash.value[item.id] = item.spectrums
        }
        const temp = (new GeoJSON()).readFeatures(
            payload.track,
            {featureProjection: projection}
        )
        source.addFeatures(temp)
    }
}

let featuresSource = new VectorSource({
    loader: function (extent, resolution, projection) {
        if (trackId.value > 0) {
            loadFeatures(this, projection, extent)
        }
    },
    format: new GeoJSON()
})

let styleCache = {};

const view        = new View({
    zoom: 7.3,
    center: fromLonLat([27.7834, 53.7098]),
})
const geolocation = new Geolocation({
    trackingOptions: {
        enableHighAccuracy: true,
    },
    projection: 'EPSG:4326',
});

const requestCurrentLocation = () => {
    geolocation.setTracking(true);
}

geolocation.on('change', function () {
    emit('get-location', geolocation.getPosition())
});
geolocation.on('error', function (error) {
    emit('get-location-error', error)
});

let drawingSource = new VectorSource()
let drawingLayer  = new VectorLayer({
        source: drawingSource,
    }
)

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
                radius: 10,
                fill: new Fill({
                    color: `rgba(${colors.r},${colors.g}, ${colors.b},0.7)`,
                }),
            }),
        });

        styleCache[size] = style;

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
watch(
    trackId,
    () => {
        refreshMap()
    }
)

const feature = ref();
let map;
const draw    = new Draw({
    type: 'Point',
    source: drawingSource,
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
            element: container,
            autoPan: true,
            autoPanAnimation: {
                duration: 250,
            },
        });

        map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                drawingLayer
            ],
            target: 'map',
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
                console.log(baseFeature.getProperties())
                feature.value = {
                    id: baseFeature.getId(),
                    properties: baseFeature.getProperties()
                };
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
    requestCurrentLocation
})


</script>

<style scoped>
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
</style>
