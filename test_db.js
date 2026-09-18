const {Client}=require('./node_modules/pg/lib/index.js');
const c=new Client({host:'localhost',port:5432,user:'postgres',password:'Antonio0108Andria',database:'educore'});
c.connect().then(async ()=>{
  const cls=await c.query('select id,name,"etablissementId" from classe');
  console.log('classes',cls.rows.slice(0,5));
  const niv=await c.query('select id,name,"classeId" from niveau limit 10');
  console.log('niveaux',niv.rows);
  const emp=await c.query('select id, "startTime", "endTime", "matiereId", "classeId", "niveauId", "etablissementId" from emploi_du_temp limit 5');
  console.log('emploi',emp.rows);
  const etu=await c.query('select id, "firstName", "lastName", "classeId", "niveauId" from etudiant limit 5');
  console.log('etudiants',etu.rows);
  const pres=await c.query('select id, status, date, "demiJournee", "classeId", "niveauId", "emploiDuTempId" from presence limit 5');
  console.log('presence',pres.rows);
  const etab=await c.query('select id,name,email,visible from etablissement');
  console.log('etab',etab.rows);
}).catch(e=>console.error(e)).finally(()=>c.end());
