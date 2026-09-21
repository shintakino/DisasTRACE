ALTER TABLE "verification_requests" ADD COLUMN "possible_duplicate_of_id" varchar(255);--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_possible_duplicate_of_id_verification_requests_id_fk" FOREIGN KEY ("possible_duplicate_of_id") REFERENCES "public"."verification_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_requests_possible_duplicate_of_idx" ON "verification_requests" USING btree ("possible_duplicate_of_id");
