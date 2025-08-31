/**
 * KMS Module Configuration Utilities Demo
 *
 * This file demonstrates the configuration utilities provided by cl-nestjs-alicloud-kms.
 * For a full NestJS application demo, run: pnpm dev
 */

import { mergeConfig, unflattenConfig, flattenConfig, validateRequiredKeys, filterEmptyValues } from '@/index';

console.log('🧰 KMS Configuration Utilities Demo\n');
console.log('💡 For a full NestJS application demo, run: pnpm dev\n');

// Demonstrate utility functions
function demonstrateUtilities() {
  console.log('📦 Configuration Utilities Demonstration\n');

  // 1. Merge Config
  console.log('1️⃣ Merge Config:');
  const localConfig = {
    'database.host': 'localhost',
    'database.port': '5432',
    'redis.port': '6379',
  };

  const remoteConfig = {
    'database.host': 'prod-db.example.com',
    'database.port': '5432',
    'database.password': 'secret123',
    'redis.port': '6379',
    'redis.host': 'redis.example.com',
  };

  const mergedConfig = mergeConfig(localConfig, remoteConfig);
  console.log('   Local config:', localConfig);
  console.log('   Remote config:', remoteConfig);
  console.log('   Merged config:', mergedConfig);
  console.log('   ✅ Remote config takes precedence\n');

  // 2. Unflatten Config
  console.log('2️⃣ Unflatten Config:');
  const flatConfig = {
    'app.database.host': 'localhost',
    'app.database.port': 5432,
    'app.redis.host': 'redis-server',
    'app.features.caching': true,
  };

  const unflattened = unflattenConfig(flatConfig);
  console.log('   Flat config:', flatConfig);
  console.log('   Unflattened config:', JSON.stringify(unflattened, null, 2));
  console.log('   ✅ Converted to nested structure\n');

  // 3. Flatten Config
  console.log('3️⃣ Flatten Config:');
  const nestedConfig = {
    database: {
      connection: {
        host: 'localhost',
        port: 5432,
      },
      credentials: {
        username: 'admin',
        password: 'secret',
      },
    },
    features: {
      caching: true,
      logging: false,
    },
  };

  const flattened = flattenConfig(nestedConfig);
  console.log('   Nested config:', JSON.stringify(nestedConfig, null, 2));
  console.log('   Flattened config:', flattened);
  console.log('   ✅ Converted to flat structure\n');

  // 4. Validate Required Keys
  console.log('4️⃣ Validate Required Keys:');
  const config = {
    host: 'localhost',
    port: 3000,
    name: 'myapp',
  };

  try {
    validateRequiredKeys(config, ['host', 'port']);
    console.log('   ✅ All required keys present');
  } catch (error) {
    console.log('   ❌ Missing required keys:', error instanceof Error ? error.message : String(error));
  }

  try {
    validateRequiredKeys(config, ['host', 'port'] as (keyof typeof config)[]);
    console.log('   ✅ All required keys present');
  } catch (error) {
    console.log('   ❌ Missing required keys:', error instanceof Error ? error.message : String(error));
  }
  console.log();

  // 5. Filter Empty Values
  console.log('5️⃣ Filter Empty Values:');
  const configWithEmpties = {
    host: 'localhost',
    port: '',
    name: null,
    password: undefined,
    enabled: true,
    count: 0,
  };

  const filtered = filterEmptyValues(configWithEmpties);
  console.log('   Original config:', configWithEmpties);
  console.log('   Filtered config:', filtered);
  console.log('   ✅ Empty values removed (keeps 0 and false)\n');
}

// Show NestJS integration information
function showNestJSIntegration() {
  console.log('🚀 NestJS Integration Demo\n');

  console.log('To see a full NestJS application demo with KMS integration, run:');
  console.log('   pnpm dev\n');

  console.log('This will start a NestJS server with the following endpoints:');
  console.log('   🏠 Application: http://localhost:3000');
  console.log('   🔐 KMS Health: http://localhost:3000/api/kms/health');
  console.log('   ⚙️  Config Demo: http://localhost:3000/api/config/demo');
  console.log('   📊 KMS Info: http://localhost:3000/api/kms/info\n');
}

// Show common troubleshooting tips
function showTroubleshootingTips() {
  console.log('🔧 Troubleshooting Tips\n');

  console.log('1️⃣ Authentication Issues:');
  console.log('   • Verify ALICLOUD_ACCESS_KEY_ID and ALICLOUD_ACCESS_KEY_SECRET');
  console.log('   • Check IAM permissions for KMS:GetSecretValue');
  console.log('   • Ensure correct regionId configuration\n');

  console.log('2️⃣ Secret Not Found:');
  console.log('   • Verify secret name spelling');
  console.log('   • Check secret exists in the specified region');
  console.log('   • Confirm access permissions to the specific secret\n');

  console.log('3️⃣ JSON Parse Errors:');
  console.log('   • Validate secret content is valid JSON');
  console.log('   • Use getSecretValue() for non-JSON secrets');
  console.log('   • Check for encoding issues\n');

  console.log('4️⃣ Connection Issues:');
  console.log('   • Use checkConnection() method to test connectivity');
  console.log('   • Verify network access to KMS endpoints');
  console.log('   • Check firewall and proxy settings\n');
}

// Main demo execution
async function runDemo() {
  try {
    demonstrateUtilities();
    showNestJSIntegration();
    showTroubleshootingTips();

    console.log('🎉 Configuration utilities demo completed!');
    console.log('📚 For more information, check out the documentation at:');
    console.log('   https://github.com/ChasLui/cl-nestjs-alicloud-kms\n');
  } catch (error) {
    console.error('❌ Demo error:', error);
  }
}

// Run the demo
runDemo();
