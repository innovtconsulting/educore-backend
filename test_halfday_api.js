const {Client}=require('./node_modules/pg/lib/index.js');
const c=new Client({host:'localhost',port:5432,user:'postgres',password:'Antonio0108Andria',database:'educore'});
c.connect().then(async ()=>{
  // Test 1: emploi du temps for ESPM teacher schedule (should have 1)
  const emp=await c.query('select id, "startTime", "endTime", "classeId", "niveauId", "matiereId" from emploi_du_temp where "etablissementId"=1');
  console.log('TEST emploi_du_temp ESPM count:',emp.rows.length, emp.rows[0] ? 'OK' : 'EMPTY');

  // Test 2: halfday presence for Cherubin today
  const today=new Date().toISOString().split('T')[0];
  const halfCher=await c.query('select * from presence where "etablissementId"=2 and date=$1',[today]);
  console.log('TEST halfday Cherubin today',today,'count:',halfCher.rows.length, halfCher.rows.map(r=>r.demiJournee));

  // Test 3: halfday Futura
  const futId=(await c.query("select id from etablissement where name='FUTURA'")).rows[0].id;
  const halfFut=await c.query('select * from presence where "etablissementId"=$1 and date=$2', [futId, today]);
  console.log('TEST halfday Futura today', today, 'count:', halfFut.rows.length);

  // Test 4: etablissement visible filtering (superadmin)
  const visible=await c.query('select name,visible from etablissement where visible=true');
  console.log('TEST superadmin visible only:', visible.rows.map(r=>r.name), visible.rows.length===1?'OK':'FAIL');

  // Test 5: halfday sessions summary query (as service does)
  const qb=await c.query(`
    select date, "demiJournee", "classeId", count(*) as total
    from presence where date is not null group by date, "demiJournee", "classeId"
  `);
  console.log('TEST halfday groupBy', qb.rows);

  // Test 6: annee-label logic
  const isCherubin = (name)=> ['cherubin','futura'].some(k=> name.toLowerCase().includes(k));
  console.log('TEST isCherubin Cherubin', isCherubin('Cherubin'), 'FUTURA', isCherubin('FUTURA'), 'ESPM', isCherubin('ESPM'));

  console.log('ALL TESTS DONE');

}).catch(e=>console.error(e)).finally(()=>c.end());
