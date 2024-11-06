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
    const currentLedgerIndex = ledgerResponse.result.ledger.ledger_index;

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
    await client.submitAndWait(signedTx.tx_blob);
}

async function sendIssuedCurrency(client, senderWallet, receiverWallet, currencyCode, amount) {
    const paymentTx = {
        "TransactionType": "Payment",
        "Account": senderWallet.address,
        "Amount": {
            "currency": currencyCode,
            "value": amount.toString(),
            "issuer": senderWallet.address
        },
        "Destination": receiverWallet.address
    };

    const ledgerResponse = await client.request({ command: 'ledger', ledger_index: 'current' });
    const currentLedgerIndex = ledgerResponse.result.ledger.ledger_index;

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
    await client.submitAndWait(signedTx.tx_blob);
}

async function saveTransaction(senderId, receiverId, transactionType, amount) {
    return await prisma.transaction.create({
        data: {
            senderId: senderId,
            receiverId: receiverId,
            transactionType: transactionType,
            amount: amount,
        },
    });
}

//trusted entity logic change
const createLoanAndManageCurrency = async (req, res) => {
    try {

        const offerId = parseInt(req.params.id);
        const id = req.user.id

        if (!id || !offerId) {
            return res.status(400).json({ error: 'Missing required fields: id, offerId, or amount' });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (user.activeLoan === true) {
            res.json({msg: "User already has an unpaid loan"})
        }
        const trustedEntity = await prisma.user.findUnique({ where: { email: 'trustedEntity@test.com' } });

        if (!user || !trustedEntity) {
            return res.status(404).json({ error: 'User or trusted entity not found' });
        }

        const offer = await prisma.offer.findUnique({
            where:{id: offerId}
        })

        if (offer.status === "accepted" || offer.status === "payed") {
            res.json({msg: "Offer already taken"})
        }

        const amount = offer.amount

        const userAccount = await prisma.account.findFirst({ 
            where: { userId: user.id }
        });

        const trustedEntityAccount = await prisma.account.findFirst({ where: { userId: trustedEntity.id } });

        const userSeed = decryptSeed(userAccount.encryptedSeed, userAccount.seedIv);
        
        const trustedEntitySeed = decryptSeed(trustedEntityAccount.encryptedSeed, trustedEntityAccount.seedIv);

        const userWallet = xrpl.Wallet.fromSeed(userSeed);
        const trustedEntityWallet = xrpl.Wallet.fromSeed(trustedEntitySeed);
        console.log(trustedEntityWallet);

        const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        const maxAmount = (parseFloat(amount) + 10).toString();
        await createTrustLine(client, userWallet, trustedEntityWallet, 'ETB', maxAmount);

        await saveTransaction( trustedEntity.id, user.id, 'TrustSet', parseFloat(maxAmount));

        await sendIssuedCurrency(client, trustedEntityWallet, userWallet, 'ETB', amount);

        await saveTransaction(trustedEntity.id, user.id, 'Payment', parseFloat(amount));

        await sendIssuedCurrency(client, userWallet, trustedEntityWallet, 'ETB', amount);

        await saveTransaction(user.id, trustedEntity.id, 'Payment', parseFloat(amount));

        await prisma.borrowed.create({
            data: {
                status: "active",
                userId: user.id,
                offerId: offer.id
            }
        });

        await prisma.realBankAccount.updateMany({
            where: { userId: user.id },
            data: { balanceETB: { increment: parseFloat(amount) } }
        });

        await prisma.realBankAccount.updateMany({
            where: { userId: trustedEntity.id },
            data: { balanceETB: { decrement: parseFloat(amount) } }
        });

        await prisma.offer.update({
            where: { id: offerId },
            data: { status: 'accepted' }
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const trustedBalance = await client.getXrpBalance(trustedEntityWallet.address);
        const userBalance = await client.getXrpBalance(userWallet.address);

        await Promise.all([
            prisma.account.update({
                where: { userId: user.id },
                data: {
                    xrpBalance: parseFloat(userBalance),
                    issuedCurrencyBalance: { increment: parseFloat(amount) }
                }
            }),
            prisma.account.update({
                where: { userId: trustedEntity.id },
                data: {
                    xrpBalance: parseFloat(trustedBalance),
                    issuedCurrencyBalance: { decrement: parseFloat(amount) }
                }
            })
        ]);
        await new Promise(resolve => setTimeout(resolve, 2000));

        await prisma.issuedCurrency.create({
            data: {
                issuerId: trustedEntity.id,
                receiverId: user.id,
                currencyCode: 'ETB',
                maxAmount: parseFloat(maxAmount)
            }
        });
        await prisma.user.update({
            where: { id: user.id },
            data:{
                activeLoan: true,
            }
        })

        await client.disconnect();

        return res.status(200).json({ message: 'Loan created, currency issued, and transactions completed successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while processing your request', details: error.message });
    }
};

const getLoans = async (req, res) => {
    const userId = req.user.id;
    
    try {
        const loans = await prisma.borrowed.findMany({
            where:{
                userId: userId
            }
        })
    
        if (!loans) {
            res.json({msg: "no loans taken"})
        }
    
        res.json(loans)
    } catch (error) {
        console.log("error: ", error);
        
    }
}

const payBack = async (req, res) => {
    const userId = req.user.id
    
    try {

        const user = await prisma.user.findUnique({
            where:{ id: userId }
        })
        const trustedEntity = await prisma.user.findUnique({
            where:{ email: "trustedEntity@test.com" }
        }) 
        if (user.activeLoan === false) {
            res.json({msg: "user doesn't have an active loan"})
        }
        const borrowed = await prisma.borrowed.findMany({
            where: {
              userId: parseInt(userId),
              status: "active"
            },
            include: {
              offer: true 
            }
          });
        
        if (borrowed.status === "paid") {
            res.json({msg: "loan already paid"})
        }
        
        const amount = borrowed[0].offer.amount

        const userAccount = await prisma.account.findFirst({ 
            where: { userId: user.id }
        });

        const trustedEntityAccount = await prisma.account.findFirst({ where: { userId: trustedEntity.id } });

        const userSeed = decryptSeed(userAccount.encryptedSeed, userAccount.seedIv);
        
        const trustedEntitySeed = decryptSeed(trustedEntityAccount.encryptedSeed, trustedEntityAccount.seedIv);

        const userWallet = xrpl.Wallet.fromSeed(userSeed);
        const trustedEntityWallet = xrpl.Wallet.fromSeed(trustedEntitySeed);
        const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        await sendIssuedCurrency(client, userWallet, trustedEntityWallet, 'ETB', amount);

        await saveTransaction(user.id, trustedEntity.id, 'Payment', parseFloat(amount));
       await prisma.borrowed.updateMany({
            where: {
                userId: userId,
                status: "active",
            },
            data: {
                status: "paid",
            }
        });

        await prisma.realBankAccount.updateMany({
            where: { userId: user.id },
            data: { balanceETB: { decrement: parseFloat(amount) } }
        });

        await prisma.realBankAccount.updateMany({
            where: { userId: trustedEntity.id },
            data: { balanceETB: { increment: parseFloat(amount) } }
        });

        await prisma.offer.update({
            where: { id: borrowed[0].offer.id },
            data: { status: 'paid' }
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const trustedBalance = await client.getXrpBalance(trustedEntityWallet.address);
        const userBalance = await client.getXrpBalance(userWallet.address);

        await Promise.all([
            prisma.account.update({
                where: { userId: user.id },
                data: {
                    xrpBalance: parseFloat(userBalance),
                    issuedCurrencyBalance: { decrement: parseFloat(amount) }
                }
            }),
            prisma.account.update({
                where: { userId: trustedEntity.id },
                data: {
                    xrpBalance: parseFloat(trustedBalance),
                    issuedCurrencyBalance: { increment: parseFloat(amount) }
                }
            })
        ]);
        await new Promise(resolve => setTimeout(resolve, 2000));

        await prisma.user.update({
            where: { id: user.id },
            data:{
                activeLoan: false,
            }
        })

        await client.disconnect();

        return res.status(200).json({ message: 'Loan paid back successfully.' });

    } catch (error) {
        
    }
}

module.exports = { createLoanAndManageCurrency, getLoans, payBack };
