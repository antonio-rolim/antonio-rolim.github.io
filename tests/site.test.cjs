const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync('script.js', 'utf8');

function makeStorage(throwing=false) {
 const values=new Map();
 return {getItem:k=>{if(throwing)throw Error('blocked');return values.get(k)||null;},setItem:(k,v)=>{if(throwing)throw Error('blocked');values.set(k,v);}};
}
function fixture({response='opaque',storageBlocked=false,heading=false,fetchImpl,receipt='missing'}={}) {
 const events=[], requests=[], assignments=[];
 const field=value=>({value,validity:{valid:true},setAttribute(){},removeAttribute(){},closest:()=>({open:false}),focus(){this.focused=true;}});
 const status={textContent:'',style:{}},button={disabled:false};
 const handlers={};
 const form={nome:field('Paciente de teste local'),whatsapp:field('(11) 98765-4321'),email:field(''),interesse:field(''),mensagem:field(''),consentimento:{...field('1'),checked:true},website:field(''),setAttribute(){},removeAttribute(){},querySelectorAll:()=>[],querySelector:s=>s==='button[type="submit"]'?button:s==='[name="website"]'?form.website:status,addEventListener:(n,f)=>handlers[n]=f};
 const title={textContent:'Fale com a equipe'},text={textContent:'Entre em contato'};
 const ss=makeStorage(storageBlocked);
 const win={location:{href:'https://drantoniorolim.com.br/?utm_source=google&nome=nao-copiar',origin:'https://drantoniorolim.com.br',pathname:'/',search:'?utm_source=google&nome=nao-copiar',assign:u=>assignments.push(u)},gtag:(...args)=>events.push(args)};
 const fetcher=fetchImpl|| (async(url,options)=>{
  requests.push(options);
  const p=new URLSearchParams(options.body);
  if(response==='network')throw Error('offline');
  if(response==='opaque')return {type:'opaque'};
  if(response==='http-error')return {type:'cors',ok:false};
  return {type:'cors',ok:true,json:async()=>response==='confirmed'?{protocol:'rolim-email-receipt-v1',ok:true,accepted:true,receipt_saved:true,notification_status:'accepted',request_id:p.get('request_id'),lead_id:'local-lead-id'}:response==='mismatch'?{protocol:'rolim-email-receipt-v1',ok:true,accepted:true,receipt_saved:true,notification_status:'accepted',request_id:'other-id',lead_id:'local-lead-id'}:{ok:true}};
 });
 const ctx=vm.createContext({document:{addEventListener(){},getElementById:()=>form,querySelector:s=>heading?(s==='[data-submission-heading]'?title:text):null,createElement:()=>({remove(){}}),head:{appendChild:script=>{const u=new URL(script.src);if(receipt==='confirmed'){win[u.searchParams.get('callback')]({protocol:'rolim-email-receipt-v1',ok:true,accepted:true,receipt_saved:true,notification_status:'accepted',request_id:u.searchParams.get('request_id'),lead_id:'jsonp-lead'});}else script.onerror();}}},window:win,sessionStorage:ss,localStorage:ss,crypto:webcrypto,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:fetcher});
 vm.runInContext(source,ctx);
 return {ctx,form,status,button,handlers,events,requests,assignments,ss,title,text,run:code=>vm.runInContext(code,ctx),submit:()=>handlers.submit({preventDefault(){}})};
}

test('phone validation requires a valid DDD and complete number',()=>{
 const f=fixture();
 for(const value of ['12345678','987654321','(20) 98765-4321','(11) 88888-8888','abc11987654321']){
  f.ctx.value=value;assert.equal(f.run('normalizeWhatsApp(value)'),null,value);
 }
 for(const value of ['(11) 98765-4321','+55 (11) 98765-4321','5511987654321']){
  f.ctx.value=value;assert.equal(f.run('normalizeWhatsApp(value)'),'5511987654321');
 }
 f.ctx.value='(11) 3456-7890';assert.equal(f.run('normalizeWhatsApp(value)'),'551134567890');
});

test('invalid optional email prevents network request and focuses field',async()=>{
 const f=fixture();f.run('setupForm()');f.form.email.value='invalid';f.form.email.validity.valid=false;
 await f.submit();assert.equal(f.requests.length,0);assert.equal(f.form.email.focused,true);
});

test('missing consent and honeypot prevent requests',async()=>{
 const f=fixture();f.run('setupForm()');f.form.consentimento.checked=false;await f.submit();assert.equal(f.requests.length,0);
 f.form.consentimento.checked=true;f.form.website.value='spam';await f.submit();assert.equal(f.requests.length,0);
});

test('opaque transport stores unconfirmed metadata, never patient fields',async()=>{
 const f=fixture();f.run('setupForm()');await f.submit();
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].mode,'no-cors');
 const receipt=JSON.parse(f.ss.getItem('rolim_submission'));assert.equal(receipt.status,'unconfirmed');assert.equal('nome' in receipt,false);assert.equal('email' in receipt,false);
 assert.equal(f.assignments[0],'thank-you.html');assert.equal(f.events.some(x=>x[1]==='conversion'),false);
 const body=new URLSearchParams(f.requests[0].body);assert.equal(body.get('utm_source'),'google');assert.equal(body.get('page_url'),'https://drantoniorolim.com.br/');assert.equal(body.get('whatsapp'),'5511987654321');
});

test('server receipt requires email acceptance, saved receipt and matching request ID',async()=>{
 for(const response of ['mismatch','partial','http-error']){
  const f=fixture({response});f.run('CONFIG.FORM_RESPONSE_MODE="cors";setupForm()');await f.submit();
  if(response==='http-error'){assert.equal(f.assignments.length,0);assert.match(f.status.textContent,/Não foi possível confirmar/);}else{assert.equal(JSON.parse(f.ss.getItem('rolim_submission')).status,'unconfirmed');}
 }
 const f=fixture({response:'confirmed'});f.run('CONFIG.FORM_RESPONSE_MODE="cors";setupForm()');await f.submit();assert.equal(JSON.parse(f.ss.getItem('rolim_submission')).status,'confirmed');
});

test('double click sends one POST; retries preserve request identity',async()=>{
 let resolve,body;let count=0;
 const f=fixture({fetchImpl:(_,opts)=>{count++;body=opts.body;return new Promise(r=>resolve=r);}});f.run('setupForm()');
 const pending=f.submit();await f.submit();assert.equal(count,1);resolve({type:'opaque'});await pending;assert.ok(new URLSearchParams(body).get('request_id'));
 const fail=fixture({response:'network'});fail.run('setupForm()');await fail.submit();await fail.submit();
 assert.equal(new URLSearchParams(fail.requests[0].body).get('request_id'),new URLSearchParams(fail.requests[1].body).get('request_id'));
});

test('network failure does not navigate or auto retry and re-enables form',async()=>{
 const f=fixture({response:'network'});f.run('setupForm()');await f.submit();assert.equal(f.requests.length,1);assert.equal(f.assignments.length,0);assert.equal(f.button.disabled,false);
});

test('storage failure keeps honest feedback on form',async()=>{
 const f=fixture({storageBlocked:true});f.run('setupForm()');await f.submit();assert.equal(f.assignments.length,0);assert.match(f.status.textContent,/não foi confirmado/);
});

test('direct thank-you visit, stale or unconfirmed receipts never convert',()=>{
 for(const receipt of [null,{status:'confirmed',request_id:'id',lead_id:'lead',submitted_at:Date.now()-31*60000},{status:'unconfirmed',request_id:'id',submitted_at:Date.now()},{status:'confirmed',request_id:'id',submitted_at:Date.now()}]){
  const f=fixture({heading:true});if(receipt)f.ss.setItem('rolim_submission',JSON.stringify(receipt));f.run('setupSubmissionStatus()');assert.equal(f.events.length,0);
 }
});

test('confirmed lead fires one Ads action with transaction ID; reload does not fire again',()=>{
 const f=fixture({heading:true});f.ss.setItem('rolim_submission',JSON.stringify({status:'confirmed',request_id:'id',lead_id:'lead-unique',submitted_at:Date.now()}));
 f.run('setupSubmissionStatus();setupSubmissionStatus()');
 assert.equal(f.events.filter(x=>x[1]==='generate_lead').length,1);
 const ads=f.events.filter(x=>x[1]==='conversion');assert.equal(ads.length,1);assert.equal(ads[0][2].transaction_id,'lead-unique');
 assert.match(f.title.textContent,/encaminhada/);
});

test('tracking allowlist excludes patient data, procedure and URL',()=>{
 const f=fixture();f.run('track("whatsapp_click",{cta_position:"hero",nome:"patient",email:"private@example.test",interesse:"private",link_url:"private"})');
 assert.deepEqual(JSON.parse(JSON.stringify(f.events[0][2])),{cta_position:'hero'});
});

test('all static WhatsApp links work without JS and have no text query',()=>{
 const html=fs.readFileSync('index.html','utf8');const links=html.match(/<a\b[^>]*data-whatsapp[^>]*>/g);assert.ok(links.length>=10);
 for(const link of links){assert.match(link,/href="https:\/\/wa.me\/5511952516867"/);assert.match(link,/data-cta-position=/);}
 assert.match(html,/method="post"/);assert.match(html,/<h3>Cirurgia Mamária Secundária/);
 const css=fs.readFileSync('styles.css','utf8');assert.doesNotMatch(css,/\.reveal \{\s*opacity: 0/);
});

test('index schema and canonical agree with production; sitemap excludes thank-you',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/https:\/\/www\.drantoniorolim/);assert.match(html,/href="https:\/\/drantoniorolim.com.br\/" rel="canonical"/);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema.address.addressLocality,'São Paulo');
 assert.doesNotMatch(fs.readFileSync('sitemap.xml','utf8'),/thank-you/);
 const thanks=fs.readFileSync('thank-you.html','utf8');assert.match(thanks,/noindex/);assert.doesNotMatch(thanks,/gtag\('event', 'conversion'/);
});

test('analytics initialization is idempotent and uses a query-free page URL',()=>{
 const calls=[],scripts=[];const c=vm.createContext({window:{location:{origin:'https://drantoniorolim.com.br',pathname:'/',search:'?email=private'}},document:{referrer:'https://example.test/path?private=true',createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}},URL});
 const code=fs.readFileSync('analytics.js','utf8');vm.runInContext(code,c);vm.runInContext(code,c);
 assert.equal(scripts.length,1);const entries=c.window.dataLayer.map(x=>Array.from(x));assert.equal(entries.filter(x=>x[0]==='config'&&x[1]==='G-Q1984RXJFE').length,1);
 assert.equal(entries.find(x=>x[0]==='set')[1].page_location,'https://drantoniorolim.com.br/');
});


test('opaque POST is confirmed by a read-only receipt without another POST',async()=>{
 const f=fixture({receipt:'confirmed'});f.run('setupForm()');await f.submit();assert.equal(f.requests.length,1);
 const p=new URLSearchParams(f.requests[0].body);assert.match(p.get('receipt_key'),/^[a-f0-9]{64}$/);
 const receipt=JSON.parse(f.ss.getItem('rolim_submission'));assert.equal(receipt.status,'confirmed');assert.equal(receipt.lead_id,'jsonp-lead');assert.equal('receipt_key' in receipt,false);
});

test('receipt lookup sends no patient fields and cleans up its callback',async()=>{
 const f=fixture();let url;let removed=false;
 f.ctx.document.head.appendChild=script=>{url=new URL(script.src);script.onerror();};
 f.ctx.document.createElement=()=>({remove(){removed=true;}});
 f.run('setupForm()');await f.submit();assert.deepEqual([...url.searchParams.keys()].sort(),['action','callback','receipt_key','request_id']);
 assert.equal(f.ctx.window[url.searchParams.get('callback')],undefined);assert.equal(removed,true);
});

test('retry preserves both request identity and receipt key after network error',async()=>{
 const f=fixture({response:'network'});f.run('setupForm()');await f.submit();await f.submit();
 const a=new URLSearchParams(f.requests[0].body),b=new URLSearchParams(f.requests[1].body);
 assert.equal(a.get('request_id'),b.get('request_id'));assert.equal(a.get('receipt_key'),b.get('receipt_key'));
});
