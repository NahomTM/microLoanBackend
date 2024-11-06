const xrpl = require('xrpl');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

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

async function createTrustLine(client, wallet, issuerWallet, currencyCode, maxAmount) {
    const trustSetTx = {
        "TransactionType": "TrustSet",
        "Account": wallet.address,
        "LimitAmount": {
            "currency": currencyCode,
            "issuer": issuerWallet.address,
            "value": maxAmount
        }
    };

    const ledgerResponse = await client.request({ command: 'ledger', ledger_index: 'current' });
    console.log('Ledger Response:', ledgerResponse);

    const currentLedgerIndex = ledgerResponse.result.ledger.ledger_index;

    if (typeof currentLedgerIndex !== 'number') {
        throw new Error('Invalid current ledger index');
    }

    // Set LastLedgerSequence to current index + buffer
    trustSetTx.LastLedgerSequence = currentLedgerIndex + 10;

    const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'current'
    });
    trustSetTx.Sequence = accountInfo.result.account_data.Sequence;

    const feeResponse = await client.request({ command: 'fee' });
    trustSetTx.Fee = feeResponse.result.drops.base_fee;

    const signedTx = wallet.sign(trustSetTx);

    console.log('Submitting TrustSet with LastLedgerSequence:', trustSetTx.LastLedgerSequence);

    const response = await client.submitAndWait(signedTx.tx_blob);
    console.log('Trustline created:', response);
}

async function sendIssuedCurrency(client, senderWallet, receiverWallet, currencyCode, amount) {
    const paymentTx = {
        "TransactionType": "Payment",
        "Account": senderWallet.address,
        "Amount": {
            "currency": currencyCode,
            "value": amount,
            "issuer": senderWallet.address
        },
        "Destination": receiverWallet.address
    };

    const ledgerResponse = await client.request({ command: 'ledger', ledger_index: 'current' });
    console.log('Ledger Response:', ledgerResponse);

    const currentLedgerIndex = ledgerResponse.result.ledger.ledger_index;

    if (typeof currentLedgerIndex !== 'number') {
        throw new Error('Invalid current ledger index');
    }

    paymentTx.LastLedgerSequence = currentLedgerIndex + 10;

    const accountInfo = await client.request({
        command: 'account_info',
        account: senderWallet.address,
        ledger_index: 'current'
    });
    paymentTx.Sequence = accountInfo.result.account_data.Sequence;

    const feeResponse = await client.request({ command: 'fee' });
    paymentTx.Fee = feeResponse.result.drops.base_fee; 

    const signedTx = senderWallet.sign(paymentTx);

    console.log('Submitting Payment with LastLedgerSequence:', paymentTx.LastLedgerSequence);

    const response = await client.submitAndWait(signedTx.tx_blob);
    console.log('Currency sent:', response);
}

const createTrustlineAndSendCurrency = async (req, res) => {
    try {
        const { id, amount } = req.body;

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        const trustedEntity = await prisma.user.findUnique({ where: { email: 'trustedEntity@test.com' } });

        if (!user || !trustedEntity) {
            return res.status(404).json({ error: 'User or trusted entity not found' });
        }
        console.log("id: ", user.id);

        const userAccount = await prisma.account.findFirst({ 
            where: {
              userId: user.id,
            }
          });
        console.log("User Account: ", userAccount);
        
        const trustedEntityAccount = await prisma.account.findFirst({ where: { userId: trustedEntity.id } });

        const userSeed = decryptSeed(userAccount.seed, userAccount.ivSeed);
        const trustedEntitySeed = decryptSeed(trustedEntityAccount.seed, trustedEntityAccount.ivSeed);

        const userWallet = xrpl.Wallet.fromSeed(userSeed);
        const trustedEntityWallet = xrpl.Wallet.fromSeed(trustedEntitySeed);

        const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        const maxAmount = (parseFloat(amount) + 100).toString();
        await createTrustLine(client, userWallet, trustedEntityWallet, 'ETB', maxAmount);

        await sendIssuedCurrency(client, trustedEntityWallet, userWallet, 'ETB', amount);

        await client.disconnect();

        return res.status(200).json({ message: 'Trustline created and currency sent' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
};

module.exports = { createTrustlineAndSendCurrency };
