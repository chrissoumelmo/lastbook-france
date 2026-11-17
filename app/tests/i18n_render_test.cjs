/* Text/markup snapshots captured from the pre-translation interface. No browser needed. */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../..');
const base = process.env.I18N_SNAPSHOT_SOURCE || path.join(root, 'web');
const read = name => fs.readFileSync(path.join(base, name + '.js'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(root, 'web/i18n/en.json')));
function between(source, first, last) { const a = source.indexOf(first), b = source.indexOf(last, a + first.length); assert(a >= 0 && b > a, first); return source.slice(a, b) }
const app = read('app'), chat = read('chat'), setup = read('setup'), update = read('update');
const nodes = new Map();
const node = key => { if (!nodes.has(key)) nodes.set(key, {innerHTML:'', addEventListener() {}, insertAdjacentHTML(_, text) {this.innerHTML += text} }); return nodes.get(key) };
const env = {console, Intl, Date, URLSearchParams, main: node('main'), $: node, setTitle() {},
  api: async () => ({title:'First aid & health',note:'Chosen to go with the survival guides',total:0,items:[],more:false}),
  searchBox: (id,value,placeholder,button) => `<search>${placeholder}|${button}</search>`, location: {hash:'#/videos'}, navigator:{}, WIN:false, UNIT:1000,
  ico: s => `<icon>${s}</icon>`, fileUrl: s => '/'+s, fromQ:()=> 'from=videos', clock: s => '1:30',
  vprog:()=>({}), SHORT:{}, topicById:()=>null, esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  E:s=>String(s??''), cur:()=>null, diskFor:()=>({}), diskName:()=> 'this disk', errCode:e=>e?.code, errText:e=>e?.message,
};
const context = vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(root,'web/i18n.js'),'utf8'), context);
context.I18n.configure(en, {}, 'en');
const code = [
  app.split('\n').find(l=>l.startsWith('const fmtDur =')),
  between(app,'async function videoRow(', '// Video formats'),
  between(app,'function srcText(', '// A reading card'),
  between(app,'function vcard(', 'function rail('),
  between(app,'function backButton(', '// Links into readers'),
  between(app,'function errorBox(', '// The window title'),
  between(app,'const many =', '// The optional local AI'),
  between(app,'function localAbout(', 'async function localAI('),
  between(chat,'  function localLine(', '  let polling'),
  between(chat,'  function stepText(', '  function srcHref('),
  between(setup,'  function size(', '  const ram'),
  between(setup,'  function eta(', '  const home'),
  between(update,'  function view(', '  function paint(').replace('function view(', 'function updateView('),
].join('\n');
vm.runInContext(code, context);
async function samples() {
  const out = {};
  const capture=(label, expression)=> out[label]=vm.runInContext(expression,context);
  capture('source.missing','srcText(null)');
  capture('source.pdf',`srcText({publisher:'Publisher',year:2026,kind:'pdf',pages:123},4)`);
  capture('source.video',`srcText({collection:'Collection',duration:240,transcript:true})`);
  capture('source.unknown',`srcText({kind:'pdf',pages:12})`);
  capture('video.card',`vcard({id:'v1',title:'A title',publisher:'A publisher',duration:90,transcript:true})`);
  for(const where of ['#/videos','#/map','#/ask','#/read/x','#/watch/x','#/search?q=water','#/library','#/']) capture('back.'+where,`backButton(${JSON.stringify(where)})`);
  capture('error',`errorBox({message:'A failure <with markup>'})`);
  capture('coverage.empty','blind({videos:0,videos_with_text:0})');
  capture('coverage.full','blind({videos:13,videos_with_text:3,pdfs_image_only:2,docs_without_text:5})');
  capture('coverage.one','blind({videos:1,videos_with_text:0,pdfs_image_only:1,docs_without_text:1})');
  for(const state of ['ready','stopped','loading','checking','measuring','absent','off','wrong','too_big','error']) {
    const local={state,name:'A model',needs_bytes:18000000000,pct:42,placement:[{bytes:1000000000,device:'CPU'}]};
    capture('ai.about.'+state,`localAbout({local:${JSON.stringify(local)}})`);
    capture('ai.chat.'+state,`localLine(${JSON.stringify(local)})`);
  }
  capture('ai.error',`localAbout({local:{state:'error',message:'A clear error'}})`);
  for(const n of [0,35,61,125,3600,7260]) capture('eta.'+n,`eta(${n})`);
  for(const n of [1230000,12800000,1200000000,123000000000]) capture('size.'+n,`size(${n})`);
  for(const state of ['idle','checking','up_to_date','available','not_published','too_old_os','error']) capture('update.'+state,`updateView({state:${JSON.stringify(state)},current:'1.1.11',version:'2.0',website:'lastbook.org',message:'A useful message'})`);
  capture('update.unversioned',`updateView({state:'idle'})`);
  capture('steps.search',`stepText({name:'search_library',args:{query:'water',kind:'video'},summary:{count:2}})`);
  capture('steps.read',`stepText({name:'read_pages',args:{doc_id:'d',pages:[2,4]},summary:{title:'Manual'}})`);
  capture('steps.place',`stepText({name:'lookup_place',args:{query:'hospital'}})`);
  for (const query of ['', 'water']) {
    await vm.runInContext(`videoRow('health',new URLSearchParams(${JSON.stringify('q=')}+${JSON.stringify(query)}))`,context);
    out['video.row.'+query] = node('main').innerHTML;
  }
  return out;
}
samples().then(out=>{
  if(process.env.I18N_SNAPSHOT_SOURCE) process.stdout.write(JSON.stringify(out,null,2)+'\n');
  else {const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'i18n_english.json')));assert.deepEqual(JSON.parse(JSON.stringify(out)),expected);console.log(`${Object.keys(out).length} English text/markup snapshots unchanged`);
    context.I18n.configure(en, JSON.parse(fs.readFileSync(path.join(root,'web/i18n/fr.json'))), 'fr');
    return vm.runInContext("videoRow('health',new URLSearchParams())",context).then(()=> {assert(node('main').innerHTML.includes('Premiers secours et santé'));assert(!node('main').innerHTML.includes('First aid &amp; health'))})}
}).catch(e=>{console.error(e);process.exitCode=1});
