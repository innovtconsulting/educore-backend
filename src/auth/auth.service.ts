import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EtudiantService } from '../etudiant/etudiant.service';
import { EnseignantService } from '../enseignant/enseignant.service';
import { ParentService } from '../parent/parent.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { MailService } from '../mail/mail.service';
import { GlobalSettingService } from '../global-setting/global-setting.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly etudiantService: EtudiantService,
    private readonly enseignantService: EnseignantService,
    private readonly parentService: ParentService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly globalSettingService: GlobalSettingService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (
      user &&
      user.isActive &&
      user.password &&
      (await bcrypt.compare(pass, user.password))
    ) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const permissions = user.aclRole?.permissions?.map((p: any) => p.name) || [];

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      permissions: permissions,
      etablissementId:
        user.etablissementId ||
        user.etudiant?.etablissement?.id ||
        user.enseignant?.affectations?.[0]?.etablissement?.id,
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
      if (role === UserRole.ETUDIANT) {
        const allowReg = await this.globalSettingService.getValue(
          'ENABLE_STUDENT_REGISTRATION',
          'true',
        );
        if (allowReg === 'false') {
          throw new BadRequestException(
            "L'auto-inscription des étudiants est actuellement désactivée.",
          );
        }

        // Si etudiantData est fourni, c'est une nouvelle pré-inscription
        if (registerDto.etudiantData) {
          profile = await this.etudiantService.preRegister({
            ...registerDto.etudiantData,
            password: password, // Utiliser le mot de passe fourni dans RegisterDto
          });

          return {
            message:
              'Votre demande de pré-inscription a été enregistrée avec succès. Votre compte sera activé après validation par un administrateur.',
            user: {
              email: profile.email,
              role: UserRole.ETUDIANT,
            },
          };
        } else {
          throw new BadRequestException(
            "Les données d'inscription sont obligatoires pour un étudiant",
          );
        }
      } else if (role === UserRole.ENSEIGNANT) {
        throw new BadRequestException(
          "L'auto-inscription n'est pas disponible pour les enseignants. Votre compte est créé par l'administration.",
        );
      } else if (role === UserRole.PARENT) {
        if (!registerDto.parentData) {
          throw new BadRequestException(
            "Les données du profil parent sont obligatoires pour l'inscription.",
          );
        }
        if (!registerDto.parentData.phoneNumber) {
          throw new BadRequestException(
            "Le numéro de téléphone est obligatoire et sert d'identifiant pour le compte parent.",
          );
        }
        // Pour les parents, l'identifiant (stocké dans le champ email de User) est le numéro de téléphone
        email = registerDto.parentData.phoneNumber;
        profile = await this.parentService.create(registerDto.parentData);
      } else {
        throw new BadRequestException(
          `L'auto-inscription n'est pas disponible pour le rôle ${role}. Votre compte doit être créé par l'administration.`,
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
        username: profile?.firstName,
        password: password,
        role: role,
        etablissement:
          (role as any) === UserRole.ETUDIANT ||
          (role as any) === UserRole.ENSEIGNANT
            ? profile.etablissement || profile.affectations?.[0]?.etablissement
            : null,
        etudiant: (role as any) === UserRole.ETUDIANT ? profile : null,
        enseignant: (role as any) === UserRole.ENSEIGNANT ? profile : null,
        parent: (role as any) === UserRole.PARENT ? profile : null,
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
        if (role === UserRole.ENSEIGNANT)
          await this.enseignantService.remove(profile.id);
        if (role === UserRole.PARENT)
          await this.parentService.remove(profile.id);
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
    await this.mailService.sendPasswordResetEmail(
      user.email,
      token,
      user.etablissement?.name,
    );

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
