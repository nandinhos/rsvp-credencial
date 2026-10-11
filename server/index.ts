import { app } from './app';
import { runMigrations } from './db/migrate';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // 1. Aplica migrações e seed no PostgreSQL se necessário
    await runMigrations();

    // 2. Inicia servidor HTTP
    app.listen(PORT, HOST, () => {
      console.log(`🚀 [BACKEND] Servidor Cerimonial & RSVP ativo em http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('❌ [BACKEND] Erro crítico na inicialização do servidor:', error);
    process.exit(1);
  }
}

bootstrap();
