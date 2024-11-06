const xrpl = require("xrpl");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const generateAndStoreAccount = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  let client;
  let fetch;

  try {
    fetch = (await import("node-fetch")).default;

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();

    const wallet = xrpl.Wallet.generate();

    if (!wallet || !wallet.privateKey) {
      throw new Error("Failed to generate XRPL wallet");
    }

    console.log("Generated wallet:", wallet);

    const ivPrivateKey = crypto.randomBytes(16);
    const ivSeed = crypto.randomBytes(16);
    const masterKey = Buffer.from(process.env.MASTER_KEY, "hex");

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

    const faucetData = await faucetResponse.json();
    console.log("Faucet response:", faucetData);

    let retries = 5;
    let xrpBalance = null;

    for (let i = 0; i < retries; i++) {
      try {
        const accountInfo = await client.request({
          command: "account_info",
          account: wallet.classicAddress,
          ledger_index: "validated",
        });

        xrpBalance = accountInfo.result.account_data.Balance / 1000000;
        console.log(`XRP Balance: ${xrpBalance} XRP`);
        break;
      } catch (error) {
        console.log(`Retrying to fetch account balance... Attempt ${i + 1}`);

        if (i === retries - 1) {
          throw new Error("Account not found after multiple attempts");
        }

        await delay(3000);
      }
    }

    await prisma.account.create({
      data: {
        publicKey: wallet.publicKey,
        privateKey: encryptedPrivateKey,
        ivPrivateKey: ivPrivateKey.toString("hex"),
        ivSeed: ivSeed.toString("hex"),
        seed: encryptedSeed,
        xrpBalance: xrpBalance,
        userId: user.id,
      },
    });

    console.log("Account created and stored successfully.");

    res.json({ msg: "success", data: { xrpBalance, publicKey: wallet.publicKey } });
  } catch (error) {
    console.error("Error:", error.message || error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

module.exports = { generateAndStoreAccount };
