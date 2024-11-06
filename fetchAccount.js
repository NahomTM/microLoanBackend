const prisma = require('@prisma/client').PrismaClient;
const crypto = require('crypto');
const xrpl = require('xrpl');

// Initialize Prisma Client
const prismaClient = new prisma();

// Function to decrypt AES encrypted seed
function decryptSeed(encryptedSeed, iv, masterKey) {
  // Convert masterKey to a buffer if it's in hex
  const key = Buffer.from(masterKey, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedSeed, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Function to find the account with the decrypted seed and log wallet details
async function getDecryptedSeedAndWallet() {
  // Fetch account details using Prisma
  const account = await prismaClient.account.findUnique({
    where: { id: 3 }, // Account ID 3
    select: {
      seed: true,   // encrypted seed
      ivSeed: true, // initialization vector
    },
  });

  if (!account) {
    console.error('Account not found!');
    return;
  }

  const { seed, ivSeed } = account;
  const masterKey = process.env.MASTER_KEY; // Ensure the master key is stored in your .env

  // Decrypt the seed
  const decryptedSeed = decryptSeed(seed, ivSeed, masterKey);
  console.log('Decrypted Seed:', decryptedSeed);

  // Generate wallet from the decrypted seed
  const wallet = xrpl.Wallet.fromSeed(decryptedSeed);
  console.log('Wallet Address:', wallet.address);
  console.log('Wallet Seed:', wallet.seed);
}

// Call the function
getDecryptedSeedAndWallet().catch((e) => {
  console.error(e);
}).finally(async () => {
  await prismaClient.$disconnect();
});
