const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utils/passwordUtils');
const prisma = new PrismaClient();
const crypto = require('crypto');
const xrpl = require('xrpl');

// Dynamic import for node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts";

const trustedEntity = async () => {
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: 'trustedEntity@test.com' }
        });

        if (!existingUser) {
            const password = 'securePassword123'; // Dummy password
            const hashedPassword = await hashPassword(password); // Hashing the password

            const trustedUser = await prisma.user.create({
                data: {
                    role: "admin",
                    fullName: "IncluFi",
                    email: "trustedEntity@test.com",
                    password: hashedPassword,
                    address: "123 Example St, Addis Ababa, Ethiopia",
                    phoneNumber: "+251911223344",
                    creditScore: 100000,
                    status: "active", // Assuming active status
                    idFile: "uploads/idFile.pdf", // Dummy path for ID file
                    bankStatement: "uploads/bankStatement.pdf", // Dummy path for bank statement
                    realBankAccounts: {
                        create: {
                            bankName: "CBE",
                            accountNumber: "1000033916788", // CBE account number format
                            balanceETB: 30000000 // Setting the balance
                        }
                    }
                }
            });

            const realBank = await prisma.realBankAccount.findFirst({
                where:{userId: trustedUser.id}
            })
            const AdminRealBank = await prisma.adminConn.create({
                data: {
                    userId: trustedUser.id,
                    accountId: realBank.id
                }
            }) 
            console.log("Trusted user: ", trustedUser);
            console.log("Admin-Account: ", AdminRealBank);
            const wallet = xrpl.Wallet.generate();

            const ivPrivateKey = crypto.randomBytes(16);
            const ivSeed = crypto.randomBytes(16);
            const masterKey = Buffer.from(process.env.MASTER_KEY, 'hex');
    
            const cipherPrivateKey = crypto.createCipheriv("aes-256-cbc", masterKey, ivPrivateKey);
            let encryptedPrivateKey = cipherPrivateKey.update(wallet.privateKey, "utf-8", "hex");
            encryptedPrivateKey += cipherPrivateKey.final("hex");
    
            const cipherSeed = crypto.createCipheriv("aes-256-cbc", masterKey, ivSeed);
            let encryptedSeed = cipherSeed.update(wallet.seed, "utf-8", "hex");
            encryptedSeed += cipherSeed.final("hex");
    
            const faucetResponse = await fetch(FAUCET_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: wallet.classicAddress, amount: "100" }),
            });
    
            if (!faucetResponse.ok) {
              throw new Error(`Faucet request failed: ${faucetResponse.statusText}`);
            }
    
            await prisma.account.create({
              data: {
                publicKey: wallet.publicKey,
                encryptedPrivateKey,
                privateKeyIv: ivPrivateKey.toString("hex"),
                encryptedSeed,
                seedIv: ivSeed.toString("hex"),
                xrpBalance: 100,
                userId: trustedUser.id,
              },
            });
            console.log(`Created user: ${trustedUser.fullName} with XRP account.`);
        } else {
            console.log("Trusted user already exists");
        }
    } catch (error) {
        console.log(error);
    } finally {
        await prisma.$disconnect();
    }
};

module.exports = trustedEntity;
