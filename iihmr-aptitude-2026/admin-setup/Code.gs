/**
 * IIHMR APTITUDE RESULTS COLLECTOR
 * Deploy this as a Google Apps Script Web App:
 * Deploy > New deployment > Web app > Execute as: Me; Who has access: Anyone
 * Copy the /exec URL into website's REPORT_ENDPOINT configuration.
 *
 * Important: This endpoint accepts public submissions. It never exposes reports
 * by GET; the connected Google Sheet must remain PRIVATE.
 */
const IIHMR_SHEET_ID = "14sIs8BDlqOjt_GJx2A49Eh1Uaapgc1UGN4IirMm_E30";
const IIHMR_ANSWER_KEYS = {"1":[2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2],"2":[3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3],"3":[1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1,0,2,3,1]};
const IIHMR_MAX_QUESTIONS = 45;
function doGet(e) {
  return ContentService.createTextOutput("IIHMR reports collector is available. Submission-only endpoint.");
}
function doPost(e) {
  let lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 60000) {
      throw Error("Empty or oversized submission.");
    }
    const payload = JSON.parse(e.postData.contents);
    if (payload.schema !== "iihmr-aptitude-2026" || !Number.isInteger(payload.test) || !IIHMR_ANSWER_KEYS[payload.test]) {
      throw Error("Unknown test.");
    }
    const test = payload.test;
    const keys = IIHMR_ANSWER_KEYS[test];
    if (!Array.isArray(payload.answers) || payload.answers.length !== IIHMR_MAX_QUESTIONS
         || !Array.isArray(payload.questions) || payload.questions.length !== IIHMR_MAX_QUESTIONS) {
      throw Error("Incomplete test payload.");
    }
    if (!payload.answers.every(a => a===null || (Number.isInteger(a) && a>=0 && a<=3))) {
      throw Error("Invalid answer values.");
    }
    const submissionId = plain(payload.submissionId,90);
    const student = plain(payload.name,100);
    const studentId = plain(payload.studentId,80);
    const email = plain(payload.email||"",160);
    if (!submissionId || !student || !studentId) throw Error("Missing student fields.");
    if (!/^iihmr[0-9a-z-]{10,90}$/i.test(submissionId)) throw Error("Invalid submission ID.");
    const received = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    let quant=0, logical=0, attempted=0;
    const questionRows=payload.questions.map((q,i)=>{
      if (!q || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.q !== "string") throw Error("Bad question " + i);
      if (q.q.length > 1000 || !q.options.every(x=>typeof x==="string"&&x.length<=200)) throw Error("Invalid question length.");
      const section = i<24 ? "Quantitative Aptitude" : "Logical Reasoning";
      const choice=payload.answers[i],correct=keys[i];
      if(choice!==null)attempted++;
      if(choice===correct){if(i<24)quant++;else logical++;}
      const answer=choice===null?"Not attempted":String.fromCharCode(65+choice)+": "+q.options[choice];
      const correctAnswer=String.fromCharCode(65+correct)+": "+q.options[correct];
      return [
        submissionId,test,studentId,i+1,section,
        plain(q.q,1000),plain(answer,230),plain(correctAnswer,230),
        choice===null?"Not attempted":choice===correct?"Correct":"Incorrect",received
      ];
    });
    const total=quant+logical;
    const started=Date.parse(payload.startedAt),completed=Date.parse(payload.completedAt);
    const duration=(Number.isFinite(started)&&Number.isFinite(completed)&&completed>=started) ? Math.min(60,Math.round((completed-started)/60000*10)/10):"";
    lock.waitLock(30000);
    const ss=SpreadsheetApp.openById(IIHMR_SHEET_ID);
    const overview=ss.getSheetByName("Responses"),details=ss.getSheetByName("Question Details");
    if(!overview||!details)throw Error("Expected sheet tabs missing.");
    // Duplicate retry protection: one row per unique submission ID.
    const ids=overview.getRange(1,1,Math.max(overview.getLastRow(),1),1);
    const existing=ids.createTextFinder(submissionId).matchEntireCell(true).findNext();
    if(existing) return asJson({ok:true,duplicate:true,submissionId:submissionId});
    overview.appendRow([submissionId,received,test,student,studentId,email,total,quant,logical,attempted,duration,plain(payload.completedAt,60),"Recorded"]);
    details.getRange(details.getLastRow()+1,1,questionRows.length,questionRows[0].length).setValues(questionRows);
    SpreadsheetApp.flush();
    return asJson({ok:true,submissionId:submissionId,score:total});
  } catch(err) {
    console.error("IIHMR collector: " + String(err));
    return asJson({ok:false,error:String(err)});
  } finally {
    try{lock.releaseLock();}catch(err){}
  }
}
function plain(value,max) {
  const s=String(value==null?"":value).replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
  // Prevent spreadsheet formula injection from candidate-controlled strings.
  return /^[=+\-@]/.test(s)?"'"+s:s;
}
function asJson(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}