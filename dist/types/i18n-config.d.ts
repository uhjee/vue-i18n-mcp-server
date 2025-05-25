/**
 * i18n 함수 설정 타입
 */
export interface I18nFunctionConfig {
    vue: {
        template: string;
        script: string;
    };
    javascript: {
        function: string;
    };
}
/**
 * 기본 i18n 함수 설정 (vue-i18n 표준)
 */
export declare const DEFAULT_I18N_CONFIG: I18nFunctionConfig;
/**
 * Vue 생태계 다양한 i18n 설정 예시
 */
export declare const VUE_I18N_CONFIGS: {
    VUE_I18N_WATCHALL: {
        vue: {
            template: string;
            script: string;
        };
        javascript: {
            function: string;
        };
    };
    VUE_I18N_COMPOSABLE: {
        vue: {
            template: string;
            script: string;
        };
        javascript: {
            function: string;
        };
    };
    CUSTOM: {
        vue: {
            template: string;
            script: string;
        };
        javascript: {
            function: string;
        };
    };
};
//# sourceMappingURL=i18n-config.d.ts.map