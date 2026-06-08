import { DataSource } from "typeorm";
import { Etablissement } from "./etablissement/entities/etablissement.entity";
import { Niveau } from "./niveau/entities/niveau.entity";
import { Classe } from "./classe/entities/classe.entity";
import { Matiere } from "./matiere/entities/matiere.entity";
import { Enseignant } from "./enseignant/entities/enseignant.entity";
import { Affectation } from "./enseignant/entities/affectation.entity";
import { EmploiDuTemp } from "./emploi-du-temps/entities/emploi-du-temp.entity";
import { Etudiant } from "./etudiant/entities/etudiant.entity";
import { Parent } from "./parent/entities/parent.entity";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres",
    synchronize: true,
    logging: false,
    entities: [Etablissement, Niveau, Classe, Matiere, Enseignant, Affectation, EmploiDuTemp, Etudiant, Parent],
    subscribers: [],
    migrations: [],
})
