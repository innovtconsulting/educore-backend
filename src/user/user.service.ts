import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Like } from 'typeorm';
import { User, Role } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EtudiantService } from '../etudiant/etudiant.service';
import { EnseignantService } from '../enseignant/enseignant.service';
import { ParentService } from '../parent/parent.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { AclService } from '../acl/acl.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => EtudiantService))
    private readonly etudiantService: EtudiantService,
    @Inject(forwardRef(() => EnseignantService))
    private readonly enseignantService: EnseignantService,
    @Inject(forwardRef(() => ParentService))
    private readonly parentService: ParentService,
    private readonly aclService: AclService,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    const password = userData.password || '12345678';
    userData.password = await bcrypt.hash(password, 10);

    // Assigner automatiquement le rôle ACL basé sur le UserRole
    if (userData.role && !userData.aclRole) {
      const aclRole = await this.aclService.findRoleByName(userData.role);
      if (aclRole) {
        userData.aclRole = aclRole;
      }
    }

    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: {
        enseignant: true,
        etudiant: true,
        parent: true,
        etablissement: true,
        aclRole: { permissions: true },
      },
    });
  }

  async findByEtudiantId(etudiantId: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { etudiant: { id: etudiantId } },
    });
  }

  async findByEnseignantId(enseignantId: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { enseignant: { id: enseignantId } },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.email = Like(`%${search}%`);
      // Note: role est un enum, Like peut ne pas fonctionner selon la DB,
      // mais restons simple ou utilisons un queryBuilder si besoin de OR complexe.
    }

    const [items, total] = await this.userRepository.findAndCount({
      where: search ? [{ email: Like(`%${search}%`) }] : {},
      relations: { enseignant: true, etudiant: true, parent: true },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        enseignant: true,
        etudiant: true,
        parent: true,
        aclRole: { permissions: true },
      },
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur #${id} non trouvé`);
    }
    return user;
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);

    // Supprimer la photo si elle existe
    if (user.photoPath) {
      const fullPath = join(process.cwd(), user.photoPath);
      if (existsSync(fullPath)) {
        await unlink(fullPath).catch(() => {});
      }
    }

    await this.userRepository.remove(user);
  }

  async updateProfile(id: number, updateDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    const { email, password, phoneNumber, address, username } = updateDto;

    // Mettre à jour l'utilisateur (User)
    if (email && email !== user.email) {
      const existing = await this.findByEmail(email);
      if (existing)
        throw new ConflictException(
          'Email ou numéro de téléphone déjà utilisé',
        );
      user.email = email;
    }

    if (username && username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username },
      });
      if (existing)
        throw new ConflictException("Nom d'utilisateur déjà utilisé");
      user.username = username;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Pour les parents, si le numéro de téléphone change, on met à jour l'identifiant si non déjà fait
    if (
      user.role === Role.PARENT &&
      phoneNumber &&
      phoneNumber !== user.email &&
      !email
    ) {
      const existing = await this.findByEmail(phoneNumber);
      if (existing)
        throw new ConflictException('Numéro de téléphone déjà utilisé');
      user.email = phoneNumber;
    }

    // Mettre à jour le profil lié (Etudiant, Enseignant ou Parent)
    if (
      user.etudiant &&
      (phoneNumber ||
        address ||
        email ||
        (username && user.role === Role.ETUDIANT))
    ) {
      await this.etudiantService.update(user.etudiant.id, {
        phoneNumber,
        address,
        email, // Synchronisation de l'email si modifié
        firstName:
          username && user.role === Role.ETUDIANT ? username : undefined,
      });
    } else if (
      user.enseignant &&
      (phoneNumber || email || (username && user.role === Role.ENSEIGNANT))
    ) {
      await this.enseignantService.update(user.enseignant.id, {
        phone: phoneNumber,
        email, // Synchronisation de l'email si modifié
        firstName:
          username && user.role === Role.ENSEIGNANT ? username : undefined,
      });
    } else if (
      user.parent &&
      (phoneNumber ||
        address ||
        email ||
        (username && user.role === Role.PARENT))
    ) {
      await this.parentService.update(user.parent.id, {
        phoneNumber,
        address,
        email,
        firstName: username && user.role === Role.PARENT ? username : undefined,
      });
    }

    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async updateProfilePicture(id: number, filePath: string): Promise<User> {
    const user = await this.findOne(id);
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Supprimer l'ancienne photo si elle existe au niveau de l'utilisateur
    if (user.photoPath) {
      const oldPath = join(process.cwd(), user.photoPath);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
    }

    user.photoPath = normalizedPath;
    await this.userRepository.save(user);

    // Synchronisation avec les profils spécifiques pour compatibilité
    if (user.etudiant) {
      // On met à jour directement pour éviter la double suppression de fichier dans le service etudiant
      await this.etudiantService.update(user.etudiant.id, {
        photoPath: normalizedPath,
      } as any);
    } else if (user.enseignant) {
      await this.enseignantService.update(user.enseignant.id, {
        photoPath: normalizedPath,
      } as any);
    }

    return this.findOne(id);
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });
  }
}
