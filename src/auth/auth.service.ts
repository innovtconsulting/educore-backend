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
import * as crypto from 'crypto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly etudiantService: EtudiantService,
    private readonly enseignantService: EnseignantService,
    private readonly parentService: ParentService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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
      access_token: await this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.enseignant || user.etudiant || user.parent || null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { password, role } = registerDto;
    let email = registerDto.email;
    let profile: any;

    try {
      // 1. Gérer la récupération du profil et de l'email selon le rôle
      if (role === Role.ETUDIANT) {
        if (registerDto.etudiantData) {
          throw new BadRequestException(
            "L'auto-inscription ne permet pas la création d'un nouveau profil étudiant. Veuillez utiliser uniquement votre matricule.",
          );
        }

        if (!registerDto.matricule) {
          throw new BadRequestException(
            "Le matricule est obligatoire pour l'inscription d'un étudiant",
          );
        }

        profile = await this.etudiantService.findByMatricule(
          registerDto.matricule,
        );
        if (!profile) {
          throw new BadRequestException(
            `Aucun étudiant trouvé avec le matricule ${registerDto.matricule}.`,
          );
        }

        // Auto-remplissage de l'email depuis le profil
        email = profile.email;

        const userWithProfile = await this.userService.findByEtudiantId(
          profile.id,
        );
        if (userWithProfile) {
          throw new BadRequestException(
            'Un compte utilisateur existe déjà pour cet étudiant.',
          );
        }
      } else if (role === Role.ENSEIGNANT) {
        if (registerDto.enseignantData) {
          throw new BadRequestException(
            "L'auto-inscription ne permet pas la création d'un nouveau profil enseignant. Veuillez utiliser uniquement votre matricule.",
          );
        }

        if (!registerDto.matricule) {
          throw new BadRequestException(
            "Le matricule est obligatoire pour l'inscription d'un enseignant",
          );
        }

        profile = await this.enseignantService.findByMatricule(
          registerDto.matricule,
        );
        if (!profile) {
          throw new BadRequestException(
            `Aucun enseignant trouvé avec le matricule ${registerDto.matricule}.`,
          );
        }

        // Auto-remplissage de l'email depuis le profil
        email = profile.email;

        const userWithProfile = await this.userService.findByEnseignantId(
          profile.id,
        );
        if (userWithProfile) {
          throw new BadRequestException(
            'Un compte utilisateur existe déjà pour cet enseignant.',
          );
        }
      } else if (role === Role.PARENT) {
        if (!email) {
          throw new BadRequestException(
            "L'email est obligatoire pour l'inscription d'un parent",
          );
        }
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

      // 2. Vérifier si l'email (éventuellement récupéré du profil) est déjà utilisé par un User
      if (!email) {
        throw new BadRequestException("L'email n'a pas pu être déterminé.");
      }

      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new BadRequestException(
          `Cet email (${email}) est déjà utilisé par un compte utilisateur.`,
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return {
        message:
          'Si cet email existe, un lien de réinitialisation a été envoyé.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valide 1 heure

    await this.userService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // Envoi de l'e-mail réel
    await this.mailService.sendPasswordResetEmail(user.email, token);

    return {
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    await this.userService.update(user.id, {
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    } as any);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
