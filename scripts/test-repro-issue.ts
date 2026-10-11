import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 [REPRO TEST] Executando verificação de conformidade com PostgreSQL e Portas Altas...');
  let failures = 0;

  // 1. Verificar se store.ts ainda possui dados mockados INITIAL_GUESTS
  const storePath = path.resolve(__dirname, '../src/services/store.ts');
  const storeContent = fs.readFileSync(storePath, 'utf-8');

  if (storeContent.includes('const INITIAL_GUESTS: Guest[] = [')) {
    console.error('❌ FALHA 1: store.ts ainda contém dados mockados estáticos (INITIAL_GUESTS)!');
    failures++;
  } else {
    console.log('✅ SUCESSO 1: store.ts livre de dados mockados estáticos.');
  }

  // 2. Verificar se docker-compose.yml usa portas baixas (3000, 3001) em vez de altas (33000, 33001)
  const composePath = path.resolve(__dirname, '../docker-compose.yml');
  const composeContent = fs.readFileSync(composePath, 'utf-8');

  if (composeContent.includes('"3000:3000"') || composeContent.includes('"3001:3001"')) {
    console.error('❌ FALHA 2: docker-compose.yml está usando portas baixas (3000, 3001) em vez de portas altas (33000, 33001)!');
    failures++;
  } else if (composeContent.includes('"33000:3000"') && composeContent.includes('"33001:3001"')) {
    console.log('✅ SUCESSO 2: docker-compose.yml configurado em portas altas (33000, 33001).');
  } else {
    console.error('❌ FALHA 2: Portas altas não configuradas corretamente no docker-compose.yml');
    failures++;
  }

  // 3. Verificar se .env.example reflete as portas altas
  const envExamplePath = path.resolve(__dirname, '../.env.example');
  const envContent = fs.readFileSync(envExamplePath, 'utf-8');
  if (!envContent.includes('33001') || !envContent.includes('33000')) {
    console.error('❌ FALHA 3: .env.example não documenta as portas altas (33000, 33001)!');
    failures++;
  } else {
    console.log('✅ SUCESSO 3: .env.example atualizado com portas altas.');
  }

  if (failures > 0) {
    console.error(`\n🚨 REPRODUÇÃO CONFIRMADA: ${failures} falha(s) detectada(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 TODOS OS CRITÉRIOS ATENDIDOS!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
