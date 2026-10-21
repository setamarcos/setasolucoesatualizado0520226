/** Planilha Financeira – Nilta (Seta Soluções)
 * Como usar: Extensões > Apps Script > cole este código > Salvar > rode criarPlanilhaNilta
 */
function onOpen(){SpreadsheetApp.getUi().createMenu('Nilta').addItem('Criar/Recriar planilha','criarPlanilhaNilta').addToUi();}

function criarPlanilhaNilta(){
  var ss=SpreadsheetApp.getActive(), R='"R$ "#,##0.00', verde='#0b5d3b';
  function aba(n){var s=ss.getSheetByName(n); if(s) ss.deleteSheet(s); return ss.insertSheet(n);}
  if(ss.getSheets().length===1 && ss.getSheets()[0].getName()!=='Painel') ss.getSheets()[0].setName('tmp');
  function cab(s,r){s.getRange(r).setBackground(verde).setFontColor('#fff').setFontWeight('bold');}

  var c=aba('Custos');
  c.getRange('A1:B1').setValues([['Custo fixo mensal','Valor']]);
  c.getRange('A2:B7').setValues([['Parcela Onix',3223.60],['Seguro',300],['IPVA + licenciamento (anual/12)',225],['Manutenção (revisão, pneus, óleo)',250],['Outros (celular, internet, lavagem)',0],['TOTAL','=SUM(B2:B6)']]);
  c.getRange('B2:B7').setNumberFormat(R); c.getRange('A7:B7').setFontWeight('bold'); cab(c,'A1:B1'); c.setColumnWidth(1,300);

  var m=aba('Metas');
  m.getRange('A1:B1').setValues([['Meta','Valor']]);
  m.getRange('A2:B9').setValues([
    ['Dinheiro que quero para casa (mês)',4000],
    ['% do faturamento em combustível',0.25],
    ['Dias trabalhados no mês',30],
    ['Reserva de emergência (meta)','=Custos!B2*2'],
    ['Separar para o carro por dia','=Custos!B7/B4'],
    ['Faturamento necessário no mês','=(Custos!B7+B2)/(1-B3)'],
    ['META DE FATURAMENTO POR DIA','=B7/B4'],
    ['Meta por semana','=B8*B4/4.33']]);
  m.getRange('B2').setNumberFormat(R); m.getRange('B3').setNumberFormat('0%');
  m.getRange('B5:B9').setNumberFormat(R); m.getRange('A8:B8').setFontWeight('bold').setBackground('#fff3c4');
  cab(m,'A1:B1'); m.setColumnWidth(1,300); m.getRange('B2:B4').setFontColor('#1a4fd6');

  var l=aba('Lançamentos');
  l.getRange('A1:I1').setValues([['Data','Ganho app','Gorjeta/extra','Km rodado','Horas','Combustível','Outros gastos','Lucro do dia','R$ por hora']]);
  cab(l,'A1:I1'); l.setFrozenRows(1);
  for(var i=2;i<=400;i++){l.getRange('H'+i).setFormula('=IF(A'+i+'="","",B'+i+'+C'+i+'-F'+i+'-G'+i+'-Metas!$B$6)');
    l.getRange('I'+i).setFormula('=IF(OR(A'+i+'="",E'+i+'=0),"",(B'+i+'+C'+i+')/E'+i+')');}
  l.getRange('A2:A400').setNumberFormat('dd/mm/yyyy');
  l.getRange('B2:C400').setNumberFormat(R); l.getRange('F2:I400').setNumberFormat(R);

  var p=aba('Painel');
  p.getRange('A1').setValue('PAINEL DO MÊS – NILTA').setFontSize(16).setFontWeight('bold').setFontColor(verde);
  p.getRange('A2:B2').setValues([['Mês (1º dia)','=DATE(YEAR(TODAY()),MONTH(TODAY()),1)']]); p.getRange('B2').setNumberFormat('mm/yyyy').setFontColor('#1a4fd6');
  var ini='Lançamentos!A:A,">="&B2,Lançamentos!A:A,"<"&EDATE(B2,1)';
  p.getRange('A4:B13').setValues([
    ['Faturamento do mês','=SUMIFS(Lançamentos!B:B,'+ini+')+SUMIFS(Lançamentos!C:C,'+ini+')'],
    ['Combustível','=SUMIFS(Lançamentos!F:F,'+ini+')'],
    ['Outros gastos','=SUMIFS(Lançamentos!G:G,'+ini+')'],
    ['Custo fixo do carro','=Custos!B7'],
    ['SOBRA PARA CASA','=B4-B5-B6-B7'],
    ['Dias trabalhados','=COUNTIFS('+ini+')'],
    ['Média por dia','=IFERROR(B4/B9,0)'],
    ['Meta por dia','=Metas!B8'],
    ['Km rodados','=SUMIFS(Lançamentos!D:D,'+ini+')'],
    ['Situação','=IF(B10>=B11,"✅ Na meta","⚠️ Abaixo da meta")']]);
  p.getRange('B4:B8').setNumberFormat(R); p.getRange('B10:B11').setNumberFormat(R);
  p.getRange('A8:B8').setFontWeight('bold').setBackground('#e3f3ea'); p.setColumnWidth(1,240); p.setColumnWidth(2,160);
  p.getRange('A15').setValue('3 potes por dia: 1) Carro  2) Reserva 10%  3) Casa. Tire 1 folga por semana.');

  var a=aba('Instruções');
  a.getRange('A1:A7').setValues([['COMO USAR'],['1. Ajuste os valores reais na aba Custos.'],['2. Ajuste suas metas na aba Metas (números em azul).'],['3. Todo dia, preencha uma linha na aba Lançamentos.'],['4. Veja o resultado na aba Painel.'],['5. Mude o mês no Painel (célula B2) para ver meses anteriores.'],['Seta Soluções – www.setasolucoes.com.br/nilta']]);
  a.getRange('A1').setFontWeight('bold'); a.setColumnWidth(1,500);

  var t=ss.getSheetByName('tmp'); if(t) ss.deleteSheet(t);
  ['Painel','Lançamentos','Metas','Custos','Instruções'].forEach(function(n,i){ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i+1);});
  ss.setActiveSheet(p);
}
