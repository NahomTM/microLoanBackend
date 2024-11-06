const { PrismaClient } = require("@prisma/client");
const xrpl = require("xrpl");
const crypto = require("crypto");
const prisma = new PrismaClient();

const MASTER_KEY = process.env.MASTER_KEY;

function decryptSeed(encryptedSeed, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(MASTER_KEY, "hex"),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedSeed, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const sendXRP = async (req, res) => {
  const { senderId, receiverId, amount } = req.body;

  try {
    const senderAccount = await prisma.account.findFirst({
      where: { userId: parseInt(senderId) },
    });
    const receiverAccount = await prisma.account.findFirst({
      where: { userId: parseInt(receiverId) },
    });

    if (!senderAccount || !receiverAccount) {
      return res.status(404).json({ error: "Sender or receiver not found" });
    }

    const senderSeed = decryptSeed(senderAccount.seed, senderAccount.ivSeed);
    const receiverSeed = decryptSeed(receiverAccount.seed, receiverAccount.ivSeed);

    const senderWallet = xrpl.Wallet.fromSeed(senderSeed);
    const receiverWallet = xrpl.Wallet.fromSeed(receiverSeed);

    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();

    const amountInDrops = xrpl.xrpToDrops(String(amount));
    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: senderWallet.address,
      Amount: amountInDrops,
      Destination: receiverWallet.address,
    });

    const signed = senderWallet.sign(prepared);
    const tx = await client.submitAndWait(signed.tx_blob);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const senderBalance = await client.getXrpBalance(senderWallet.address);
    const receiverBalance = await client.getXrpBalance(receiverWallet.address);

    await prisma.account.update({
      where: { id: parseInt(senderAccount.id) },
      data: {
        xrpBalance: parseFloat(senderBalance),
      },
    });

    await prisma.account.update({
      where: { id: parseInt(receiverAccount.id) },
      data: {
        xrpBalance: parseFloat(receiverBalance),
      },
    });

    client.disconnect();

    return res.status(200).json({
      message: "Transaction completed successfully",
      transactionResult: tx.result,
      senderBalance: senderBalance,
      receiverBalance: receiverBalance,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Transaction failed" });
  }
};

const transactHistory = async (req,res) => {

  const userId = req.user.id

  try {
    const Transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          {receiverId: userId},
          {senderId: userId}
        ]
      }
    })

    if (!Transactions) {
      res.json({msg: "No transactions made"})
    }

    res.json(Transactions)
  } catch (error) {
    console.log("error: ", error);
    
  }
}

module.exports = { sendXRP, transactHistory };
