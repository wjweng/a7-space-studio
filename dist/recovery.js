// When a saved layout cannot be read, the editor falls back to the initial layout and its
// next autosave overwrites the stored one. The unreadable copy is set aside first, byte for
// byte, so a later fix can import it again.
export const RECOVERY_KEY='a7-studio-v1-unreadable';
const LIMIT=3;
export function readRecovered(storage){
 try{const list=JSON.parse(storage.getItem(RECOVERY_KEY));return Array.isArray(list)?list.filter(e=>e&&typeof e.raw==='string'&&typeof e.savedAt==='string'):[];}catch{return[];}
}
// Newest first; the same text is kept once. Returns false when storage refuses the copy.
export function setAside(storage,raw,now=new Date()){
 const list=readRecovered(storage);if(!list.some(e=>e.raw===raw))list.unshift({savedAt:now.toISOString(),raw});
 try{storage.setItem(RECOVERY_KEY,JSON.stringify(list.slice(0,LIMIT)));return true;}catch{return false;}
}
export function discardRecovered(storage,savedAt){
 const list=readRecovered(storage).filter(e=>e.savedAt!==savedAt);
 try{if(list.length)storage.setItem(RECOVERY_KEY,JSON.stringify(list));else storage.removeItem(RECOVERY_KEY);}catch{}
}
// Asks the browser not to evict this site's storage under disk pressure or inactivity.
export async function requestPersistentStorage(manager=globalThis.navigator?.storage){
 try{if(!manager?.persist)return false;if(await manager.persisted?.())return true;return await manager.persist();}catch{return false;}
}
