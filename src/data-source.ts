import { DataSource } from "typeorm";
import { Etablissement } from "./etablissement/entities/etablissement.entity";
import { Niveau } from "./niveau/entities/niveau.entity";
import { Classe } from "./classe/entities/classe.entity";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: 5432,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres",
    synchronize: true,
    logging: true,
    entities: [Etablissement, Niveau, Classe],
    subscribers: [],
    migrations: [],
})
