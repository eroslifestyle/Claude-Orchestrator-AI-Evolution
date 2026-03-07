/**
 * Global Styles Module for Orchestrator Plugin
 *
 * Questo modulo fornisce uno stile CSS/QSS centralizzato per tutte le interfacce
 * dell'orchestrator-plugin, basato sul sistema di stile del modulo TELEGRAM.
 *
 * Risolve i problemi di:
 * - Testo scuro su sfondi scuri (usa testo bianco per default)
 * - Pulsanti con testo troncato (regole CSS per evitare troncamento)
 *
 * @version 1.0.0
 * @author Development Team
 */
export declare const COLORS: {
    readonly bg_primary: "#0d0d12";
    readonly bg_secondary: "#13131a";
    readonly bg_tertiary: "#1c1c26";
    readonly bg_card: "#1c1c26";
    readonly bg_input: "#13131a";
    readonly bg_hover: "#262633";
    readonly bg_card_hover: "#262633";
    readonly table_bg: "#13131a";
    readonly table_row_even: "#13131a";
    readonly table_row_odd: "#1c1c26";
    readonly table_header: "#1c1c26";
    readonly table_gridline: "#1c1c26";
    readonly table_selection: "#3b82f6";
    readonly text_primary: "#f5f5f7";
    readonly text_secondary: "#d0d0d8";
    readonly text_muted: "#a0a0b0";
    readonly text_dark: "#1e293b";
    readonly accent_primary: "#3b82f6";
    readonly accent_secondary: "#60a5fa";
    readonly accent_hover: "#2563eb";
    readonly accent_light: "#93c5fd";
    readonly success: "#22c55e";
    readonly success_dark: "#16a34a";
    readonly warning: "#f59e0b";
    readonly warning_dark: "#d97706";
    readonly error: "#ef4444";
    readonly error_dark: "#dc2626";
    readonly info: "#3b82f6";
    readonly border_light: "#1c1c26";
    readonly border_dark: "#1c1c26";
};
export declare const FONTS: {
    readonly family: "\"Segoe UI\", \"SF Pro Display\", -apple-system, sans-serif";
    readonly family_mono: "\"Consolas\", \"Monaco\", \"Courier New\", monospace";
    readonly size_tiny: 10;
    readonly size_small: 11;
    readonly size_base: 12;
    readonly size_medium: 13;
    readonly size_large: 14;
    readonly size_header: 15;
    readonly size_title: 16;
    readonly size_button: 12;
    readonly size_table: 12;
    readonly size_table_header: 12;
    readonly weight_normal: 400;
    readonly weight_medium: 500;
    readonly weight_bold: 600;
    readonly weight_black: 700;
};
export declare const DIMS: {
    readonly table_row_height: 42;
    readonly table_header_height: 45;
    readonly table_min_col_width: 80;
    readonly button_height: 26;
    readonly button_min_width: 100;
    readonly button_padding_h: 12;
    readonly button_padding_v: 4;
    readonly button_radius: 4;
    readonly input_height: 36;
    readonly input_radius: 6;
    readonly border_radius_small: 4;
    readonly border_radius_sm: 4;
    readonly border_radius: 6;
    readonly card_radius: 8;
    readonly spacing_xs: 4;
    readonly spacing_sm: 8;
    readonly spacing_small: 8;
    readonly spacing_md: 12;
    readonly spacing_medium: 12;
    readonly spacing_lg: 16;
    readonly spacing_large: 16;
    readonly spacing_xl: 24;
    readonly padding_xs: 4;
    readonly padding_sm: 8;
    readonly padding_small: 8;
    readonly padding_md: 12;
    readonly padding_medium: 12;
    readonly padding_lg: 16;
    readonly padding_large: 16;
    readonly padding_xl: 24;
};
/**
 * Generate global CSS stylesheet with white text for dark backgrounds
 * and rules to prevent button text truncation
 */
export declare function getGlobalStylesheet(): string;
/**
 * Generate QSS (Qt Style Sheet) for PyQt5 applications
 * This is used when the orchestrator plugin needs to style PyQt5 widgets
 */
export declare function getQSSStylesheet(): string;
declare const _default: {
    COLORS: {
        readonly bg_primary: "#0d0d12";
        readonly bg_secondary: "#13131a";
        readonly bg_tertiary: "#1c1c26";
        readonly bg_card: "#1c1c26";
        readonly bg_input: "#13131a";
        readonly bg_hover: "#262633";
        readonly bg_card_hover: "#262633";
        readonly table_bg: "#13131a";
        readonly table_row_even: "#13131a";
        readonly table_row_odd: "#1c1c26";
        readonly table_header: "#1c1c26";
        readonly table_gridline: "#1c1c26";
        readonly table_selection: "#3b82f6";
        readonly text_primary: "#f5f5f7";
        readonly text_secondary: "#d0d0d8";
        readonly text_muted: "#a0a0b0";
        readonly text_dark: "#1e293b";
        readonly accent_primary: "#3b82f6";
        readonly accent_secondary: "#60a5fa";
        readonly accent_hover: "#2563eb";
        readonly accent_light: "#93c5fd";
        readonly success: "#22c55e";
        readonly success_dark: "#16a34a";
        readonly warning: "#f59e0b";
        readonly warning_dark: "#d97706";
        readonly error: "#ef4444";
        readonly error_dark: "#dc2626";
        readonly info: "#3b82f6";
        readonly border_light: "#1c1c26";
        readonly border_dark: "#1c1c26";
    };
    FONTS: {
        readonly family: "\"Segoe UI\", \"SF Pro Display\", -apple-system, sans-serif";
        readonly family_mono: "\"Consolas\", \"Monaco\", \"Courier New\", monospace";
        readonly size_tiny: 10;
        readonly size_small: 11;
        readonly size_base: 12;
        readonly size_medium: 13;
        readonly size_large: 14;
        readonly size_header: 15;
        readonly size_title: 16;
        readonly size_button: 12;
        readonly size_table: 12;
        readonly size_table_header: 12;
        readonly weight_normal: 400;
        readonly weight_medium: 500;
        readonly weight_bold: 600;
        readonly weight_black: 700;
    };
    DIMS: {
        readonly table_row_height: 42;
        readonly table_header_height: 45;
        readonly table_min_col_width: 80;
        readonly button_height: 26;
        readonly button_min_width: 100;
        readonly button_padding_h: 12;
        readonly button_padding_v: 4;
        readonly button_radius: 4;
        readonly input_height: 36;
        readonly input_radius: 6;
        readonly border_radius_small: 4;
        readonly border_radius_sm: 4;
        readonly border_radius: 6;
        readonly card_radius: 8;
        readonly spacing_xs: 4;
        readonly spacing_sm: 8;
        readonly spacing_small: 8;
        readonly spacing_md: 12;
        readonly spacing_medium: 12;
        readonly spacing_lg: 16;
        readonly spacing_large: 16;
        readonly spacing_xl: 24;
        readonly padding_xs: 4;
        readonly padding_sm: 8;
        readonly padding_small: 8;
        readonly padding_md: 12;
        readonly padding_medium: 12;
        readonly padding_lg: 16;
        readonly padding_large: 16;
        readonly padding_xl: 24;
    };
    getGlobalStylesheet: typeof getGlobalStylesheet;
    getQSSStylesheet: typeof getQSSStylesheet;
};
export default _default;
//# sourceMappingURL=GlobalStyles.d.ts.map