-- AlterTable
ALTER TABLE "Borrowed" ADD COLUMN     "offerId" INTEGER;

-- AddForeignKey
ALTER TABLE "Borrowed" ADD CONSTRAINT "Borrowed_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
