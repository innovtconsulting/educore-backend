import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TenantResolutionInterceptor } from './common/interceptors/tenant-resolution.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EtablissementModule } from './etablissement/etablissement.module';
import { Etablissement } from './etablissement/entities/etablissement.entity';
import { ClasseModule } from './classe/classe.module';
import { Classe } from './classe/entities/classe.entity';
import { NiveauModule } from './niveau/niveau.module';
import { Niveau } from './niveau/entities/niveau.entity';
import { MatiereModule } from './matiere/matiere.module';
import { Matiere } from './matiere/entities/matiere.entity';
import { EnseignantModule } from './enseignant/enseignant.module';
import { Enseignant } from './enseignant/entities/enseignant.entity';
import { Affectation } from './enseignant/entities/affectation.entity';
import { EmploiDuTempsModule } from './emploi-du-temps/emploi-du-temps.module';
import { EmploiDuTemp } from './emploi-du-temps/entities/emploi-du-temp.entity';
import { EtudiantModule } from './etudiant/etudiant.module';
import { Etudiant } from './etudiant/entities/etudiant.entity';
import { ParentModule } from './parent/parent.module';
import { Parent } from './parent/entities/parent.entity';
import { PresenceModule } from './presence/presence.module';
import { Presence } from './presence/entities/presence.entity';
import { SanctionModule } from './sanction/sanction.module';
import { Sanction } from './sanction/entities/sanction.entity';
import { DailyReport } from './reporting/entities/daily-report.entity';
import { GeneratedDocument } from './certificate/entities/generated-document.entity';
import { Document } from './document/entities/document.entity';
import { AnneeUniversitaire } from './annee-universitaire/entities/annee-universitaire.entity';
import { Semestre } from './semestre/entities/semestre.entity';
import { Evaluation } from './evaluation/entities/evaluation.entity';
import { Note } from './note/entities/note.entity';
import { FinanceModule } from './finance/finance.module';
import { Frais } from './finance/entities/frais.entity';
import { Facture } from './finance/entities/facture.entity';
import { Paiement } from './finance/entities/paiement.entity';
import { Depense } from './finance/entities/depense.entity';
import { Discipline } from './discipline/entities/discipline.entity';
import { User } from './user/entities/user.entity';
import { Devoir } from './devoir/entities/devoir.entity';
import { GlobalSetting } from './global-setting/entities/global-setting.entity';
import { Submission } from './devoir/entities/submission.entity';
import { Salle } from './salle/entities/salle.entity';
import { Inscription } from './etudiant/entities/inscription.entity';
import { Role as AclRole } from './acl/entities/role.entity';
import { Permission as AclPermission } from './acl/entities/permission.entity';
import { ReportingModule } from './reporting/reporting.module';
import { DocumentModule } from './document/document.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { SemestreModule } from './semestre/semestre.module';
import { NoteModule } from './note/note.module';
import { BulletinModule } from './bulletin/bulletin.module';
import { AnneeUniversitaireModule } from './annee-universitaire/annee-universitaire.module';
import { DisciplineModule } from './discipline/discipline.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DevoirModule } from './devoir/devoir.module';
import { StudentDashboardModule } from './student-dashboard/student-dashboard.module';
import { ParentDashboardModule } from './parent-dashboard/parent-dashboard.module';
import { LifeDashboardModule } from './life-dashboard/life-dashboard.module';
import { MailModule } from './mail/mail.module';
import { GlobalSettingModule } from './global-setting/global-setting.module';
import { CertificateModule } from './certificate/certificate.module';
import { SalleModule } from './salle/salle.module';
import { InscriptionModule } from './inscription/inscription.module';
import { AclModule } from './acl/acl.module';
import { AnnonceModule } from './annonce/annonce.module';
import { Annonce } from './annonce/entities/annonce.entity';
import { NotificationTokenModule } from './notification-token/notification-token.module';
import { NotificationToken } from './notification-token/entities/notification-token.entity';
import { SiteStageModule } from './site-stage/site-stage.module';
import { SiteStage } from './site-stage/entities/site-stage.entity';
import { PeriodeStage } from './site-stage/entities/periode-stage.entity';
import { AffectationStage } from './site-stage/entities/affectation-stage.entity';
import { NatureStage } from './site-stage/entities/nature-stage.entity';
import { SharedModule } from './shared/shared.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/entities/notification.entity';
import { PersonnelModule } from './personnel/personnel.module';
import { Personnel } from './personnel/entities/personnel.entity';
import { PaiePersonnel } from './personnel/entities/paie-personnel.entity';
import { JournalModule } from './journal/journal.module';
import { Journal } from './journal/entities/journal.entity';
import { JournalHistory } from './journal/entities/journal-history.entity';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [
        AclRole,
        AclPermission,
        Etablissement,
        Niveau,
        Classe,
        Matiere,
        Enseignant,
        Affectation,
        EmploiDuTemp,
        Etudiant,
        Parent,
        Presence,
        Sanction,
        DailyReport,
        GeneratedDocument,
        Document,
        AnneeUniversitaire,
        Semestre,
        Evaluation,
        Note,
        Frais,
        Facture,
        Paiement,
        Depense,
        Discipline,
        User,
        Devoir,
        Submission,
        Salle,
        Inscription,
        GlobalSetting,
        Annonce,
        NotificationToken,
        Notification,
        SiteStage,
        PeriodeStage,
        AffectationStage,
        NatureStage,
        Personnel,
        PaiePersonnel,
        Journal,
        JournalHistory,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl:
        process.env.DB_HOST === 'localhost' || !process.env.DATABASE_URL
          ? false
          : { rejectUnauthorized: false },
    }),
    EtablissementModule,
    ClasseModule,
    NiveauModule,
    MatiereModule,
    EnseignantModule,
    EmploiDuTempsModule,
    EtudiantModule,
    ParentModule,
    PresenceModule,
    SanctionModule,
    FinanceModule,
    ReportingModule,
    DocumentModule,
    EvaluationsModule,
    SemestreModule,
    NoteModule,
    BulletinModule,
    AnneeUniversitaireModule,
    DisciplineModule,
    UserModule,
    AuthModule,
    DevoirModule,
    StudentDashboardModule,
    ParentDashboardModule,
    LifeDashboardModule,
    MailModule,
    GlobalSettingModule,
    CertificateModule,
    SalleModule,
    InscriptionModule,
    AclModule,
    AnnonceModule,
    NotificationTokenModule,
    NotificationsModule,
    SiteStageModule,
    PersonnelModule,
    SharedModule,
    JournalModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TenantResolutionInterceptor },
  ],
})
export class AppModule {}
