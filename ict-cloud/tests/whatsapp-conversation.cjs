'use strict';
const assert=require('node:assert/strict');
const {parseChat,splitChat,gradeLabel}=require('../whatsapp-parser.js');
const staff=[
 {id:'a',name_ar:'معلمة اختبار ألف',name_en:'Teacher Alpha'},
 {id:'b',name_ar:'معلمة اختبار باء',name_en:'Teacher Beta'},
 {id:'c',name_ar:'معلمة اختبار جيم',name_en:'Teacher Gamma'},
 {id:'d',name_ar:'معلمة اختبار دال',name_en:'Teacher Delta'}
];
// Synthetic conversation; do not commit real school chat or personal data.
const chat=[
 '[11/10, 11:30 AM] Supervisor: محتاج مراجعة الشهر ملف Word من التقييم الخامس إلى التقييم الثامن وعاوز موقف جميع الفصول',
 '[11/10, 12:04 PM] Teacher Alpha: رابعة ابتدائي شغالين في THEME2 Lesson 2',
 '[11/10, 12:04 PM] Teacher Alpha: التقييم السابع',
 '[11/10, 12:13 PM] Teacher Beta: السادس الابتدائي في lesson2 theme2 و في التقييم السابع',
 '[11/10, 4:18 PM] Teacher Gamma: G5 lesson 2 them 2 wek 6',
 'G 6 lesson 6 theme 2 بكرة هدخل ف theme 2 lesson 1 week6',
 'Prp1 lesson 5 week 6',
 'Prp 2 lesson 2. Theme 2 week 7',
 'Prp 3 lesson 5 كانت عندي الحصة الأولى',
 '[11/10, 4:19 PM] Teacher Gamma: معلش كان اليوم مليان حصص',
 '[11/10, 5:40 PM] Teacher Gamma: هو فرق بس فصل سنة سادسة فرق درس بس والتقييم لكن باقي الفصول زي بعض'
].join('\n');
const result=parseChat(chat,staff);
assert.equal(result.totalMessages,6);
assert.equal(result.items.length,7,'each teacher/grade needs an independent row');
assert.equal(result.directives.length,1,'supervisor request is not a lesson report');
function row(id,grade){const r=result.items.find(x=>x.staffId===id&&x.grade===grade);assert.ok(r,'Missing '+id+' '+grade);return r}
assert.deepEqual({lesson:row('a','P4').lesson,theme:row('a','P4').theme,evaluation:row('a','P4').evaluation,week:row('a','P4').week},
{lesson:'Lesson 2',theme:'Theme 2',evaluation:7,week:null});
assert.equal(row('b','P6').evaluation,7);
assert.equal(row('c','P5').week,6);
assert.equal(row('c','P5').evaluation,null,'Week 6 must never become Eval 6');
assert.equal(row('c','P6').lesson,null,'Contradictory sixth-primary lesson must stay unconfirmed');
assert.equal(row('c','P6').plannedLesson,'Lesson 1');
assert.ok(row('c','P6').flags.some(x=>x.includes('فروق بين فصول')));
assert.equal(row('c','PREP1').week,6);
assert.equal(row('c','PREP2').week,7);
assert.equal(row('c','PREP3').week,null);
assert.equal(result.items.filter(x=>x.staffId==='d').length,0,'No invented update for silent staff');
assert.equal(splitChat(chat).length,6);
const unlinked=parseChat('[11/10, 9:00 AM] Unknown User: رابعة ابتدائي lesson 3',staff);
assert.equal(unlinked.items.length,1);
assert.equal(unlinked.items[0].staffId,null,'unrecognized senders cannot be silently linked');
assert.equal(gradeLabel('P4'),'رابعة ابتدائي');
console.log('WhatsApp parser synthetic batch test passed: 7 rows, sender-linked updates, week/eval separation.');
