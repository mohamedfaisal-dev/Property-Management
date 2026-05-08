import { Sequelize, Options } from 'sequelize';
import 'dotenv/config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DbConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: 'mariadb';
  dialectOptions?: Record<string, unknown>;
  logging: boolean | ((sql: string) => void);
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
    evict: number;
    handleDisconnects: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment-based configurations
// ─────────────────────────────────────────────────────────────────────────────
export const config: Record<string, DbConfig> = {
  development: {
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'toor',
    database: process.env.DB_NAME ?? 'property_rental',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mariadb',
    dialectOptions: {
      timezone: 'local',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60_000,
      idle: 30_000,
      evict: 1_000,
      handleDisconnects: true,
    },
  },

  test: {
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'toor',
    database: process.env.DB_NAME_TEST ?? 'property_rental_test',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mariadb',
    logging: false,
  },

  production: {
    username: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
    host: process.env.DB_HOST ?? '',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mariadb',
    dialectOptions: { timezone: 'local' },
    logging: false,
    pool: {
      max: 50,
      min: 10,
      acquire: 60_000,
      idle: 30_000,
      evict: 1_000,
      handleDisconnects: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolve active config
// ─────────────────────────────────────────────────────────────────────────────
const env = (process.env.NODE_ENV ?? 'development').trim();
const dbConfig: DbConfig = config[env] ?? config['development'];

// ─────────────────────────────────────────────────────────────────────────────
// Sequelize instance
// ─────────────────────────────────────────────────────────────────────────────
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    logging: dbConfig.logging as Options['logging'],
    pool: dbConfig.pool,
  }
);
