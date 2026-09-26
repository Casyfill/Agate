import * as vl from 'vega-lite';
const warns=[]; const logger={level(){return this},warn(...a){warns.push(a.join(' '));return this},info(){return this},debug(){return this},error(...a){warns.push('E '+a.join(' '));return this}};
const rows=[{note:{genre:'a',rating:3}}];
const s1 = vl.compile({data:{name:'base', values: rows}, mark:'bar', encoding:{y:{field:'note.genre',type:'nominal'}, x:{aggregate:'mean',field:'note.rating',type:'quantitative'}}, width:'container', height:{step:28}},{logger}).spec;
console.log('names with values:', s1.data.map(d=>d.name), 'autosize', JSON.stringify(s1.autosize), 'warns', warns);
warns.length=0;
const s2 = vl.compile({data:{name:'base', values: rows}, mark:'bar', encoding:{y:{field:'note.genre',type:'nominal'}, x:{aggregate:'mean',field:'note.rating',type:'quantitative'}}, width:'container', height:{step:28}, autosize:{type:'fit-x',contains:'padding'}},{logger}).spec;
console.log('with fit-x: autosize', JSON.stringify(s2.autosize), 'warns', warns);
