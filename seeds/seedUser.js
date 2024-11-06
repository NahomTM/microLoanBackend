const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { hashPassword } = require("../utils/passwordUtils");
const { faker } = require('@faker-js/faker');
const crypto = require("crypto");
const xrpl = require("xrpl");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts";

const getRandomStatus = () => {
  const statuses = ["active", "blocked", "pending", "rejected"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const getRandomBank = () => {
  const banks = ["CBE", "Abyssinia", "Awash"];
  return banks[Math.floor(Math.random() * banks.length)];
};

const getBankAccountNumber = (bank) => {
  switch (bank) {
    case "CBE":
      return "10000" + Math.floor(1000000000 + Math.random() * 9000000000);
    case "Abyssinia":
      return "1713" + Math.floor(10000 + Math.random() * 90000);
    case "Awash":
      return "0132" + Math.floor(1000000000 + Math.random() * 9000000000);
    default:
      return "Unknown Bank";
  }
};

const getRandomBalance = () => {
  return Math.floor(100000 + Math.random() * 400000);
};

const seedUsers = async () => {
  try {
    for (let i = 0; i < 50; i++) {
      const fullName = faker.person.fullName();
      const email = faker.internet.email(fullName.split(" ")[0]);
      const password = await hashPassword(`password${i}`);
      const address = faker.location.streetAddress();
      const phoneNumber = faker.phone.number();
      const status = getRandomStatus();
      const bankName = getRandomBank();
      const accountNumber = getBankAccountNumber(bankName);
      const balance = getRandomBalance();
      const idFile = "uploads/idFile2.pdf";
      const bankStatement = "uploads/bankStatement2.pdf";

      const existingUser = await prisma.user.findUnique({
        where: { id: i + 2 },
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            role: "client",
            fullName,
            email,
            password,
            address,
            phoneNumber,
            creditScore: 100,
            status,
            idFile,
            bankStatement,
            realBankAccounts: {
              create: {
                bankName,
                accountNumber,
                balanceETB: balance,
              },
            },
          },
        });

        const wallet = xrpl.Wallet.generate();

        const ivPrivateKey = crypto.randomBytes(16);
        const ivSeed = crypto.randomBytes(16);
        const masterKey = Buffer.from(process.env.MASTER_KEY, "hex");

        const cipherPrivateKey = crypto.createCipheriv(
          "aes-256-cbc",
          masterKey,
          ivPrivateKey
        );
        let encryptedPrivateKey = cipherPrivateKey.update(
          wallet.privateKey,
          "utf-8",
          "hex"
        );
        encryptedPrivateKey += cipherPrivateKey.final("hex");

        const cipherSeed = crypto.createCipheriv(
          "aes-256-cbc",
          masterKey,
          ivSeed
        );
        let encryptedSeed = cipherSeed.update(wallet.seed, "utf-8", "hex");
        encryptedSeed += cipherSeed.final("hex");

        const faucetResponse = await fetch(FAUCET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: wallet.classicAddress,
            amount: "100",
          }),
        });

        if (!faucetResponse.ok) {
          throw new Error(
            `Faucet request failed: ${faucetResponse.statusText}`
          );
        }

        await prisma.account.create({
          data: {
            publicKey: wallet.publicKey,
            encryptedPrivateKey,
            privateKeyIv: ivPrivateKey.toString("hex"),
            encryptedSeed,
            seedIv: ivSeed.toString("hex"),
            xrpBalance: 100,
            userId: user.id,
          },
        });
        console.log(`Created user: ${user.fullName} with XRP account.`);
      } else {
        console.log(`User already exists: ${existingUser.fullName}`);
      }
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = seedUsers;
