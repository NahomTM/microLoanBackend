/*
  Warnings:

  - You are about to drop the column `ivPrivateKey` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `ivSeed` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `privateKey` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `seed` on the `Account` table. All the data in the column will be lost.
  - You are about to alter the column `xrpBalance` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `encryptedPrivateKey` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedSeed` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `privateKeyIv` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seedIv` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creditScore` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "ivPrivateKey",
DROP COLUMN "ivSeed",
DROP COLUMN "privateKey",
DROP COLUMN "seed",
ADD COLUMN     "encryptedPrivateKey" TEXT NOT NULL,
ADD COLUMN     "encryptedSeed" TEXT NOT NULL,
ADD COLUMN     "issuedCurrencyBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "privateKeyIv" TEXT NOT NULL,
ADD COLUMN     "seedIv" TEXT NOT NULL,
ALTER COLUMN "xrpBalance" SET DEFAULT 0.0,
ALTER COLUMN "xrpBalance" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "activeLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "bankStatement" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creditScore" INTEGER NOT NULL,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "idFile" TEXT,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AdminConn" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "AdminConn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCTemp" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "idFile" TEXT NOT NULL,
    "bankStatement" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "KYCTemp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealBankAccount" (
    "id" SERIAL NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "balanceETB" DECIMAL(65,30) NOT NULL DEFAULT 100000.0,
    "userId" INTEGER,

    CONSTRAINT "RealBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "durationToReturn" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrowed" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Borrowed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER,
    "receiverId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedCurrency" (
    "id" SERIAL NOT NULL,
    "issuerId" INTEGER,
    "receiverId" INTEGER,
    "currencyCode" TEXT NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordStatus" (
    "id" SERIAL NOT NULL,
    "isChanged" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PasswordStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminConn_userId_key" ON "AdminConn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCTemp_email_key" ON "KYCTemp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KYCTemp_accountNumber_key" ON "KYCTemp"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "KYCTemp_userId_key" ON "KYCTemp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RealBankAccount_accountNumber_key" ON "RealBankAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ResetToken_token_key" ON "ResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "AdminConn" ADD CONSTRAINT "AdminConn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminConn" ADD CONSTRAINT "AdminConn_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RealBankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCTemp" ADD CONSTRAINT "KYCTemp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealBankAccount" ADD CONSTRAINT "RealBankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Borrowed" ADD CONSTRAINT "Borrowed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCurrency" ADD CONSTRAINT "IssuedCurrency_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCurrency" ADD CONSTRAINT "IssuedCurrency_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordStatus" ADD CONSTRAINT "PasswordStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetToken" ADD CONSTRAINT "ResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
