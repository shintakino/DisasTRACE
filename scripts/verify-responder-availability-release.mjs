import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadApiRoute } from './helpers/load-api-route.mjs';
const {releaseResponderAvailability}=await loadApiRoute('lib/responder-availability.ts',{});
const dialect=new PgDialect();
for (const scenario of ['idle','accepted','new-offer','documentation','off-duty']) {
  const events=[];
  let dutyStatus=scenario==='off-duty'?'OFF_DUTY':'ACTIVE_DISPATCH';
  const tx={
    select:()=>({from:()=>({where:()=>({for:async()=>{
      events.push('lock');
      return [{id:'owner',dutyStatus}];
    }})})}),
    query:{incidents:{findFirst:async({where})=>{
      events.push('read-current-work');
      const {sql,params}=dialect.sqlToQuery(where);
      assert.ok(sql.includes('"current_offer_responder_id"'));
      assert.ok(params.includes('DISPATCHED') && params.includes('ARRIVED'));
      assert.equal(params.includes('DOCUMENTATION_PENDING'),false);
      return ['accepted','new-offer'].includes(scenario)?{id:'newer'}:undefined;
    }}},
    update:()=>({set:values=>({where:async()=>{events.push('write');dutyStatus=values.dutyStatus;}})}),
  };
  const result=await releaseResponderAvailability(tx,'owner');
  assert.deepEqual(events.slice(0,2),['lock','read-current-work']);
  assert.equal(result.dutyStatus,['accepted','new-offer'].includes(scenario)?'ACTIVE_DISPATCH':scenario==='off-duty'?'OFF_DUTY':'ON_DUTY');
  assert.equal(result.released,['idle','documentation'].includes(scenario));
  if (scenario==='new-offer') assert.equal(events.includes('write'),false,'Cleanup cannot release the offer committed before the responder lock was acquired.');
}
console.log('PASS responder availability release: locks before fresh reads, protects accepted work/new offers, excludes documentation, preserves Off Duty');
