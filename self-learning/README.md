# Self Learning

Students open `self-learning/` from the homepage or Learning Fees. One ₹599 payment buys 30 days from manual bank approval, with up to ten whole board-and-class chapters. Students may choose chapters gradually. The confirmation counts a chapter once and keeps that choice until expiry. Each lesson contains an explanation, worked example, independent practice, solution and a common mistake or check. Each chapter also has a challenge and revision questions.

Register with a learner name and student or parent email. Save the generated private learning key before scanning the existing UPI QR. The email and key open the same learner record on another device. Each learner can have a separate key even if siblings share a parent email.

## Owner payment review

1. Open `self-learning/admin.html` and sign in with the existing gallery owner credentials.
2. Compare the payer, amount and UPI reference against the actual bank credit. The pending queue includes submitted references. A WhatsApp screenshot can help identify a payment.
3. Select **Approve bank payment** and confirm the credit. The database records the approval time and the exact expiry 720 hours later. **Request a correction** displays your message on the student's pass and allows resubmission.
4. Look up a registered email to see other passes. After verifying the learner's identity, **Replace lost learning key** produces a new key for manual private delivery to the registered address.

Renewals are manual. An expired learner can register the next payment using the same key and gets ten new chapter choices on approval. Completed lessons remain on that learner's record.

GitHub hosts the interface and public plan details. Supabase holds the private chapter content, learner records, payment references, selections and progress. The Edge Function checks access on every chapter read and update. The public catalogue contains only chapter and lesson titles. Published lesson bodies and student records belong exclusively in the private database.
