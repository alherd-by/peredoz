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
