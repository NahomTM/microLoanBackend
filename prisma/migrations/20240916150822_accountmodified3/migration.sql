/*
  Warnings:

  - You are about to drop the column `iv` on the `Account` table. All the data in the column will be lost.
  - Added the required column `ivPrivateKey` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ivSeed` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `xrpBalance` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "iv",
ADD COLUMN     "ivPrivateKey" TEXT NOT NULL,
ADD COLUMN     "ivSeed" TEXT NOT NULL,
ADD COLUMN     "xrpBalance" DECIMAL(65,30) NOT NULL;
