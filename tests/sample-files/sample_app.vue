<template>
    <div class="frack-view-wrapper page-container-content tabgroup">
      <div class="full-wrapper">
        <div class="frack-summary">
          <div class="title-bar title-h4">{{$localeMessage('WATCHALL.WORD.SUMMARY')}}</div>
          <!-- 장비 종류 별 요약 -->
          <el-row class="summary-main mr-b5" style="display: flex">
            <div v-for="(item, idx) in summaryDataList" :key="idx" :class="['frack-type-box', 'objtype-list', clickable(item) ? 'c-pointer' : '']" @click="onClickSummary(item)">
              <div class="header">
                <div class="label">{{ getSummaryInfoData(item, 'objDefineName') }}</div>
                <div :class="['objtype-icon', getIconClass(item)]"></div>
              </div>
              <div class="contents">
                <div class="count">{{ getSummaryInfoData(item, 'cnt') }}</div>
                <div v-if="!isEmpty(item.eventlevelId)" class="event-label" :style="getEventStatus(item)">{{ getSummaryInfoData(item, 'eventlevelName') }}</div>
              </div>
            </div>
          </el-row>
          <!-- 랙 성능정보 요약 -->
          <el-row :gutter="20" class="summary-sub mr-b20">
            <el-col :span="12" class="summary-chart">
              <w-perf-status-hist-view class="mr-b10" ref="perfInfo" />
            </el-col>
            <el-col :span="12" class="summary-progress">
              <div class="progress-list">
                <div class="title title-popup-s">{{ '공간 사용률' }}}</div>
                <div class="progress">
                  <div class="label">
                    <div class="perf1">{{ getData('UNIT', 'UNIT_USAGE') }}U / {{ getData('UNIT', 'UNIT_CAPACITY') }}U</div>
                    <div class="perf2">{{ getData('UNIT', 'UNIT_USERATE')}}%</div>
                  </div>
                  <el-progress
                    :stroke-width="8" :percentage="getProgressData('UNIT', 'UNIT_USERATE')"
                    :color="`linear-gradient(to right, rgb(102,221,255), rgb(22,104,226))`"
                  ></el-progress>
                </div>
              </div>
              <div class="progress-list">
                <div class="title title-popup-s">{{$localeMessage(['WATCHALL.WORD.POWER2', 'WATCHALL.WORD.USE_RATE'])}}</div>
                <div class="progress">
                  <div class="label">
                    <div class="perf1">{{ convertValuByUnit(getData('POWER', 'POWER_USAGE' , 2), 'W', false, null, true) }}W / {{ convertValuByUnit(getData('POWER', 'POWER_CAPACITY'), 'W', false, null, true) }}W</div>
                    <div class="perf2">{{ getData('POWER', 'POWER_USERATE', 2)}}%</div>
                  </div>
                  <el-progress
                    :stroke-width="8" :percentage="getProgressData('POWER', 'POWER_USERATE')"
                    :color="`linear-gradient(to right, rgb(102,221,255), rgb(22,104,226))`"
                  ></el-progress>
                </div>
              </div>
              <div class="progress-list">
                <div class="title title-popup-s">{{$localeMessage(['WATCHALL.WORD.TEMP'])}}</div>
                <div class="progress">
                  <div class="label">
                    <div class="perf1">{{ getData('TEMP', 'TEMP_USAGE', 2) }}℃ / {{ getData('TEMP', 'TEMP_CAPACITY') }}℃</div>
                  </div>
                  <el-progress
                    :stroke-width="8" :percentage="getProgressData('TEMP', 'TEMP_USERATE')"
                    :color="`linear-gradient(to right, rgb(102,221,255), rgb(22,104,226))`"
                  ></el-progress>
                </div>
              </div>
            </el-col>
          </el-row>
          <!-- 실장정보 -->
          <div class=" title-bar title-h4">{{$localeMessage(['WATCHALL.WORD.OPEARATION_PLACE', 'WATCHALL.WORD.INFORMATION'])}}</div>
          <el-row style="height: calc(100% - 315px)">
            <el-scrollbar ref="scrollbar" class="bar-visible">
              <div class="mr-b25">
                <div class="title-bar tit title-popup-s">{{$localeMessage(['WATCHALL.WORD.SERVER'])}}</div>
                <w-rack-info-table style="padding: 0 10px" :widget-data="tableData.SERVER" obj-define-id="SERVER" :objtype-id="null" />
              </div>
              <div class="mr-b25">
                <div class="title-bar tit title-popup-s">{{$localeMessage(['WATCHALL.WORD.NETWORK'])}}</div>
                <w-rack-info-table style="padding: 0 10px" :widget-data="tableData.NETDEVICE" obj-define-id="NETDEVICE" :objtype-id="null"/>
              </div>
              <div class="mr-b25">
                <div class="title-bar tit title-popup-s">{{$localeMessage(['WATCHALL.WORD.STORAGE1'])}}</div>
                <w-rack-info-table style="padding: 0 10px" :widget-data="tableData.STORAGE" obj-define-id="STORAGE" :objtype-id="null"/>
              </div>
              <div class="mr-b25">
                <div class="title-bar tit title-popup-s" style="justify-content: space-between;">
                  <span>{{$localeMessage(['WATCHALL.WORD.POWER2', 'WATCHALL.WORD.DISTRIBUTION2'])}}</span>
                  <el-radio-group v-model="currentPdu">
                    <el-radio v-for="item in pduLabelList" :key="item.label" :label="item.label">{{ item.label }}</el-radio>
                  </el-radio-group>
                </div>
                <w-pdu-table style="padding: 0 10px" :pduData="pduData" />
              </div>
              <div class="mr-b25">
                <div class="title-bar tit title-popup-s">{{$localeMessage(['WATCHALL.WORD.TEMP', 'WATCHALL.WORD.SENSOR2'])}}</div>
                <w-rack-info-table style="padding: 0 10px" :widget-data="tableData.TEMP" obj-define-id="TEMP"/>
              </div>
            </el-scrollbar>
          </el-row>
        </div>
        <div class="frack-view">
          <w-rack-view
            ref="rackView"
            rack-view-mode="monitoring"
            :unitCount="rackInfo.rackUnitCapacity"
            :objs="rackInfo.facilityObj.OBJ"
            :pdus="rackInfo.facilityObj.PDU"
            :frontTemps="rackInfo.facilityObj.FRONT_TEMP"
            :rearTemps="rackInfo.facilityObj.REAR_TEMP"
            :isSimpleViewer="true"
            @rack-edit="onRackEdit"
          />
        </div>
      </div>
      <w-rack-summary-detail-info-popup ref="summaryDetailInfoPopup" />
      <w-rack-property-popup ref="rackPropertyPopup" @re-load="loadData"/>
    </div>
    </template>
    
    <script>
    import { mapGetters } from 'vuex';
    import WRackView from '@/views/topologymap/components/rack/RackView';
    import WRackSummaryDetailInfoPopup from '@/views/performance/node/rack-view/components/RackSummaryDetailInfoPopup';
    import WRackInfoTable from '@/views/performance/node/rack-view/components/RackInfoTable';
    import WPduTable from '@/views/performance/node/rack-view/components/PduTable';
    import WPerfStatusHistView from '@/views/performance/node/rack-view/components/PerfStatusHistView';
    import ScrollbarMixin from '@/mixins/scrollbar';
    import rackViewAPI from '@/api/performance/rack-view/rack-view';
    import { getFacilityObjStructureToViewer } from '@/utils/rack-major-info';
    import { isEmpty, isNumber, isNil } from 'lodash';
    import { convertValuByUnit } from '@/utils/number';
    import WRackPropertyPopup from '@/views/topologymap/components/popup/RackPropertyPopup';
    
    export default {
      name: 'WPerformanceNodeRackView',
      mixins: [ScrollbarMixin],
      components: {
        WRackView,
        WRackInfoTable,
        WPduTable,
        WPerfStatusHistView,
        WRackSummaryDetailInfoPopup,
        WRackPropertyPopup,
      },
      props: {
        active: {
          type: Boolean,
          defulat: false,
        },
      },
      data() {
        return {
          chartData: [],
          configData: [],
          tableData: {
            SERVER: [],
            NETWORK: [],
            STORAGE: [],
            FTH: [],
            FTEMP: [],
            FPDUS: [],
          },
          rackInfo: {
            rackUnitCapacity: 5,
            facilityObj: {
              PDU: [],
              FRONT_TEMP: [{}, {}, {}],
              REAR_TEMP: [{}, {}, {}],
              OBJ: [],
            },
          },
          summaryData: {
            PDU: 0,
            TEMP: 0,
            SERVER: 0,
            NETDEVICE: 0,
            STORAGE: 0,
          },
          summaryDataList: [],
          currentPdu: 'PDU1',
          pduData: {},
        };
      },
      computed: {
        clickable() {
          return ((item) => isNumber(this.getSummaryInfoData(item, 'cnt')) && this.getSummaryInfoData(item, 'cnt') > 0);
        },
        ...mapGetters(['selectedNode']),
        /**
         * 전력분배 라벨 리스트
         */
        pduLabelList() {
          return this.rackInfo.facilityObj.PDU.map((pdu) => ({
            label: `PDU${pdu.slot + 1}`,
          }));
        },
      },
      watch: {
        active: {
          handler(val) {
            if (val) {
              this.loadData();
            }
          },
        },
        selectedNode: {
          immediate: true,
          handler(value) {
            if (!isEmpty(value)) {
              this.loadData();
            }
          },
        },
        currentPdu: {
          handler(val) {
            this.pduData = isEmpty(this.tableData) ? {} : this.tableData[val];
          },
        },
        pduLabelList: {
          handler(val) {
            const pduLabels = val.map((d) => d.label);
            // 현재 선택된 PDU가 목록에 없으면, 첫 번째 PDU를 선택함
            if (!pduLabels.includes(this.currentPdu)) {
              this.currentPdu = pduLabels[0] || 'PDU1';
            }
          },
        },
      },
      methods: {
        isEmpty,
        convertValuByUnit,
        getIconClass(target) {
          if (target && target.objectType && target.objectType === 'PDU') {
            // return 'fas fa-outlet'; // 원래 전력 분배 아이콘
            return 'fas fa-bolt'; // 랙 뷰 관련 요약화면에서 보여주는 전력 아이콘
          }
    
          if (target && target.objectType && target.objectType === 'TEMP') {
            return 'far fa-temperature-high';
          }
          if (!isEmpty(target) && !isEmpty(target.objDefineId)) {
            let objDefineInfo;
            switch (target.objDefineId) {
              case 'WIRELESS_DEVICE':
              case 'TENANTS':
              case 'IPT_DEVICE':
                objDefineInfo = 'NETDEVICE';
                break;
              default:
                objDefineInfo = target.objDefineId;
                break;
            }
            return objDefineInfo.toLocaleLowerCase();
          }
          return 'etc';
        },
        getSummaryInfoData(item, key) {
          return (item && item[key]) || '';
        },
        getEventStatus(item) {
          const style = {};
          if (item && item.eventlevelColorBg) {
            style.backgroundColor = item.eventlevelColorBg;
          }
          if (item && item.eventlevelColorText) {
            style.color = item.eventlevelColorText;
          }
          return style;
        },
        getSummaryData(key) {
          if (this.summaryData && this.summaryData[key] && this.summaryData[key].cnt) {
            return this.summaryData[key].cnt;
          }
          return 0;
        },
        getData(key, subKey, fractionDigits) {
          if (this.configData && this.configData[key] && this.configData[key][subKey]) {
            let data = this.configData[key][subKey];
            if (!isNil(fractionDigits) && fractionDigits > 0) {
              data = data.toFixed(fractionDigits);
            }
            return data;
          }
          return '-';
        },
        getProgressData(key, subKey) {
          if (this.configData && this.configData[key] && this.configData[key][subKey]) {
            return (this.configData[key][subKey] > 100) ? 100 : this.configData[key][subKey];
          }
          return 0;
        },
        onNodeClick(data) {
          this.selectedNode = data;
        },
        loadData() {
          const params = {
            objId: this.selectedNode.obj.objId,
          };
          rackViewAPI.getFrackViewInstallationInfo(params)
            .then((response) => {
              if (response.data.success) {
                this.tableData = response.data.data.installInfo;
                this.pduData = isEmpty(this.tableData) ? {} : this.tableData[this.currentPdu];
              }
            });
          rackViewAPI.getFrackViewSummaryInfo(params)
            .then((response) => {
              if (response.data.success) {
                this.summaryDataList = response.data.data;
                this.summaryDataList = this.summaryDataList.reduce((acc, item) => {
                  // 'VIRTUAL_'로 시작하는 가상 센서는 관련된 실제 센서 타입의 cnt 값을 더하거나,
                  // 해당 실제 센서가 없다면 새로운 객체를 추가한다.
                  if (item.objectType.startsWith('VIRTUAL_')) {
                    const virtualObjType = item.objectType.replace('VIRTUAL_', '');
                    // 실제 센서 타입이 이미 존재하는지 확인한다.
                    const match = acc.find((obj) => obj.objectType === virtualObjType || obj.objectType === virtualObjType.slice(-4));
                    if (match) {
                      // 존재한다면 cnt 값을 더한다.
                      match.cnt += item.cnt;
                    } else {
                      // 존재하지 않으면 새로운 객체를 생성하여 추가한다.
                      acc.push({
                        key: item.key === 'VIRTUAL_PDU' ? virtualObjType : virtualObjType.slice(-4),
                        objDefineName: virtualObjType === 'PDU' ? '전력 분배' : '전방 온도 센서',
                        objectType: item.objType === 'VIRTUAL_PDU' ? virtualObjType : virtualObjType.slice(-4),
                        cnt: item.cnt,
                      });
                    }
                  } else {
                    // 가상 센서가 아닌 경우, 배열에 그대로 추가한다.
                    acc.push(item);
                  }
                  return acc;
                }, []);
              }
            });
          rackViewAPI.getFrackViewViewerInfo(params)
            .then((response) => {
              if (response.data.success) {
                this.rackInfo.rackUnitCapacity = response.data.data.rackUnitCapacity;
                this.rackInfo.facilityObj = getFacilityObjStructureToViewer(response.data.data.facilityObj, response.data.data.rackUnitCapacity);
              }
            });
          rackViewAPI.getFrackViewHistPerfInfo(params)
            .then((response) => {
              if (response.data.success) {
                this.chartData = response.data.data.perfInfo;
                this.configData = response.data.data.configInfo;
                this.$refs.perfInfo.setData(this.chartData);
              }
            });
        },
        onClickSummary(item) {
          const param = {
            frackObjType: item.key,
            frackObjTypeNameList: [item.objDefineName],
            objId: this.selectedNode.obj.objId,
          };
          const summaryData = this.getSummaryInfoData(item, 'cnt');
    
          if (isNumber(summaryData) && summaryData > 0) {
            this.$refs.summaryDetailInfoPopup.open(param);
          }
        },
        onRackEdit() {
          this.$refs.rackPropertyPopup.open({
            type: 'common',
            popupType: 'EDIT',
            obj: this.selectedNode.obj,
            objId: this.selectedNode.obj.objId,
          });
        },
      },
    };
    </script>
    <style lang="scss">
    </style>
    