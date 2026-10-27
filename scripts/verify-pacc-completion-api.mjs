import assert from 'node:assert/strict';
import { getTableName } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadApiRoute } from './helpers/load-api-route.mjs';
const dialect=new PgDialect();
const incidentId='10000000-0000-4000-8000-000000000001';
const supabase={auth:{getUser:async()=>({data:{user:{id:'owner',user_metadata:{}}}})}};

for (const newerOffer of [false,true]) {
  let incident={id:incidentId,responderId:'owner',status:'ARRIVED'};
  let report=null;
  let inserts=0;
  let dutyStatus='ACTIVE_DISPATCH';
  const tx={
    select:()=>({from:table=>({where:()=>({for:async()=>getTableName(table)==='users'?[{id:'owner',dutyStatus}]:[{...incident}]})})}),
    query:{reports:{findFirst:async()=>report},incidents:{findFirst:async({where})=>{
      const {sql,params}=dialect.sqlToQuery(where);
      assert.ok(sql.includes('"current_offer_responder_id"'));
      assert.equal(params.includes('DOCUMENTATION_PENDING'),false,'An older documentation draft must not reserve availability.');
      return newerOffer?{id:'newer-offer'}:null;
    }}},
    insert:table=>({values:values=>({returning:async()=>{
      assert.equal(getTableName(table),'reports');
      report={...values};inserts++;return [report];
    }})}),
    update:table=>({set:values=>({where:async()=>{
      if(getTableName(table)==='incidents') incident={...incident,...values};
      else dutyStatus=values.dutyStatus;
    }})}),
  };
  const route=await loadApiRoute('app/api/reports/route.ts',{
    supabase,db:{query:{users:{findFirst:async()=>({id:'owner',role:'ambulance_responder',status:'ACTIVE',verificationStatus:'APPROVED'})},
      incidents:{findFirst:async()=>incident},reports:{findFirst:async()=>report}},
      transaction:async fn=>fn(tx),insert:()=>({values:async()=>{throw new Error('Notification provider/database unavailable after commit.');}}),
    },
  });
  const post=()=>route.POST(new Request('https://test/api/reports',{method:'POST',body:JSON.stringify({incidentId,description:'Final report'})}));
  const first=await post();
  assert.equal(first.status,200,'Advisory notification failure cannot reopen completed work.');
  const result=await first.json();
  assert.equal(result.success,true);
  assert.equal(incident.status,'RESOLVED');
  assert.equal(report.status,'SUBMITTED');
  assert.equal(dutyStatus,newerOffer?'ACTIVE_DISPATCH':'ON_DUTY');
  assert.equal(result.dutyStatus,dutyStatus);
  const retry=await post();
  assert.equal(retry.status,200);
  assert.equal((await retry.json()).alreadySubmitted,true);
  assert.equal(inserts,1,'A lost completion response does not create a second report.');
}

let locks=0;
const manual=await loadApiRoute('app/api/verification/[id]/dispatch/route.ts',{
  supabase:{auth:{getUser:async()=>({data:{user:{id:'pacc',app_metadata:{role:'pacc_admin'}}}})}},
  db:{query:{systemSettings:{findFirst:async()=>null}},transaction:async fn=>fn({
    select:()=>({from:table=>({where:()=>({limit:()=>({for:async()=>{
      locks++;
      assert.notEqual(getTableName(table),'users','A completed report must be rejected before locking/reserving the selected unit.');
      return getTableName(table)==='verification_requests'?[{id:'request',status:'VERIFIED'}]:[{id:incidentId,status:'DISPATCHED',responderId:null}];
    }})})})}),
    query:{reports:{findFirst:async()=>({id:'final',status:'SUBMITTED'})}},
    update:()=>{throw new Error('No mutation is allowed for redispatch of a completed report.');},
  })},
});
const conflict=await manual.POST(new Request('https://test/dispatch',{method:'POST',body:JSON.stringify({responderId:'owner'})}),{params:Promise.resolve({id:'request'})});
assert.equal(conflict.status,409);
assert.equal((await conflict.json()).code,'REPORT_CLOSED');
assert.equal(locks,2);
console.log('PASS actual completion/dispatch handlers: final report is terminal, notification failure and retry are safe, older drafts do not reserve duty, and newer offers stay reserved');
