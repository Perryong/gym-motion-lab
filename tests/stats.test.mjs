import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalize} from '../dist/store.js';
import {localDate,weekStreak,thisWeek,monthCount,weightChange,heatmap,muscleSets} from '../dist/stats.js';

const NOW=new Date(2026,9,11,12).getTime(); // Sunday 11 Oct 2026
const at=(m,d,h=18,minutes=45)=>({day:'mon',name:'',started:new Date(2026,m,d,h).getTime(),finished:new Date(2026,m,d,h,minutes).getTime(),entries:[{id:4,sets:[{kg:60,reps:10,done:true},{kg:60,reps:8,done:true}]},{id:21,sets:[{kg:16,reps:10,done:true}]}]});

test('local dates are formatted in local time',()=>{
 assert.equal(localDate(new Date(2026,0,5,23,30).getTime()),'2026-01-05');
});

test('week streak counts back from the current week',()=>{
 assert.equal(weekStreak([at(8,15),at(8,30),at(9,6)],NOW),2); // weeks of 28 Sep and 5 Oct; 21 Sep is empty
 assert.equal(weekStreak([at(8,24),at(9,1)],NOW),2,'an empty current week does not break the streak');
 assert.equal(weekStreak([at(8,15)],NOW),0);
 assert.equal(weekStreak([],NOW),0);
});

test('this week compares workouts done with planned days',()=>{
 const s=normalize(JSON.stringify({plan:{mon:{items:[{id:4}]},wed:{items:[{id:21}]},fri:{items:[{id:26}]}}}));
 s.history=[at(9,5),at(9,7),at(9,2)];
 assert.deepEqual(thisWeek(s,NOW),{done:2,planned:3});
});

test('month count only includes the current month',()=>{
 assert.equal(monthCount([at(8,30),at(9,1),at(9,10)],NOW),2);
});

test('weight change compares latest with the entry on or before the window start',()=>{
 const w=[{date:'2026-09-05',kg:80},{date:'2026-09-11',kg:79.5},{date:'2026-10-10',kg:78.4}];
 assert.equal(weightChange(w,NOW,30),-1.1);
 assert.equal(weightChange(w.slice(2),NOW,30),null);
 assert.equal(weightChange([],NOW,30),null);
});

test('heatmap ends on this sunday and buckets minutes trained',()=>{
 const grid=heatmap([at(9,10,9,50),at(9,9,9,20),at(9,9,18,20)],NOW,52);
 assert.equal(grid.length,52);assert.ok(grid.every(w=>w.length===7));
 assert.equal(grid.at(-1).at(-1).date,'2026-10-11');
 assert.equal(grid[0][0].date,'2025-10-13');
 const cell=d=>grid.flat().find(c=>c.date===d);
 assert.equal(cell('2026-10-10').level,3);
 assert.equal(cell('2026-10-09').minutes,40,'two sessions on one day add up');
 assert.equal(cell('2026-10-09').level,2);
 assert.equal(cell('2026-10-08').level,0);
});

test('muscle sets count completed sets per group within the range',()=>{
 const h=[at(8,1),at(9,8)];
 assert.deepEqual(muscleSets(h,NOW,7),{chest:2,back:0,shoulders:0,arms:0,legs:1,core:0});
 assert.deepEqual(muscleSets(h,NOW,null),{chest:4,back:0,shoulders:0,arms:0,legs:2,core:0});
});

test('sets of a library exercise count toward its group',async()=>{
 const {LIBRARY}=await import('../dist/library.js'),arm=LIBRARY.find(e=>e.group==='arms');
 const w={...at(9,8),entries:[{id:arm.id,sets:[{kg:10,reps:10,done:true},{kg:10,reps:10,done:true},{kg:10,reps:8,done:true}]},{id:26,sets:[{kg:null,reps:15,done:true}]}]};
 assert.deepEqual(muscleSets([w],NOW,7),{chest:0,back:0,shoulders:0,arms:3,legs:0,core:1});
});

test('the body figure has a region for every group',async()=>{
 const {bodyFigure}=await import('../dist/charts.js');
 const svg=bodyFigure({chest:1,back:1,shoulders:1,arms:1,legs:1,core:1});
 for(const g of ['chest','back','shoulders','arms','legs','core'])assert.ok(svg.includes(`data-group="${g}"`),g);
 assert.ok(!svg.includes('data-group="abs"'),'old abs key');
});

test('goal trend says whether a weight change moves toward the goal',async()=>{
 const {goalTrend}=await import('../dist/stats.js');
 assert.equal(goalTrend(80,79,77),'toward');assert.equal(goalTrend(76,77,77),'toward');
 assert.equal(goalTrend(79,80,77),'away');assert.equal(goalTrend(79,78,null),'');assert.equal(goalTrend(78,78,77),'');
});

test('month grid starts on monday and covers whole weeks',async()=>{
 const {monthGrid}=await import('../dist/stats.js');
 const oct=monthGrid(2026,9); // October 2026 starts on a Thursday
 assert.equal(oct.length,5);assert.ok(oct.every(w=>w.length===7));
 assert.deepEqual(oct[0].slice(0,4).map(c=>[c.date,c.inMonth]),[['2026-09-28',false],['2026-09-29',false],['2026-09-30',false],['2026-10-01',true]]);
 assert.deepEqual(oct.at(-1).at(-1),{date:'2026-11-01',inMonth:false});
 assert.equal(oct.flat().filter(c=>c.inMonth).length,31);
 const feb=monthGrid(2021,1); // February 2021 starts on a Monday and fills exactly four weeks
 assert.equal(feb.length,4);assert.equal(feb[0][0].date,'2021-02-01');
 assert.equal(monthGrid(2027,0)[0][0].date,'2026-12-28','grid crosses the year boundary');
});

test('workouts are grouped by local date with completed set counts',async()=>{
 const {workoutsByDate}=await import('../dist/stats.js');
 const map=workoutsByDate([at(9,8,9),at(9,8,18),at(9,10)]);
 assert.deepEqual([...map.keys()],['2026-10-08','2026-10-10']);
 assert.equal(map.get('2026-10-08').length,2);
 assert.equal(map.get('2026-10-08')[0].sets,3);
});

test('3D back exercises count toward Back',()=>{
 const w={...at(9,8),entries:[{id:33,sets:[{kg:50,reps:8,done:true},{kg:50,reps:8,done:true}]},{id:32,sets:[{kg:null,reps:6,done:true}]}]};
 assert.deepEqual(muscleSets([w],NOW,7),{chest:0,back:3,shoulders:0,arms:0,legs:0,core:0});
});
