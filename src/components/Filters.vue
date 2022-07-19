<template>
    <el-dialog v-model="filterDialog"
               top="0"
               :show-close="false"
               width="var(--dialog-width)">
        <div class="scene" style="padding-top: 0">
            <div class="flex-column pdng-b-15px" id="filter-actions">
                <el-row class="pdng-l-5px">
                    <el-button @click="saveFilter" type="success">
                        Применить фильтр
                    </el-button>
                    <el-button @click="filterDialog = false" type="danger">
                        Отмена
                    </el-button>
                </el-row>
                <el-row class="pdng-t-25px mil-pdng-t-5px pdng-b-25px pdng-l-5px">
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
            <div class="flex-column">
                <div class="pdng-t-20px" v-loading="trackListLoading" style="overflow-x: auto">
                    <h4 class="pdng-l-5px">Выберите треки (не больше трех)</h4>
                    <el-table :data="trackListFiltered"
                              class="pdng-t-10px"
                              ref="trackListTable"
                              row-key="id"
                              :default-sort="{ prop: Object.keys(trackListSorting)[0], order: Object.values(trackListSorting)[0] + 'ending' }"
                              highlight-current-row
                              @select-all="onSelectAll"
                              @selection-change="onRowsSelect"
                              table-layout="auto">
                        <el-table-column type="selection" width="50" fixed/>
                        <el-table-column label="Название" prop="name" min-width="150" sortable>
                            <template #header>
                                Название (Всего: {{ trackListFiltered.length }})
                                <div class="notdisplay mil-show hint-scroll">
                                    <svg
                                        width="25"
                                        viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-78e17ca8="">
                                        <path fill="currentColor"
                                              d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path>
                                        <path fill="currentColor"
                                              d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path>
                                    </svg>
                                    <svg width="25"
                                         viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-78e17ca8="">
                                        <path fill="currentColor"
                                              d="M511.552 128c-35.584 0-64.384 28.8-64.384 64.448v516.48L274.048 570.88a94.272 94.272 0 0 0-112.896-3.456 44.416 44.416 0 0 0-8.96 62.208L332.8 870.4A64 64 0 0 0 384 896h512V575.232a64 64 0 0 0-45.632-61.312l-205.952-61.76A96 96 0 0 1 576 360.192V192.448C576 156.8 547.2 128 511.552 128zM359.04 556.8l24.128 19.2V192.448a128.448 128.448 0 1 1 256.832 0v167.744a32 32 0 0 0 22.784 30.656l206.016 61.76A128 128 0 0 1 960 575.232V896a64 64 0 0 1-64 64H384a128 128 0 0 1-102.4-51.2L101.056 668.032A108.416 108.416 0 0 1 128 512.512a158.272 158.272 0 0 1 185.984 8.32L359.04 556.8z"></path>
                                    </svg>
                                </div>
                            </template>
                            <template #default="{row}">
                                #{{ row.id }} - <b>{{ row.name }}</b>
                                <template v-if="row.atomfast_id"> (Atomfast)</template>
                            </template>
                        </el-table-column>
                        <el-table-column label="Пользователь" prop="user.id" sortable #default="{row}" min-width="300">
                            <template v-if="row.user">
                                {{ row.user.display_name ? row.user.display_name : row.user.email }}
                            </template>
                        </el-table-column>
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
import {formatWithTime}                  from '../date'
import {getUser}                         from "../user";
import {ref, computed, reactive, toRefs} from "vue";

const props = defineProps({
    trackList: Array
})

const filterDialog      = ref(false);
const {trackList: list} = toRefs(props);
const trackListLoading  = ref(false)
const trackListSorting  = ref({created_at: 'desc'})
const trackListFilter   = ref('')
const trackListFiltered = computed(() => {
    if (!list.value) {
        return []
    }
    let tmp = list.value;
    if (filter.user_id) {
        let uf   = filter.user_id + ''
        console.log(filter.user_id)
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

const user = ref(getUser())

const filter = reactive({
    created_at: '',
    user_id   : '',
    track_id  : []
})

const saveFilter = () => {
    emit('change', filter)
    filterDialog.value = false
}
const show       = () => {
    filterDialog.value = true
}
defineExpose({
    show
})

const onRowsSelect = (selectedRows) => {
    if (
        (selectedRows.length === trackListFiltered.value.length && trackListFiltered.value.length > 3)
        || selectedRows.length === 0
    ) {
        return
    }
    if (selectedRows.length > 3) {
        trackListTable.value.toggleRowSelection(selectedRows[0], undefined)
    }
    filter.track_id = selectedRows.map((i) => i.id)
}
const onSelectAll  = () => {
    trackListTable.value.clearSelection()
}
</script>
