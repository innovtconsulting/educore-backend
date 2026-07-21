import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CertificateTemplate, SupervisorLabel } from '../entities/etablissement.entity';

export class CreateEtablissementDto {
  @ApiProperty({ example: 'Lycée Excellence' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({ example: 'Dakar, Sénégal' })
  @IsString({ message: "L'adresse doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'adresse est obligatoire" })
  address!: string;

  @ApiProperty({ example: 'contact@lycee.sn' })
  @IsEmail({}, { message: "L'email doit être une adresse email valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email!: string;

  @ApiProperty({ example: '+221 33 000 00 00' })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  phone!: string;

  @ApiPropertyOptional({
    enum: CertificateTemplate,
    default: CertificateTemplate.DEFAULT,
    description: 'Template utilisé pour la génération des certificats (scolarité, réussite...)',
  })
  @IsEnum(CertificateTemplate)
  @IsOptional()
  certificateTemplate?: CertificateTemplate;

  @ApiPropertyOptional({
    enum: SupervisorLabel,
    default: SupervisorLabel.MONITRICE,
    description:
      "Libellé d'affichage du rôle Monitrice (ex: \"Monitrice\" ou \"Monitrice\"), purement cosmétique",
  })
  @IsEnum(SupervisorLabel)
  @IsOptional()
  supervisorLabel?: SupervisorLabel;
}
