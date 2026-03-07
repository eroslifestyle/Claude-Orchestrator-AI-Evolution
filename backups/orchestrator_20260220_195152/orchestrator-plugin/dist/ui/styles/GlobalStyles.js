"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQSSStylesheet = exports.getGlobalStylesheet = exports.DIMS = exports.FONTS = exports.COLORS = void 0;
// =============================================================================
// COLOR PALETTE - Based on TELEGRAM Module Universal Theme
// =============================================================================
exports.COLORS = {
    // Background - Dark theme for better readability
    bg_primary: '#0d0d12', // Main background
    bg_secondary: '#13131a', // Cards, panels, tables
    bg_tertiary: '#1c1c26', // Sections, headers
    bg_card: '#1c1c26', // Card/sections
    bg_input: '#13131a', // Input fields
    bg_hover: '#262633', // Hover state
    bg_card_hover: '#262633', // Card hover
    // Tables - NO white rows, all dark
    table_bg: '#13131a',
    table_row_even: '#13131a',
    table_row_odd: '#1c1c26',
    table_header: '#1c1c26',
    table_gridline: '#1c1c26',
    table_selection: '#3b82f6',
    // Text - WHITE text for dark backgrounds (FIX for dark text issue)
    text_primary: '#f5f5f7', // White/light gray for main text
    text_secondary: '#d0d0d8', // Light gray for secondary text
    text_muted: '#a0a0b0', // Gray for placeholders/disabled
    text_dark: '#1e293b', // For light themes
    // Accent - Blue theme
    accent_primary: '#3b82f6', // Blue
    accent_secondary: '#60a5fa', // Light blue
    accent_hover: '#2563eb', // Blue hover
    accent_light: '#93c5fd', // Very light blue
    // Status colors
    success: '#22c55e', // Green
    success_dark: '#16a34a', // Dark green
    warning: '#f59e0b', // Orange
    warning_dark: '#d97706', // Dark orange
    error: '#ef4444', // Red
    error_dark: '#dc2626', // Dark red
    info: '#3b82f6', // Blue info
    // Borders - almost invisible for modern look
    border_light: '#1c1c26',
    border_dark: '#1c1c26',
};
// =============================================================================
// FONT SIZES - Increased for better readability
// =============================================================================
exports.FONTS = {
    family: '"Segoe UI", "SF Pro Display", -apple-system, sans-serif',
    family_mono: '"Consolas", "Monaco", "Courier New", monospace',
    size_tiny: 10, // Smallest text
    size_small: 11, // Small text
    size_base: 12, // Base text size (standard)
    size_medium: 13, // Medium text
    size_large: 14, // Large text
    size_header: 15, // Headers
    size_title: 16, // Titles
    size_button: 12, // Button text (aligned with base)
    size_table: 12, // Table text (aligned with base)
    size_table_header: 12, // Table header
    // Weights
    weight_normal: 400,
    weight_medium: 500,
    weight_bold: 600,
    weight_black: 700,
};
// =============================================================================
// DIMENSIONS - Uniform spacing and sizing
// =============================================================================
exports.DIMS = {
    // Tables
    table_row_height: 42,
    table_header_height: 45,
    table_min_col_width: 80,
    // Buttons - Compact but readable
    button_height: 26,
    button_min_width: 100,
    button_padding_h: 12,
    button_padding_v: 4,
    button_radius: 4,
    // Input
    input_height: 36,
    input_radius: 6,
    // Border radius
    border_radius_small: 4,
    border_radius_sm: 4,
    border_radius: 6,
    card_radius: 8,
    // Spacing
    spacing_xs: 4,
    spacing_sm: 8,
    spacing_small: 8,
    spacing_md: 12,
    spacing_medium: 12,
    spacing_lg: 16,
    spacing_large: 16,
    spacing_xl: 24,
    // Padding
    padding_xs: 4,
    padding_sm: 8,
    padding_small: 8,
    padding_md: 12,
    padding_medium: 12,
    padding_lg: 16,
    padding_large: 16,
    padding_xl: 24,
};
// =============================================================================
// CSS GENERATORS
// =============================================================================
/**
 * Generate global CSS stylesheet with white text for dark backgrounds
 * and rules to prevent button text truncation
 */
function getGlobalStylesheet() {
    return `
    /* ==================== GLOBAL RESET ==================== */
    * {
      font-family: ${exports.FONTS.family};
      box-sizing: border-box;
    }

    /* ==================== DARK THEME BACKGROUND ==================== */
    body, html, :root {
      background-color: ${exports.COLORS.bg_primary};
      color: ${exports.COLORS.text_primary};
    }

    /* ==================== WHITE TEXT ON DARK BACKGROUNDS ==================== */
    /* FIX: Ensures white text is visible on dark backgrounds */
    .widget,
    .panel,
    .card,
    .container,
    .dashboard,
    .section {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_primary} !important;
    }

    /* ==================== TEXT STYLES ==================== */
    h1, h2, h3, h4, h5, h6 {
      color: ${exports.COLORS.text_primary} !important;
      font-weight: ${exports.FONTS.weight_bold};
    }

    h1 { font-size: ${exports.FONTS.size_title}px; }
    h2 { font-size: ${exports.FONTS.size_header}px; }
    h3 { font-size: ${exports.FONTS.size_large}px; }
    h4 { font-size: ${exports.FONTS.size_medium}px; }
    h5 { font-size: ${exports.FONTS.size_base}px; }
    h6 { font-size: ${exports.FONTS.size_small}px; }

    p, span, div, label, text {
      color: ${exports.COLORS.text_primary};
    }

    .text-primary { color: ${exports.COLORS.text_primary} !important; }
    .text-secondary { color: ${exports.COLORS.text_secondary} !important; }
    .text-muted { color: ${exports.COLORS.text_muted} !important; }
    .text-success { color: ${exports.COLORS.success} !important; }
    .text-warning { color: ${exports.COLORS.warning} !important; }
    .text-error { color: ${exports.COLORS.error} !important; }
    .text-info { color: ${exports.COLORS.info} !important; }

    /* ==================== BUTTON STYLES - NO TRUNCATION ==================== */
    /* FIX: Prevents button text from being truncated */
    button, .button, .btn, [role="button"] {
      /* Ensure full text is visible */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;

      /* Minimum width to prevent truncation */
      min-width: ${exports.DIMS.button_min_width}px;
      width: auto !important;

      /* Proper padding */
      padding: ${exports.DIMS.button_padding_v}px ${exports.DIMS.button_padding_h}px;

      /* White text on colored buttons */
      color: ${exports.COLORS.text_primary} !important;
      background-color: ${exports.COLORS.accent_primary};
      border: 2px solid ${exports.COLORS.accent_primary};
      border-radius: ${exports.DIMS.button_radius}px;

      font-size: ${exports.FONTS.size_button}px;
      font-weight: ${exports.FONTS.weight_medium};
      min-height: ${exports.DIMS.button_height}px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    button:hover, .button:hover, .btn:hover {
      background-color: ${exports.COLORS.accent_hover};
      border-color: ${exports.COLORS.accent_hover};
    }

    button:active, .button:active, .btn:active {
      background-color: ${exports.COLORS.accent_secondary};
    }

    button:disabled, .button:disabled, .btn:disabled {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_muted} !important;
      border-color: ${exports.COLORS.border_dark};
      cursor: not-allowed;
    }

    /* Button variants */
    .btn-primary, .button-primary {
      background-color: ${exports.COLORS.accent_primary};
      color: ${exports.COLORS.text_primary} !important;
      border-color: ${exports.COLORS.accent_primary};
    }

    .btn-success, .button-success {
      background-color: ${exports.COLORS.success};
      color: ${exports.COLORS.text_primary} !important;
      border-color: ${exports.COLORS.success};
    }

    .btn-danger, .button-danger {
      background-color: ${exports.COLORS.error};
      color: ${exports.COLORS.text_primary} !important;
      border-color: ${exports.COLORS.error};
    }

    .btn-warning, .button-warning {
      background-color: ${exports.COLORS.warning};
      color: ${exports.COLORS.text_primary} !important;
      border-color: ${exports.COLORS.warning};
    }

    .btn-info, .button-info {
      background-color: ${exports.COLORS.info};
      color: ${exports.COLORS.text_primary} !important;
      border-color: ${exports.COLORS.info};
    }

    /* Outline buttons - dark border, white text */
    .btn-outline, .button-outline {
      background-color: transparent;
      color: ${exports.COLORS.text_primary} !important;
      border: 2px solid ${exports.COLORS.accent_primary};
    }

    .btn-outline:hover, .button-outline:hover {
      background-color: ${exports.COLORS.accent_primary};
      color: ${exports.COLORS.text_primary} !important;
    }

    /* ==================== INPUT STYLES ==================== */
    input, textarea, select, .input, .form-control {
      background-color: ${exports.COLORS.bg_input};
      color: ${exports.COLORS.text_primary} !important;
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.input_radius}px;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      min-height: ${exports.DIMS.input_height}px;
      font-size: ${exports.FONTS.size_base}px;
      font-family: ${exports.FONTS.family};

      /* FIX: Prevent text truncation in inputs */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    input:focus, textarea:focus, select:focus,
    .input:focus, .form-control:focus {
      border-color: ${exports.COLORS.accent_primary};
      outline: none;
      box-shadow: 0 0 0 2px ${exports.COLORS.accent_primary}33;
    }

    input::placeholder, textarea::placeholder {
      color: ${exports.COLORS.text_muted};
    }

    /* ==================== TABLE STYLES ==================== */
    table, .table {
      background-color: ${exports.COLORS.table_bg};
      color: ${exports.COLORS.text_primary} !important;
      border-collapse: collapse;
      width: 100%;
      font-size: ${exports.FONTS.size_table}px;
    }

    thead, .table-header {
      background-color: ${exports.COLORS.table_header};
      color: ${exports.COLORS.text_primary} !important;
    }

    th, .table th {
      background-color: ${exports.COLORS.table_header};
      color: ${exports.COLORS.text_primary} !important;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      text-align: left;
      font-weight: ${exports.FONTS.weight_bold};
      border-bottom: 2px solid ${exports.COLORS.accent_primary};
    }

    td, .table td {
      background-color: ${exports.COLORS.table_row_even};
      color: ${exports.COLORS.text_primary} !important;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      border-bottom: 1px solid ${exports.COLORS.table_gridline};

      /* FIX: Prevent text truncation in table cells */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    tr:nth-child(odd) td, .table tr:nth-child(odd) td {
      background-color: ${exports.COLORS.table_row_odd};
    }

    tr:hover td, .table tr:hover td {
      background-color: ${exports.COLORS.bg_card_hover};
    }

    /* ==================== CARD/PANEL STYLES ==================== */
    .card, .panel, .widget {
      background-color: ${exports.COLORS.bg_card};
      color: ${exports.COLORS.text_primary} !important;
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.card_radius}px;
      padding: ${exports.DIMS.spacing_md}px;
      margin-bottom: ${exports.DIMS.spacing_md}px;
    }

    .card-header, .panel-header {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_primary} !important;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      border-bottom: 1px solid ${exports.COLORS.border_light};
      font-weight: ${exports.FONTS.weight_bold};
      border-radius: ${exports.DIMS.card_radius}px ${exports.DIMS.card_radius}px 0 0;
    }

    /* ==================== LINK STYLES ==================== */
    a, .link {
      color: ${exports.COLORS.accent_light};
      text-decoration: none;
    }

    a:hover, .link:hover {
      color: ${exports.COLORS.accent_primary};
      text-decoration: underline;
    }

    /* ==================== BADGE/LABEL STYLES ==================== */
    .badge, .label {
      display: inline-block;
      padding: ${exports.DIMS.spacing_xs}px ${exports.DIMS.spacing_sm}px;
      font-size: ${exports.FONTS.size_small}px;
      font-weight: ${exports.FONTS.weight_medium};
      border-radius: ${exports.DIMS.border_radius_small}px;
      white-space: nowrap !important;  /* FIX: Prevent truncation */
    }

    .badge-primary, .label-primary {
      background-color: ${exports.COLORS.accent_primary};
      color: ${exports.COLORS.text_primary} !important;
    }

    .badge-success, .label-success {
      background-color: ${exports.COLORS.success};
      color: ${exports.COLORS.text_primary} !important;
    }

    .badge-danger, .label-danger {
      background-color: ${exports.COLORS.error};
      color: ${exports.COLORS.text_primary} !important;
    }

    .badge-warning, .label-warning {
      background-color: ${exports.COLORS.warning};
      color: ${exports.COLORS.text_primary} !important;
    }

    /* ==================== UTILITY CLASSES ==================== */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }

    .mt-1 { margin-top: ${exports.DIMS.spacing_xs}px; }
    .mt-2 { margin-top: ${exports.DIMS.spacing_sm}px; }
    .mt-3 { margin-top: ${exports.DIMS.spacing_md}px; }
    .mt-4 { margin-top: ${exports.DIMS.spacing_lg}px; }

    .mb-1 { margin-bottom: ${exports.DIMS.spacing_xs}px; }
    .mb-2 { margin-bottom: ${exports.DIMS.spacing_sm}px; }
    .mb-3 { margin-bottom: ${exports.DIMS.spacing_md}px; }
    .mb-4 { margin-bottom: ${exports.DIMS.spacing_lg}px; }

    .p-1 { padding: ${exports.DIMS.spacing_xs}px; }
    .p-2 { padding: ${exports.DIMS.spacing_sm}px; }
    .p-3 { padding: ${exports.DIMS.spacing_md}px; }
    .p-4 { padding: ${exports.DIMS.spacing_lg}px; }

    /* ==================== FIX FOR TRUNCATED TEXT ==================== */
    /* Global fix for any element with truncated text */
    *[class*="button"], *[class*="btn"], button,
    *[class*="label"], *[class*="badge"],
    td, th, .table-cell {
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
      min-width: max-content !important;
    }

    /* For elements that explicitly need ellipsis */
    .truncate, .text-truncate {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 100% !important;
    }

    /* ==================== SCROLLBAR STYLES ==================== */
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    ::-webkit-scrollbar-track {
      background: ${exports.COLORS.bg_secondary};
    }

    ::-webkit-scrollbar-thumb {
      background: ${exports.COLORS.border_light};
      border-radius: 6px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${exports.COLORS.accent_primary};
    }

    /* ==================== TOOLTIP STYLES ==================== */
    [role="tooltip"], .tooltip {
      background-color: ${exports.COLORS.bg_card};
      color: ${exports.COLORS.text_primary} !important;
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.border_radius_small}px;
      padding: ${exports.DIMS.spacing_sm}px;
      font-size: ${exports.FONTS.size_small}px;
      max-width: 300px;
      z-index: 1000;
    }
  `;
}
exports.getGlobalStylesheet = getGlobalStylesheet;
/**
 * Generate QSS (Qt Style Sheet) for PyQt5 applications
 * This is used when the orchestrator plugin needs to style PyQt5 widgets
 */
function getQSSStylesheet() {
    return `
    /* ==================== GLOBAL ==================== */
    QWidget {
      font-family: ${exports.FONTS.family};
      font-size: ${exports.FONTS.size_base}pt;
      color: ${exports.COLORS.text_primary};
    }

    QMainWindow, QDialog {
      background-color: ${exports.COLORS.bg_primary};
    }

    /* ==================== LABELS ==================== */
    QLabel {
      color: ${exports.COLORS.text_primary};
      background: transparent;
    }

    QLabel[class="header"] {
      font-size: ${exports.FONTS.size_header}pt;
      font-weight: bold;
    }

    QLabel[class="title"] {
      font-size: ${exports.FONTS.size_title}pt;
      font-weight: bold;
    }

    QLabel[class="muted"] {
      color: ${exports.COLORS.text_muted};
    }

    /* ==================== BUTTONS - NO TRUNCATION ==================== */
    QPushButton {
      background-color: ${exports.COLORS.accent_primary};
      color: ${exports.COLORS.text_primary};
      border: 2px solid ${exports.COLORS.accent_primary};
      border-radius: ${exports.DIMS.button_radius}px;
      padding: ${exports.DIMS.button_padding_v}px ${exports.DIMS.button_padding_h}px;
      min-height: ${exports.DIMS.button_height}px;
      font-size: ${exports.FONTS.size_button}pt;
      font-weight: 500;
    }

    QPushButton:hover {
      background-color: ${exports.COLORS.accent_hover};
      border-color: ${exports.COLORS.accent_hover};
    }

    QPushButton:pressed {
      background-color: ${exports.COLORS.accent_secondary};
    }

    QPushButton:focus {
      border: 2px solid ${exports.COLORS.accent_light};
      outline: none;
    }

    QPushButton:disabled {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_muted};
      border-color: ${exports.COLORS.border_dark};
    }

    /* Button variants */
    QPushButton[class="success"] {
      background-color: ${exports.COLORS.success};
      border-color: ${exports.COLORS.success};
    }

    QPushButton[class="success"]:hover {
      background-color: ${exports.COLORS.success_dark};
    }

    QPushButton[class="danger"] {
      background-color: ${exports.COLORS.error};
      border-color: ${exports.COLORS.error};
    }

    QPushButton[class="danger"]:hover {
      background-color: ${exports.COLORS.error_dark};
    }

    QPushButton[class="warning"] {
      background-color: ${exports.COLORS.warning};
      border-color: ${exports.COLORS.warning};
    }

    QPushButton[class="warning"]:hover {
      background-color: ${exports.COLORS.warning_dark};
    }

    /* ==================== INPUTS ==================== */
    QLineEdit, QTextEdit, QPlainTextEdit, QSpinBox, QDoubleSpinBox {
      background-color: ${exports.COLORS.bg_input};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.input_radius}px;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      min-height: ${exports.DIMS.input_height}px;
      font-size: ${exports.FONTS.size_base}pt;
      selection-background-color: ${exports.COLORS.accent_primary};
    }

    QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
      border: 2px solid ${exports.COLORS.accent_primary};
      outline: none;
    }

    QSpinBox:focus, QDoubleSpinBox:focus {
      border: 2px solid ${exports.COLORS.accent_primary};
      outline: none;
    }

    QLineEdit:disabled, QTextEdit:disabled {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_muted};
    }

    /* ==================== COMBOBOX ==================== */
    QComboBox {
      background-color: ${exports.COLORS.bg_input};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.input_radius}px;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_md}px;
      min-height: ${exports.DIMS.input_height}px;
      font-size: ${exports.FONTS.size_base}pt;
    }

    QComboBox:hover {
      border-color: ${exports.COLORS.accent_primary};
    }

    QComboBox::drop-down {
      border: none;
      width: 30px;
    }

    QComboBox::down-arrow {
      image: none;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 6px solid ${exports.COLORS.text_secondary};
      margin-right: ${exports.DIMS.spacing_sm}px;
    }

    QComboBox QAbstractItemView {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      selection-background-color: ${exports.COLORS.accent_primary};
    }

    /* ==================== TABLES ==================== */
    QTableWidget, QTableView {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.card_radius}px;
      gridline-color: ${exports.COLORS.border_dark};
      alternate-background-color: ${exports.COLORS.bg_tertiary};
      font-size: ${exports.FONTS.size_table}pt;
    }

    QTableWidget::item, QTableView::item {
      padding: ${exports.DIMS.spacing_sm}px;
      color: ${exports.COLORS.text_primary};
      border-bottom: 1px solid ${exports.COLORS.border_dark};
    }

    QTableWidget::item:alternate, QTableView::item:alternate {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_primary};
    }

    QTableWidget::item:selected, QTableView::item:selected {
      background-color: ${exports.COLORS.accent_primary};
      color: white;
    }

    QTableWidget::item:hover, QTableView::item:hover {
      background-color: ${exports.COLORS.bg_card_hover};
      color: ${exports.COLORS.text_primary};
    }

    QHeaderView::section {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_primary};
      padding: ${exports.DIMS.spacing_sm}px;
      border: none;
      border-bottom: 2px solid ${exports.COLORS.accent_primary};
      font-weight: bold;
      font-size: ${exports.FONTS.size_table}pt;
    }

    /* ==================== SCROLLBARS ==================== */
    QScrollBar:vertical {
      background-color: ${exports.COLORS.bg_secondary};
      width: ${exports.DIMS.spacing_md}px;
      border-radius: ${exports.DIMS.spacing_sm}px;
      margin: 0;
    }

    QScrollBar::handle:vertical {
      background-color: ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.spacing_sm}px;
      min-height: ${exports.DIMS.spacing_xl}px;
    }

    QScrollBar::handle:vertical:hover {
      background-color: ${exports.COLORS.accent_primary};
    }

    QScrollBar:horizontal {
      background-color: ${exports.COLORS.bg_secondary};
      height: ${exports.DIMS.spacing_md}px;
      border-radius: ${exports.DIMS.spacing_sm}px;
    }

    QScrollBar::handle:horizontal {
      background-color: ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.spacing_sm}px;
      min-width: ${exports.DIMS.spacing_xl}px;
    }

    QScrollBar::handle:horizontal:hover {
      background-color: ${exports.COLORS.accent_primary};
    }

    /* ==================== GROUPBOX ==================== */
    QGroupBox {
      background-color: ${exports.COLORS.bg_card};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.card_radius}px;
      margin-top: ${exports.DIMS.spacing_lg}px;
      padding-top: ${exports.DIMS.spacing_lg}px;
      font-size: ${exports.FONTS.size_medium}pt;
      font-weight: bold;
    }

    QGroupBox::title {
      subcontrol-origin: margin;
      subcontrol-position: top left;
      left: ${exports.DIMS.spacing_md}px;
      padding: 0 ${exports.DIMS.spacing_sm}px;
      color: ${exports.COLORS.text_primary};
    }

    /* ==================== PROGRESSBAR ==================== */
    QProgressBar {
      background-color: ${exports.COLORS.bg_tertiary};
      border: none;
      border-radius: ${exports.DIMS.spacing_sm}px;
      height: ${exports.DIMS.spacing_md}px;
      text-align: center;
      font-size: ${exports.FONTS.size_small}pt;
    }

    QProgressBar::chunk {
      background-color: ${exports.COLORS.accent_primary};
      border-radius: ${exports.DIMS.spacing_sm}px;
    }

    /* ==================== TOOLTIPS ==================== */
    QToolTip {
      background-color: ${exports.COLORS.bg_card};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.spacing_sm}px;
      padding: ${exports.DIMS.spacing_sm}px;
      font-size: ${exports.FONTS.size_small}pt;
    }

    /* ==================== MENU ==================== */
    QMenu {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_primary};
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.card_radius}px;
      padding: ${exports.DIMS.spacing_sm}px;
    }

    QMenu::item {
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_lg}px;
      border-radius: ${exports.DIMS.spacing_sm}px;
    }

    QMenu::item:selected {
      background-color: ${exports.COLORS.accent_primary};
      color: white;
    }

    QMenu::separator {
      height: 1px;
      background-color: ${exports.COLORS.border_dark};
      margin: ${exports.DIMS.spacing_sm}px 0;
    }

    /* ==================== STATUSBAR ==================== */
    QStatusBar {
      background-color: ${exports.COLORS.bg_primary};
      color: ${exports.COLORS.text_secondary};
      border-top: 1px solid ${exports.COLORS.border_dark};
      font-size: ${exports.FONTS.size_small}pt;
    }

    QStatusBar::item {
      border: none;
    }

    /* ==================== TABS ==================== */
    QTabWidget::pane {
      border: 1px solid ${exports.COLORS.border_light};
      border-radius: ${exports.DIMS.card_radius}px;
      background-color: ${exports.COLORS.bg_secondary};
    }

    QTabBar::tab {
      background-color: ${exports.COLORS.bg_tertiary};
      color: ${exports.COLORS.text_secondary};
      border: 1px solid ${exports.COLORS.border_dark};
      border-bottom: none;
      border-top-left-radius: ${exports.DIMS.card_radius}px;
      border-top-right-radius: ${exports.DIMS.card_radius}px;
      padding: ${exports.DIMS.spacing_sm}px ${exports.DIMS.spacing_lg}px;
      margin-right: 2px;
      font-size: ${exports.FONTS.size_base}pt;
    }

    QTabBar::tab:selected {
      background-color: ${exports.COLORS.bg_secondary};
      color: ${exports.COLORS.text_primary};
      border-color: ${exports.COLORS.border_light};
    }

    QTabBar::tab:hover:!selected {
      background-color: ${exports.COLORS.bg_card_hover};
      color: ${exports.COLORS.text_primary};
    }
  `;
}
exports.getQSSStylesheet = getQSSStylesheet;
// =============================================================================
// EXPORTS
// =============================================================================
exports.default = {
    COLORS: exports.COLORS,
    FONTS: exports.FONTS,
    DIMS: exports.DIMS,
    getGlobalStylesheet,
    getQSSStylesheet,
};
//# sourceMappingURL=GlobalStyles.js.map