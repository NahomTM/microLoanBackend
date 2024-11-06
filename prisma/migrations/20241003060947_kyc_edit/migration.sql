/*
  Warnings:

  - You are about to drop the column `email` on the `KYCTemp` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `KYCTemp` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "KYCTemp_email_key";

-- AlterTable
ALTER TABLE "KYCTemp" DROP COLUMN "email",
DROP COLUMN "password";
