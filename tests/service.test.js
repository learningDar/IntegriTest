const test = require('node:test');
const assert = require('node:assert/strict');

const base = process.env.SERVICE_TEST_URL;
const password = process.env.SERVICE_TEST_PASSWORD;
const extensionOrigin = 'chrome-extension://amlfomdhhaklmifkneplnngkbaabibgp';

test('class roster persists across exams and snapshots names after deletion',
  { skip: !base || !password }, async () => {
    const login = await call('/api/teacher/login',{method:'POST',value:{password}});
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const students = [{studentId:'0012',name:'Student 1'},{studentId:'A-2',name:'Student 2'}];
    const fullRoster = Array.from({length:100},(_,index) => ({
      studentId:`S${String(index + 1).padStart(3,'0')}`,name:`Student ${index + 1}`
    }));
    assert.equal((await call('/api/teacher/classes',{method:'POST',cookie,value:{
      name:'Too many',students:[...fullRoster,{studentId:'S101',name:'Student 101'}]
    }})).status,400);
    const fullClass = await call('/api/teacher/classes',{method:'POST',cookie,value:{name:'Full class',students:fullRoster}});
    assert.equal(fullClass.status,201,JSON.stringify(fullClass.data));
    assert.equal((await call(`/api/teacher/classes/${fullClass.data.class.id}`,{method:'DELETE',cookie})).status,200);
    assert.equal((await call('/api/teacher/classes',{method:'POST',cookie,value:{
      name:'Invalid class',students:[...students,students[0]]
    }})).status,400);
    const created = await call('/api/teacher/classes',{method:'POST',cookie,value:{name:'Architecture A',students}});
    assert.equal(created.status,201,JSON.stringify(created.data));
    const classId = created.data.class.id;
    const classes = await call('/api/teacher/classes',{cookie});
    assert.ok(classes.data.classes.some(c => c.id === classId && c.student_count === 2));
    const makeExam = async () => {
      const result = await call('/api/teacher/exams',{method:'POST',cookie,value:{
        title:'Architecture Quiz',formUrl:`https://docs.google.com/forms/d/e/${crypto.randomUUID().replaceAll('-','')}/viewform`
      }});
      assert.equal(result.status,201);
      return result.data.exam.id;
    };
    const first = await makeExam();
    const second = await makeExam();
    const assign = examId => call(`/api/teacher/exams/${examId}/assign-class`,{
      method:'POST',cookie,value:{classId}
    });
    const codes1 = await assign(first);
    const codes2 = await assign(second);
    assert.equal(codes1.status,201,JSON.stringify(codes1.data));
    assert.equal(codes2.status,201);
    assert.equal(codes1.data.codes.length,2);
    assert.notEqual(codes1.data.codes[0].code,codes2.data.codes[0].code);
    assert.equal((await assign(first)).status,409);
    const firstCode = codes1.data.codes.find(c => c.studentId === '0012');
    assert.equal(firstCode.name,'Student 1');
    const paired = await call('/api/student/pair',{method:'POST',value:{code:firstCode.code},origin:extensionOrigin});
    assert.equal(paired.status,201,JSON.stringify(paired.data));
    assert.equal(paired.data.studentName,'Student 1');
    assert.equal((await call('/api/student/pair',{method:'POST',value:{code:firstCode.code}})).status,403);
    assert.equal((await call(`/api/teacher/classes/${classId}`,{method:'DELETE',cookie})).status,200);
    const sessions = await call(`/api/teacher/exams/${first}/sessions`,{cookie});
    assert.equal(sessions.data.sessions.find(s => s.student_id === '0012').student_name,'Student 1');
    const report = await call(`/api/teacher/sessions/${paired.data.sessionId}/report.json`,{cookie});
    assert.equal(report.data.studentName,'Student 1');
    assert.equal(report.data.incidents.length,0);
    assert.ok(!JSON.stringify(report.data.incidents).includes('Student 1'));
  });

async function call(path, { method = 'GET', value, cookie, credential, origin } = {}) {
  const headers = {};
  if (value !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (credential) headers.authorization = `Bearer ${credential}`;
  if (origin) headers.origin = origin;
  const response = await fetch(base + path, { method, headers, body: value === undefined ? undefined : JSON.stringify(value) });
  return { status: response.status, headers: response.headers, data: await response.json() };
}

test('teacher access, one-use codes, delivery retries, ending, and private service JSON',
  { skip: !base || !password }, async () => {
    assert.equal((await call('/api/teacher/exams')).status, 401);
    assert.equal((await call('/api/teacher/login', {method:'POST',value:{password:'wrong'}})).status, 401);
    const login = await call('/api/teacher/login', {method:'POST',value:{password}});
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.ok(cookie.startsWith('teacher_session='));
    const privatePath = 'secret-answer=123';
    const created = await call('/api/teacher/exams', {method:'POST',cookie,value:{
      title:'Systems Integration Quiz',
      formUrl:`https://docs.google.com/forms/d/e/demo${crypto.randomUUID().replaceAll('-','')}/viewform?${privatePath}`
    }});
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.ok(!JSON.stringify(created.data).includes(privatePath));
    const exam = created.data.exam;
    const codeResponse = await call(`/api/teacher/exams/${exam.id}/codes`, {
      method:'POST',cookie,value:{studentIds:['Student 1']}
    });
    assert.equal(codeResponse.status, 201);
    const code = codeResponse.data.codes[0].code;
    assert.equal((await call(`/api/teacher/exams/${exam.id}/codes`,{
      method:'POST',cookie,value:{studentIds:['Student 2','Student 1']}
    })).status,409);
    assert.equal((await call(`/api/teacher/exams/${exam.id}/codes`,{
      method:'POST',cookie,value:{studentIds:['Student 2']}
    })).status,201);
    const beforePair = await call(`/api/teacher/exams/${exam.id}/sessions`,{cookie});
    const assigned = beforePair.data.sessions.find(s => s.student_id === 'Student 1');
    assert.equal(assigned.status,'NOT_PAIRED');
    assert.equal(assigned.id,null);
    assert.equal(assigned.code_status,'ISSUED');
    assert.equal(assigned.event_count,0);
    assert.equal((await call('/api/student/pair',{method:'POST',value:{code:'0000000000000000'}})).status,403);
    const pair = await call('/api/student/pair',{method:'POST',value:{code},origin:extensionOrigin});
    assert.equal(pair.status,201,JSON.stringify(pair.data));
    assert.equal(pair.headers.get('access-control-allow-origin'),extensionOrigin);
    assert.equal((await call('/api/student/pair',{method:'POST',value:{code}})).status,403);
    const credential = pair.data.credential;
    assert.equal((await call('/api/student/events',{method:'POST',credential,value:{incidents:[]}})).status,409);
    assert.equal((await call('/api/student/start',{method:'POST',credential,value:{}})).status,200);
    const incident = (sequence,type,extra={}) => ({
      id:crypto.randomUUID(), sequence, timestamp:new Date().toISOString(),type,
      severity:'LOW',source:'CHROME',...extra
    });
    const events = [
      incident(1,'EXAM_STARTED'),
      incident(2,'AI_SITE_OPENED',{severity:'HIGH',hostname:'chatgpt.com',domainCategory:'AI_PLATFORM',details:'secret prompt'}),
      incident(3,'DESKTOP_APP_ACTIVE',{severity:'MEDIUM',source:'WINDOWS_HOST',appCategory:'WORD',details:'secret document path'}),
      incident(4,'EXAM_ENDED')
    ];
    const batch = {incidents:events};
    assert.equal((await call('/api/student/events',{method:'POST',credential,value:batch})).data.acknowledgedSequence,4);
    assert.equal((await call('/api/student/events',{method:'POST',credential,value:batch})).data.acknowledgedSequence,4);
    const alteredRetry = {incidents:events.map(item => item.sequence === 2
      ? {...item,hostname:'evil.example',details:'changed'} : item)};
    assert.equal((await call('/api/student/events',{method:'POST',credential,value:alteredRetry})).data.acknowledgedSequence,4);
    assert.equal((await call('/api/student/end',{method:'POST',credential,value:{reason:'MANUAL',lastSequence:3}})).status,409);
    assert.equal((await call('/api/student/end',{method:'POST',credential,value:{reason:'MANUAL',lastSequence:4}})).status,200);
    assert.equal((await call('/api/student/events',{method:'POST',credential,value:{incidents:[incident(5,'WEBPAGE_OPENED')]}})).status,409);
    const sessions = await call(`/api/teacher/exams/${exam.id}/sessions`,{cookie});
    const ended = sessions.data.sessions.find(s => s.student_id === 'Student 1');
    assert.equal(ended.event_count,4);
    assert.equal(ended.end_reason,'MANUAL');
    assert.equal(ended.code_status,'USED');
    assert.ok(ended.started_at);
    assert.equal(ended.low_count,2);
    assert.equal(ended.medium_count,1);
    assert.equal(ended.high_count,1);
    assert.equal(ended.latest_type,'DESKTOP_APP_ACTIVE');
    assert.equal(ended.latest_app_category,'WORD');
    const report = await call(`/api/teacher/sessions/${pair.data.sessionId}/report.json`,{cookie});
    assert.equal(report.status,200);
    assert.equal(report.data.incidents.length,4);
    assert.equal(report.data.studentId,'Student 1');
    assert.equal(report.data.studentName,null);
    assert.equal(report.data.incidents[1].hostname,'chatgpt.com');
    assert.equal(report.data.incidents[2].appCategory,'WORD');
    assert.equal(report.data.incidents[2].source,'WINDOWS_HOST');
    assert.ok(!JSON.stringify(report.data).includes(privatePath));
    assert.ok(!JSON.stringify(report.data).includes('secret prompt'));
    assert.ok(!JSON.stringify(report.data).includes('secret document path'));
    assert.ok(!JSON.stringify(report.data).includes(credential));
  });

test('extension CORS permits configured origin and rejects unrelated origins',
  {skip: !base || !password}, async () => {
    const accepted = await fetch(base+'/api/student/pair',{method:'OPTIONS',headers:{origin:extensionOrigin,
      'access-control-request-method':'POST','access-control-request-headers':'content-type'}});
    assert.equal(accepted.status,204);
    assert.equal(accepted.headers.get('access-control-allow-origin'),extensionOrigin);
    const rejected = await call('/api/student/pair',{method:'POST',origin:'https://evil.example',value:{code:'0000000000000000'}});
    assert.equal(rejected.status,403);
  });

test('public connection check reports service readiness', {skip: !base}, async () => {
  const result = await call('/api/health');
  assert.equal(result.status,200);
  assert.equal(result.data.status,'ok');
  assert.equal(result.data.version,'0.3.2');
});

test('teacher accepts signed-in Google Forms links and stores a canonical respondent URL',
  {skip: !base || !password}, async () => {
    const login = await call('/api/teacher/login',{method:'POST',value:{password}});
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const result = await call('/api/teacher/exams',{method:'POST',cookie,value:{
      title:'Signed-in link test',formUrl:'https://docs.google.com/forms/u/0/d/e/demo-signed/viewform?usp=sharing'
    }});
    assert.equal(result.status,201);
    assert.equal(result.data.exam.formUrl,'https://docs.google.com/forms/d/e/demo-signed/viewform');
  });
