import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User, Role } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EtudiantService } from '../etudiant/etudiant.service';
import { EnseignantService } from '../enseignant/enseignant.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly etudiantService: EtudiantService,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: { enseignant: true, etudiant: true, parent: true },
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

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: { enseignant: true, etudiant: true, parent: true },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { enseignant: true, etudiant: true, parent: true },
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
    await this.userRepository.remove(user);
  }

  async updateProfile(id: number, updateDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    const { email, password, phoneNumber, address } = updateDto;

    // Mettre à jour l'utilisateur (User)
    if (email && email !== user.email) {
      const existing = await this.findByEmail(email);
      if (existing) throw new ConflictException('Email déjà utilisé');
      user.email = email;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Mettre à jour le profil lié (Etudiant ou Enseignant)
    if (user.etudiant && (phoneNumber || address || email)) {
      await this.etudiantService.update(user.etudiant.id, {
        phoneNumber,
        address,
        email, // Synchronisation de l'email si modifié
      } as any);
    } else if (user.enseignant && (phoneNumber || email)) {
      await this.enseignantService.update(user.enseignant.id, {
        phone: phoneNumber,
        email, // Synchronisation de l'email si modifié
      } as any);
    }

    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async updateProfilePicture(id: number, filePath: string): Promise<User> {
    const user = await this.findOne(id);

    if (user.etudiant) {
      await this.etudiantService.updateProfilePicture(user.etudiant.id, filePath);
    } else if (user.enseignant) {
      await this.enseignantService.updateProfilePicture(user.enseignant.id, filePath);
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
