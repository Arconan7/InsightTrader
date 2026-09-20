declare module '*live-intelligence-service.mjs' {
  export function loadCachedDataset(): any;
  export function refreshLiveIntelligence(): Promise<any>;
  export function getIntelligence(): any;
  export function getSyncStatus(): any;
}

