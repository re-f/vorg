export const PREVIEW_PANEL_TYPE = 'vorgPreview';
export const SIDE_PANEL_TYPE = 'vorgSidePreview';
export const PREVIEW_TITLE = 'Org Preview';

export const COMMANDS = {
  PREVIEW: 'vorg.preview',
  PREVIEW_TO_SIDE: 'vorg.previewToSide',
  FOLLOW_LINK: 'vorg.followLink',
  INSERT_LINK: 'vorg.insertLink'
} as const;

export const WEBVIEW_MESSAGES = {
  READY: 'ready',
  UPDATE_SCROLL: 'updateScroll'
} as const;

export const DEFAULT_PREVIEW_OPTIONS = {
  enableScripts: true,
  retainContextWhenHidden: true
} as const; 