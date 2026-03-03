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

// =============================================================================
// COLOR PALETTE - Based on TELEGRAM Module Universal Theme
// =============================================================================

export const COLORS = {
  // Background - Dark theme for better readability
  bg_primary: '#0d0d12',       // Main background
  bg_secondary: '#13131a',     // Cards, panels, tables
  bg_tertiary: '#1c1c26',      // Sections, headers
  bg_card: '#1c1c26',          // Card/sections
  bg_input: '#13131a',         // Input fields
  bg_hover: '#262633',         // Hover state
  bg_card_hover: '#262633',    // Card hover

  // Tables - NO white rows, all dark
  table_bg: '#13131a',
  table_row_even: '#13131a',
  table_row_odd: '#1c1c26',
  table_header: '#1c1c26',
  table_gridline: '#1c1c26',
  table_selection: '#3b82f6',

  // Text - WHITE text for dark backgrounds (FIX for dark text issue)
  text_primary: '#f5f5f7',     // White/light gray for main text
  text_secondary: '#d0d0d8',   // Light gray for secondary text
  text_muted: '#a0a0b0',       // Gray for placeholders/disabled
  text_dark: '#1e293b',        // For light themes

  // Accent - Blue theme
  accent_primary: '#3b82f6',   // Blue
  accent_secondary: '#60a5fa', // Light blue
  accent_hover: '#2563eb',     // Blue hover
  accent_light: '#93c5fd',     // Very light blue

  // Status colors
  success: '#22c55e',          // Green
  success_dark: '#16a34a',     // Dark green
  warning: '#f59e0b',          // Orange
  warning_dark: '#d97706',     // Dark orange
  error: '#ef4444',            // Red
  error_dark: '#dc2626',       // Dark red
  info: '#3b82f6',             // Blue info

  // Borders - almost invisible for modern look
  border_light: '#1c1c26',
  border_dark: '#1c1c26',
} as const;

// =============================================================================
// FONT SIZES - Increased for better readability
// =============================================================================

export const FONTS = {
  family: '"Segoe UI", "SF Pro Display", -apple-system, sans-serif',
  family_mono: '"Consolas", "Monaco", "Courier New", monospace',

  size_tiny: 10,        // Smallest text
  size_small: 11,       // Small text
  size_base: 12,        // Base text size (standard)
  size_medium: 13,      // Medium text
  size_large: 14,       // Large text
  size_header: 15,      // Headers
  size_title: 16,       // Titles
  size_button: 12,      // Button text (aligned with base)
  size_table: 12,       // Table text (aligned with base)
  size_table_header: 12,// Table header

  // Weights
  weight_normal: 400,
  weight_medium: 500,
  weight_bold: 600,
  weight_black: 700,
} as const;

// =============================================================================
// DIMENSIONS - Uniform spacing and sizing
// =============================================================================

export const DIMS = {
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
} as const;

// =============================================================================
// CSS GENERATORS
// =============================================================================

/**
 * Generate global CSS stylesheet with white text for dark backgrounds
 * and rules to prevent button text truncation
 */
export function getGlobalStylesheet(): string {
  return `
    /* ==================== GLOBAL RESET ==================== */
    * {
      font-family: ${FONTS.family};
      box-sizing: border-box;
    }

    /* ==================== DARK THEME BACKGROUND ==================== */
    body, html, :root {
      background-color: ${COLORS.bg_primary};
      color: ${COLORS.text_primary};
    }

    /* ==================== WHITE TEXT ON DARK BACKGROUNDS ==================== */
    /* FIX: Ensures white text is visible on dark backgrounds */
    .widget,
    .panel,
    .card,
    .container,
    .dashboard,
    .section {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_primary} !important;
    }

    /* ==================== TEXT STYLES ==================== */
    h1, h2, h3, h4, h5, h6 {
      color: ${COLORS.text_primary} !important;
      font-weight: ${FONTS.weight_bold};
    }

    h1 { font-size: ${FONTS.size_title}px; }
    h2 { font-size: ${FONTS.size_header}px; }
    h3 { font-size: ${FONTS.size_large}px; }
    h4 { font-size: ${FONTS.size_medium}px; }
    h5 { font-size: ${FONTS.size_base}px; }
    h6 { font-size: ${FONTS.size_small}px; }

    p, span, div, label, text {
      color: ${COLORS.text_primary};
    }

    .text-primary { color: ${COLORS.text_primary} !important; }
    .text-secondary { color: ${COLORS.text_secondary} !important; }
    .text-muted { color: ${COLORS.text_muted} !important; }
    .text-success { color: ${COLORS.success} !important; }
    .text-warning { color: ${COLORS.warning} !important; }
    .text-error { color: ${COLORS.error} !important; }
    .text-info { color: ${COLORS.info} !important; }

    /* ==================== BUTTON STYLES - NO TRUNCATION ==================== */
    /* FIX: Prevents button text from being truncated */
    button, .button, .btn, [role="button"] {
      /* Ensure full text is visible */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;

      /* Minimum width to prevent truncation */
      min-width: ${DIMS.button_min_width}px;
      width: auto !important;

      /* Proper padding */
      padding: ${DIMS.button_padding_v}px ${DIMS.button_padding_h}px;

      /* White text on colored buttons */
      color: ${COLORS.text_primary} !important;
      background-color: ${COLORS.accent_primary};
      border: 2px solid ${COLORS.accent_primary};
      border-radius: ${DIMS.button_radius}px;

      font-size: ${FONTS.size_button}px;
      font-weight: ${FONTS.weight_medium};
      min-height: ${DIMS.button_height}px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    button:hover, .button:hover, .btn:hover {
      background-color: ${COLORS.accent_hover};
      border-color: ${COLORS.accent_hover};
    }

    button:active, .button:active, .btn:active {
      background-color: ${COLORS.accent_secondary};
    }

    button:disabled, .button:disabled, .btn:disabled {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_muted} !important;
      border-color: ${COLORS.border_dark};
      cursor: not-allowed;
    }

    /* Button variants */
    .btn-primary, .button-primary {
      background-color: ${COLORS.accent_primary};
      color: ${COLORS.text_primary} !important;
      border-color: ${COLORS.accent_primary};
    }

    .btn-success, .button-success {
      background-color: ${COLORS.success};
      color: ${COLORS.text_primary} !important;
      border-color: ${COLORS.success};
    }

    .btn-danger, .button-danger {
      background-color: ${COLORS.error};
      color: ${COLORS.text_primary} !important;
      border-color: ${COLORS.error};
    }

    .btn-warning, .button-warning {
      background-color: ${COLORS.warning};
      color: ${COLORS.text_primary} !important;
      border-color: ${COLORS.warning};
    }

    .btn-info, .button-info {
      background-color: ${COLORS.info};
      color: ${COLORS.text_primary} !important;
      border-color: ${COLORS.info};
    }

    /* Outline buttons - dark border, white text */
    .btn-outline, .button-outline {
      background-color: transparent;
      color: ${COLORS.text_primary} !important;
      border: 2px solid ${COLORS.accent_primary};
    }

    .btn-outline:hover, .button-outline:hover {
      background-color: ${COLORS.accent_primary};
      color: ${COLORS.text_primary} !important;
    }

    /* ==================== INPUT STYLES ==================== */
    input, textarea, select, .input, .form-control {
      background-color: ${COLORS.bg_input};
      color: ${COLORS.text_primary} !important;
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.input_radius}px;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      min-height: ${DIMS.input_height}px;
      font-size: ${FONTS.size_base}px;
      font-family: ${FONTS.family};

      /* FIX: Prevent text truncation in inputs */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    input:focus, textarea:focus, select:focus,
    .input:focus, .form-control:focus {
      border-color: ${COLORS.accent_primary};
      outline: none;
      box-shadow: 0 0 0 2px ${COLORS.accent_primary}33;
    }

    input::placeholder, textarea::placeholder {
      color: ${COLORS.text_muted};
    }

    /* ==================== TABLE STYLES ==================== */
    table, .table {
      background-color: ${COLORS.table_bg};
      color: ${COLORS.text_primary} !important;
      border-collapse: collapse;
      width: 100%;
      font-size: ${FONTS.size_table}px;
    }

    thead, .table-header {
      background-color: ${COLORS.table_header};
      color: ${COLORS.text_primary} !important;
    }

    th, .table th {
      background-color: ${COLORS.table_header};
      color: ${COLORS.text_primary} !important;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      text-align: left;
      font-weight: ${FONTS.weight_bold};
      border-bottom: 2px solid ${COLORS.accent_primary};
    }

    td, .table td {
      background-color: ${COLORS.table_row_even};
      color: ${COLORS.text_primary} !important;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      border-bottom: 1px solid ${COLORS.table_gridline};

      /* FIX: Prevent text truncation in table cells */
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }

    tr:nth-child(odd) td, .table tr:nth-child(odd) td {
      background-color: ${COLORS.table_row_odd};
    }

    tr:hover td, .table tr:hover td {
      background-color: ${COLORS.bg_card_hover};
    }

    /* ==================== CARD/PANEL STYLES ==================== */
    .card, .panel, .widget {
      background-color: ${COLORS.bg_card};
      color: ${COLORS.text_primary} !important;
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.card_radius}px;
      padding: ${DIMS.spacing_md}px;
      margin-bottom: ${DIMS.spacing_md}px;
    }

    .card-header, .panel-header {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_primary} !important;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      border-bottom: 1px solid ${COLORS.border_light};
      font-weight: ${FONTS.weight_bold};
      border-radius: ${DIMS.card_radius}px ${DIMS.card_radius}px 0 0;
    }

    /* ==================== LINK STYLES ==================== */
    a, .link {
      color: ${COLORS.accent_light};
      text-decoration: none;
    }

    a:hover, .link:hover {
      color: ${COLORS.accent_primary};
      text-decoration: underline;
    }

    /* ==================== BADGE/LABEL STYLES ==================== */
    .badge, .label {
      display: inline-block;
      padding: ${DIMS.spacing_xs}px ${DIMS.spacing_sm}px;
      font-size: ${FONTS.size_small}px;
      font-weight: ${FONTS.weight_medium};
      border-radius: ${DIMS.border_radius_small}px;
      white-space: nowrap !important;  /* FIX: Prevent truncation */
    }

    .badge-primary, .label-primary {
      background-color: ${COLORS.accent_primary};
      color: ${COLORS.text_primary} !important;
    }

    .badge-success, .label-success {
      background-color: ${COLORS.success};
      color: ${COLORS.text_primary} !important;
    }

    .badge-danger, .label-danger {
      background-color: ${COLORS.error};
      color: ${COLORS.text_primary} !important;
    }

    .badge-warning, .label-warning {
      background-color: ${COLORS.warning};
      color: ${COLORS.text_primary} !important;
    }

    /* ==================== UTILITY CLASSES ==================== */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }

    .mt-1 { margin-top: ${DIMS.spacing_xs}px; }
    .mt-2 { margin-top: ${DIMS.spacing_sm}px; }
    .mt-3 { margin-top: ${DIMS.spacing_md}px; }
    .mt-4 { margin-top: ${DIMS.spacing_lg}px; }

    .mb-1 { margin-bottom: ${DIMS.spacing_xs}px; }
    .mb-2 { margin-bottom: ${DIMS.spacing_sm}px; }
    .mb-3 { margin-bottom: ${DIMS.spacing_md}px; }
    .mb-4 { margin-bottom: ${DIMS.spacing_lg}px; }

    .p-1 { padding: ${DIMS.spacing_xs}px; }
    .p-2 { padding: ${DIMS.spacing_sm}px; }
    .p-3 { padding: ${DIMS.spacing_md}px; }
    .p-4 { padding: ${DIMS.spacing_lg}px; }

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
      background: ${COLORS.bg_secondary};
    }

    ::-webkit-scrollbar-thumb {
      background: ${COLORS.border_light};
      border-radius: 6px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${COLORS.accent_primary};
    }

    /* ==================== TOOLTIP STYLES ==================== */
    [role="tooltip"], .tooltip {
      background-color: ${COLORS.bg_card};
      color: ${COLORS.text_primary} !important;
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.border_radius_small}px;
      padding: ${DIMS.spacing_sm}px;
      font-size: ${FONTS.size_small}px;
      max-width: 300px;
      z-index: 1000;
    }
  `;
}

/**
 * Generate QSS (Qt Style Sheet) for PyQt5 applications
 * This is used when the orchestrator plugin needs to style PyQt5 widgets
 */
export function getQSSStylesheet(): string {
  return `
    /* ==================== GLOBAL ==================== */
    QWidget {
      font-family: ${FONTS.family};
      font-size: ${FONTS.size_base}pt;
      color: ${COLORS.text_primary};
    }

    QMainWindow, QDialog {
      background-color: ${COLORS.bg_primary};
    }

    /* ==================== LABELS ==================== */
    QLabel {
      color: ${COLORS.text_primary};
      background: transparent;
    }

    QLabel[class="header"] {
      font-size: ${FONTS.size_header}pt;
      font-weight: bold;
    }

    QLabel[class="title"] {
      font-size: ${FONTS.size_title}pt;
      font-weight: bold;
    }

    QLabel[class="muted"] {
      color: ${COLORS.text_muted};
    }

    /* ==================== BUTTONS - NO TRUNCATION ==================== */
    QPushButton {
      background-color: ${COLORS.accent_primary};
      color: ${COLORS.text_primary};
      border: 2px solid ${COLORS.accent_primary};
      border-radius: ${DIMS.button_radius}px;
      padding: ${DIMS.button_padding_v}px ${DIMS.button_padding_h}px;
      min-height: ${DIMS.button_height}px;
      font-size: ${FONTS.size_button}pt;
      font-weight: 500;
    }

    QPushButton:hover {
      background-color: ${COLORS.accent_hover};
      border-color: ${COLORS.accent_hover};
    }

    QPushButton:pressed {
      background-color: ${COLORS.accent_secondary};
    }

    QPushButton:focus {
      border: 2px solid ${COLORS.accent_light};
      outline: none;
    }

    QPushButton:disabled {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_muted};
      border-color: ${COLORS.border_dark};
    }

    /* Button variants */
    QPushButton[class="success"] {
      background-color: ${COLORS.success};
      border-color: ${COLORS.success};
    }

    QPushButton[class="success"]:hover {
      background-color: ${COLORS.success_dark};
    }

    QPushButton[class="danger"] {
      background-color: ${COLORS.error};
      border-color: ${COLORS.error};
    }

    QPushButton[class="danger"]:hover {
      background-color: ${COLORS.error_dark};
    }

    QPushButton[class="warning"] {
      background-color: ${COLORS.warning};
      border-color: ${COLORS.warning};
    }

    QPushButton[class="warning"]:hover {
      background-color: ${COLORS.warning_dark};
    }

    /* ==================== INPUTS ==================== */
    QLineEdit, QTextEdit, QPlainTextEdit, QSpinBox, QDoubleSpinBox {
      background-color: ${COLORS.bg_input};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.input_radius}px;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      min-height: ${DIMS.input_height}px;
      font-size: ${FONTS.size_base}pt;
      selection-background-color: ${COLORS.accent_primary};
    }

    QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
      border: 2px solid ${COLORS.accent_primary};
      outline: none;
    }

    QSpinBox:focus, QDoubleSpinBox:focus {
      border: 2px solid ${COLORS.accent_primary};
      outline: none;
    }

    QLineEdit:disabled, QTextEdit:disabled {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_muted};
    }

    /* ==================== COMBOBOX ==================== */
    QComboBox {
      background-color: ${COLORS.bg_input};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.input_radius}px;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_md}px;
      min-height: ${DIMS.input_height}px;
      font-size: ${FONTS.size_base}pt;
    }

    QComboBox:hover {
      border-color: ${COLORS.accent_primary};
    }

    QComboBox::drop-down {
      border: none;
      width: 30px;
    }

    QComboBox::down-arrow {
      image: none;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 6px solid ${COLORS.text_secondary};
      margin-right: ${DIMS.spacing_sm}px;
    }

    QComboBox QAbstractItemView {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      selection-background-color: ${COLORS.accent_primary};
    }

    /* ==================== TABLES ==================== */
    QTableWidget, QTableView {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.card_radius}px;
      gridline-color: ${COLORS.border_dark};
      alternate-background-color: ${COLORS.bg_tertiary};
      font-size: ${FONTS.size_table}pt;
    }

    QTableWidget::item, QTableView::item {
      padding: ${DIMS.spacing_sm}px;
      color: ${COLORS.text_primary};
      border-bottom: 1px solid ${COLORS.border_dark};
    }

    QTableWidget::item:alternate, QTableView::item:alternate {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_primary};
    }

    QTableWidget::item:selected, QTableView::item:selected {
      background-color: ${COLORS.accent_primary};
      color: white;
    }

    QTableWidget::item:hover, QTableView::item:hover {
      background-color: ${COLORS.bg_card_hover};
      color: ${COLORS.text_primary};
    }

    QHeaderView::section {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_primary};
      padding: ${DIMS.spacing_sm}px;
      border: none;
      border-bottom: 2px solid ${COLORS.accent_primary};
      font-weight: bold;
      font-size: ${FONTS.size_table}pt;
    }

    /* ==================== SCROLLBARS ==================== */
    QScrollBar:vertical {
      background-color: ${COLORS.bg_secondary};
      width: ${DIMS.spacing_md}px;
      border-radius: ${DIMS.spacing_sm}px;
      margin: 0;
    }

    QScrollBar::handle:vertical {
      background-color: ${COLORS.border_light};
      border-radius: ${DIMS.spacing_sm}px;
      min-height: ${DIMS.spacing_xl}px;
    }

    QScrollBar::handle:vertical:hover {
      background-color: ${COLORS.accent_primary};
    }

    QScrollBar:horizontal {
      background-color: ${COLORS.bg_secondary};
      height: ${DIMS.spacing_md}px;
      border-radius: ${DIMS.spacing_sm}px;
    }

    QScrollBar::handle:horizontal {
      background-color: ${COLORS.border_light};
      border-radius: ${DIMS.spacing_sm}px;
      min-width: ${DIMS.spacing_xl}px;
    }

    QScrollBar::handle:horizontal:hover {
      background-color: ${COLORS.accent_primary};
    }

    /* ==================== GROUPBOX ==================== */
    QGroupBox {
      background-color: ${COLORS.bg_card};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.card_radius}px;
      margin-top: ${DIMS.spacing_lg}px;
      padding-top: ${DIMS.spacing_lg}px;
      font-size: ${FONTS.size_medium}pt;
      font-weight: bold;
    }

    QGroupBox::title {
      subcontrol-origin: margin;
      subcontrol-position: top left;
      left: ${DIMS.spacing_md}px;
      padding: 0 ${DIMS.spacing_sm}px;
      color: ${COLORS.text_primary};
    }

    /* ==================== PROGRESSBAR ==================== */
    QProgressBar {
      background-color: ${COLORS.bg_tertiary};
      border: none;
      border-radius: ${DIMS.spacing_sm}px;
      height: ${DIMS.spacing_md}px;
      text-align: center;
      font-size: ${FONTS.size_small}pt;
    }

    QProgressBar::chunk {
      background-color: ${COLORS.accent_primary};
      border-radius: ${DIMS.spacing_sm}px;
    }

    /* ==================== TOOLTIPS ==================== */
    QToolTip {
      background-color: ${COLORS.bg_card};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.spacing_sm}px;
      padding: ${DIMS.spacing_sm}px;
      font-size: ${FONTS.size_small}pt;
    }

    /* ==================== MENU ==================== */
    QMenu {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_primary};
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.card_radius}px;
      padding: ${DIMS.spacing_sm}px;
    }

    QMenu::item {
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_lg}px;
      border-radius: ${DIMS.spacing_sm}px;
    }

    QMenu::item:selected {
      background-color: ${COLORS.accent_primary};
      color: white;
    }

    QMenu::separator {
      height: 1px;
      background-color: ${COLORS.border_dark};
      margin: ${DIMS.spacing_sm}px 0;
    }

    /* ==================== STATUSBAR ==================== */
    QStatusBar {
      background-color: ${COLORS.bg_primary};
      color: ${COLORS.text_secondary};
      border-top: 1px solid ${COLORS.border_dark};
      font-size: ${FONTS.size_small}pt;
    }

    QStatusBar::item {
      border: none;
    }

    /* ==================== TABS ==================== */
    QTabWidget::pane {
      border: 1px solid ${COLORS.border_light};
      border-radius: ${DIMS.card_radius}px;
      background-color: ${COLORS.bg_secondary};
    }

    QTabBar::tab {
      background-color: ${COLORS.bg_tertiary};
      color: ${COLORS.text_secondary};
      border: 1px solid ${COLORS.border_dark};
      border-bottom: none;
      border-top-left-radius: ${DIMS.card_radius}px;
      border-top-right-radius: ${DIMS.card_radius}px;
      padding: ${DIMS.spacing_sm}px ${DIMS.spacing_lg}px;
      margin-right: 2px;
      font-size: ${FONTS.size_base}pt;
    }

    QTabBar::tab:selected {
      background-color: ${COLORS.bg_secondary};
      color: ${COLORS.text_primary};
      border-color: ${COLORS.border_light};
    }

    QTabBar::tab:hover:!selected {
      background-color: ${COLORS.bg_card_hover};
      color: ${COLORS.text_primary};
    }
  `;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  COLORS,
  FONTS,
  DIMS,
  getGlobalStylesheet,
  getQSSStylesheet,
};
