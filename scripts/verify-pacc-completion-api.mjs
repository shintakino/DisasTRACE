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
    update:table=>({set:values=>({where:()=>{
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
    select:()=>({from:table=>({where:()=>({orderBy(){return this;},limit:()=>({for:async()=>{
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

for (const dispatchMethod of ['PACC_MANUAL','AUTO_1KM']) {
  const request={id:'request',status:'VERIFIED',requestId:'REQ-1',type:'Medical Emergency'};
  let incident={id:incidentId,requestId:request.id,status:'DISPATCHED',responderId:null,currentOfferResponderId:null,
    offerExpiresAt:null,dispatchMethod:'AUTO_1KM'};
  let dutyStatus='ON_DUTY';
  const responder={id:'owner',role:'ambulance_responder',status:'ACTIVE',verificationStatus:'APPROVED',dutyStatus,
    lastLocationUpdatedAt:new Date(),fullName:'Responder',email:'responder@example.test',unitId:'AMB-1'};
  const transaction={
    select:()=>({from:table=>({where:()=>({orderBy(){return this;},limit:()=>({for:async()=>{
      const name=getTableName(table);
      if(name==='verification_requests')return [request];
      if(name==='incidents')return [incident];
      if(name==='users')return [responder];
      throw new Error(`Unexpected locked table ${name}`);
    }})})})}),
    query:{reports:{findFirst:async()=>null}},
    update:table=>({set:values=>({where:()=>{
      const name=getTableName(table);
      if(name==='users')dutyStatus=values.dutyStatus;
      if(name==='verification_requests')request.status=values.status;
      if(name==='incidents')incident={...incident,...values,dispatchMethod};
      return {returning:async()=>name==='users'?[{id:'owner'}]:[incident]};
    }})}),
    insert:table=>({values:async()=>{
      assert.equal(getTableName(table),'audit_logs');
    }}),
  };
  const route=await loadApiRoute('app/api/verification/[id]/dispatch/route.ts',{
    debug:true,
    supabase:{auth:{getUser:async()=>({data:{user:{id:'pacc',app_metadata:{role:'pacc_admin'}}}})}},
    db:{query:{systemSettings:{findFirst:async()=>null}},transaction:async fn=>fn(transaction)},
  });
  const response=await route.POST(new Request('https://test/dispatch',{method:'POST',body:JSON.stringify({responderId:'owner'})}),{params:Promise.resolve({id:'request'})});
  assert.equal(response.status,200,`${dispatchMethod} reassignment should be available to PACC.`);
  assert.equal((await response.json()).success,true);
  assert.equal(incident.currentOfferResponderId,'owner');
  assert.equal(request.status,'VERIFIED');
  assert.equal(dutyStatus,'ACTIVE_DISPATCH');
}
console.log('PASS actual completion/dispatch handlers: final reports stay terminal, notification failure/retry is safe, older drafts do not reserve duty, and both unassigned incident types accept an eligible PACC manual reassignment');
