# Class 10 CBSE Mathematics paper shop

Public page: `question-papers/index.html`. Private order desk: `question-papers/admin.html`.

The first collection contains Mathematics Standard Set A in two formats:

| Paper ID | Marks | Questions | Practice time | Price |
| --- | ---: | ---: | --- | ---: |
| IM-C10-MS-30-A | 30 | 15 | 75 minutes | ₹9 |
| IM-C10-MS-80-A | 80 | 38 | 3 hours | ₹29 |

Each price includes one manual evaluation. These are original Innovative Masterminds practice papers. The 80-mark paper follows the 2026–27 CBSE section structure and unit mark totals; the 30-mark paper is an adapted practice format.

## Student workflow

1. Register the student name and confirm the delivery email twice.
2. The order is saved privately before showing payment. The payment page reuses the existing UPI QR image byte for byte. The optional UPI app link specifies the server-validated amount and order ID.
3. Pay, then submit the UPI reference. This records `PAYMENT_REVIEW`; it does not verify payment or deliver anything automatically.
4. A highlighted WhatsApp option below the QR/timeline lets the payer attach a payment screenshot. The message includes paper, amount, order ID, registered email and reference if entered. Opening WhatsApp does not attach an image or send a message automatically.
5. The paper is manually emailed within one hour of receiving payment details after bank verification. The student replies to that same email with their completed answer sheets.
6. Evaluated results are manually emailed within six hours of receiving the answer email.

## Owner workflow

Sign into `admin.html` with the existing gallery owner account (`im.abhilash.ssas@gmail.com` and its Supabase Auth password).

1. Download each private paper using **Open private paper / Save PDF**. Choose **Print / Save PDF** and retain the PDFs for manual delivery. The Innovative Masterminds logo appears in each paper header.
2. For a web-submitted reference, review the bank credit, amount, payer and reference. Check that the reference has not already funded an assessment report or class booking.
3. For a WhatsApp screenshot where the payer has not submitted the web reference, open the matching registered order and use **Record WhatsApp payment details**. Enter the actual message-received timestamp and reference. Bank verification remains a separate step.
4. Mark payment as verified only after checking the bank credit.
5. Email the PDF yourself to the registered email. Include the order ID and instructions to reply to that same email with the completed answer sheets. Record the actual sent time in the desk.
6. When answers arrive, record the email's actual received timestamp. This establishes the six-hour result deadline.
7. Evaluate the paper, manually email the score, corrections and improvement feedback, then record the actual sent time.

Bank approval and retries never restart the one-hour deadline. Logging an answer email later does not postpone the six-hour deadline. Status controls do not send mail. Use **Flag payment issue** for a questionable credit and **Accepting new question-paper orders** to pause new sales when unavailable. Existing orders can still submit payment references while new orders are paused.

## Private data and deployment

The existing Supabase project hosts the `im-paper-shop` Edge Function and five `im_paper_*` tables. Orders and full paper content are not stored in the public GitHub repository. Direct table access is revoked for `anon` and `authenticated`; RLS is enabled. The function returns a limited catalogue and two sample questions per product. Full papers and order administration require a verified Auth user in the private owner allowlist. Payer status requests require the order ID and a random, hashed order token. Tokens are not put in URLs.

Public browser configuration contains only the existing publishable key. The server key is read from the Edge Function environment. `verify_jwt=false` supports anonymous checkout; the function explicitly checks the application key/origin and validates Auth plus owner allowlist on every administration request.

The public function source and schema are tracked under `supabase/`. Full question content is private database data, seeded from the approved owner-review preview. To revise an already sold paper, add a new product ID/version rather than silently replacing that paper.

The existing Apps Script booking/calendar and ₹99 assessment-report flows are unchanged. No automatic report sharing or email sending was added.

## Verification

Run `node supabase/functions/im-paper-shop/tests.cjs` for the isolated workflow checks. They cover fixed pricing, registration and payment retries, wrong-token access, anonymous paper denial, owner allowlist, duplicate references, payment gating, timestamps, WhatsApp receipt handling and order pausing. Synthetic browser test orders are retained as `TEST_COMPLETED` and excluded from the owner queue. No bank credit is approved for launch QA.
