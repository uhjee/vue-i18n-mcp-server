/**
 * i18n 함수 설정 타입
 */
/**
 * 기본 i18n 함수 설정 (vue-i18n 표준)
 */
export const DEFAULT_I18N_CONFIG = {
    vue: {
        template: '$t', // {{ $t('key') }}
        script: 'this.$t', // this.$t('key')
    },
    javascript: {
        function: 'i18n.t', // i18n.t('key')
    }
};
/**
 * Vue 생태계 다양한 i18n 설정 예시
 */
export const VUE_I18N_CONFIGS = {
    // vue-i18n 글로벌 사용 (composition API 스타일)
    VUE_I18N_WATCHALL: {
        vue: {
            template: '$localeMessage',
            script: 'this.$localeMessage', // setup()에서 글로벌 사용
        },
        javascript: {
            function: 'i18n.localeMessage',
        }
    },
    // vue-i18n useI18n 훅 스타일 (Vue 3 Composition API)
    VUE_I18N_COMPOSABLE: {
        vue: {
            template: 't',
            script: 't', // const { t } = useI18n()
        },
        javascript: {
            function: 'i18n.global.t',
        }
    },
    // 커스텀 번역 함수
    CUSTOM: {
        vue: {
            template: 'translate',
            script: 'this.translate',
        },
        javascript: {
            function: 'translate',
        }
    }
};
//# sourceMappingURL=i18n-config.js.map