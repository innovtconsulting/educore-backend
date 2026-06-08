import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEtudiantDto } from './dto/create-etudiant.dto';
import { UpdateEtudiantDto } from './dto/update-etudiant.dto';
import { Etudiant } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Parent, ParentGender } from '../parent/entities/parent.entity';
import { In } from 'typeorm';

@Injectable()
export class EtudiantService {
  constructor(
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async create(createEtudiantDto: CreateEtudiantDto): Promise<Etudiant> {
    const { etablissementId, classeId, niveauId, parentIds, ...rest } = createEtudiantDto;

    // Vérifier l'existence des relations
    const etablissement = await this.etablissementRepository.findOneBy({
      id: etablissementId,
    });
    if (!etablissement)
      throw new NotFoundException(`Établissement #${etablissementId} introuvable`);

    const classe = await this.classeRepository.findOneBy({ id: classeId });
    if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);

    const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
    if (!niveau) throw new NotFoundException(`Niveau #${niveauId} introuvable`);

    let parents: Parent[] = [];
    if (parentIds && parentIds.length > 0) {
      parents = await this.parentRepository.findBy({ id: In(parentIds) });
      if (parents.length !== parentIds.length) {
        throw new NotFoundException('Certains parents sont introuvables');
      }

      // Validation des règles métier pour les parents
      if (parents.length > 2) {
        throw new BadRequestException('Un étudiant ne peut pas avoir plus de 2 parents');
      }

      const hasPere = parents.some((p) => p.gender === ParentGender.PERE);
      const hasMere = parents.some((p) => p.gender === ParentGender.MERE);
      const hasTuteur = parents.some((p) => p.gender === ParentGender.TUTEUR);

      if (parents.length === 2) {
        if (!hasPere || !hasMere) {
          throw new BadRequestException(
            'Si l\'étudiant a 2 parents, ce doit être un père et une mère',
          );
        }
      }

      if (hasTuteur && parents.length > 1) {
        throw new BadRequestException(
          'Un tuteur ne peut pas être associé à un autre parent',
        );
      }
    } else {
      throw new BadRequestException('Un étudiant doit avoir au moins un parent ou tuteur');
    }

    // Vérifier l'unicité du matricule et de l'email
    const existing = await this.etudiantRepository.findOne({
      where: [{ email: rest.email }, { matricule: rest.matricule }],
    });
    if (existing) {
      throw new BadRequestException('L\'email ou le matricule existe déjà');
    }

    const etudiant = this.etudiantRepository.create({
      ...rest,
      etablissement,
      classe,
      niveau,
      parents,
    });

    return await this.etudiantRepository.save(etudiant);
  }

  async findAll(): Promise<Etudiant[]> {
    return await this.etudiantRepository.find({
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
      },
    });
  }

  async findOne(id: number): Promise<Etudiant> {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id },
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
      },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant #${id} introuvable`);
    return etudiant;
  }

  async update(id: number, updateEtudiantDto: UpdateEtudiantDto): Promise<Etudiant> {
    const etudiant = await this.findOne(id);
    const { etablissementId, classeId, niveauId, parentIds, ...rest } = updateEtudiantDto;

    if (etablissementId) {
      const etablissement = await this.etablissementRepository.findOneBy({
        id: etablissementId,
      });
      if (!etablissement)
        throw new NotFoundException(`Établissement #${etablissementId} introuvable`);
      etudiant.etablissement = etablissement;
    }

    if (classeId) {
      const classe = await this.classeRepository.findOneBy({ id: classeId });
      if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);
      etudiant.classe = classe;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
      if (!niveau) throw new NotFoundException(`Niveau #${niveauId} introuvable`);
      etudiant.niveau = niveau;
    }

    if (parentIds) {
      const parents = await this.parentRepository.findBy({ id: In(parentIds) });
      if (parents.length !== parentIds.length) {
        throw new NotFoundException('Certains parents sont introuvables');
      }
      etudiant.parents = parents;
    }

    Object.assign(etudiant, rest);
    return await this.etudiantRepository.save(etudiant);
  }

  async remove(id: number): Promise<void> {
    const etudiant = await this.findOne(id);
    await this.etudiantRepository.remove(etudiant);
  }

  async updateProfilePicture(id: number, filePath: string): Promise<Etudiant> {
    const etudiant = await this.findOne(id);
    etudiant.photoPath = filePath;
    return await this.etudiantRepository.save(etudiant);
  }
}
