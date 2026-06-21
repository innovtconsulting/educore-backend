import { AppDataSource } from './src/data-source';
import { Presence } from './src/presence/entities/presence.entity';
import { EmploiDuTemp } from './src/emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from './src/etudiant/entities/etudiant.entity';
import { PresenceService } from './src/presence/presence.service';
import { TenantContext } from './src/common/tenant/tenant.context';

async function main() {
  await AppDataSource.initialize();
  
  const presenceRepo = AppDataSource.getRepository(Presence);
  const emploiRepo = AppDataSource.getRepository(EmploiDuTemp);
  const etudiantRepo = AppDataSource.getRepository(Etudiant);
  
  const presenceService = new PresenceService(presenceRepo, emploiRepo, etudiantRepo);
  
  // Test findAll with tenantId = 1
  await TenantContext.run(1, async () => {
    const result = await presenceService.findAll({ page: 1, limit: 15 });
    console.log('findAll result for tenantId = 1:', result);
  });

  // Test findAll with no tenantId (SuperAdmin)
  await TenantContext.run(undefined as any, async () => {
    const result = await presenceService.findAll({ page: 1, limit: 15 });
    console.log('findAll result for SuperAdmin:', result);
  });

  await AppDataSource.destroy();
}

main();
