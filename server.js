import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';

const PORT=Number(process.env.PORT||3080);
const API=(process.env.BAILEYS_BASE_URL||'').replace(/\/$/,'');
const KEY=process.env.BAILEYS_API_KEY||'';
const PASSWORD=process.env.DASHBOARD_PASSWORD||'';
const SECRET=process.env.WEBHOOK_SECRET||'';
const PUBLIC_URL=(process.env.PUBLIC_URL||'').replace(/\/$/,'');
if(!API || !KEY || PASSWORD.length<12 || SECRET.length<20 || !PUBLIC_URL || !/^https?:\/\/[^/]+$/.test(PUBLIC_URL)){
 console.error('Configure BAILEYS_BASE_URL, BAILEYS_API_KEY, DASHBOARD_PASSWORD (12+), WEBHOOK_SECRET (20+), PUBLIC_URL');process.exit(1);
}
const here=path.dirname(fileURLToPath(import.meta.url));
let currentNumber=''; let qr=''; let status='Non connecté'; let lastEvent=''; let qrAt=0;
const isPhone=s=>/^\+\d{5,15}$/.test(s);
const equal=(a,b)=>{const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
const safeRead=async(req,max=20_000)=>{let n=0;let chunks=[];for await(const c of req){n+=c.length;if(n>max)throw new Error('Payload too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))};
const origin=(req)=>req.headers.origin; const url=(req)=>new URL(req.url,'http://localhost');
async function callBaileys(method,p,data){const controller=new AbortController();const t=setTimeout(()=>controller.abort(),25000);try{const r=await fetch(API+p,{method,headers:{'x-api-key':KEY,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal});const raw=await r.text();let parsed;try{parsed=raw?JSON.parse(raw):null}catch{parsed={message:raw.slice(0,500)}};return {ok:r.ok,status:r.status,body:parsed}}finally{clearTimeout(t)}}
const server=http.createServer(async(req,res)=>{
 try{
 const u=url(req),p=u.pathname;
 if(p==='/health'){return json(res,200,{ok:true})}
 if(p===`/hook/${SECRET}` && req.method==='POST'){
  const b=await safeRead(req,3_000_000);
  if(!equal(String(b.webhookVerifyToken||''),SECRET))return json(res,403,{error:'Invalid webhook token'});
  if(b.event==='connection.update'){
   const d=b.data||{};lastEvent=new Date().toISOString();
   if(typeof d.connection==='string')status=d.connection;
   if(typeof d.qrDataUrl==='string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.qrDataUrl) && d.qrDataUrl.length<200000){qr=d.qrDataUrl;qrAt=Date.now();}
   if(d.connection==='open'){qr='';qrAt=0;}
   if(d.connection==='close'){qr='';qrAt=0;}
  }
  return json(res,200,{ok:true});
 }
 const auth=req.headers.authorization||'';
 const given=auth.startsWith('Basic ')?Buffer.from(auth.slice(6),'base64').toString('utf8').split(':').slice(1).join(':'):'';
 if(!equal(given,PASSWORD)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Baileys Dashboard"','Cache-Control':'no-store'});return res.end('Authentification requise')}
 if(req.method==='GET'&&p==='/'){const html=await readFile(path.join(here,'public','index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});return res.end(html)}
 if(req.method==='GET'&&p==='/app.js'){const js=await readFile(path.join(here,'public','app.js'));res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(js)}
 if(p.startsWith('/api/')){
  if(req.method!=='GET' && origin(req) && origin(req)!==PUBLIC_URL)return json(res,403,{error:'Origine refusée'});
  if(req.method==='GET'&&p==='/api/state')return json(res,200,{phone:currentNumber,status,lastEvent,qr:qrAt && Date.now()-qrAt < 55000 ? qr:null,qrAge:qrAt?Date.now()-qrAt:null});
  if(req.method==='GET'&&p==='/api/check'){const result=await callBaileys('GET','/status/auth');return json(res,result.status,{ok:result.ok,result:result.body})}
  if(req.method==='POST'&&p==='/api/connect'){
   const b=await safeRead(req);if(!isPhone(b.phone))return json(res,400,{error:'Numéro invalide. Format +212...'});
   currentNumber=b.phone;qr='';qrAt=0;status='connecting';
   const result=await callBaileys('POST','/connections/'+encodeURIComponent(b.phone),{
    clientName:'Baileys Dashboard',webhookUrl:`${PUBLIC_URL}/hook/${SECRET}`,webhookVerifyToken:SECRET,
    includeMedia:false,syncFullHistory:false,groupsEnabled:false,autoPresenceSubscribe:false});
   return json(res,result.status,{ok:result.ok,result:result.body,info:result.ok?'Session initialisée. QR attendu via webhook.':'Impossible d’initialiser.'});
  }
  if(req.method==='POST'&&p==='/api/send'){
   const b=await safeRead(req);if(!isPhone(b.phone)||!isPhone(b.to)||typeof b.message!=='string'||!b.message.trim()||b.message.length>3000)return json(res,400,{error:'Vérifie les numéros et le message.'});
   const result=await callBaileys('POST','/connections/'+encodeURIComponent(b.phone)+'/send-message',{jid:b.to.slice(1)+'@s.whatsapp.net',messageContent:{text:b.message}});
   return json(res,result.status,{ok:result.ok,result:result.body,info:result.ok?'Message accepté par Baileys.':'Échec de l’envoi.'});
  }
  if(req.method==='POST'&&p==='/api/disconnect'){
   const b=await safeRead(req);if(!isPhone(b.phone)||b.confirm!=='DECONNECTER')return json(res,400,{error:'Confirmation requise'});
   const result=await callBaileys('DELETE','/connections/'+encodeURIComponent(b.phone));
   if(result.ok){qr='';status='Déconnecté';}
   return json(res,result.status,{ok:result.ok,result:result.body});
  }
 }
 return json(res,404,{error:'Route inconnue'});
 }catch(e){console.error('Request error:',e.message);return json(res,500,{error:e.message==='Payload too large'?e.message:'Erreur serveur / API injoignable'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Dashboard running on ${PORT}`));
