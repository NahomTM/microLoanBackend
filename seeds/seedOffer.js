const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedOffers = async () => {
  try {
    const userId = 1;
    for (let i = 1; i <= 50; i++) {
      const existingOffer = await prisma.offer.findUnique({
        where: {
          id: i,
        },
      });

      if (existingOffer) {
        console.log(`Offer with id ${i} already exists. Skipping creation.`);
        continue;
      }

      const amount = Math.floor(Math.random() * (100000 - 5000 + 1)) + 5000;

      let interestRate;
      if (amount <= 20000) {
        interestRate = 10;
      } else if (amount <= 50000) {
        interestRate = 8;
      } else if (amount <= 80000) {
        interestRate = 7;
      } else {
        interestRate = 5;
      }

      let durationToReturn;
      if (amount <= 20000) {
        durationToReturn = Math.floor(Math.random() * (6 - 2 + 1)) + 2;
      } else if (amount <= 50000) {
        durationToReturn = Math.floor(Math.random() * (9 - 6 + 1)) + 6;
      } else {
        durationToReturn = Math.floor(Math.random() * (12 - 9 + 1)) + 9;
      }

      const status = 'active';

      await prisma.offer.create({
        data: {
          amount: amount,
          interestRate: interestRate,
          durationToReturn: durationToReturn,
          status: status,
          userId: userId,
        },
      });
      console.log(`Created offer ${i}:`, { amount, interestRate, durationToReturn, status });
    }
  } catch (error) {
    console.error('Error creating seed offers:', error);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = seedOffers;
