/** Planilha Financeira Nilta – Seta Soluções (v2)
 * 1) Na planilha: Extensões > Apps Script > cole este código > Salvar
 * 2) Rode "configurar" uma vez (autorize)
 * 3) Implantar > Gerenciar implantações > editar > Nova versão > Implantar
 *    (Executar como: Eu | Acesso: Qualquer pessoa)
 */
var ID = '1xDDXgHOJBcoQDhE1AJcOtSvrTkK3votsfjgM66FfxiE';
var CAB = ['Data','Bruto','Combustível','Tipo','Litros','Viagens','Km','Parcela/dia','Manutenção/dia','Documentos/dia','Seguro/dia','Fixos/dia','Lucro líquido','Por viagem','Mensagem','Registrado em'];

function ss_(){ return SpreadsheetApp.openById(ID); }

function configurar(){
  var ss = ss_(), v = '#0b5d3b', R = '"R$ "#,##0.00';
  var l = ss.getSheetByName('Lancamentos') || ss.insertSheet('Lancamentos');
  l.getRange(1,1,1,CAB.length).setValues([CAB]).setBackground(v).setFontColor('#fff').setFontWeight('bold');
  l.setFrozenRows(1);
  l.getRange('A:A').setNumberFormat('dd/mm/yyyy');
  ['B','C','H','I','J','K','L','M','N'].forEach(function(c){ l.getRange(c+':'+c).setNumberFormat(R); });
  l.getRange('B1:N1').setNumberFormat('@');

  var c = ss.getSheetByName('Custos') || ss.insertSheet('Custos');
  if (!c.getRange('A1').getValue()) {
    c.getRange('A1:B6').setValues([['Custo mensal','Valor'],['Parcela Onix',3223.60],['Manutenção',250],['Documentos (IPVA+licenc./12)',225],['Seguro',300],['Dias de trabalho no mês',26]]);
    c.getRange('A1:B1').setBackground(v).setFontColor('#fff').setFontWeight('bold');
    c.getRange('B2:B5').setNumberFormat(R); c.setColumnWidth(1,260);
  }

  var p = ss.getSheetByName('Painel') || ss.insertSheet('Painel', 0);
  p.clear();
  var L = 'Lancamentos!';
  p.getRange('A1').setValue('Painel da Nilta').setFontSize(16).setFontWeight('bold').setFontColor(v);
  p.getRange('A3:B14').setValues([
    ['Dias lançados', '=COUNTA('+L+'A2:A)'],
    ['Bruto total', '=SUM('+L+'B2:B)'],
    ['Combustível total', '=SUM('+L+'C2:C)'],
    ['Lucro líquido total', '=SUM('+L+'M2:M)'],
    ['Média bruta por dia', '=IFERROR(AVERAGE('+L+'B2:B),0)'],
    ['Média lucro por dia', '=IFERROR(AVERAGE('+L+'M2:M),0)'],
    ['Média viagens por dia', '=IFERROR(AVERAGE('+L+'F2:F),0)'],
    ['Ganho bruto por viagem', '=IFERROR(B4/SUM('+L+'F2:F),0)'],
    ['% do bruto em combustível', '=IFERROR(B5/B4,0)'],
    ['% do bruto que vira lucro', '=IFERROR(B6/B4,0)'],
    ['Lucro dos últimos 7 lançamentos', '=IFERROR(SUM(QUERY('+L+'A2:M,"select M where A is not null order by A desc limit 7",0)),0)'],
    ['Meta bruta mínima por dia (empatar)', '=SUM(Custos!B2:B5)/Custos!B6+IFERROR(B5/B3,0)']
  ]);
  p.getRange('B4:B10').setNumberFormat(R); p.getRange('B9').setNumberFormat('0.0');
  p.getRange('B10').setNumberFormat(R); p.getRange('B11:B12').setNumberFormat('0%');
  p.getRange('B13:B14').setNumberFormat(R); p.setColumnWidth(1,280); p.setColumnWidth(2,140);
  return 'ok';
}

function custos_(){
  var c = ss_().getSheetByName('Custos').getRange('B2:B6').getValues().map(function(r){return Number(r[0])||0;});
  var d = c[4] || 26;
  return {parcela:c[0]/d, manut:c[1]/d, docs:c[2]/d, seguro:c[3]/d};
}

function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Recebe lançamento do HTML (POST text/plain com JSON) */
function doPost(e){
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = ss_(), l = ss.getSheetByName('Lancamentos');
    if (!l) { configurar(); l = ss.getSheetByName('Lancamentos'); }
    var k = custos_(), fix = k.parcela + k.manut + k.docs + k.seguro;
    var bruto = +d.bruto||0, comb = +d.combustivel||0, via = +d.viagens||0;
    var lucro = bruto - comb - fix;
    var p = d.data.split('-'), data = new Date(p[0], p[1]-1, p[2]);
    var row = [data,bruto,comb,d.tipo||'',+d.litros||'',via,+d.km||'',k.parcela,k.manut,k.docs,k.seguro,fix,lucro,via?bruto/via:0,d.mensagem||'',new Date()];
    // Se já existe a data, substitui (evita duplicar)
    var datas = l.getRange(2,1,Math.max(l.getLastRow()-1,1),1).getValues();
    var alvo = -1;
    for (var i=0;i<datas.length;i++){ if (datas[i][0] instanceof Date && datas[i][0].toDateString()===data.toDateString()) { alvo=i+2; break; } }
    if (alvo>0) l.getRange(alvo,1,1,row.length).setValues([row]); else l.appendRow(row);
    return json_({ok:true, lucro:lucro, fixos:fix});
  } catch(err) { return json_({ok:false, erro:String(err)}); }
}

/** Devolve custos e histórico para o HTML */
function doGet(){
  try {
    var ss = ss_(), l = ss.getSheetByName('Lancamentos');
    var hist = [];
    if (l && l.getLastRow()>1) {
      hist = l.getRange(2,1,l.getLastRow()-1,7).getValues().filter(function(r){return r[0];}).map(function(r){
        return {data:Utilities.formatDate(new Date(r[0]),'America/Sao_Paulo','yyyy-MM-dd'),bruto:r[1],combustivel:r[2],tipo:r[3],litros:r[4],viagens:r[5],km:r[6]};
      });
    }
    var c = ss.getSheetByName('Custos') ? ss.getSheetByName('Custos').getRange('B2:B6').getValues() : [[3223.6],[250],[225],[300],[26]];
    return json_({ok:true, custos:{parcela:c[0][0],manut:c[1][0],docs:c[2][0],seguro:c[3][0],dias:c[4][0]}, historico:hist});
  } catch(err) { return json_({ok:false, erro:String(err)}); }
}
