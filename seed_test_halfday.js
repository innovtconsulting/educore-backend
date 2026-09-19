const {Client}=require('./node_modules/pg/lib/index.js');
const c=new Client({host:'localhost',port:5432,user:'postgres',password:'Antonio0108Andria',database:'educore'});
c.connect().then(async ()=>{
  // ensure Cherubin visible false
  await c.query('update etablissement set visible=false where id=2');
  console.log('cherubin visible false done');
  // create Futura if not exists
  let futura = await c.query("select id from etablissement where email='contact@futura.test'");
  let futuraId;
  if(futura.rows.length===0){
    const res=await c.query("insert into etablissement (name,address,email,phone,visible) values ('FUTURA','Antananarivo','contact@futura.test','+261340000000',false) returning id");
    futuraId=res.rows[0].id;
    console.log('futura created',futuraId);
  } else { futuraId=futura.rows[0].id; console.log('futura exists',futuraId); }

  // create classe for Cherubin if none
  let clsCher=await c.query('select id from classe where "etablissementId"=2 limit 1');
  let classeId;
  if(clsCher.rows.length===0){
    const res=await c.query('insert into classe (name,"etablissementId") values (\'CP\',2) returning id');
    classeId=res.rows[0].id;
    console.log('classe CP cherubin',classeId);
  } else classeId=clsCher.rows[0].id;

  let nivCher=await c.query('select id from niveau where "classeId"=$1 limit 1',[classeId]);
  let niveauId;
  if(nivCher.rows.length===0){
    const res=await c.query('insert into niveau (name,"classeId","etablissementId") values (\'A\',$1,2) returning id',[classeId]);
    niveauId=res.rows[0].id;
    console.log('niveau A cherubin',niveauId);
  } else niveauId=nivCher.rows[0].id;

  // create etudiant for Cherubin if none
  let etu=await c.query('select id from etudiant where "classeId"=$1 limit 1',[classeId]);
  if(etu.rows.length===0){
    await c.query('insert into etudiant ("firstName","lastName","matricule","classeId","niveauId","etablissementId","status") values (\'Test\',\'Eleve Cherubin\',\'CH-001\',$1,$2,2,\'Actif\')',[classeId,niveauId]);
    console.log('etudiant cherubin créé');
  }

  // same for Futura
  let clsFut=await c.query('select id from classe where "etablissementId"=$1 limit 1',[futuraId]);
  let classeFutId;
  if(clsFut.rows.length===0){
    const res=await c.query('insert into classe (name,"etablissementId") values (\'CP\',$1) returning id',[futuraId]);
    classeFutId=res.rows[0].id;
    console.log('classe CP futura',classeFutId);
  } else classeFutId=clsFut.rows[0].id;
  let nivFut=await c.query('select id from niveau where "classeId"=$1 limit 1',[classeFutId]);
  let niveauFutId;
  if(nivFut.rows.length===0){
    const res=await c.query('insert into niveau (name,"classeId","etablissementId") values (\'A\',$1,$2) returning id',[classeFutId,futuraId]);
    niveauFutId=res.rows[0].id;
    console.log('niveau A futura',niveauFutId);
  } else niveauFutId=nivFut.rows[0].id;

  let etuFut=await c.query('select id from etudiant where "classeId"=$1 limit 1',[classeFutId]);
  if(etuFut.rows.length===0){
    await c.query('insert into etudiant ("firstName","lastName","matricule","classeId","niveauId","etablissementId","status") values (\'Test\',\'Eleve Futura\',\'FU-001\',$1,$2,$3,\'Actif\')',[classeFutId,niveauFutId,futuraId]);
    console.log('etudiant futura créé');
  }

  // check counts
  const chk=await c.query('select etablissement.name, count(classe.id) as classes from etablissement left join classe on classe."etablissementId"=etablissement.id group by etablissement.id, etablissement.name');
  console.log(chk.rows);

  // create emploi_du_temp for ESPM to test normal presence (need matiere, enseignant, salle)
  // check if any matiere exists
  let mat=await c.query('select id from matiere limit 1');
  let matId = mat.rows[0]?.id;
  let ens=await c.query('select id from enseignant limit 1');
  let ensId = ens.rows[0]?.id;
  console.log('matiere',matId,'enseignant',ensId);
  if(matId && ensId){
    // create one emploi for today for ESPM classe 1 niveau 1
    const now=new Date();
    const start=new Date(now); start.setHours(8,0,0,0);
    const end=new Date(now); end.setHours(10,0,0,0);
    const exists=await c.query('select id from emploi_du_temp where "classeId"=1 and "niveauId"=1 limit 1');
    if(exists.rows.length===0){
      await c.query('insert into emploi_du_temp ("startTime","endTime","matiereId","enseignantId","etablissementId","classeId","niveauId",type) values ($1,$2,$3,$4,1,1,1,\'Cours\')',[start.toISOString(), end.toISOString(), matId, ensId]);
      console.log('emploi créé pour ESPM');
    } else console.log('emploi déjà existe',exists.rows[0].id);
  }

  // test halfday presence insert directly
  const etuCher=await c.query('select id from etudiant where "etablissementId"=2 limit 1');
  const etuCherId=etuCher.rows[0].id;
  const today=new Date().toISOString().split('T')[0];
  // try insert presence halfday
  await c.query('delete from presence where date=$1 and "demiJournee"=\'MATIN\' and "etablissementId"=2',[today]);
  await c.query('insert into presence (status, "etudiantId","etablissementId","classeId","niveauId",date,"demiJournee") values (\'Présent\',$1,2,$2,$3,$4,\'MATIN\')',[etuCherId, classeId, niveauId, today]);
  console.log('halfday presence inserted cherubin',today);
  const half=await c.query('select status,date,"demiJournee", "classeId" from presence where "etablissementId"=2');
  console.log('halfday rows',half.rows);

  // test halfday for Futura
  const etuF=await c.query('select id from etudiant where "etablissementId"=$1 limit 1',[futuraId]);
  if(etuF.rows.length>0){
    await c.query('delete from presence where date=$1 and "demiJournee"=\'APRES_MIDI\' and "etablissementId"=$2',[today,futuraId]);
    await c.query('insert into presence (status, "etudiantId","etablissementId","classeId","niveauId",date,"demiJournee") values (\'Absent\',$1,$2,$3,$4,$5,\'APRES_MIDI\')',[etuF.rows[0].id, futuraId, classeFutId, niveauFutId, today]);
    console.log('halfday futura inserted');
  }

}).catch(e=>console.error(e)).finally(()=>c.end());
