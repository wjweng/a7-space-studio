// The design-scheme list is compared by content: keyOf(state) (app.js's stateKey) returns the
// same key for the same furniture, palette and floors, whatever the scheme is called.
export const MAX_SCHEMES=30;

// Renames every UUID by order of first appearance. Ids carry no meaning beyond linking parts
// together, and validateFurniture gives a stored cabinet without a design a fresh random one on
// every load (as share links give fresh ids), so raw keys of one layout never matched.
const UUIDS=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
export function canonicalIds(text){
  const ids=new Map();return text.replace(UUIDS,id=>{if(!ids.has(id))ids.set(id,ids.size);return '#'+ids.get(id);});
}

const safeKey=(keyOf,state)=>{try{return keyOf(state);}catch{return null;}};

// Drops later copies of a layout already in the list, keeping the earliest (and its name).
// A scheme whose key cannot be computed is kept rather than treated as a copy.
export function uniqueSchemes(list,keyOf){
  const seen=new Set();
  return list.filter(s=>{const key=safeKey(keyOf,s.state);if(key===null)return true;if(seen.has(key))return false;seen.add(key);return true;});
}

// Appends incoming schemes not already present, while the list has room. Existing schemes are
// never pushed out: an import used to append and keep the last 30, so a file with 30 schemes
// silently replaced the whole list.
export function mergeSchemes(list,incoming,keyOf,limit=MAX_SCHEMES){
  const seen=new Set(list.map(s=>safeKey(keyOf,s.state)).filter(k=>k!==null)),schemes=[...list];let added=0,duplicate=0,full=0;
  for(const s of incoming){
    const key=safeKey(keyOf,s.state);
    if(key!==null&&seen.has(key)){duplicate++;continue;}
    if(schemes.length>=limit){full++;continue;}
    if(key!==null)seen.add(key);schemes.push(s);added++;
  }
  return{schemes,added,duplicate,full};
}
