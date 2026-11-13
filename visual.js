// Pure appearance validation. Shared by the panel and isolated chat content script.
export const DEFAULT_PREFERENCES=Object.freeze({
  uiMode:'auto',performanceProfile:'balanced',theme:'dark-plus',lineNumbers:true,wrap:false,fontSize:13,maxHeight:420,glassBlur:18,glassOpacity:75,glassCards:true
});
const VISUAL_THEMES=new Set(['dark-plus','light-plus','github-dark','github-light','one-dark-pro','dracula']);
export function resolveUiMode(mode,systemDark=false){return mode==='light'||mode==='dark'?mode:systemDark?'dark':'light';}
export function normalizePreferences(raw={}){
  const v=raw||{};
  const bounded=(value,min,max,step,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(min,Math.min(max,value))/step)*step:fallback;
  return {
    uiMode:['auto','light','dark'].includes(v.uiMode)?v.uiMode:DEFAULT_PREFERENCES.uiMode,
    performanceProfile:['balanced','low'].includes(v.performanceProfile)?v.performanceProfile:DEFAULT_PREFERENCES.performanceProfile,
    theme:VISUAL_THEMES.has(v.theme)?v.theme:DEFAULT_PREFERENCES.theme,
    lineNumbers:typeof v.lineNumbers==='boolean'?v.lineNumbers:DEFAULT_PREFERENCES.lineNumbers,
    wrap:typeof v.wrap==='boolean'?v.wrap:DEFAULT_PREFERENCES.wrap,
    fontSize:bounded(v.fontSize,11,17,1,DEFAULT_PREFERENCES.fontSize),
    maxHeight:bounded(v.maxHeight,260,700,20,DEFAULT_PREFERENCES.maxHeight),
    glassBlur:bounded(v.glassBlur,0,30,2,DEFAULT_PREFERENCES.glassBlur),
    glassOpacity:bounded(v.glassOpacity,55,95,5,DEFAULT_PREFERENCES.glassOpacity),
    glassCards:typeof v.glassCards==='boolean'?v.glassCards:DEFAULT_PREFERENCES.glassCards
  };
}
export function compactRenderRequired(code){
  const src=String(code??'');return src.length>24000||src.split('\n').length>600;
}

/** No stored message data: these predicates operate only on preference values. */
export function isLowMode(p){return p?.performanceProfile==='low';}
export function needsRerender(previous,next){
  return ['theme','lineNumbers','wrap','performanceProfile'].some(key=>previous[key]!==next[key]);
}
export function effectiveCardSettings(p){
  const low=isLowMode(p);
  return {theme:p.theme,lineNumbers:!low&&p.lineNumbers,wrap:p.wrap,fontSize:p.fontSize,performanceProfile:low?'low':'balanced'};
}
export function processingBudget(p){return isLowMode(p)?{batch:10,delay:40}:{batch:30,delay:12};}
