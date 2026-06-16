import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Préfixe global
  app.setGlobalPrefix('api');

  app.enableCors();

  // Servir les fichiers statiques (photos de profil, etc.)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(new TenantInterceptor());

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Educore API')
    .setDescription(
      "Documentation de l'API de gestion universitaire multi-établissement",
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification et gestion des comptes')
    .addTag('users', 'Gestion des utilisateurs et profils')
    .addTag('etudiants', 'Gestion des étudiants et pré-inscriptions')
    .addTag('enseignants', 'Gestion du corps enseignant')
    .addTag('parents', 'Gestion des parents d’élèves')
    .addTag('etablissement', 'Gestion des établissements (Tenants)')
    .addTag('niveau', 'Niveaux d’études (L1, L2, etc.)')
    .addTag('classe', 'Classes et cursus')
    .addTag('matiere', 'Matières et unités d’enseignement')
    .addTag('annee-universitaire', 'Années académiques')
    .addTag('semestre', 'Semestres')
    .addTag('inscriptions', 'Inscriptions, réinscriptions et diplomation')
    .addTag('certificates', 'Génération de certificats et attestations')
    .addTag('bulletins', 'Notes et bulletins semestriels')
    .addTag('evaluation', 'Évaluations et examens')
    .addTag('note', 'Saisie des notes')
    .addTag('finance', 'Facturation, paiements et frais')
    .addTag('emploi-du-temps', 'Emploi du temps et planning')
    .addTag('salles', 'Gestion des salles de classe')
    .addTag('presence', 'Suivi des présences et absences')
    .addTag('sanctions', 'Mesures disciplinaires')
    .addTag('discipline', 'Règlements et consignes')
    .addTag('devoirs', 'Gestion des devoirs')
    .addTag('documents', 'GED - Gestion électronique de documents')
    .addTag('reporting', 'Rapports et statistiques')
    .addTag('student-dashboard', 'Tableau de bord étudiant')
    .addTag('parent-dashboard', 'Tableau de bord parent')
    .addTag('life-dashboard', 'Tableau de bord vie scolaire')
    .addTag('global-settings', 'Configuration globale du système')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
