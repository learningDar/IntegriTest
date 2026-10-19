# IntegriTest user guide

This guide covers the hosted pilot at [integritest.dareugenio.workers.dev](https://integritest.dareugenio.workers.dev/). It records observable exam activity for professor review; it does not decide whether a student cheated. Live activity, automatic End, and gap recovery were observed across devices with v0.3.3; the current v0.3.4 package updates setup instructions. The full remote gate is still pending.

## Student: prepare a Windows computer

Use **Google Chrome on a Windows laptop or desktop**. Phone-based Google Forms sessions are outside this pilot because the extension and Windows companion have not been verified on phones.

1. Obtain your own one-time join code privately from your professor. Do not share it or use another student's code.
2. Download [IntegriTest v0.3.4](https://integritest.dareugenio.workers.dev/downloads/integritest-v0.3.4.zip) and its [SHA-256 checksum](https://integritest.dareugenio.workers.dev/downloads/integritest-v0.3.4.sha256). In **Downloads**, right-click the ZIP, choose **Extract All**, and open the resulting folder. Keep it in place while using the monitor. You should see `extension`, `native-host`, and `README.txt` together.
3. Open `chrome://extensions`, turn on **Developer mode**, and choose **Load unpacked**. In Chrome's folder picker, open the extracted **`extension`** folder and click **Select Folder**. The picker hides files, so seeing only `icons` inside `extension` is normal; do not select `icons`. The extension ID should be `amlfomdhhaklmifkneplnngkbaabibgp`. If an older unpacked IntegriTest is installed, remove it before loading this version.
4. In ordinary File Explorer, return to the extracted folder that shows both `extension` and `native-host`. Click the address bar, type `powershell`, and press Enter. In the PowerShell window that opens, run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId amlfomdhhaklmifkneplnngkbaabibgp
   ```

   This registers the Windows companion for your Windows account. A successful run prints a `Registered` message and the host path. Reload the extension in `chrome://extensions` afterward. If you move the extracted folder later, run the command again from its new location.
5. Open the extension popup, enter **your** code, and select **Pair**. Use **Open registered Form** in the popup. Check that the assigned name and ID belong to you, the popup can reach the teacher service, and **Desktop monitor** says **connected**. Tell your professor if any of those checks fail.
6. On the registered Form, choose **Start Examination**. Fullscreen is optional. After the Form accepts your submission and shows its confirmation page, the paired session should end automatically. A failed submission with unanswered required questions should leave monitoring active. If the confirmation appears but monitoring continues, tell your professor. Use **Report a problem and stop early** only for a technical problem; the report labels that separately.

The popup keeps a local timeline and JSON export as a fallback when delivery is interrupted. A connected desktop monitor reports app **categories**, not document contents.

## Professor: prepare and review an exam

1. Publish a Google Form and copy its respondent link ending in `viewform`. Sign in at the [professor workspace](https://integritest.dareugenio.workers.dev/teacher.html) with the password supplied by the project administrator.
2. Create an exam record with the Form link. Import a class `.xlsx` file whose first sheet has **Student ID** and **Name** headers; inspect the preview before saving. Select the exam, assign the class, and generate its one-time codes. For a late arrival, add a name with an optional Student ID.
3. Give each code only to its assigned student through a private, verified channel. The first person to use a code claims that roster assignment. A code does **not** establish physical identity, so confirm the recipient independently and match the roster to Google Forms responses separately.
4. During the exam, use the monitoring table to review each student's connection, event counts, and latest observed activity. Open **View full report** for the complete timeline and service-generated JSON. A connection gap means contact was missed; it does not describe activity during the gap.

The professor view does not receive Form answers. Its event labels describe observations, such as a ChatGPT page becoming active, rather than proving use or misconduct.

## Local development

From the repository root, run `npm.cmd install`, `npm.cmd run build:roster`, and `npm.cmd run db:local`. Create an ignored `.dev.vars` with `TEACHER_PASSWORD`, a random `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS=amlfomdhhaklmifkneplnngkbaabibgp`. Start the local service with `npm.cmd run dev -- --ip 127.0.0.1 --port 8787`. To build a separate localhost package, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-demo.ps1`; this rewrites the local `public/downloads` output, so rebuild with the HTTPS origin before publishing it again.

## Release verification still required

Cross-device live activity, confirmed-submission End, and visible gap recovery with v0.3.3 have been reported. Still record event categories and counts, no incidents after End, report privacy, wrong/reused codes, retry without duplicates, and 30-day cleanup with disposable hosted records. Until the full gate passes, treat hosted monitoring as a pilot.
