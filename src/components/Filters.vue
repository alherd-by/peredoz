<template>
    <el-dialog v-model="filterDialog"
               top="0"
               :show-close="false"
               width="var(--dialog-width)">
        <div class="scene" style="padding-top: 0">
            <div class="flex-column pdng-b-15px" id="filter-actions">
                <el-row class="pdng-l-5px">
                    <el-button @click="saveFilter" type="success">
                        Применить
                    </el-button>
                    <el-button @click="filterDialog = false" type="danger">
                        Отмена
                    </el-button>
                </el-row>
                <el-row class="pdng-t-25px mil-pdng-t-5px pdng-b-25px pdng-l-5px" v-if="user.id">
                    <span class="pdng-t-10px pdng-r-10px">
                        <b>Объекты добавлены:</b>
                    </span>
                    <el-radio-group v-model="filter.user_id">
                        <el-radio-button :label="''">Всеми</el-radio-button>
                        <el-radio-button :label="'user_id.eq.' + user.id">
                            Мною
                        </el-radio-button>
                        <el-radio-button :label="'user_id.neq.' + user.id">
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
            <el-row>
                <el-checkbox v-model="filter.show_localities"
                             style="white-space: normal">
                    Загрязненные населенные пункты
                </el-checkbox>
            </el-row>
            <div class="flex-column">
                <div class="pdng-t-20px" v-loading="trackListLoading" style="overflow-x: auto">
                    <h4 class="pdng-l-5px">
                        Список треков. Всего треков: <b>{{ trackListFiltered.length }}</b>
                    </h4>
                    <el-table :data="trackListFiltered"
                              class="pdng-t-10px"
                              ref="trackListTable"
                              row-key="id"
                              :default-sort="{ prop: 'name', order: 'ascending' }"
                              highlight-current-row
                              table-layout="auto">
                        <el-table-column width="20" fixed>
                            <template #default="{row}">
                                <el-button size="small"
                                           :icon="Aim"
                                           circle
                                           @click="clickTrack(row)"></el-button>
                            </template>
                        </el-table-column>
                        <el-table-column label="Название" prop="name" min-width="150" sortable>
                            <template #header>
                                Название
                                <div class="notdisplay mil-show hint-scroll">
                                    <swipe-icon></swipe-icon>
                                </div>
                            </template>
                            <template #default="{row}">
                                <b>{{ row.name }}</b>
                                <template v-if="row.atomfast_id"> (Atomfast)</template>
                            </template>
                        </el-table-column>
                        <el-table-column label="Пользователь" prop="user.id" sortable #default="{row}" min-width="300">
                            <template v-if="row.user">
                                {{ row.user.display_name ? row.user.display_name : row.user.email }}
                            </template>
                        </el-table-column>
                        <el-table-column label="#" prop="id" min-width="20" sortable></el-table-column>
                        <el-table-column label="Добавлен" #default="{row}" prop="created_at" sortable min-width="300">
                            {{ formatWithTime(row.created_at) }}
                        </el-table-column>
                    </el-table>
                </div>
            </div>
        </div>
    </el-dialog>
</template>
<script setup>
import {formatWithTime}                             from '../date'
import {getUser}                                    from "../user";
import {ref, computed, reactive, toRefs, onMounted} from "vue";
import SwipeIcon                                    from './icons/swipe.vue'
import {ElButton}                                   from 'element-plus'
import {Aim}                                        from '@element-plus/icons-vue'

const props = defineProps({
    trackList: Array
})

const filterDialog      = ref(false);
const {trackList: list} = toRefs(props);
const trackListLoading  = ref(false)
const trackListFilter   = ref('')
const trackListFiltered = computed(() => {
    if (!list.value) {
        return []
    }
    let tmp = list.value;
    if (filter.user_id) {
        let uf   = filter.user_id + ''
        const ff = uf.includes('neq')
            ? (s) => s.user.id !== uf.split('neq.')[1]
            : (s) => s.user.id === uf.split('eq.')[1]
        tmp      = tmp.filter(ff)
    }
    if (trackListFilter.value.length >= 3) {
        tmp = tmp.filter(s => s.name.toLowerCase().includes(trackListFilter.value.toLowerCase()))
    }
    return tmp;
})
const trackListTable    = ref();
const emit              = defineEmits(['change'])

const user = ref({email: ''})

const filter = reactive({
    created_at     : '',
    user_id        : '',
    track          : null,
    show_localities: false
})

const saveFilter = () => {
    emit('change', filter)
    filterDialog.value = false
}
const show       = () => {
    filterDialog.value = true
}
defineExpose({
    show,
    addTrack(track) {
        filter.track = track;
        saveFilter()
    }
})

const clickTrack   = (t) => {
    filter.track = t
    saveFilter()
}
onMounted(async () => {
    user.value = await getUser()
})
</script>
