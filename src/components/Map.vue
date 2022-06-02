<script setup>
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import {Cluster, OSM} from "ol/source";
import View from "ol/View";
import {fromLonLat} from "ol/proj";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON"
import {Circle, Fill, Style, Text} from 'ol/style';
import 'ol/ol.css'
import {ref, onMounted} from 'vue'


let featuresSource = new VectorSource({
    loader: function (extent, resolution, projection) {
        loadFeatures(this, projection)
    },
    format: new GeoJSON()
})
const loadFeatures = async function (source, projection) {
    const response = await fetch(
        'https://peredoz.hasura.app/api/rest/track',
        {
            method: 'GET',
        }
    )
    const payload  = await response.json()
    if (payload.features_by_pk) {
        source.addFeatures((new GeoJSON()).readFeatures(payload.features_by_pk.data, {featureProjection: projection}))
    }
}

let featureLayer = new VectorLayer({
    source: featuresSource
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

</script>

<template>
    <div id="map" style="height: 100%;width: 100%"></div>
</template>

<style scoped>
#map {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
}
</style>
