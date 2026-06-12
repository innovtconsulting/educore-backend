import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EtudiantService } from '../etudiant/etudiant.service';
import { EnseignantService } from '../enseignant/enseignant.service';
import { ParentService } from '../parent/parent.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../user/entities/user.entity';
import { EnrollmentStatus } from '../etudiant/entities/etudiant.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly etudiantService: EtudiantService,
    private readonly enseignantService: EnseignantService,
    private readonly parentService: ParentService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      enseignantId: user.enseignant?.id,
      etudiantId: user.etudiant?.id,
      parentId: user.parent?.id,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.enseignant || user.etudiant || user.parent || null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, role } = registerDto;

    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    let profile: any;

    try {
      // 2. Créer ou récupérer le profil selon le rôle
      if (role === Role.ETUDIANT) {
        if (!registerDto.matricule) {
          throw new BadRequestException(
            'Le matricule est obligatoire pour l\'inscription d\'un étudiant',
          );
        }

        // Chercher l'étudiant par matricule
        profile = await this.etudiantService.findByMatricule(registerDto.matricule);
        if (!profile) {
          throw new BadRequestException(
            `Aucun étudiant trouvé avec le matricule ${registerDto.matricule}. Veuillez contacter l'administration.`,
          );
        }

        // Vérifier si cet étudiant a déjà un compte utilisateur
        const userWithProfile = await this.userService.findByEtudiantId(profile.id);
        if (userWithProfile) {
          throw new BadRequestException(
            'Un compte utilisateur existe déjà pour cet étudiant.',
          );
        }
      } else if (role === Role.ENSEIGNANT) {
        if (!registerDto.enseignantData) {
          throw new BadRequestException(
            "Les données de l'enseignant sont manquantes",
          );
        }
        profile = await this.enseignantService.create(
          registerDto.enseignantData,
        );
      } else if (role === Role.PARENT) {
        if (!registerDto.parentData) {
          throw new BadRequestException(
            'Les données du parent sont manquantes',
          );
        }
        profile = await this.parentService.create(registerDto.parentData);
      } else {
        throw new BadRequestException(
          "Rôle non supporté pour l'auto-inscription",
        );
      }

      // 3. Créer l'utilisateur lié
      const user = await this.userService.create({
        email: email,
        password: password,
        role: role,
        etudiant: role === Role.ETUDIANT ? profile : null,
        enseignant: role === Role.ENSEIGNANT ? profile : null,
        parent: role === Role.PARENT ? profile : null,
      });

      return {
        message: 'Inscription réussie.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: any) {
      // Nettoyage en cas d'erreur (uniquement pour les profils créés ici)
      if (profile && profile.id) {
        if (role === Role.ENSEIGNANT)
          await this.enseignantService.remove(profile.id);
        if (role === Role.PARENT) await this.parentService.remove(profile.id);
      }
      throw error;
    }
  }
}
