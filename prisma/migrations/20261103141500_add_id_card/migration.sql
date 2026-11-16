-- CreateTable
CREATE TABLE "id_card" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "alumni_number" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "id_card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "id_card_graduate_id_issued_at_idx" ON "id_card"("graduate_id", "issued_at" DESC);

-- CreateIndex
CREATE INDEX "id_card_alumni_number_idx" ON "id_card"("alumni_number");

-- AddForeignKey
ALTER TABLE "id_card" ADD CONSTRAINT "id_card_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
