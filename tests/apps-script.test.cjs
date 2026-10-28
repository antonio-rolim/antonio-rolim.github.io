const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync('integrations/apps-script/Code.gs','utf8');
const requestId='12345678-1234-4234-8234-123456789abc';
const receiptKey='a'.repeat(64);
const valid=()=>({token:'test-token',nome:'Contato de teste',whatsapp:'(11) 98765-4321',email:'reply@example.test',interesse:'Consulta',mensagem:'Teste local sem envio real',consentimento:'1',page_url:'https://drantoniorolim.com.br/',request_id:requestId,receipt_key:receiptKey,privacy_version:'2026-10-27'});
function fixture({throwAt=0,busy=false,failWriteAt=0}={}){
 const data=new Map([['CONTACT_DESTINATIONS','first@example.test,second@example.test'],['FORM_TOKEN','test-token']]);
 let writes=0;const calls=[];let locked=false;
 const props={getProperty:k=>data.get(k)||null,getProperties:()=>Object.fromEntries(data),setProperty:(k,v)=>{writes++;if(writes===failWriteAt)throw Error('quota');data.set(k,v);},deleteProperty:k=>data.delete(k)};
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>{locked=!busy;return locked;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,v)=>[...crypto.createHash('sha256').update(v).digest()].map(b=>b>127?b-256:b)},GmailApp:{sendEmail:(...args)=>{calls.push(args);if(calls.length===throwAt)throw Error('simulated provider error');}},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'javascript'},createTextOutput:body=>({body,mime:'',setMimeType(mime){this.mime=mime;return this;}})}});
 vm.runInContext(source,c);
 const invoke=(fn,args)=>{c.args=args;return vm.runInContext(`${fn}(args)`,c);};
 return {c,data,calls,invoke,post:p=>JSON.parse(invoke('doPost',{parameter:p}).body),get:p=>invoke('doGet',{parameter:p}),receipt:()=>JSON.parse(data.get('ROLIM_RECEIPT_V1_'+requestId)),locked:()=>locked};
}

test('valid contact sends to both destinations and returns email-accepted receipt',()=>{
 const f=fixture(),r=f.post(valid());assert.equal(f.calls.length,2);assert.equal(r.accepted,true);assert.equal(r.receipt_saved,true);assert.equal(r.request_id,requestId);assert.equal(r.notification_status,'accepted');assert.equal(r.persisted,undefined);assert.equal(f.calls[0][3].replyTo,'reply@example.test');assert.equal(f.locked(),false);
});
test('same attempt never resends accepted notifications',()=>{
 const f=fixture();const first=f.post(valid()),again=f.post(valid());assert.deepEqual(again,first);assert.equal(f.calls.length,2);
});
test('GET is read-only and contains no contact fields',()=>{
 const f=fixture();f.post(valid());const before=JSON.stringify([...f.data]);
 const r=f.get({action:'receipt',request_id:requestId,receipt_key:receiptKey});assert.equal(JSON.parse(r.body).accepted,true);assert.equal(JSON.stringify([...f.data]),before);assert.equal(f.calls.length,2);
 for(const text of ['Contato de teste','98765','reply@example.test','Teste local'])assert.equal(r.body.includes(text),false);
 const stored=JSON.stringify([...f.data].filter(([k])=>k.startsWith('ROLIM_')));assert.equal(stored.includes(receiptKey),false);assert.equal(stored.includes('Contato de teste'),false);
});
test('missing or wrong key does not reveal receipt',()=>{
 const f=fixture();f.post(valid());for(const key of ['', 'b'.repeat(64)])assert.equal(JSON.parse(f.get({action:'receipt',request_id:requestId,receipt_key:key}).body).ok,false);
});
test('invalid data, missing consent, bot and malformed payload send no mail',()=>{
 for(const change of [{token:'wrong'},{consentimento:'0'},{whatsapp:'12345678'},{email:'not-email'},{nome:'bad\nheader'},{nome:'x'.repeat(121)},{website:'bot'},{mensagem:'x'.repeat(1501)},{page_url:'https://evil.example/'},{receipt_key:'bad'}]){
  const f=fixture();assert.equal(f.post({...valid(),...change}).ok,false,JSON.stringify(change));assert.equal(f.calls.length,0);
 }
 const f=fixture();assert.equal(JSON.parse(f.invoke('doPost',{postData:{contents:'{"invalid"'}}).body).ok,false);assert.equal(f.calls.length,0);
});
test('ambiguous failure on second recipient never resends either on retry',()=>{
 const f=fixture({throwAt:2});assert.equal(f.post(valid()).accepted,false);assert.deepEqual(f.receipt().recipients,['accepted','uncertain']);f.post(valid());assert.equal(f.calls.length,2);assert.equal(f.locked(),false);
});
test('storage failure before send sends nothing; after send remains unconfirmed without resend',()=>{
 const before=fixture({failWriteAt:1});assert.equal(before.post(valid()).ok,false);assert.equal(before.calls.length,0);
 const after=fixture({failWriteAt:3});assert.equal(after.post(valid()).ok,false);assert.equal(after.calls.length,1);after.post(valid());assert.equal(after.calls.length,1);assert.equal(after.receipt().recipients[0],'sending');
});
test('request ID cannot be reused with different contents or key',()=>{
 const f=fixture();f.post(valid());assert.equal(f.post({...valid(),mensagem:'different'}).ok,false);assert.equal(f.post({...valid(),receipt_key:'b'.repeat(64)}).ok,false);assert.equal(f.calls.length,2);
});
test('concurrent lock contention does not send',()=>{
 const f=fixture({busy:true});assert.equal(f.post(valid()).status,'busy');assert.equal(f.calls.length,0);
});
test('JSONP callback is restricted; response remains non-personal',()=>{
 const f=fixture();f.post(valid());
 const good=f.get({action:'receipt',request_id:requestId,receipt_key:receiptKey,callback:'rolimReceipt_'+'a'.repeat(24)});assert.equal(good.mime,'javascript');assert.match(good.body,/^typeof rolimReceipt_/);
 const attack=f.get({action:'receipt',request_id:requestId,receipt_key:receiptKey,callback:'alert(1)//'});assert.equal(attack.mime,'json');assert.equal(attack.body.includes('alert'),false);
});
test('expired receipt cannot confirm; expired entries are cleaned on new request',()=>{
 const f=fixture();f.post(valid());const r=f.receipt();r.created_at=Date.now()-49*3600*1000;f.data.set('ROLIM_RECEIPT_V1_'+requestId,JSON.stringify(r));
 assert.equal(JSON.parse(f.get({action:'receipt',request_id:requestId,receipt_key:receiptKey}).body).ok,false);
 const p=valid();p.request_id='87654321-1234-4234-8234-123456789abc';f.post(p);assert.equal(f.data.has('ROLIM_RECEIPT_V1_'+requestId),false);
});
test('JSON and URL-encoded request bodies are supported',()=>{
 for(const body of [JSON.stringify(valid()),new URLSearchParams(valid()).toString()]){
  const f=fixture();assert.equal(JSON.parse(f.invoke('doPost',{postData:{contents:body}}).body).accepted,true);assert.equal(f.calls.length,2);
 }
});
