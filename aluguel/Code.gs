const CONFIG = {
  SHEET_ID: '1sNozbCN6Uy2CIgkCDlr8XO4Fv2VlXHuy7ybFY1OQbdE',
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxTzA1NS5Djj5334MBhe6bXEbRXBQqGg5D51nafUSRZWLbdKOCJhArfND4GyyoRpaG9/exec'
};

const H = {
  'Prospeccao B2B':['Empresa','Região','Segmento','Contato','Prioridade','Melhor abordagem','Mensagem específica','Observação','Status'],
  'Divulgacao':['Canal','Modelo','Posicionamento','Prioridade','Melhor abordagem','Observação','Status','Link','Data da publicação','Próxima ação'],
  'Contatos':['Data','Empresa/Pessoa','Canal','Tipo','Resultado','Valor proposto','Retorno em','Observação'],
  'Imovel':['Chave','Valor'],
  'Fotos':['Imovel','Ambiente','URL','Legenda','Ordem','Ativa']
};

function doGet(e){init();const p=(e&&e.parameter)||{};return out(route(p),p.callback)}
function doPost(e){init();const p=(e&&e.parameter)||{};return out(route(p))}
function route(p){try{switch(p.action||'ping'){
case'ping':return ok({message:'API Casa Monte Sinai online'});
case'stats':return ok(stats());
case'getImovel':return ok(getImovel());
case'getPublic':return ok(getPublic());
case'saveImovel':return ok(saveImovel(JSON.parse(p.data||'{}')));
case'list':return ok(list(p.table));
case'insert':return ok(insert(p.table,JSON.parse(p.data||'{}')));
case'update':return ok(update(p.table,JSON.parse(p.data||'{}')));
case'delete':return ok(del(p.table,p.row));
default:throw Error('Ação inválida: '+p.action)}}catch(e){return{ok:false,error:e.message}}}
function ss(){return SpreadsheetApp.openById(CONFIG.SHEET_ID)}
function init(){const s=ss();Object.keys(H).forEach(n=>{let sh=s.getSheetByName(n)||s.insertSheet(n);if(sh.getLastRow()===0)sh.getRange(1,1,1,H[n].length).setValues([H[n]]);sh.setFrozenRows(1)})}
function list(t){if(!H[t])throw Error('Tabela inválida: '+t);const v=ss().getSheetByName(t).getDataRange().getDisplayValues();if(v.length<2)return[];return v.slice(1).map((r,i)=>{const o={_row:i+2};H[t].forEach((h,j)=>o[h]=r[j]||'');return o}).filter(o=>Object.keys(o).some(k=>k!='_row'&&o[k]!=''))}
function getImovel(){const rows=list('Imovel'),o={};rows.forEach(r=>{if(r.Chave)o[r.Chave]=r.Valor||''});const p={localizacao:'Monte Sinai, Esmeraldas/MG',tipo:'Casa mobiliada para locação temporária',quartos:'2',piscina:'10 x 4 m',lago:'5 x 10 m',area_lazer:'Churrasqueira + 2 mesas + banheiro externo',gramado:'Aproximadamente 50 m² + 200 m² no lote lateral',valor_mensal:'R$ 2.500',valor_quinzena:'R$ 1.600',estrategia_b2b:'Alojamento temporário de equipe de obra',estrategia_familia:'Casa mobiliada para estadia prolongada',titulo:'Casa Monte Sinai',whatsapp:'31984821901'};if(!o.localizacao){saveImovel(p);return p}if(!o.titulo)o.titulo='Casa Monte Sinai';if(!o.whatsapp)o.whatsapp='31984821901';return o}
function saveImovel(o){const sh=ss().getSheetByName('Imovel'),rows=sh.getDataRange().getValues(),m={};rows.slice(1).forEach((r,i)=>{if(r[0])m[String(r[0])]=i+2});Object.keys(o).forEach(k=>m[k]?sh.getRange(m[k],2).setValue(o[k]):sh.appendRow([k,o[k]]));return getImovel()}
function getPublic(){const i=getImovel(),fotos=list('Fotos').filter(x=>String(x.Ativa||'SIM').toUpperCase()!='NAO'&&(!x.Imovel||x.Imovel==i.titulo||x.Imovel==i.localizacao));return{titulo:i.titulo,localizacao:i.localizacao,tipo:i.tipo,quartos:i.quartos,piscina:i.piscina,lago:i.lago,area_lazer:i.area_lazer,gramado:i.gramado,valor_mensal:i.valor_mensal,valor_quinzena:i.valor_quinzena,descricao:i.descricao||'Casa mobiliada com estrutura de lazer e área externa para estadias por quinzena ou mês.',whatsapp:i.whatsapp||'31984821901',atualizado:Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Sao_Paulo','dd/MM/yyyy HH:mm'),fotos:fotos}}
function insert(t,o){if(!H[t])throw Error('Tabela inválida: '+t);const sh=ss().getSheetByName(t);sh.appendRow(H[t].map(h=>o[h]!==undefined?o[h]:''));return{saved:true,row:sh.getLastRow()}}
function update(t,o){if(!H[t]||Number(o._row)<2)throw Error('Dados inválidos');const sh=ss().getSheetByName(t),r=Number(o._row);sh.getRange(r,1,1,H[t].length).setValues([H[t].map(h=>o[h]!==undefined?o[h]:'')]);return{saved:true,row:r}}
function del(t,r){if(!H[t]||Number(r)<2)throw Error('Dados inválidos');ss().getSheetByName(t).deleteRow(Number(r));return{deleted:true}}
function stats(){const p=list('Prospeccao B2B');return{prospeccao:p.length,retornos:p.filter(x=>['Respondeu','Interessado','Negociando','Fechado'].includes(x.Status)).length,interessados:p.filter(x=>['Interessado','Negociando'].includes(x.Status)).length,fechados:p.filter(x=>x.Status==='Fechado').length}}
function ok(d){return{ok:true,data:d}}
function out(o,cb){const j=JSON.stringify(o);if(cb)return ContentService.createTextOutput(cb+'('+j+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(j).setMimeType(ContentService.MimeType.JSON)}
